import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

/**
 * GET /api/learning/reflection/history — list past reflection runs
 * Params: trigger_type, limit
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const triggerType = searchParams.get('trigger_type');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    const db = supabase();
    let query = db
      .from('reflection_runs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (triggerType) query = query.eq('trigger_type', triggerType);

    const { data, error, count } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ runs: data || [], count });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch reflection history';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
