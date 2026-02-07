import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function POST(
  _req: NextRequest,
  { params }: { params: { chainId: string } }
) {
  try {
    const { chainId } = await params;

    // Get the chain
    const { data: chain, error: chainError } = await supabase()
      .from('action_chains')
      .select('*')
      .eq('id', chainId)
      .single();

    if (chainError || !chain) {
      return NextResponse.json({ error: 'Chain not found' }, { status: 404 });
    }

    if (chain.status !== 'pending') {
      return NextResponse.json({ error: `Chain is already ${chain.status}` }, { status: 400 });
    }

    // Get all pending actions
    const { data: actions } = await supabase()
      .from('proposed_actions')
      .select('*')
      .eq('chain_id', chainId)
      .eq('status', 'pending');

    // Mark all actions as approved/executed
    for (const action of actions || []) {
      await supabase()
        .from('proposed_actions')
        .update({
          status: 'executed',
          executed_at: new Date().toISOString(),
          execution_result: { approved_by: 'user', approved_at: new Date().toISOString() },
        })
        .eq('id', action.id);
    }

    // Mark chain as approved
    await supabase()
      .from('action_chains')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('id', chainId);

    return NextResponse.json({ message: 'Chain approved', actions_executed: actions?.length || 0 });
  } catch (error) {
    console.error('Failed to approve chain:', error);
    return NextResponse.json({ error: 'Failed to approve chain' }, { status: 500 });
  }
}
