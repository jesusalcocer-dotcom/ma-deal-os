import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

/**
 * GET /api/learning/audit
 * Query learning audit log entries with filtering.
 * Params: action, component, limit
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const component = searchParams.get('component');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    const db = supabase();
    let query = db
      .from('learning_audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (action) query = query.eq('action', action);
    if (component) query = query.eq('component', component);

    const { data, error, count } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ entries: data || [], count });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch audit log';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
