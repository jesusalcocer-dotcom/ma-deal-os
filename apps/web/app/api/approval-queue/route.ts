import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const dealId = searchParams.get('deal_id');

    let query = supabase()
      .from('action_chains')
      .select('*, proposed_actions(*)', { count: 'exact' })
      .eq('status', 'pending')
      .order('significance', { ascending: false })
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (dealId) {
      query = query.eq('deal_id', dealId);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch approval queue:', error);
      return NextResponse.json({ error: 'Failed to fetch approval queue' }, { status: 500 });
    }

    return NextResponse.json({ chains: data, total: count, limit, offset });
  } catch (error) {
    console.error('Failed to fetch approval queue:', error);
    return NextResponse.json({ error: 'Failed to fetch approval queue' }, { status: 500 });
  }
}
