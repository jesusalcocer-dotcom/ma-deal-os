import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/server';

export async function GET() {
  try {
    const db = supabase();

    // Get total count
    const { count: totalCount } = await db
      .from('provision_formulations')
      .select('*', { count: 'exact', head: true });

    // Try to get quality distribution
    const { data: scored, error } = await db
      .from('provision_formulations')
      .select('composite_quality_score')
      .not('composite_quality_score', 'is', null);

    if (error) {
      // Quality columns may not exist yet
      return NextResponse.json({
        total_formulations: totalCount || 0,
        scored_formulations: 0,
        unscored_formulations: totalCount || 0,
        distribution: [],
        note: 'Quality scoring columns not yet created (migration 015)',
      });
    }

    const scoredCount = scored?.length || 0;

    // Build histogram
    const buckets: Record<string, number> = {
      '0.0-0.2': 0,
      '0.2-0.4': 0,
      '0.4-0.6': 0,
      '0.6-0.8': 0,
      '0.8-1.0': 0,
    };

    for (const row of scored || []) {
      const score = parseFloat(row.composite_quality_score);
      if (score < 0.2) buckets['0.0-0.2']++;
      else if (score < 0.4) buckets['0.2-0.4']++;
      else if (score < 0.6) buckets['0.4-0.6']++;
      else if (score < 0.8) buckets['0.6-0.8']++;
      else buckets['0.8-1.0']++;
    }

    const distribution = Object.entries(buckets).map(([range, count]) => ({
      range,
      count,
      percentage: scoredCount > 0 ? Math.round((count / scoredCount) * 100) : 0,
    }));

    // Calculate average
    const avgScore = scoredCount > 0
      ? scored!.reduce((sum: number, r: any) => sum + parseFloat(r.composite_quality_score), 0) / scoredCount
      : 0;

    return NextResponse.json({
      total_formulations: totalCount || 0,
      scored_formulations: scoredCount,
      unscored_formulations: (totalCount || 0) - scoredCount,
      average_quality_score: Math.round(avgScore * 100) / 100,
      distribution,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to generate quality report' },
      { status: 500 }
    );
  }
}
