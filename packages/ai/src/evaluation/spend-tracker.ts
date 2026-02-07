/**
 * Learning Spend Tracker
 * Tracks API spend specifically for learning activities separate from deal execution.
 * Checks against configured spend caps and can pause learning if limits exceeded.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'sonnet': { input: 3.0, output: 15.0 },
  'opus': { input: 15.0, output: 75.0 },
  'haiku': { input: 0.8, output: 4.0 },
  'claude-sonnet-4-5-20250929': { input: 3.0, output: 15.0 },
  'claude-opus-4-6': { input: 15.0, output: 75.0 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4.0 },
};

export type SpendBehavior = 'hard_stop' | 'warn_only' | 'degrade_model';

export interface SpendCheck {
  allowed: boolean;
  currentMonthlySpend: number;
  monthlyCap: number;
  percentUsed: number;
  behavior: SpendBehavior;
  warning?: string;
}

export class LearningSpendTracker {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Calculate cost for a given API call.
   */
  calculateCost(inputTokens: number, outputTokens: number, model: string): number {
    const rates = MODEL_PRICING[model] || MODEL_PRICING['sonnet'];
    return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
  }

  /**
   * Record learning spend for an activity.
   */
  async recordSpend(
    category: string,
    inputTokens: number,
    outputTokens: number,
    model: string,
    dealId?: string
  ): Promise<SpendCheck> {
    const cost = this.calculateCost(inputTokens, outputTokens, model);

    // Record in audit log
    try {
      await this.supabase.from('learning_audit_log').insert({
        event_type: 'learning_spend',
        actor: `system:${category}`,
        entity_type: 'spend',
        description: `${category}: ${inputTokens + outputTokens} tokens, $${cost.toFixed(4)}`,
        after_state: {
          category,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          model,
          cost_usd: cost,
        },
        deal_id: dealId || null,
      });
    } catch {
      // Don't fail if audit table doesn't exist
    }

    // Check against caps
    return this.checkSpendLimits(cost);
  }

  /**
   * Check if learning spend is within limits.
   */
  async checkSpendLimits(additionalCost: number = 0): Promise<SpendCheck> {
    const monthlyCap = Number(await this.getConfigValue('learning.spend.monthly_cap', 500)) || 500;
    const behavior = String(await this.getConfigValue('learning.spend.behavior_when_exceeded', 'warn_only')) as SpendBehavior;
    const currentSpend = await this.getMonthlySpend();

    const totalSpend = currentSpend + additionalCost;
    const percentUsed = monthlyCap > 0 ? (totalSpend / monthlyCap) * 100 : 0;

    const result: SpendCheck = {
      allowed: true,
      currentMonthlySpend: totalSpend,
      monthlyCap,
      percentUsed: Math.round(percentUsed * 10) / 10,
      behavior,
    };

    if (totalSpend > monthlyCap) {
      if (behavior === 'hard_stop') {
        result.allowed = false;
        result.warning = `Learning spend cap exceeded: $${totalSpend.toFixed(2)} / $${monthlyCap}. Learning activities paused.`;
      } else if (behavior === 'warn_only') {
        result.warning = `Learning spend cap exceeded: $${totalSpend.toFixed(2)} / $${monthlyCap}. Activities continuing (warn_only mode).`;
      } else if (behavior === 'degrade_model') {
        result.warning = `Learning spend cap exceeded: $${totalSpend.toFixed(2)} / $${monthlyCap}. Downgrading to cheaper models.`;
      }
    } else if (percentUsed > 80) {
      result.warning = `Learning spend at ${result.percentUsed}% of monthly cap.`;
    }

    return result;
  }

  /**
   * Get total learning spend for the current month.
   */
  async getMonthlySpend(): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    try {
      const { data } = await this.supabase
        .from('learning_audit_log')
        .select('after_state')
        .eq('event_type', 'learning_spend')
        .gte('created_at', startOfMonth.toISOString());

      if (!data) return 0;

      return data.reduce((total: number, row) => {
        const state = row.after_state as Record<string, unknown> | null;
        return total + (Number(state?.cost_usd) || 0);
      }, 0);
    } catch {
      return 0;
    }
  }

  /**
   * Get total learning spend for a specific deal.
   */
  async getDealSpend(dealId: string): Promise<number> {
    try {
      const { data } = await this.supabase
        .from('learning_audit_log')
        .select('after_state')
        .eq('event_type', 'learning_spend')
        .eq('deal_id', dealId);

      if (!data) return 0;

      return data.reduce((total: number, row) => {
        const state = row.after_state as Record<string, unknown> | null;
        return total + (Number(state?.cost_usd) || 0);
      }, 0);
    } catch {
      return 0;
    }
  }

  /**
   * Get a configuration value with fallback.
   */
  private async getConfigValue(key: string, fallback: unknown): Promise<unknown> {
    try {
      const { data } = await this.supabase
        .from('learning_configuration')
        .select('config_value')
        .eq('config_key', key)
        .single();

      if (!data?.config_value) return fallback;

      const value = data.config_value as Record<string, unknown>;
      // Return the first value in the config object
      const firstKey = Object.keys(value)[0];
      return firstKey ? value[firstKey] : fallback;
    } catch {
      return fallback;
    }
  }
}
