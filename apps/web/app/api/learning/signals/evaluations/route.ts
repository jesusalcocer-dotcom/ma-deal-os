import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

/**
 * GET /api/learning/signals/evaluations
 * Query self-evaluation records with filtering.
 * Params: agent_type, min_score, max_score, limit
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agentType = searchParams.get('agent_type');
    const minScore = searchParams.get('min_score');
    const maxScore = searchParams.get('max_score');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const db = supabase();
    let query = db
      .from('self_evaluations')
      .select('*', { count: 'exact' })
      .order('evaluated_at', { ascending: false })
      .limit(limit);

    if (agentType) query = query.eq('agent_type', agentType);
    if (minScore) query = query.gte('overall_score', parseFloat(minScore));
    if (maxScore) query = query.lte('overall_score', parseFloat(maxScore));

    const { data, error, count } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ evaluations: data || [], count });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch evaluations';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
