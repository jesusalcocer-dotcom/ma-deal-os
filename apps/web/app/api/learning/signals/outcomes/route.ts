import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

/**
 * GET /api/learning/signals/outcomes
 * Query outcome signal records with filtering.
 * Params: signal_type, agent_type, limit
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const signalType = searchParams.get('signal_type');
    const agentType = searchParams.get('agent_type');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const db = supabase();
    let query = db
      .from('outcome_signals')
      .select('*', { count: 'exact' })
      .order('measured_at', { ascending: false })
      .limit(limit);

    if (signalType) query = query.eq('signal_type', signalType);
    if (agentType) query = query.eq('agent_type', agentType);

    const { data, error, count } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ outcome_signals: data || [], count });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch outcome signals';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
