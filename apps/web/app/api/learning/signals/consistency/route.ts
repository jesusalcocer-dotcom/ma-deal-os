import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

/**
 * GET /api/learning/signals/consistency
 * Query consistency check records with filtering.
 * Params: severity, resolved, limit
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const resolved = searchParams.get('resolved');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const db = supabase();
    let query = db
      .from('consistency_checks')
      .select('*', { count: 'exact' })
      .order('detected_at', { ascending: false })
      .limit(limit);

    if (severity) query = query.eq('severity', severity);
    if (resolved === 'true') query = query.not('resolved_at', 'is', null);
    if (resolved === 'false') query = query.is('resolved_at', null);

    const { data, error, count } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ consistency_checks: data || [], count });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch consistency checks';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
