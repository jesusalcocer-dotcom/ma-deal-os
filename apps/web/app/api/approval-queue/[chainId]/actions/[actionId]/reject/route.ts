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
      .update({ status: 'rejected' })
      .eq('id', actionId);

    // Check if all actions are now resolved
    const { data: remaining } = await supabase()
      .from('proposed_actions')
      .select('id')
      .eq('chain_id', chainId)
      .eq('status', 'pending');

    if (!remaining || remaining.length === 0) {
      // Check if any were approved/executed
      const { data: executed } = await supabase()
        .from('proposed_actions')
        .select('id')
        .eq('chain_id', chainId)
        .eq('status', 'executed');

      const newStatus = (executed && executed.length > 0) ? 'partially_approved' : 'rejected';
      await supabase()
        .from('action_chains')
        .update({ status: newStatus, approved_at: new Date().toISOString() })
        .eq('id', chainId);
    }

    return NextResponse.json({ message: 'Action rejected' });
  } catch (error) {
    console.error('Failed to reject action:', error);
    return NextResponse.json({ error: 'Failed to reject action' }, { status: 500 });
  }
}
