import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { dealId } = await params;

    const { data, error } = await supabase()
      .from('post_closing_obligations')
      .select('*')
      .eq('deal_id', dealId)
      .order('deadline', { ascending: true, nullsFirst: false });

    if (error) {
      if (error.message?.includes('post_closing_obligations')) {
        return NextResponse.json([]);
      }
      console.error('Failed to fetch post-closing obligations:', error);
      return NextResponse.json({ error: 'Failed to fetch post-closing obligations' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Failed to fetch post-closing obligations:', error);
    return NextResponse.json({ error: 'Failed to fetch post-closing obligations' }, { status: 500 });
  }
}
