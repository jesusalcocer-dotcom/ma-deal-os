import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';
import { ConsistencyChecker } from '@ma-deal-os/ai';

/**
 * POST /api/learning/consistency/run
 * Trigger consistency checks for a single deal or all active deals.
 * Body: { dealId?: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { dealId } = body as { dealId?: string };
    const db = supabase();
    const checker = new ConsistencyChecker(db);

    if (dealId) {
      // Check a single deal
      const result = await checker.checkDeal(dealId, 'on_demand');
      return NextResponse.json({
        checks_run: 1,
        contradictions_found: result.contradictions.length,
        results: [result],
      });
    }

    // Check all active deals
    const results = await checker.checkAllActiveDeals('nightly');
    const totalContradictions = results.reduce((sum, r) => sum + r.contradictions.length, 0);

    return NextResponse.json({
      checks_run: results.length,
      contradictions_found: totalContradictions,
      results,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to run consistency checks';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
