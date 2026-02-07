/**
 * Pattern Application Tracker — tracks when patterns are injected into agent prompts
 * and whether the output quality improved as a result.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { PatternImpact } from './types';

export class PatternTracker {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Record that a pattern was applied to an agent invocation.
   * Updates the pattern's last_applied_at and supporting_count.
   */
  async recordApplication(params: {
    patternId: string;
    agentType: string;
    dealId?: string;
    evaluationScore?: number;
  }): Promise<void> {
    try {
      // Update pattern metadata
      const { data: pattern } = await this.supabase
        .from('learned_patterns')
        .select('supporting_count')
        .eq('id', params.patternId)
        .single();

      if (pattern) {
        await this.supabase.from('learned_patterns').update({
          last_applied_at: new Date().toISOString(),
          supporting_count: (Number(pattern.supporting_count) || 0) + 1,
          updated_at: new Date().toISOString(),
        }).eq('id', params.patternId);
      }

      // Store application record for impact analysis
      await this.supabase.from('learning_audit_log').insert({
        action: 'pattern_applied',
        component: 'pattern_tracker',
        details: {
          patternId: params.patternId,
          agentType: params.agentType,
          dealId: params.dealId || null,
          evaluationScore: params.evaluationScore || null,
        },
      });
    } catch {
      // Non-critical — don't fail the agent invocation
    }
  }

  /**
   * Calculate the impact of a pattern by comparing scores before and after it was created.
   */
  async getPatternImpact(patternId: string): Promise<PatternImpact | null> {
    try {
      // Get pattern creation date
      const { data: pattern } = await this.supabase
        .from('learned_patterns')
        .select('created_at, agent_type')
        .eq('id', patternId)
        .single();

      if (!pattern) return null;

      const createdAt = pattern.created_at as string;
      const agentType = pattern.agent_type as string;

      // Get evaluations before pattern was created (last 30 days before)
      const beforeDate = new Date(createdAt);
      beforeDate.setDate(beforeDate.getDate() - 30);

      const { data: beforeEvals } = await this.supabase
        .from('self_evaluations')
        .select('overall_score')
        .eq('agent_type', agentType)
        .gte('created_at', beforeDate.toISOString())
        .lt('created_at', createdAt)
        .limit(50);

      // Get evaluations after pattern was created
      const { data: afterEvals } = await this.supabase
        .from('self_evaluations')
        .select('overall_score')
        .eq('agent_type', agentType)
        .gte('created_at', createdAt)
        .limit(50);

      // Get application count from audit log
      const { count: applicationCount } = await this.supabase
        .from('learning_audit_log')
        .select('*', { count: 'exact', head: true })
        .eq('action', 'pattern_applied')
        .contains('details', { patternId });

      const avgBefore = beforeEvals && beforeEvals.length > 0
        ? beforeEvals.reduce((sum: number, e: Record<string, unknown>) => sum + (Number(e.overall_score) || 0), 0) / beforeEvals.length
        : 0;

      const avgAfter = afterEvals && afterEvals.length > 0
        ? afterEvals.reduce((sum: number, e: Record<string, unknown>) => sum + (Number(e.overall_score) || 0), 0) / afterEvals.length
        : 0;

      return {
        patternId,
        applicationCount: applicationCount || 0,
        avgScoreBefore: avgBefore,
        avgScoreAfter: avgAfter,
        improvement: avgAfter - avgBefore,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get impact metrics for all active patterns.
   */
  async getAllPatternImpacts(): Promise<PatternImpact[]> {
    try {
      const { data: patterns } = await this.supabase
        .from('learned_patterns')
        .select('id')
        .neq('lifecycle_stage', 'retired')
        .order('confidence', { ascending: false })
        .limit(20);

      if (!patterns) return [];

      const impacts: PatternImpact[] = [];
      for (const p of patterns) {
        const impact = await this.getPatternImpact(p.id as string);
        if (impact) impacts.push(impact);
      }

      return impacts;
    } catch {
      return [];
    }
  }
}
