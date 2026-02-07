import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: { dealId: string } }) {
  try {
    const { dealId } = await params;
    const { data: items, error } = await supabase()
      .from('checklist_items')
      .select('*')
      .eq('deal_id', dealId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return NextResponse.json(items || []);
  } catch (error) {
    console.error('Failed to get checklist:', error);
    return NextResponse.json({ error: 'Failed to get checklist' }, { status: 500 });
  }
}
