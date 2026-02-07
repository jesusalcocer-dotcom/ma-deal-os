import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { dealId } = await params;

    const { data, error } = await supabase()
      .from('disclosure_schedules')
      .select('*, disclosure_entries(id)')
      .eq('deal_id', dealId)
      .order('schedule_number', { ascending: true });

    if (error) {
      if (error.message?.includes('disclosure_schedules')) {
        return NextResponse.json([]);
      }
      console.error('Failed to fetch disclosure schedules:', error);
      return NextResponse.json({ error: 'Failed to fetch disclosure schedules' }, { status: 500 });
    }

    // Add entry count
    const schedules = (data || []).map((s: any) => ({
      ...s,
      entry_count: s.disclosure_entries?.length || 0,
      disclosure_entries: undefined,
    }));

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Failed to fetch disclosure schedules:', error);
    return NextResponse.json({ error: 'Failed to fetch disclosure schedules' }, { status: 500 });
  }
}
