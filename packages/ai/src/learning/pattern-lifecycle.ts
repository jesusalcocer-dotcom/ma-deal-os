/**
 * Pattern Lifecycle Manager — handles promotion, decay, and retirement of learned patterns.
 * Promotion rules:
 *   proposed (0.3-0.4) → confirmed (0.5-0.6): 5+ deals, no contradictions
 *   confirmed (0.5-0.6) → established (0.7-0.8): 8+ deals, no contradictions
 *   established (0.7-0.8) → hard_rule (0.95): 20+ deals, requires human approval (L3)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { LearnedPattern, PromotionDecision } from './types';

export class PatternLifecycle {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Evaluate whether a pattern should be promoted.
   */
  async evaluatePromotion(pattern: LearnedPattern): Promise<PromotionDecision> {
    const autoPromotionMax = await this.getAutoPromotionMax();

    if (pattern.lifecycle_stage === 'proposed' &&
        pattern.supporting_count >= 5 &&
        pattern.contradicting_count === 0) {
      return { promote: true, newStage: 'confirmed', newConfidence: 0.6 };
    }

    if (pattern.lifecycle_stage === 'confirmed' &&
        pattern.supporting_count >= 8 &&
        pattern.contradicting_count === 0) {
      if (autoPromotionMax === 'established' || autoPromotionMax === 'hard_rule') {
        return { promote: true, newStage: 'established', newConfidence: 0.8 };
      }
      return { promote: false, requiresHumanApproval: true, proposedStage: 'established' };
    }

    if (pattern.lifecycle_stage === 'established' &&
        pattern.supporting_count >= 20) {
      // Hard rule promotion always requires human approval (L3 governance)
      return { promote: false, requiresHumanApproval: true, proposedStage: 'hard_rule' };
    }

    return { promote: false };
  }

  /**
   * Promote a pattern to a new lifecycle stage.
   */
  async promotePattern(patternId: string, newStage: string, newConfidence: number): Promise<void> {
    const pattern = await this.getPattern(patternId);
    if (!pattern) return;

    const oldVersion = {
      stage: pattern.lifecycle_stage,
      confidence: pattern.confidence,
      timestamp: new Date().toISOString(),
    };

    const versionHistory = Array.isArray(pattern.version_history)
      ? [...pattern.version_history, oldVersion]
      : [oldVersion];

    await this.supabase.from('learned_patterns').update({
      lifecycle_stage: newStage,
      confidence: newConfidence,
      version: (pattern.version || 1) + 1,
      version_history: versionHistory,
      updated_at: new Date().toISOString(),
    }).eq('id', patternId);

    await this.auditLog('pattern_promoted', {
      entityType: 'pattern',
      entityId: patternId,
      description: `Pattern promoted from ${pattern.lifecycle_stage} to ${newStage}`,
      beforeState: { stage: pattern.lifecycle_stage, confidence: pattern.confidence },
      afterState: { stage: newStage, confidence: newConfidence },
    });
  }

  /**
   * Apply decay to a pattern when contradicting signals arrive.
   * Below 0.2 → retired.
   */
  async applyDecay(patternId: string, contradictionCount: number, reason?: string): Promise<void> {
    const pattern = await this.getPattern(patternId);
    if (!pattern) return;

    const decayPerContradiction = 0.05;
    const newConfidence = pattern.confidence - (contradictionCount * decayPerContradiction);

    if (newConfidence < 0.2) {
      await this.retirePattern(patternId, reason || 'Confidence dropped below 0.2');
    } else {
      await this.supabase.from('learned_patterns').update({
        confidence: newConfidence,
        contradicting_count: pattern.contradicting_count + contradictionCount,
        updated_at: new Date().toISOString(),
      }).eq('id', patternId);

      await this.auditLog('pattern_decayed', {
        entityId: patternId,
        oldConfidence: pattern.confidence,
        newConfidence,
        contradictionCount,
        reason,
      });
    }
  }

  /**
   * Retire a pattern — sets lifecycle_stage to 'retired'.
   */
  async retirePattern(patternId: string, reason?: string): Promise<void> {
    const pattern = await this.getPattern(patternId);
    if (!pattern) return;

    await this.supabase.from('learned_patterns').update({
      lifecycle_stage: 'retired',
      updated_at: new Date().toISOString(),
    }).eq('id', patternId);

    await this.auditLog('pattern_retired', {
      entityId: patternId,
      previousStage: pattern.lifecycle_stage,
      previousConfidence: pattern.confidence,
      reason: reason || 'Manual retirement',
    });
  }

  /**
   * Run promotion checks on all active patterns.
   * Returns list of patterns that were promoted or flagged for human approval.
   */
  async runPromotionSweep(): Promise<{
    promoted: string[];
    needsApproval: Array<{ patternId: string; proposedStage: string }>;
  }> {
    const promoted: string[] = [];
    const needsApproval: Array<{ patternId: string; proposedStage: string }> = [];

    try {
      const { data: patterns } = await this.supabase
        .from('learned_patterns')
        .select('*')
        .neq('lifecycle_stage', 'retired')
        .neq('lifecycle_stage', 'hard_rule')
        .order('supporting_count', { ascending: false });

      if (!patterns) return { promoted, needsApproval };

      for (const raw of patterns) {
        const pattern = raw as unknown as LearnedPattern;
        const decision = await this.evaluatePromotion(pattern);

        if (decision.promote && decision.newStage && decision.newConfidence) {
          await this.promotePattern(pattern.id, decision.newStage, decision.newConfidence);
          promoted.push(pattern.id);
        } else if (decision.requiresHumanApproval && decision.proposedStage) {
          needsApproval.push({ patternId: pattern.id, proposedStage: decision.proposedStage });
        }
      }
    } catch {
      // Non-critical
    }

    return { promoted, needsApproval };
  }

  /**
   * Get a single pattern by ID.
   */
  async getPattern(patternId: string): Promise<LearnedPattern | null> {
    try {
      const { data } = await this.supabase
        .from('learned_patterns')
        .select('*')
        .eq('id', patternId)
        .single();

      return data as unknown as LearnedPattern | null;
    } catch {
      return null;
    }
  }

  private async getAutoPromotionMax(): Promise<string> {
    try {
      const { data } = await this.supabase
        .from('learning_configuration')
        .select('config_value')
        .eq('config_key', 'learning.reflection.auto_promotion_max')
        .single();

      return String((data?.config_value as Record<string, unknown>)?.value || 'established');
    } catch {
      return 'established';
    }
  }

  private async auditLog(action: string, details: Record<string, unknown>): Promise<void> {
    try {
      await this.supabase.from('learning_audit_log').insert({
        action,
        component: 'pattern_lifecycle',
        details,
      });
    } catch {
      // Non-critical
    }
  }
}
