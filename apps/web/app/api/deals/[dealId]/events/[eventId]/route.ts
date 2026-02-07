import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: { dealId: string; eventId: string } }
) {
  try {
    const { dealId, eventId } = await params;

    // Fetch the event
    const { data: event, error: eventError } = await supabase()
      .from('propagation_events')
      .select('*')
      .eq('id', eventId)
      .eq('deal_id', dealId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Fetch action chains for this event
    const { data: chains, error: chainsError } = await supabase()
      .from('action_chains')
      .select('*')
      .eq('trigger_event_id', eventId);

    if (chainsError) {
      console.error('Failed to fetch action chains:', chainsError);
    }

    // Fetch proposed actions for each chain
    const chainsWithActions = [];
    for (const chain of chains || []) {
      const { data: actions } = await supabase()
        .from('proposed_actions')
        .select('*')
        .eq('chain_id', chain.id)
        .order('sequence_order', { ascending: true });

      chainsWithActions.push({ ...chain, actions: actions || [] });
    }

    return NextResponse.json({
      event,
      action_chains: chainsWithActions,
    });
  } catch (error) {
    console.error('Failed to fetch event:', error);
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 });
  }
}
