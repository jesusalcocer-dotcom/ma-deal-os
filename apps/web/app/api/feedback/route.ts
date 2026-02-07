import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      deal_id,
      event_type,
      target_type,
      target_id,
      original_output,
      modified_output,
      modification_delta,
      annotation,
      agent_confidence,
    } = body;

    if (!deal_id || !event_type || !target_type) {
      return NextResponse.json(
        { error: 'deal_id, event_type, and target_type are required' },
        { status: 400 }
      );
    }

    const db = supabase();

    const { data, error } = await db
      .from('feedback_events')
      .insert({
        deal_id,
        event_type,
        target_type,
        target_id,
        original_output,
        modified_output,
        modification_delta,
        annotation,
        agent_confidence,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ feedback_event: data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create feedback event' },
      { status: 500 }
    );
  }
}
