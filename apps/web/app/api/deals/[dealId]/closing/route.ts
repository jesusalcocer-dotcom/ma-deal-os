import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { dealId } = await params;

    // Get latest closing checklist for this deal
    const { data: checklist, error } = await supabase()
      .from('closing_checklists')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.message?.includes('closing_checklists') || error.code === 'PGRST116') {
        return NextResponse.json({ checklist: null, conditions: [], deliverables: [], post_closing: [] });
      }
      console.error('Failed to fetch closing checklist:', error);
      return NextResponse.json({ error: 'Failed to fetch closing checklist' }, { status: 500 });
    }

    if (!checklist) {
      return NextResponse.json({ checklist: null, conditions: [], deliverables: [], post_closing: [] });
    }

    // Load conditions and deliverables in parallel
    const [conditionsResult, deliverablesResult, postClosingResult] = await Promise.all([
      supabase()
        .from('closing_conditions')
        .select('*')
        .eq('closing_checklist_id', checklist.id)
        .order('sort_order', { ascending: true }),
      supabase()
        .from('closing_deliverables')
        .select('*')
        .eq('closing_checklist_id', checklist.id)
        .order('sort_order', { ascending: true }),
      supabase()
        .from('post_closing_obligations')
        .select('*')
        .eq('deal_id', dealId)
        .order('deadline', { ascending: true, nullsFirst: false }),
    ]);

    return NextResponse.json({
      checklist,
      conditions: conditionsResult.data || [],
      deliverables: deliverablesResult.data || [],
      post_closing: postClosingResult.data || [],
    });
  } catch (error) {
    console.error('Failed to fetch closing data:', error);
    return NextResponse.json({ error: 'Failed to fetch closing data' }, { status: 500 });
  }
}
