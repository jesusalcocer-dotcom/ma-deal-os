import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { dealId: string; scheduleId: string } }
) {
  try {
    const { scheduleId } = await params;
    const body = await req.json();

    if (!body.entry_text) {
      return NextResponse.json({ error: 'entry_text is required' }, { status: 400 });
    }

    const { data, error } = await supabase()
      .from('disclosure_entries')
      .insert({
        schedule_id: scheduleId,
        entry_text: body.entry_text,
        entry_type: body.entry_type || 'manual',
        source_dd_finding_id: body.source_dd_finding_id || null,
        source_email_id: body.source_email_id || null,
        source_client_response: body.source_client_response || null,
        status: body.status || 'draft',
      })
      .select()
      .single();

    if (error) {
      if (error.message?.includes('disclosure_entries')) {
        return NextResponse.json({ error: 'Table not created yet. Run migration 007.' }, { status: 503 });
      }
      console.error('Failed to create disclosure entry:', error);
      return NextResponse.json({ error: 'Failed to create disclosure entry' }, { status: 500 });
    }

    // Update entry count on schedule
    const { count } = await supabase()
      .from('disclosure_entries')
      .select('id', { count: 'exact', head: true })
      .eq('schedule_id', scheduleId);

    if (count !== null) {
      await supabase()
        .from('disclosure_schedules')
        .update({ entry_count: count })
        .eq('id', scheduleId);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Failed to create disclosure entry:', error);
    return NextResponse.json({ error: 'Failed to create disclosure entry' }, { status: 500 });
  }
}
