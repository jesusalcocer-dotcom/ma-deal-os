import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function POST(
  _req: NextRequest,
  { params }: { params: { chainId: string; actionId: string } }
) {
  try {
    const { chainId, actionId } = await params;

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

    await supabase()
      .from('proposed_actions')
      .update({
        status: 'executed',
        executed_at: new Date().toISOString(),
        execution_result: { approved_by: 'user' },
      })
      .eq('id', actionId);

    // Check if all actions in the chain are now resolved
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

    return NextResponse.json({ message: 'Action approved and executed' });
  } catch (error) {
    console.error('Failed to approve action:', error);
    return NextResponse.json({ error: 'Failed to approve action' }, { status: 500 });
  }
}
