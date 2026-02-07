/**
 * Signal Aggregator — queries all recent signals and prepares them for reflection analysis.
 * Produces concise text summaries that fit in a Claude context window.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SignalBundle, SignalSummary, ClusterSummary } from './types';

export class SignalAggregator {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Gathers all signals since a given timestamp, grouped by type.
   * Returns a structured summary ready for the Reflection Engine.
   */
  async gatherSignals(since: Date, dealId?: string): Promise<SignalBundle> {
    const sinceStr = since.toISOString();
    const now = new Date().toISOString();

    const [evaluations, consistencyChecks, variantComparisons, outcomeSignals, exemplarComparisons] = await Promise.all([
      this.getEvaluations(sinceStr, dealId),
      this.getConsistencyChecks(sinceStr, dealId),
      this.getVariantComparisons(sinceStr, dealId),
      this.getOutcomeSignals(sinceStr, dealId),
      this.getExemplarComparisons(sinceStr, dealId),
    ]);

    return {
      totalSignals: evaluations.length + consistencyChecks.length + variantComparisons.length + outcomeSignals.length + exemplarComparisons.length,
      period: { since: sinceStr, until: now },
      evaluations: this.summarizeEvaluations(evaluations),
      consistencyChecks: this.summarizeConsistencyChecks(consistencyChecks),
      variantComparisons: this.summarizeVariantComparisons(variantComparisons),
      outcomeSignals: this.summarizeOutcomeSignals(outcomeSignals),
      exemplarComparisons: this.summarizeExemplarComparisons(exemplarComparisons),
      clusteredByAgent: this.clusterByAgentType(evaluations, outcomeSignals),
      clusteredByDealType: this.clusterByDealType(variantComparisons),
    };
  }

  private async getEvaluations(since: string, dealId?: string): Promise<Record<string, unknown>[]> {
    try {
      let query = this.supabase
        .from('self_evaluations')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(200);

      if (dealId) query = query.eq('deal_id', dealId);
      const { data } = await query;
      return (data || []) as Record<string, unknown>[];
    } catch { return []; }
  }

  private async getConsistencyChecks(since: string, dealId?: string): Promise<Record<string, unknown>[]> {
    try {
      let query = this.supabase
        .from('consistency_checks')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(100);

      if (dealId) query = query.eq('deal_id', dealId);
      const { data } = await query;
      return (data || []) as Record<string, unknown>[];
    } catch { return []; }
  }

  private async getVariantComparisons(since: string, _dealId?: string): Promise<Record<string, unknown>[]> {
    try {
      const query = this.supabase
        .from('variant_comparisons')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(100);

      const { data } = await query;
      return (data || []) as Record<string, unknown>[];
    } catch { return []; }
  }

  private async getOutcomeSignals(since: string, dealId?: string): Promise<Record<string, unknown>[]> {
    try {
      let query = this.supabase
        .from('outcome_signals')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(200);

      if (dealId) query = query.eq('deal_id', dealId);
      const { data } = await query;
      return (data || []) as Record<string, unknown>[];
    } catch { return []; }
  }

  private async getExemplarComparisons(since: string, _dealId?: string): Promise<Record<string, unknown>[]> {
    try {
      const query = this.supabase
        .from('exemplar_comparisons')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(100);

      const { data } = await query;
      return (data || []) as Record<string, unknown>[];
    } catch { return []; }
  }

  // --- Summarization ---

  private summarizeEvaluations(evals: Record<string, unknown>[]): SignalSummary {
    if (evals.length === 0) return { count: 0, text: 'No evaluations in this period.' };

    // Group by agent_type
    const byAgent: Record<string, { scores: number[]; criteriaScores: Record<string, number[]> }> = {};
    for (const ev of evals) {
      const at = String(ev.agent_type || 'unknown');
      if (!byAgent[at]) byAgent[at] = { scores: [], criteriaScores: {} };
      byAgent[at].scores.push(Number(ev.overall_score) || 0);

      const criteria = ev.criteria_scores as Array<{ criterion: string; score: number }> | null;
      if (Array.isArray(criteria)) {
        for (const c of criteria) {
          if (!byAgent[at].criteriaScores[c.criterion]) byAgent[at].criteriaScores[c.criterion] = [];
          byAgent[at].criteriaScores[c.criterion].push(c.score);
        }
      }
    }

    const lines: string[] = [];
    for (const [agent, data] of Object.entries(byAgent)) {
      const avg = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
      // Find weakest criterion
      let weakest = '';
      let weakestAvg = Infinity;
      for (const [criterion, scores] of Object.entries(data.criteriaScores)) {
        const critAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
        if (critAvg < weakestAvg) {
          weakestAvg = critAvg;
          weakest = criterion;
        }
      }
      const weakStr = weakest ? `, weakest criterion: '${weakest}' (avg ${weakestAvg.toFixed(2)})` : '';
      lines.push(`${agent}: ${data.scores.length} evaluations, avg score ${avg.toFixed(2)}${weakStr}`);
    }

    return { count: evals.length, text: lines.join('. ') };
  }

  private summarizeConsistencyChecks(checks: Record<string, unknown>[]): SignalSummary {
    if (checks.length === 0) return { count: 0, text: 'No consistency checks in this period.' };

    const severityCounts: Record<string, number> = {};
    let totalContradictions = 0;
    for (const check of checks) {
      const contradictions = check.contradictions as Array<{ severity: string }> | null;
      if (Array.isArray(contradictions)) {
        totalContradictions += contradictions.length;
        for (const c of contradictions) {
          const sev = c.severity || 'unknown';
          severityCounts[sev] = (severityCounts[sev] || 0) + 1;
        }
      }
    }

    const sevText = Object.entries(severityCounts).map(([k, v]) => `${k}: ${v}`).join(', ');
    return {
      count: checks.length,
      text: `${checks.length} consistency checks, ${totalContradictions} contradictions found (${sevText || 'none'})`,
    };
  }

  private summarizeVariantComparisons(comparisons: Record<string, unknown>[]): SignalSummary {
    if (comparisons.length === 0) return { count: 0, text: 'No variant comparisons in this period.' };

    const byTask: Record<string, { winners: Record<string, number> }> = {};
    for (const comp of comparisons) {
      const tt = String(comp.task_type || 'unknown');
      const selected = String(comp.selected_variant || 'unknown');
      if (!byTask[tt]) byTask[tt] = { winners: {} };
      byTask[tt].winners[selected] = (byTask[tt].winners[selected] || 0) + 1;
    }

    const lines: string[] = [];
    for (const [task, data] of Object.entries(byTask)) {
      const winnerList = Object.entries(data.winners).map(([k, v]) => `${k}:${v}`).join(', ');
      lines.push(`${task}: ${winnerList} wins`);
    }

    return { count: comparisons.length, text: `${comparisons.length} variant comparisons. Winner distribution: ${lines.join('; ')}` };
  }

  private summarizeOutcomeSignals(signals: Record<string, unknown>[]): SignalSummary {
    if (signals.length === 0) return { count: 0, text: 'No outcome signals in this period.' };

    const byType: Record<string, number> = {};
    for (const s of signals) {
      const st = String(s.signal_type || 'unknown');
      byType[st] = (byType[st] || 0) + 1;
    }

    const typeText = Object.entries(byType).map(([k, v]) => `${k}: ${v}`).join(', ');
    return { count: signals.length, text: `${signals.length} outcome signals (${typeText})` };
  }

  private summarizeExemplarComparisons(comparisons: Record<string, unknown>[]): SignalSummary {
    if (comparisons.length === 0) return { count: 0, text: 'No exemplar comparisons in this period.' };

    const scores = comparisons.map(c => Number(c.similarity_score) || 0);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Collect common gaps
    const gapCounts: Record<string, number> = {};
    for (const c of comparisons) {
      const gaps = c.gaps_identified as string[] | null;
      if (Array.isArray(gaps)) {
        for (const gap of gaps.slice(0, 3)) {
          const key = gap.substring(0, 80);
          gapCounts[key] = (gapCounts[key] || 0) + 1;
        }
      }
    }
    const topGaps = Object.entries(gapCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const gapText = topGaps.length > 0
      ? `. Top gaps: ${topGaps.map(([k, v]) => `"${k}" (${v}x)`).join(', ')}`
      : '';

    return { count: comparisons.length, text: `${comparisons.length} exemplar comparisons, avg similarity ${avg.toFixed(2)}${gapText}` };
  }

  // --- Clustering ---

  private clusterByAgentType(
    evaluations: Record<string, unknown>[],
    outcomes: Record<string, unknown>[]
  ): Record<string, ClusterSummary> {
    const clusters: Record<string, ClusterSummary> = {};

    for (const ev of evaluations) {
      const at = String(ev.agent_type || 'unknown');
      if (!clusters[at]) clusters[at] = { signalCount: 0, avgScore: 0, topIssues: [] };
      clusters[at].signalCount++;
      clusters[at].avgScore = ((clusters[at].avgScore || 0) * (clusters[at].signalCount - 1) + (Number(ev.overall_score) || 0)) / clusters[at].signalCount;
    }

    for (const os of outcomes) {
      const at = String(os.agent_type || 'unknown');
      if (!clusters[at]) clusters[at] = { signalCount: 0, topIssues: [] };
      clusters[at].signalCount++;
    }

    return clusters;
  }

  private clusterByDealType(comparisons: Record<string, unknown>[]): Record<string, ClusterSummary> {
    const clusters: Record<string, ClusterSummary> = {};

    for (const comp of comparisons) {
      const ctx = comp.context as Record<string, unknown> | null;
      const dt = String(ctx?.dealType || 'unknown');
      if (!clusters[dt]) clusters[dt] = { signalCount: 0, topIssues: [] };
      clusters[dt].signalCount++;
    }

    return clusters;
  }
}
