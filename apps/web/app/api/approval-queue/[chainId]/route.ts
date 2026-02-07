import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: { chainId: string } }
) {
  try {
    const { chainId } = await params;

    const { data: chain, error } = await supabase()
      .from('action_chains')
      .select('*')
      .eq('id', chainId)
      .single();

    if (error || !chain) {
      return NextResponse.json({ error: 'Chain not found' }, { status: 404 });
    }

    const { data: actions } = await supabase()
      .from('proposed_actions')
      .select('*')
      .eq('chain_id', chainId)
      .order('sequence_order', { ascending: true });

    // Get the trigger event
    const { data: event } = await supabase()
      .from('propagation_events')
      .select('*')
      .eq('id', chain.trigger_event_id)
      .single();

    // Get the deal name
    const { data: deal } = await supabase()
      .from('deals')
      .select('id, name, code_name')
      .eq('id', chain.deal_id)
      .single();

    return NextResponse.json({
      chain,
      actions: actions || [],
      trigger_event: event,
      deal,
    });
  } catch (error) {
    console.error('Failed to fetch chain detail:', error);
    return NextResponse.json({ error: 'Failed to fetch chain detail' }, { status: 500 });
  }
}
