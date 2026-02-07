/**
 * Variant Generator — generates 3 strategy variants, evaluates them, selects the best.
 * Signal Source 3: Competitive Self-Play
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getAnthropicClient } from '../client';
import { ModelRouter } from '../routing/model-router';
import { SelfEvaluator } from './self-evaluator';
import { VARIANT_STRATEGIES, type VariantStrategy } from './variant-strategies';
import type { DealContext } from '../routing/types';
import type { SelfEvaluation } from './types';

export interface VariantOutput {
  strategy: string;
  output: string;
  score: number;
  evaluation?: SelfEvaluation;
}

export interface VariantComparisonResult {
  selected: VariantOutput;
  all: VariantOutput[];
  selectionReasoning: string;
}

export class VariantGenerator {
  private supabase: SupabaseClient;
  private modelRouter: ModelRouter;
  private selfEvaluator: SelfEvaluator;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.modelRouter = new ModelRouter(supabase);
    this.selfEvaluator = new SelfEvaluator(supabase);
  }

  /**
   * Generate 3 variants for a task, evaluate them, and select the best.
   */
  async generateAndCompare(params: {
    taskType: string;
    dealContext: DealContext;
    basePrompt: string;
    sourceDocuments: string[];
  }): Promise<VariantComparisonResult> {
    const strategies = VARIANT_STRATEGIES[params.taskType];
    if (!strategies) {
      throw new Error(`No variant strategies defined for task type: ${params.taskType}`);
    }

    // Get model from router
    let modelId = 'claude-sonnet-4-5-20250929';
    try {
      const selection = await this.modelRouter.getModel(params.taskType, params.dealContext);
      modelId = selection.modelId;
    } catch {
      // Fallback
    }

    // Generate all 3 variants in parallel
    const variants = await Promise.all(
      strategies.map(strategy =>
        this.generateVariant(params.basePrompt, strategy, modelId)
      )
    );

    // Evaluate all 3 with the self-evaluator
    const evaluations = await Promise.all(
      variants.map(v =>
        this.selfEvaluator.evaluate({
          agentType: params.taskType,
          output: v.output,
          sourceDocuments: params.sourceDocuments,
          dealContext: { dealId: params.dealContext.dealId },
        })
      )
    );

    // Score and select best
    const scored: VariantOutput[] = variants.map((v, i) => ({
      strategy: v.strategy,
      output: v.output,
      score: evaluations[i].overallScore,
      evaluation: evaluations[i],
    }));

    const best = scored.reduce((a, b) => (a.score > b.score ? a : b));
    const reasoning = `Selected '${best.strategy}' (score: ${best.score.toFixed(3)}) over ${scored.filter(s => s !== best).map(s => `'${s.strategy}' (${s.score.toFixed(3)})`).join(', ')}`;

    // Store comparison
    await this.storeComparison(
      params.dealContext.dealId || null,
      params.taskType,
      scored,
      best.strategy,
      reasoning,
      params.dealContext
    );

    return { selected: best, all: scored, selectionReasoning: reasoning };
  }

  /**
   * Generate a single variant with a given strategy.
   */
  private async generateVariant(
    basePrompt: string,
    strategy: VariantStrategy,
    modelId: string
  ): Promise<{ strategy: string; output: string }> {
    const anthropic = getAnthropicClient();

    const response = await anthropic.messages.create({
      model: modelId,
      max_tokens: 4096,
      system: `You are generating a variant output using the "${strategy.name}" strategy.\n\nStrategy instruction: ${strategy.instruction}\n\nApply this strategy to the task below.`,
      messages: [{ role: 'user', content: basePrompt }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    return {
      strategy: strategy.name,
      output: textBlock?.text ?? '',
    };
  }

  /**
   * Store variant comparison in the database.
   */
  private async storeComparison(
    dealId: string | null,
    taskType: string,
    variants: VariantOutput[],
    selectedVariant: string,
    reasoning: string,
    context: DealContext
  ): Promise<void> {
    try {
      await this.supabase.from('variant_comparisons').insert({
        deal_id: dealId || null,
        task_type: taskType,
        variants: variants.map(v => ({
          strategy: v.strategy,
          score: v.score,
          output_preview: v.output.substring(0, 500),
        })),
        selected_variant: selectedVariant,
        selection_reasoning: reasoning,
        context: {
          dealType: context.dealType,
          industry: context.industry,
          jurisdiction: context.jurisdiction,
        },
      });
    } catch {
      console.warn('Failed to store variant comparison — table may not exist');
    }
  }
}
