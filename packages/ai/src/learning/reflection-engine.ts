/**
 * Reflection Engine — processes aggregated signals into actionable patterns.
 * Uses Claude Opus to identify systematic patterns across signal data.
 * Manages the full pattern lifecycle: create, update, decay, retire.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getAnthropicClient } from '../client';
import { SignalAggregator } from './signal-aggregator';
import { REFLECTION_SYSTEM_PROMPT, buildReflectionPrompt } from './reflection-prompts';
import type { ReflectionResult, ReflectionDecision, LearnedPattern } from './types';

export class ReflectionEngine {
  private supabase: SupabaseClient;
  private signalAggregator: SignalAggregator;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.signalAggregator = new SignalAggregator(supabase);
  }

  /**
   * Run the reflection engine.
   * Gathers signals since last run, calls Opus for analysis, applies decisions.
   */
  async reflect(params: {
    triggerType: 'nightly' | 'milestone' | 'manual';
    dealId?: string;
  }): Promise<ReflectionResult> {
    // 1. Get last reflection time
    const lastRun = await this.getLastReflectionRun(params.triggerType);
    const since = lastRun ? new Date(lastRun) : new Date(0);

    // 2. Gather signals
    const signals = await this.signalAggregator.gatherSignals(since, params.dealId);
    if (signals.totalSignals === 0) {
      return {
        noNewSignals: true,
        signalsProcessed: 0,
        patternsCreated: [],
        patternsUpdated: [],
        patternsDecayed: [],
        patternsPromoted: [],
      };
    }

    // 3. Get existing patterns for context
    const existingPatterns = await this.getActivePatterns();

    // 4. Call Claude Opus
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      system: REFLECTION_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: buildReflectionPrompt(signals, existingPatterns),
      }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    const responseText = textBlock?.text ?? '';

    // 5. Parse decisions
    const decisions = this.parseDecisions(responseText);

    // 6. Apply decisions
    const result = await this.applyDecisions(decisions, signals.totalSignals);

    // 7. Record reflection run
    await this.recordRun(params.triggerType, params.dealId || null, signals.totalSignals, result);

    return result;
  }

  /**
   * Parse the JSON response from Opus into structured decisions.
   */
  private parseDecisions(responseText: string): ReflectionDecision {
    const defaults: ReflectionDecision = {
      newPatterns: [],
      updatedPatterns: [],
      decayedPatterns: [],
    };

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return defaults;

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        newPatterns: Array.isArray(parsed.new_patterns) ? parsed.new_patterns.map((p: Record<string, unknown>) => ({
          description: String(p.description || ''),
          patternType: String(p.pattern_type || 'quality_pattern'),
          agentType: String(p.agent_type || 'all'),
          instruction: String(p.instruction || ''),
          conditions: (p.conditions || {}) as Record<string, unknown>,
          supportingSignalIds: [],
          initialConfidence: Number(p.initial_confidence) || 0.35,
        })) : [],
        updatedPatterns: Array.isArray(parsed.updated_patterns) ? parsed.updated_patterns.map((p: Record<string, unknown>) => ({
          patternId: String(p.pattern_id || ''),
          confidenceChange: Number(p.confidence_change) || 0,
          reason: String(p.reason || ''),
          newSupportingSignals: [],
        })) : [],
        decayedPatterns: Array.isArray(parsed.decayed_patterns) ? parsed.decayed_patterns.map((p: Record<string, unknown>) => ({
          patternId: String(p.pattern_id || ''),
          confidenceReduction: Number(p.confidence_reduction) || 0.05,
          reason: String(p.reason || ''),
          contradictingSignals: [],
        })) : [],
      };
    } catch {
      return defaults;
    }
  }

  /**
   * Apply reflection decisions: create new patterns, update existing, decay contradicted.
   */
  private async applyDecisions(decisions: ReflectionDecision, signalsProcessed: number): Promise<ReflectionResult> {
    const result: ReflectionResult = {
      signalsProcessed,
      patternsCreated: [],
      patternsUpdated: [],
      patternsDecayed: [],
      patternsPromoted: [],
    };

    // Create new patterns
    for (const proposed of decisions.newPatterns) {
      try {
        const { data } = await this.supabase.from('learned_patterns').insert({
          pattern_type: proposed.patternType,
          agent_type: proposed.agentType,
          description: proposed.description,
          instruction: proposed.instruction,
          conditions: proposed.conditions,
          confidence: proposed.initialConfidence,
          lifecycle_stage: 'proposed',
          supporting_count: 1,
          contradicting_count: 0,
          source_signals: proposed.supportingSignalIds,
          version: 1,
          version_history: [],
        }).select('id').single();

        if (data) {
          result.patternsCreated.push(data.id);
          await this.auditLog('pattern_created', {
            patternId: data.id,
            description: proposed.description,
            agentType: proposed.agentType,
          });
        }
      } catch {
        // Skip failed patterns
      }
    }

    // Update existing patterns (increase confidence)
    for (const update of decisions.updatedPatterns) {
      if (!update.patternId) continue;
      try {
        const { data: existing } = await this.supabase
          .from('learned_patterns')
          .select('confidence, supporting_count')
          .eq('id', update.patternId)
          .single();

        if (existing) {
          const newConfidence = Math.min(0.95, (Number(existing.confidence) || 0) + update.confidenceChange);
          const newCount = (Number(existing.supporting_count) || 0) + (update.newSupportingSignals.length || 1);

          await this.supabase.from('learned_patterns').update({
            confidence: newConfidence,
            supporting_count: newCount,
            updated_at: new Date().toISOString(),
          }).eq('id', update.patternId);

          result.patternsUpdated.push(update.patternId);
        }
      } catch {
        // Skip
      }
    }

    // Decay contradicted patterns
    for (const decay of decisions.decayedPatterns) {
      if (!decay.patternId) continue;
      try {
        const { data: existing } = await this.supabase
          .from('learned_patterns')
          .select('confidence, contradicting_count, lifecycle_stage')
          .eq('id', decay.patternId)
          .single();

        if (existing) {
          const newConfidence = (Number(existing.confidence) || 0) - decay.confidenceReduction;
          const newContradictions = (Number(existing.contradicting_count) || 0) + 1;

          if (newConfidence < 0.2) {
            // Retire pattern
            await this.supabase.from('learned_patterns').update({
              confidence: Math.max(0, newConfidence),
              contradicting_count: newContradictions,
              lifecycle_stage: 'retired',
              updated_at: new Date().toISOString(),
            }).eq('id', decay.patternId);

            await this.auditLog('pattern_retired', {
              patternId: decay.patternId,
              reason: decay.reason,
              finalConfidence: newConfidence,
            });
          } else {
            await this.supabase.from('learned_patterns').update({
              confidence: newConfidence,
              contradicting_count: newContradictions,
              updated_at: new Date().toISOString(),
            }).eq('id', decay.patternId);
          }

          result.patternsDecayed.push(decay.patternId);
        }
      } catch {
        // Skip
      }
    }

    return result;
  }

  /**
   * Get active (non-retired) patterns.
   */
  private async getActivePatterns(): Promise<LearnedPattern[]> {
    try {
      const { data } = await this.supabase
        .from('learned_patterns')
        .select('*')
        .neq('lifecycle_stage', 'retired')
        .order('confidence', { ascending: false })
        .limit(50);

      return (data || []) as unknown as LearnedPattern[];
    } catch {
      return [];
    }
  }

  /**
   * Get the last reflection run time.
   */
  private async getLastReflectionRun(triggerType: string): Promise<string | null> {
    try {
      const { data } = await this.supabase
        .from('reflection_runs')
        .select('created_at')
        .eq('trigger_type', triggerType)
        .order('created_at', { ascending: false })
        .limit(1);

      return data && data.length > 0 ? (data[0].created_at as string) : null;
    } catch {
      return null;
    }
  }

  /**
   * Record a reflection run.
   */
  private async recordRun(
    triggerType: string,
    dealId: string | null,
    signalsProcessed: number,
    result: ReflectionResult
  ): Promise<void> {
    try {
      const { data } = await this.supabase.from('reflection_runs').insert({
        trigger_type: triggerType,
        deal_id: dealId,
        signals_processed: signalsProcessed,
        patterns_created: result.patternsCreated.length,
        patterns_updated: result.patternsUpdated.length,
        patterns_decayed: result.patternsDecayed.length,
        result_summary: {
          created: result.patternsCreated,
          updated: result.patternsUpdated,
          decayed: result.patternsDecayed,
          promoted: result.patternsPromoted,
        },
      }).select('id').single();

      if (data) {
        result.reflectionRunId = data.id;
      }
    } catch {
      // Non-critical
    }
  }

  private async auditLog(action: string, details: Record<string, unknown>): Promise<void> {
    try {
      await this.supabase.from('learning_audit_log').insert({
        action,
        component: 'reflection_engine',
        details,
      });
    } catch {
      // Non-critical
    }
  }
}
