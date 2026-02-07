/**
 * Distillation Trial Runner
 * Tests whether Sonnet + exemplars can match Opus quality for a task type.
 * Runs controlled experiments: Opus baseline vs Sonnet plain vs Sonnet + exemplars.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getAnthropicClient } from '../client';
import { SelfEvaluator } from '../evaluation/self-evaluator';
import { ExemplarService } from '../evaluation/exemplar-service';
import { MODEL_IDS } from '../routing/types';
import type { DistillationTrialResult, TrialDetail } from './types';

export class DistillationTrialRunner {
  private supabase: SupabaseClient;
  private evaluator: SelfEvaluator;
  private exemplarService: ExemplarService;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.evaluator = new SelfEvaluator(supabase);
    this.exemplarService = new ExemplarService(supabase);
  }

  /**
   * Run a distillation trial for a task type.
   * 1. Checks if enough exemplars exist
   * 2. Finds historical high-scoring Opus evaluations
   * 3. For each, runs Sonnet plain and Sonnet + exemplars
   * 4. Compares scores to Opus baseline
   * 5. Returns recommendation
   */
  async runTrial(taskType: string): Promise<DistillationTrialResult> {
    // Get routing config
    const config = await this.getRoutingConfig(taskType);
    if (!config) {
      return {
        taskType,
        recommendation: 'reject_needs_more',
        reason: 'No routing config found for task type',
        trials: [],
      };
    }

    const minExemplars = Number(config.min_exemplars_for_testing) || 15;
    const exemplarCount = Number(config.exemplar_count) || 0;

    if (exemplarCount < minExemplars) {
      return {
        taskType,
        recommendation: 'reject_needs_more',
        reason: `Only ${exemplarCount}/${minExemplars} exemplars available`,
        trials: [],
      };
    }

    // Find historical high-scoring Opus evaluations
    const historicalDeals = await this.findHighScoringOpusEvaluations(taskType, 3);
    if (historicalDeals.length < 3) {
      return {
        taskType,
        recommendation: 'reject_needs_more',
        reason: `Only ${historicalDeals.length}/3 historical Opus evaluations found`,
        trials: [],
      };
    }

    // Run trials
    const trials: TrialDetail[] = [];

    for (const deal of historicalDeals) {
      const trial = await this.runSingleTrial(taskType, deal);
      trials.push(trial);
    }

    // Store trials in database
    for (const trial of trials) {
      await this.storeTrial(taskType, trial);
    }

    // Calculate averages
    const avgSonnet = trials.reduce((s, t) => s + t.sonnetScore, 0) / trials.length;
    const avgSonnetExemplars = trials.reduce((s, t) => s + t.sonnetWithExemplarsScore, 0) / trials.length;
    const avgOpus = trials.reduce((s, t) => s + t.opusScore, 0) / trials.length;

    // Determine recommendation
    const threshold = Number(config.handoff_threshold) || 0.85;
    const qualityGapMax = 0.10; // Max allowed gap between Opus and Sonnet+exemplars

    let recommendation: DistillationTrialResult['recommendation'];
    let reason: string;

    if (avgSonnetExemplars >= threshold && (avgOpus - avgSonnetExemplars) <= qualityGapMax) {
      recommendation = 'approve_handoff';
      reason = `Sonnet+exemplars avg ${avgSonnetExemplars.toFixed(3)} meets threshold ${threshold} with gap ${(avgOpus - avgSonnetExemplars).toFixed(3)}`;
    } else if (avgSonnetExemplars < threshold) {
      recommendation = 'reject_quality_gap';
      reason = `Sonnet+exemplars avg ${avgSonnetExemplars.toFixed(3)} below threshold ${threshold}`;
    } else {
      recommendation = 'reject_quality_gap';
      reason = `Quality gap ${(avgOpus - avgSonnetExemplars).toFixed(3)} exceeds max ${qualityGapMax}`;
    }

    // Log in audit
    await this.logAudit('distillation_trial_completed', {
      taskType,
      recommendation,
      reason,
      avgSonnet,
      avgSonnetExemplars,
      avgOpus,
      trialCount: trials.length,
    });

    return {
      taskType,
      recommendation,
      reason,
      avgSonnetScore: avgSonnet,
      avgSonnetWithExemplarsScore: avgSonnetExemplars,
      avgOpusBaseline: avgOpus,
      trials,
    };
  }

  /**
   * Run a single trial: Sonnet plain vs Sonnet + exemplars against Opus baseline.
   */
  private async runSingleTrial(
    taskType: string,
    deal: { dealId: string | null; outputSnapshot: string; opusScore: number; dealCharacteristics: Record<string, unknown> }
  ): Promise<TrialDetail> {
    const anthropic = getAnthropicClient();
    const prompt = `You are performing a ${taskType} task for an M&A deal.\n\nContext:\n${deal.outputSnapshot.substring(0, 3000)}\n\nProduce the same type of output.`;

    // Run Sonnet plain
    let sonnetScore = 0;
    try {
      const sonnetResponse = await anthropic.messages.create({
        model: MODEL_IDS.sonnet,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });
      const sonnetText = sonnetResponse.content.find(b => b.type === 'text')?.text ?? '';
      const sonnetEval = await this.evaluator.evaluate({
        agentType: taskType,
        output: sonnetText,
        sourceDocuments: [],
        dealContext: { dealId: deal.dealId || undefined },
      });
      sonnetScore = sonnetEval.overallScore;
    } catch {
      // Use 0 if Sonnet fails
    }

    // Get exemplars for injection
    const exemplars = await this.exemplarService.findExemplars({
      documentType: taskType,
      dealCharacteristics: deal.dealCharacteristics as { dealType?: string; industry?: string; jurisdiction?: string; sizeRange?: string },
      preferDistillation: true,
      limit: 3,
    });

    // Build Sonnet prompt WITH exemplars (Layer 5 injection)
    let sonnetWithExemplarsScore = 0;
    try {
      const exemplarContext = exemplars.length > 0
        ? `\n\n## Reference Exemplars (Gold Standard)\n${exemplars.map((e, i) => `### Exemplar ${i + 1} (quality: ${e.quality_score})\n${JSON.stringify(e.content).substring(0, 2000)}`).join('\n\n')}`
        : '';

      const sonnetExResponse = await anthropic.messages.create({
        model: MODEL_IDS.sonnet,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt + exemplarContext }],
      });
      const sonnetExText = sonnetExResponse.content.find(b => b.type === 'text')?.text ?? '';
      const sonnetExEval = await this.evaluator.evaluate({
        agentType: taskType,
        output: sonnetExText,
        sourceDocuments: [],
        dealContext: { dealId: deal.dealId || undefined },
      });
      sonnetWithExemplarsScore = sonnetExEval.overallScore;
    } catch {
      // Use 0 if fails
    }

    return {
      dealId: deal.dealId,
      dealCharacteristics: deal.dealCharacteristics,
      opusScore: deal.opusScore,
      sonnetScore,
      sonnetWithExemplarsScore,
      exemplarIds: exemplars.map(e => e.id),
      exemplarCount: exemplars.length,
      scoreGap: deal.opusScore - sonnetWithExemplarsScore,
    };
  }

  /**
   * Find historical high-scoring Opus evaluations for a task type.
   */
  private async findHighScoringOpusEvaluations(
    taskType: string,
    limit: number
  ): Promise<Array<{ dealId: string | null; outputSnapshot: string; opusScore: number; dealCharacteristics: Record<string, unknown> }>> {
    try {
      const { data, error } = await this.supabase
        .from('self_evaluations')
        .select('deal_id, output_snapshot, overall_score, model_used')
        .eq('agent_type', taskType)
        .gte('overall_score', 0.90)
        .like('model_used', '%opus%')
        .order('overall_score', { ascending: false })
        .limit(limit);

      if (error || !data) return [];

      return data.map((row: Record<string, unknown>) => ({
        dealId: (row.deal_id as string) || null,
        outputSnapshot: (row.output_snapshot as string) || '',
        opusScore: (row.overall_score as number) || 0,
        dealCharacteristics: {},
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get routing config for a task type.
   */
  private async getRoutingConfig(taskType: string): Promise<Record<string, unknown> | null> {
    try {
      const { data, error } = await this.supabase
        .from('model_routing_config')
        .select('*')
        .eq('task_type', taskType)
        .single();

      if (error || !data) return null;
      return data as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  /**
   * Store a trial result in the database.
   */
  private async storeTrial(taskType: string, trial: TrialDetail): Promise<void> {
    try {
      await this.supabase.from('distillation_trials').insert({
        task_type: taskType,
        opus_score: trial.opusScore,
        sonnet_score: trial.sonnetScore,
        sonnet_with_exemplars_score: trial.sonnetWithExemplarsScore,
        exemplar_ids: trial.exemplarIds,
        exemplar_count: trial.exemplarCount,
        score_gap: trial.scoreGap,
        deal_context: trial.dealCharacteristics,
        trial_status: 'completed',
      });
    } catch {
      console.warn('Failed to store distillation trial — table may not exist');
    }
  }

  /**
   * Log to the learning audit trail.
   */
  private async logAudit(action: string, details: Record<string, unknown>): Promise<void> {
    try {
      await this.supabase.from('learning_audit_log').insert({
        action,
        component: 'distillation_trial_runner',
        details,
      });
    } catch {
      // Non-critical
    }
  }
}
