import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { chainId: string; actionId: string } }
) {
  try {
    const { chainId, actionId } = await params;
    const body = await req.json();

    const { data: action, error } = await supabase()
      .from('proposed_actions')
      .select('*')
      .eq('id', actionId)
      .eq('chain_id', chainId)
      .single();

    if (error || !action) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    if (action.status !== 'pending') {
      return NextResponse.json({ error: `Action is already ${action.status}` }, { status: 400 });
    }

    // Update payload with modifications, then mark as executed
    const modifiedPayload = { ...action.payload, ...body.payload };
    await supabase()
      .from('proposed_actions')
      .update({
        payload: modifiedPayload,
        status: 'executed',
        executed_at: new Date().toISOString(),
        execution_result: { modified_by: 'user', original_payload: action.payload },
      })
      .eq('id', actionId);

    // Check if all actions resolved
    const { data: remaining } = await supabase()
      .from('proposed_actions')
      .select('id')
      .eq('chain_id', chainId)
      .eq('status', 'pending');

    if (!remaining || remaining.length === 0) {
      await supabase()
        .from('action_chains')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', chainId);
    }

    return NextResponse.json({ message: 'Action modified and executed', payload: modifiedPayload });
  } catch (error) {
    console.error('Failed to modify action:', error);
    return NextResponse.json({ error: 'Failed to modify action' }, { status: 500 });
  }
}
