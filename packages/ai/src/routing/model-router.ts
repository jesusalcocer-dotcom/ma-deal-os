/**
 * Model Router — determines which Claude model to use for each task type
 *
 * Checks: model_routing_config table → novelty score → dynamic promotion rules
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ModelSelection, DealContext, RoutingConfig, ModelTier } from './types';
import { MODEL_IDS } from './types';
import { calculateNoveltyScore } from './novelty-scorer';

const AUTO_PROMOTE_THRESHOLD = 5; // consecutive low scores before auto-promoting Sonnet → Opus
const NOVELTY_THRESHOLD = 0.7; // novelty score above which Opus is used regardless

export class ModelRouter {
  private supabase: SupabaseClient;
  private configCache: Map<string, { config: RoutingConfig; cachedAt: number }> = new Map();
  private cacheTtlMs = 60_000; // 1 minute cache

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Given a task type and optional deal context, returns which model to use.
   */
  async getModel(taskType: string, dealContext?: DealContext): Promise<ModelSelection> {
    // 1. Look up configured model for this task type
    const config = await this.getRoutingConfig(taskType);

    // 2. Calculate novelty score if deal context provided
    if (dealContext && (dealContext.dealType || dealContext.industry || dealContext.jurisdiction || dealContext.dealValue)) {
      const { score } = await calculateNoveltyScore(this.supabase, dealContext);
      if (score > NOVELTY_THRESHOLD) {
        return {
          model: 'opus',
          modelId: MODEL_IDS.opus,
          reason: 'high_novelty',
          noveltyScore: score,
        };
      }
    }

    // 3. Check dynamic promotion (consecutive low scores → promote to Opus)
    if (config && config.consecutive_low_scores >= AUTO_PROMOTE_THRESHOLD && config.current_model === 'sonnet') {
      return {
        model: 'opus',
        modelId: MODEL_IDS.opus,
        reason: 'auto_promoted',
      };
    }

    // 4. Return configured model
    const model: ModelTier = config?.current_model || 'opus';
    return {
      model,
      modelId: MODEL_IDS[model],
      reason: 'configured',
    };
  }

  /**
   * After each agent invocation, record the evaluation score and update routing stats.
   */
  async recordScore(taskType: string, score: number, model: string): Promise<void> {
    const config = await this.getRoutingConfig(taskType);
    if (!config) return;

    const lowThreshold = 0.70;
    const highThreshold = 0.95;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (score < lowThreshold) {
      updates.consecutive_low_scores = (config.consecutive_low_scores || 0) + 1;
      updates.consecutive_high_scores = 0;
    } else if (score >= highThreshold) {
      updates.consecutive_high_scores = (config.consecutive_high_scores || 0) + 1;
      updates.consecutive_low_scores = 0;
    } else {
      // Reset both counters on a mid-range score
      updates.consecutive_low_scores = 0;
      updates.consecutive_high_scores = 0;
    }

    await this.supabase
      .from('model_routing_config')
      .update(updates)
      .eq('task_type', taskType);

    // Invalidate cache
    this.configCache.delete(taskType);
  }

  /**
   * Get routing config for a task type, with caching.
   */
  private async getRoutingConfig(taskType: string): Promise<RoutingConfig | null> {
    // Check cache
    const cached = this.configCache.get(taskType);
    if (cached && Date.now() - cached.cachedAt < this.cacheTtlMs) {
      return cached.config;
    }

    const { data, error } = await this.supabase
      .from('model_routing_config')
      .select('task_type, current_model, distillation_status, exemplar_count, consecutive_low_scores, consecutive_high_scores')
      .eq('task_type', taskType)
      .single();

    if (error || !data) {
      return null;
    }

    const config = data as RoutingConfig;
    this.configCache.set(taskType, { config, cachedAt: Date.now() });
    return config;
  }

  /**
   * Get model ID string for a given tier.
   */
  static getModelId(tier: ModelTier): string {
    return MODEL_IDS[tier];
  }
}
