import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: { dealId: string; scheduleId: string } }
) {
  try {
    const { dealId, scheduleId } = await params;

    const { data, error } = await supabase()
      .from('disclosure_schedules')
      .select('*, disclosure_entries(*)')
      .eq('id', scheduleId)
      .eq('deal_id', dealId)
      .single();

    if (error || !data) {
      if (error?.message?.includes('disclosure_schedules')) {
        return NextResponse.json({ error: 'Table not created yet' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch disclosure schedule:', error);
    return NextResponse.json({ error: 'Failed to fetch disclosure schedule' }, { status: 500 });
  }
}
