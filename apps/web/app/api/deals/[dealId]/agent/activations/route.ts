import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { dealId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const agentType = searchParams.get('agent_type');

    let query = supabase()
      .from('agent_activations')
      .select('*', { count: 'exact' })
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (agentType) {
      query = query.eq('agent_type', agentType);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Failed to fetch activations:', error);
      return NextResponse.json({ error: 'Failed to fetch activations' }, { status: 500 });
    }

    return NextResponse.json({ activations: data, total: count, limit, offset });
  } catch (error) {
    console.error('Failed to fetch activations:', error);
    return NextResponse.json({ error: 'Failed to fetch activations' }, { status: 500 });
  }
}
