import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

/**
 * GET /api/deals/[dealId]/learning/signals
 * All learning signals for a specific deal — aggregated view.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const { dealId } = await params;
    const db = supabase();

    // Fetch all signal types in parallel
    const [evaluationsResult, consistencyResult, outcomesResult] = await Promise.all([
      db
        .from('self_evaluations')
        .select('id, agent_type, overall_score, evaluated_at', { count: 'exact' })
        .eq('deal_id', dealId)
        .order('evaluated_at', { ascending: false })
        .limit(20),
      db
        .from('consistency_checks')
        .select('id, severity, description, resolved_at, detected_at', { count: 'exact' })
        .eq('deal_id', dealId)
        .order('detected_at', { ascending: false })
        .limit(20),
      db
        .from('outcome_signals')
        .select('id, signal_type, agent_type, metric_name, metric_value, measured_at', { count: 'exact' })
        .eq('deal_id', dealId)
        .order('measured_at', { ascending: false })
        .limit(20),
    ]);

    // Calculate aggregations
    const evaluations = evaluationsResult.data || [];
    const avgScore = evaluations.length > 0
      ? evaluations.reduce((sum: number, e: Record<string, unknown>) => sum + (Number(e.overall_score) || 0), 0) / evaluations.length
      : null;

    const consistency = consistencyResult.data || [];
    const unresolvedCount = consistency.filter((c: Record<string, unknown>) => !c.resolved_at).length;

    return NextResponse.json({
      deal_id: dealId,
      self_evaluations: {
        count: evaluationsResult.count || 0,
        recent: evaluations,
        avg_score: avgScore ? Math.round(avgScore * 1000) / 1000 : null,
      },
      consistency_checks: {
        count: consistencyResult.count || 0,
        unresolved: unresolvedCount,
        recent: consistency,
      },
      outcome_signals: {
        count: outcomesResult.count || 0,
        recent: outcomesResult.data || [],
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch deal signals';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
