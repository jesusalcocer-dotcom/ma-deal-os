/**
 * EDGAR Ingestion Pipeline
 * Full pipeline: search → download → segment → classify → score → store.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { searchEdgar, downloadExhibit } from './edgar-discovery';
import { scoreFormulation } from './quality-scorer';
import type { EdgarFiling } from './edgar-discovery';

export interface IngestionResult {
  filings_found: number;
  exhibits_processed: number;
  formulations_stored: number;
  errors: string[];
}

export interface IngestionConfig {
  keywords: string[];
  form_types?: string[];
  start_date?: string;
  max_filings?: number;
  dry_run?: boolean;
}

/**
 * Run the full EDGAR ingestion pipeline.
 */
export async function ingestFromEdgar(
  supabase: SupabaseClient,
  config: IngestionConfig
): Promise<IngestionResult> {
  const result: IngestionResult = {
    filings_found: 0,
    exhibits_processed: 0,
    formulations_stored: 0,
    errors: [],
  };

  // Step 1: Search EDGAR
  const filings = await searchEdgar({
    keywords: config.keywords,
    form_types: config.form_types,
    start_date: config.start_date,
    max_results: config.max_filings || 10,
  });

  result.filings_found = filings.length;

  if (filings.length === 0) {
    result.errors.push('No filings found matching search criteria');
    return result;
  }

  if (config.dry_run) {
    return result;
  }

  // Step 2: Process each filing
  for (const filing of filings) {
    try {
      await processFilingExhibits(supabase, filing, result);
    } catch (e: any) {
      result.errors.push(`Filing ${filing.accession_number}: ${e.message}`);
    }
  }

  return result;
}

async function processFilingExhibits(
  supabase: SupabaseClient,
  filing: EdgarFiling,
  result: IngestionResult
): Promise<void> {
  for (const exhibit of filing.exhibits) {
    if (!exhibit.url) continue;

    result.exhibits_processed++;

    // Download and extract text
    const text = await downloadExhibit(exhibit.url);
    if (!text || text.length < 1000) continue;

    // Extract year from filing date
    const year = filing.filing_date
      ? parseInt(filing.filing_date.substring(0, 4))
      : new Date().getFullYear();

    // Score the formulation
    const scores = scoreFormulation({
      text: text.substring(0, 5000), // Use first 5K chars for scoring
      source_firm: null,
      deal_size_range: null,
      year,
    });

    // Store as a provision formulation
    const { error } = await supabase.from('provision_formulations').insert({
      text: text.substring(0, 50000), // Limit text size
      source_document_type: filing.form_type,
      source_firm: filing.company_name,
      year,
      deal_size_range: null,
      industry: null,
      firm_tier: scores.firm_tier,
      deal_size_score: scores.deal_size_score,
      recency_score: scores.recency_score,
      structural_quality_score: scores.structural_quality_score,
      corpus_alignment_score: scores.corpus_alignment_score,
      composite_quality_score: scores.composite_quality_score,
    });

    if (error) {
      result.errors.push(`Store failed: ${error.message}`);
    } else {
      result.formulations_stored++;
    }
  }
}
