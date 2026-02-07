/**
 * Shadow Testing Runner
 * Runs Sonnet in parallel with Opus when shadow testing is enabled.
 * Sonnet output is discarded — only scores are compared and stored.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getAnthropicClient } from '../client';
import { SelfEvaluator } from '../evaluation/self-evaluator';
import { ExemplarService } from '../evaluation/exemplar-service';
import { MODEL_IDS } from '../routing/types';
import type { ShadowTestResult } from './types';

export class ShadowRunner {
  private supabase: SupabaseClient;
  private evaluator: SelfEvaluator;
  private exemplarService: ExemplarService;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.evaluator = new SelfEvaluator(supabase);
    this.exemplarService = new ExemplarService(supabase);
  }

  /**
   * Check if shadow testing is enabled for a task type.
   */
  async isShadowEnabled(taskType: string): Promise<boolean> {
    try {
      const { data } = await this.supabase
        .from('model_routing_config')
        .select('distillation_status')
        .eq('task_type', taskType)
        .single();

      return data?.distillation_status === 'testing';
    } catch {
      return false;
    }
  }

  /**
   * Run a shadow test: re-run the same prompt with Sonnet + exemplars,
   * evaluate the output, and store the comparison.
   * This is fire-and-forget — errors are swallowed.
   */
  async runShadow(params: {
    taskType: string;
    prompt: string;
    opusOutput: string;
    opusScore: number;
    dealId?: string;
    dealCharacteristics?: Record<string, unknown>;
  }): Promise<ShadowTestResult | null> {
    try {
      const anthropic = getAnthropicClient();

      // Get exemplars for injection
      const exemplars = await this.exemplarService.findExemplars({
        documentType: params.taskType,
        dealCharacteristics: (params.dealCharacteristics || {}) as { dealType?: string; industry?: string; jurisdiction?: string; sizeRange?: string },
        preferDistillation: true,
        limit: 3,
      });

      // Build prompt with exemplar injection (Layer 5)
      let promptWithExemplars = params.prompt;
      if (exemplars.length > 0) {
        const exemplarContext = exemplars.map((e, i) =>
          `### Exemplar ${i + 1} (quality: ${e.quality_score})\n${JSON.stringify(e.content).substring(0, 2000)}`
        ).join('\n\n');
        promptWithExemplars += `\n\n## Reference Exemplars (Gold Standard)\n${exemplarContext}`;
      }

      // Run Sonnet
      const response = await anthropic.messages.create({
        model: MODEL_IDS.sonnet,
        max_tokens: 4096,
        messages: [{ role: 'user', content: promptWithExemplars }],
      });

      const sonnetOutput = response.content.find(b => b.type === 'text')?.text ?? '';

      // Evaluate Sonnet output
      const evaluation = await this.evaluator.evaluate({
        agentType: params.taskType,
        output: sonnetOutput,
        sourceDocuments: [],
        dealContext: { dealId: params.dealId },
      });

      const result: ShadowTestResult = {
        taskType: params.taskType,
        dealId: params.dealId || null,
        opusOutput: params.opusOutput.substring(0, 500),
        sonnetOutput: sonnetOutput.substring(0, 500),
        opusScore: params.opusScore,
        sonnetScore: evaluation.overallScore,
        scoreGap: params.opusScore - evaluation.overallScore,
        exemplarIds: exemplars.map(e => e.id),
      };

      // Store as distillation trial
      await this.storeShadowResult(result);

      // Log audit
      await this.logAudit('shadow_test_completed', {
        taskType: params.taskType,
        dealId: params.dealId,
        opusScore: params.opusScore,
        sonnetScore: evaluation.overallScore,
        gap: result.scoreGap,
        exemplarCount: exemplars.length,
      });

      return result;
    } catch {
      console.warn('Shadow test failed (non-critical)');
      return null;
    }
  }

  /**
   * Store shadow test result as a distillation trial.
   */
  private async storeShadowResult(result: ShadowTestResult): Promise<void> {
    try {
      await this.supabase.from('distillation_trials').insert({
        task_type: result.taskType,
        opus_score: result.opusScore,
        sonnet_score: result.sonnetScore,
        sonnet_with_exemplars_score: result.sonnetScore, // Shadow tests always use exemplars
        exemplar_ids: result.exemplarIds,
        exemplar_count: result.exemplarIds.length,
        score_gap: result.scoreGap,
        deal_context: { dealId: result.dealId },
        trial_status: 'shadow_test',
      });
    } catch {
      // Non-critical
    }
  }

  private async logAudit(action: string, details: Record<string, unknown>): Promise<void> {
    try {
      await this.supabase.from('learning_audit_log').insert({
        action,
        component: 'shadow_runner',
        details,
      });
    } catch {
      // Non-critical
    }
  }
}
