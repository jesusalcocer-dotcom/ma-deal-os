import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { dealId } = await params;

    const { data, error } = await supabase()
      .from('negotiation_roadmaps')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.message?.includes('negotiation_roadmaps') || error.code === 'PGRST116') {
        return NextResponse.json({ deal_id: dealId, strategy_summary: null, note: 'No roadmap generated yet' });
      }
      console.error('Failed to fetch roadmap:', error);
      return NextResponse.json({ error: 'Failed to fetch roadmap' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch roadmap:', error);
    return NextResponse.json({ error: 'Failed to fetch roadmap' }, { status: 500 });
  }
}
