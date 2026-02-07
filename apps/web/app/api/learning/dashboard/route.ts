import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

/**
 * GET /api/learning/dashboard
 * Returns aggregated dashboard data for the learning system overview.
 *
 * Response shape:
 * {
 *   activePatterns, retiredPatterns, avgScore, scoreImprovement,
 *   humanCorrections, metaInterventions, dealsProcessed,
 *   recentEvents, velocityData, spendData
 * }
 */
export async function GET() {
  try {
    const db = supabase();

    // Run all queries in parallel with individual error handling
    const [
      activePatternsResult,
      retiredPatternsResult,
      evaluationsResult,
      metaInterventionsResult,
      dealsProcessedResult,
      auditLogResult,
      velocityResult,
      spendResult,
    ] = await Promise.all([
      // 1. Count active patterns (lifecycle_stage != 'retired')
      db
        .from('learned_patterns')
        .select('id', { count: 'exact', head: true })
        .neq('lifecycle_stage', 'retired')
        .then((res: any) => ({ count: res.count ?? 0, error: res.error }))
        .catch(() => ({ count: 0, error: null })),

      // 2. Count retired patterns
      db
        .from('learned_patterns')
        .select('id', { count: 'exact', head: true })
        .eq('lifecycle_stage', 'retired')
        .then((res: any) => ({ count: res.count ?? 0, error: res.error }))
        .catch(() => ({ count: 0, error: null })),

      // 3. Recent self_evaluations (last 100) for avg score and improvement
      db
        .from('self_evaluations')
        .select('overall_score, agent_type, evaluated_at')
        .order('evaluated_at', { ascending: false })
        .limit(100)
        .then((res: any) => ({ data: res.data ?? [], error: res.error }))
        .catch(() => ({ data: [] as any[], error: null })),

      // 4. Count meta interventions
      db
        .from('meta_interventions')
        .select('id', { count: 'exact', head: true })
        .then((res: any) => ({ count: res.count ?? 0, error: res.error }))
        .catch(() => ({ count: 0, error: null })),

      // 5. Count distinct deal_id from self_evaluations
      db
        .from('self_evaluations')
        .select('deal_id')
        .then((res: any) => {
          const uniqueDeals = new Set(
            (res.data ?? []).map((r: any) => r.deal_id).filter(Boolean)
          );
          return { count: uniqueDeals.size, error: res.error };
        })
        .catch(() => ({ count: 0, error: null })),

      // 6. Recent learning_audit_log entries (limit 20) for events feed
      db
        .from('learning_audit_log')
        .select('id, event_type, actor, entity_type, description, created_at')
        .order('created_at', { ascending: false })
        .limit(20)
        .then((res: any) => ({ data: res.data ?? [], error: res.error }))
        .catch(() => ({ data: [] as any[], error: null })),

      // 7. Self evaluations for velocity data — avg score per day (last 30 days)
      db
        .from('self_evaluations')
        .select('overall_score, evaluated_at')
        .gte(
          'evaluated_at',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        )
        .order('evaluated_at', { ascending: true })
        .then((res: any) => ({ data: res.data ?? [], error: res.error }))
        .catch(() => ({ data: [] as any[], error: null })),

      // 8. Agent activations aggregated for spend breakdown
      db
        .from('agent_activations')
        .select('agent_type, total_cost_usd, input_tokens, output_tokens, created_at')
        .gte(
          'created_at',
          new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            1
          ).toISOString()
        )
        .order('created_at', { ascending: false })
        .then((res: any) => ({ data: res.data ?? [], error: res.error }))
        .catch(() => ({ data: [] as any[], error: null })),
    ]);

    // Compute average score from evaluations
    const evaluations = evaluationsResult.data;
    const avgScore =
      evaluations.length > 0
        ? evaluations.reduce((sum: number, e: any) => sum + (e.overall_score ?? 0), 0) /
          evaluations.length
        : 0;

    // Compute score improvement: compare first half vs second half of recent evaluations
    let scoreImprovement = 0;
    if (evaluations.length >= 4) {
      const midpoint = Math.floor(evaluations.length / 2);
      // evaluations are ordered newest-first
      const recentHalf = evaluations.slice(0, midpoint);
      const olderHalf = evaluations.slice(midpoint);

      const recentAvg =
        recentHalf.reduce((s: number, e: any) => s + (e.overall_score ?? 0), 0) /
        recentHalf.length;
      const olderAvg =
        olderHalf.reduce((s: number, e: any) => s + (e.overall_score ?? 0), 0) /
        olderHalf.length;
      scoreImprovement = recentAvg - olderAvg;
    }

    // Count human corrections from audit log (actor starts with 'user:')
    const humanCorrections = (auditLogResult.data as any[]).filter(
      (e: any) => typeof e.actor === 'string' && e.actor.startsWith('user:')
    ).length;

    // Build velocity data: group evaluations by date, average the scores
    const velocityMap = new Map<string, { total: number; count: number }>();
    for (const ev of velocityResult.data) {
      const date = (ev.evaluated_at ?? '').substring(0, 10); // YYYY-MM-DD
      if (!date) continue;
      const entry = velocityMap.get(date) ?? { total: 0, count: 0 };
      entry.total += ev.overall_score ?? 0;
      entry.count += 1;
      velocityMap.set(date, entry);
    }
    const velocityData = Array.from(velocityMap.entries())
      .map(([date, v]) => ({
        date,
        avgScore: Math.round((v.total / v.count) * 100) / 100,
        count: v.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Build spend data: aggregate by agent_type
    const spendMap = new Map<
      string,
      { totalCost: number; totalInputTokens: number; totalOutputTokens: number; activations: number }
    >();
    let monthlyTotalSpend = 0;
    for (const activation of spendResult.data) {
      const agentType = activation.agent_type ?? 'unknown';
      const cost = parseFloat(activation.total_cost_usd ?? '0');
      const entry = spendMap.get(agentType) ?? {
        totalCost: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        activations: 0,
      };
      entry.totalCost += cost;
      entry.totalInputTokens += activation.input_tokens ?? 0;
      entry.totalOutputTokens += activation.output_tokens ?? 0;
      entry.activations += 1;
      spendMap.set(agentType, entry);
      monthlyTotalSpend += cost;
    }
    const spendData = Array.from(spendMap.entries())
      .map(([agentType, s]) => ({
        agentType,
        totalCost: Math.round(s.totalCost * 1000000) / 1000000,
        totalInputTokens: s.totalInputTokens,
        totalOutputTokens: s.totalOutputTokens,
        activations: s.activations,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);

    return NextResponse.json({
      activePatterns: activePatternsResult.count,
      retiredPatterns: retiredPatternsResult.count,
      avgScore: Math.round(avgScore * 100) / 100,
      scoreImprovement: Math.round(scoreImprovement * 100) / 100,
      humanCorrections,
      metaInterventions: metaInterventionsResult.count,
      dealsProcessed: dealsProcessedResult.count,
      recentEvents: auditLogResult.data,
      velocityData,
      spendData,
      monthlyTotalSpend: Math.round(monthlyTotalSpend * 100) / 100,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch dashboard data';
    console.error('Learning dashboard error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
