/**
 * Spot-Checker — periodic validation after model handoff.
 * Every Nth invocation, runs Opus on the same input and compares scores.
 * Auto-reverts to Opus if Sonnet drops below threshold for consecutive checks.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getAnthropicClient } from '../client';
import { SelfEvaluator } from '../evaluation/self-evaluator';
import { MODEL_IDS } from '../routing/types';
import type { SpotCheckResult } from './types';

export class SpotChecker {
  private supabase: SupabaseClient;
  private evaluator: SelfEvaluator;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.evaluator = new SelfEvaluator(supabase);
  }

  /**
   * Check if a spot-check should run for this invocation.
   * Returns true every Nth invocation (default N=10) when distillation_status is 'handed_off'.
   */
  async shouldSpotCheck(taskType: string): Promise<boolean> {
    try {
      const { data: config } = await this.supabase
        .from('model_routing_config')
        .select('distillation_status')
        .eq('task_type', taskType)
        .single();

      if (config?.distillation_status !== 'handed_off') return false;

      // Get spot-check frequency from learning config
      const frequency = await this.getSpotCheckFrequency();

      // Count invocations since last spot-check
      const { count } = await this.supabase
        .from('self_evaluations')
        .select('*', { count: 'exact', head: true })
        .eq('agent_type', taskType)
        .gte('created_at', await this.getLastSpotCheckTime(taskType));

      return (count || 0) >= frequency;
    } catch {
      return false;
    }
  }

  /**
   * Run a spot-check: re-run with Opus, compare to Sonnet score.
   * Auto-reverts if consecutive failures exceed threshold.
   */
  async runSpotCheck(params: {
    taskType: string;
    prompt: string;
    sonnetOutput: string;
    sonnetScore: number;
    dealId?: string;
  }): Promise<SpotCheckResult> {
    const anthropic = getAnthropicClient();

    // Run Opus on the same prompt
    let opusScore = 0;
    try {
      const response = await anthropic.messages.create({
        model: MODEL_IDS.opus,
        max_tokens: 4096,
        messages: [{ role: 'user', content: params.prompt }],
      });
      const opusText = response.content.find(b => b.type === 'text')?.text ?? '';

      const evaluation = await this.evaluator.evaluate({
        agentType: params.taskType,
        output: opusText,
        sourceDocuments: [],
        dealContext: { dealId: params.dealId },
      });
      opusScore = evaluation.overallScore;
    } catch {
      // If Opus fails, don't count as a failure for Sonnet
      return {
        taskType: params.taskType,
        dealId: params.dealId || null,
        sonnetScore: params.sonnetScore,
        opusScore: 0,
        scoreGap: 0,
        belowThreshold: false,
        consecutiveFailures: 0,
        autoReverted: false,
      };
    }

    // Get revert threshold
    const revertThreshold = await this.getRevertThreshold();
    const belowThreshold = params.sonnetScore < revertThreshold;

    // Store spot-check result
    await this.storeSpotCheck(params.taskType, params.dealId || null, {
      sonnetScore: params.sonnetScore,
      opusScore,
      belowThreshold,
    });

    // Check consecutive failures
    const consecutiveFailures = belowThreshold
      ? await this.getConsecutiveFailures(params.taskType) + 1
      : 0;

    // Auto-revert if 3+ consecutive failures
    let autoReverted = false;
    if (consecutiveFailures >= 3) {
      await this.autoRevert(params.taskType);
      autoReverted = true;
    }

    return {
      taskType: params.taskType,
      dealId: params.dealId || null,
      sonnetScore: params.sonnetScore,
      opusScore,
      scoreGap: opusScore - params.sonnetScore,
      belowThreshold,
      consecutiveFailures,
      autoReverted,
    };
  }

  /**
   * Auto-revert a task type from Sonnet back to Opus.
   */
  private async autoRevert(taskType: string): Promise<void> {
    try {
      await this.supabase
        .from('model_routing_config')
        .update({
          current_model: 'opus',
          distillation_status: 'collecting',
          updated_at: new Date().toISOString(),
        })
        .eq('task_type', taskType);

      await this.supabase.from('learning_audit_log').insert({
        action: 'auto_revert_to_opus',
        component: 'spot_checker',
        details: {
          task_type: taskType,
          reason: '3+ consecutive spot-check failures below revert threshold',
        },
      });
    } catch {
      console.warn('Failed to auto-revert — table may not exist');
    }
  }

  /**
   * Store a spot-check result in distillation_trials.
   */
  private async storeSpotCheck(
    taskType: string,
    dealId: string | null,
    scores: { sonnetScore: number; opusScore: number; belowThreshold: boolean }
  ): Promise<void> {
    try {
      await this.supabase.from('distillation_trials').insert({
        task_type: taskType,
        opus_score: scores.opusScore,
        sonnet_score: scores.sonnetScore,
        sonnet_with_exemplars_score: scores.sonnetScore,
        score_gap: scores.opusScore - scores.sonnetScore,
        deal_context: { dealId, type: 'spot_check' },
        trial_status: scores.belowThreshold ? 'spot_check_fail' : 'spot_check_pass',
        exemplar_ids: [],
        exemplar_count: 0,
      });
    } catch {
      // Non-critical
    }
  }

  /**
   * Count consecutive spot-check failures for a task type.
   */
  private async getConsecutiveFailures(taskType: string): Promise<number> {
    try {
      const { data } = await this.supabase
        .from('distillation_trials')
        .select('trial_status')
        .eq('task_type', taskType)
        .in('trial_status', ['spot_check_pass', 'spot_check_fail'])
        .order('created_at', { ascending: false })
        .limit(5);

      if (!data) return 0;

      let count = 0;
      for (const row of data) {
        if (row.trial_status === 'spot_check_fail') count++;
        else break;
      }
      return count;
    } catch {
      return 0;
    }
  }

  /**
   * Get the time of the last spot-check for a task type.
   */
  private async getLastSpotCheckTime(taskType: string): Promise<string> {
    try {
      const { data } = await this.supabase
        .from('distillation_trials')
        .select('created_at')
        .eq('task_type', taskType)
        .in('trial_status', ['spot_check_pass', 'spot_check_fail'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        return data[0].created_at as string;
      }
      // If no spot-check found, use a date far in the past
      return '2000-01-01T00:00:00Z';
    } catch {
      return '2000-01-01T00:00:00Z';
    }
  }

  private async getSpotCheckFrequency(): Promise<number> {
    try {
      const { data } = await this.supabase
        .from('learning_configuration')
        .select('config_value')
        .eq('config_key', 'learning.spot_check.frequency')
        .single();

      return Number((data?.config_value as Record<string, unknown>)?.value) || 10;
    } catch {
      return 10;
    }
  }

  private async getRevertThreshold(): Promise<number> {
    try {
      const { data } = await this.supabase
        .from('learning_configuration')
        .select('config_value')
        .eq('config_key', 'learning.spot_check.revert_threshold')
        .single();

      return Number((data?.config_value as Record<string, unknown>)?.value) || 0.80;
    } catch {
      return 0.80;
    }
  }
}
