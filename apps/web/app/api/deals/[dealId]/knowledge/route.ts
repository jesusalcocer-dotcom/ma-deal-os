import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const { dealId } = await params;
    const { searchParams } = new URL(request.url);
    const knowledgeType = searchParams.get('type');

    const db = supabase();

    let query = db
      .from('deal_knowledge')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false });

    if (knowledgeType) {
      query = query.eq('knowledge_type', knowledgeType);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message, entries: [] },
        { status: 200 }
      );
    }

    return NextResponse.json({
      entries: data || [],
      count: data?.length || 0,
      deal_id: dealId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch knowledge', entries: [] },
      { status: 200 }
    );
  }
}
