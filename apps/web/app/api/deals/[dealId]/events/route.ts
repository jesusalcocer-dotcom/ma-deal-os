import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { dealId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type');
    const processed = searchParams.get('processed');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (isNaN(limit) || isNaN(offset) || limit < 1 || offset < 0) {
      return NextResponse.json({ error: 'Invalid limit or offset' }, { status: 400 });
    }

    let query = supabase()
      .from('propagation_events')
      .select('*', { count: 'exact' })
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq('event_type', type);
    }

    if (processed !== null) {
      query = query.eq('processed', processed === 'true');
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch events:', error);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    return NextResponse.json({ events: data, total: count, limit, offset });
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
