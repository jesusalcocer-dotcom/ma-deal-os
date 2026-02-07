import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Count pending chains
    const { count: pendingCount } = await supabase()
      .from('action_chains')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Count by tier
    const { data: tierCounts } = await supabase()
      .from('action_chains')
      .select('approval_tier, status')
      .eq('status', 'pending');

    const byTier = { 1: 0, 2: 0, 3: 0 };
    for (const chain of tierCounts || []) {
      const tier = chain.approval_tier as 1 | 2 | 3;
      byTier[tier] = (byTier[tier] || 0) + 1;
    }

    // Get recently approved chains for avg resolution time
    const { data: recentApproved } = await supabase()
      .from('action_chains')
      .select('created_at, approved_at')
      .eq('status', 'approved')
      .not('approved_at', 'is', null)
      .order('approved_at', { ascending: false })
      .limit(50);

    let avgResolutionMs = 0;
    if (recentApproved && recentApproved.length > 0) {
      const totalMs = recentApproved.reduce((sum: number, chain: any) => {
        const created = new Date(chain.created_at).getTime();
        const approved = new Date(chain.approved_at!).getTime();
        return sum + (approved - created);
      }, 0);
      avgResolutionMs = totalMs / recentApproved.length;
    }

    return NextResponse.json({
      pending_count: pendingCount || 0,
      by_tier: byTier,
      avg_resolution_ms: Math.round(avgResolutionMs),
      recently_approved: recentApproved?.length || 0,
    });
  } catch (error) {
    console.error('Failed to fetch queue stats:', error);
    return NextResponse.json({ error: 'Failed to fetch queue stats' }, { status: 500 });
  }
}
