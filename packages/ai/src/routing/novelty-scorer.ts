/**
 * Novelty Scorer — determines if a deal context is novel enough to warrant Opus
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { DealContext, NoveltyFactors } from './types';

/**
 * Calculate novelty score for a deal context.
 * Score 0.0-1.0 where higher = more novel.
 * Factors: deal type commonality, industry familiarity, jurisdiction, deal value range.
 */
export async function calculateNoveltyScore(
  supabase: SupabaseClient,
  context: DealContext
): Promise<{ score: number; factors: NoveltyFactors }> {
  const factors: NoveltyFactors = {
    dealTypeNovel: false,
    industryNovel: false,
    jurisdictionNovel: false,
    valueOutlier: false,
  };

  let noveltyPoints = 0;
  const maxPoints = 4;

  // Factor 1: Is deal_type in the top 5 most common?
  if (context.dealType) {
    const { data: deals } = await supabase
      .from('deals')
      .select('parameters')
      .limit(100);

    if (deals && deals.length > 0) {
      const typeCounts: Record<string, number> = {};
      for (const deal of deals) {
        const dt = (deal.parameters as Record<string, unknown>)?.deal_type as string;
        if (dt) typeCounts[dt] = (typeCounts[dt] || 0) + 1;
      }
      const topTypes = Object.entries(typeCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([type]) => type);

      if (!topTypes.includes(context.dealType)) {
        factors.dealTypeNovel = true;
        noveltyPoints++;
      }
    } else {
      // No historical deals — everything is novel
      factors.dealTypeNovel = true;
      noveltyPoints++;
    }
  }

  // Factor 2: Is industry seen in last 20 deals?
  if (context.industry) {
    const { data: recentDeals } = await supabase
      .from('deals')
      .select('parameters')
      .order('created_at', { ascending: false })
      .limit(20);

    if (recentDeals && recentDeals.length > 0) {
      const recentIndustries = recentDeals
        .map((d) => (d.parameters as Record<string, unknown>)?.industry as string)
        .filter(Boolean);

      if (!recentIndustries.includes(context.industry)) {
        factors.industryNovel = true;
        noveltyPoints++;
      }
    } else {
      factors.industryNovel = true;
      noveltyPoints++;
    }
  }

  // Factor 3: Is jurisdiction in firm's primary 3?
  if (context.jurisdiction) {
    const { data: allDeals } = await supabase
      .from('deals')
      .select('parameters')
      .limit(100);

    if (allDeals && allDeals.length > 0) {
      const jurisdictionCounts: Record<string, number> = {};
      for (const deal of allDeals) {
        const j = (deal.parameters as Record<string, unknown>)?.jurisdiction as string;
        if (j) jurisdictionCounts[j] = (jurisdictionCounts[j] || 0) + 1;
      }
      const topJurisdictions = Object.entries(jurisdictionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([j]) => j);

      if (!topJurisdictions.includes(context.jurisdiction)) {
        factors.jurisdictionNovel = true;
        noveltyPoints++;
      }
    } else {
      factors.jurisdictionNovel = true;
      noveltyPoints++;
    }
  }

  // Factor 4: Is deal value in top/bottom 10%?
  if (context.dealValue) {
    const { data: allDeals } = await supabase
      .from('deals')
      .select('deal_value')
      .not('deal_value', 'is', null)
      .limit(100);

    if (allDeals && allDeals.length >= 10) {
      const values = allDeals
        .map((d) => parseFloat(d.deal_value as string))
        .filter((v) => !isNaN(v))
        .sort((a, b) => a - b);

      if (values.length >= 10) {
        const p10 = values[Math.floor(values.length * 0.1)];
        const p90 = values[Math.floor(values.length * 0.9)];

        if (context.dealValue < p10 || context.dealValue > p90) {
          factors.valueOutlier = true;
          noveltyPoints++;
        }
      }
    } else {
      // Not enough data to judge
      factors.valueOutlier = false;
    }
  }

  return {
    score: noveltyPoints / maxPoints,
    factors,
  };
}
