/**
 * Quality-Weighted Precedent Retrieval
 * Enhanced search that weights results by quality score and similarity.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface PrecedentSearchParams {
  provision_type?: string;
  variant_id?: string;
  query_text?: string;
  min_quality?: number;
  max_results?: number;
  deal_size_range?: string;
  industry?: string;
}

export interface PrecedentResult {
  id: string;
  text: string;
  provision_type_id: string;
  variant_id: string | null;
  source_firm: string | null;
  deal_size_range: string | null;
  industry: string | null;
  year: number | null;
  composite_quality_score: number | null;
  final_score: number;
}

/**
 * Search for precedent formulations with quality-weighted ranking.
 * Falls back to text search if embeddings aren't available.
 */
export async function searchPrecedent(
  supabase: SupabaseClient,
  params: PrecedentSearchParams
): Promise<PrecedentResult[]> {
  const {
    provision_type,
    variant_id,
    min_quality = 0.30,
    max_results = 10,
    deal_size_range,
    industry,
  } = params;

  // Build query
  let query = supabase
    .from('provision_formulations')
    .select(`
      id, text, provision_type_id, variant_id, source_firm,
      deal_size_range, industry, year, composite_quality_score,
      favorability_score
    `);

  // Filter by provision type if provided (need type code → id lookup)
  if (provision_type) {
    const { data: typeData } = await supabase
      .from('provision_types')
      .select('id')
      .eq('code', provision_type)
      .single();

    if (typeData) {
      query = query.eq('provision_type_id', typeData.id);
    }
  }

  if (variant_id) {
    query = query.eq('variant_id', variant_id);
  }

  if (deal_size_range) {
    query = query.eq('deal_size_range', deal_size_range);
  }

  if (industry) {
    query = query.eq('industry', industry);
  }

  // Fetch results
  const { data, error } = await query
    .order('composite_quality_score', { ascending: false, nullsFirst: false })
    .limit(max_results * 3); // Over-fetch to allow post-filtering

  if (error) {
    if (error.message?.includes('composite_quality_score') || error.message?.includes('column')) {
      // Quality columns not yet created - fall back to unweighted
      return searchFallback(supabase, params);
    }
    throw new Error(`Precedent search failed: ${error.message}`);
  }

  if (!data || data.length === 0) return [];

  // Score and rank results
  const scored: PrecedentResult[] = data
    .map((row: any) => {
      const qualityScore = row.composite_quality_score
        ? parseFloat(row.composite_quality_score)
        : 0.40;

      // If we had embeddings, similarity would be computed here
      // For now, use quality score as the primary ranking signal
      const similarity = 0.50; // Default when no embedding similarity
      const finalScore = 0.6 * similarity + 0.4 * qualityScore;

      return {
        id: row.id,
        text: row.text,
        provision_type_id: row.provision_type_id,
        variant_id: row.variant_id,
        source_firm: row.source_firm,
        deal_size_range: row.deal_size_range,
        industry: row.industry,
        year: row.year,
        composite_quality_score: qualityScore,
        final_score: Math.round(finalScore * 100) / 100,
      };
    })
    .filter((r: PrecedentResult) => (r.composite_quality_score ?? 0) >= min_quality)
    .sort((a: PrecedentResult, b: PrecedentResult) => b.final_score - a.final_score)
    .slice(0, max_results);

  return scored;
}

/**
 * Fallback search when quality columns don't exist yet.
 */
async function searchFallback(
  supabase: SupabaseClient,
  params: PrecedentSearchParams
): Promise<PrecedentResult[]> {
  const { provision_type, max_results = 10 } = params;

  let query = supabase
    .from('provision_formulations')
    .select('id, text, provision_type_id, variant_id, source_firm, deal_size_range, industry, year, favorability_score');

  if (provision_type) {
    const { data: typeData } = await supabase
      .from('provision_types')
      .select('id')
      .eq('code', provision_type)
      .single();

    if (typeData) {
      query = query.eq('provision_type_id', typeData.id);
    }
  }

  const { data } = await query.limit(max_results);

  return (data || []).map((row: any) => ({
    id: row.id,
    text: row.text,
    provision_type_id: row.provision_type_id,
    variant_id: row.variant_id,
    source_firm: row.source_firm,
    deal_size_range: row.deal_size_range,
    industry: row.industry,
    year: row.year,
    composite_quality_score: null,
    final_score: 0.50,
  }));
}
