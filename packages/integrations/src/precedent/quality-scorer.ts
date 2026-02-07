/**
 * Quality Scorer for Provision Formulations
 * Scores formulations on firm tier, deal size, recency, structural quality, and corpus alignment.
 */

import { lookupFirmTier, FIRM_TIER_UNKNOWN } from '@ma-deal-os/core';
import { identifyFirm } from './firm-identifier';

export interface QualityScores {
  firm_tier: number;
  deal_size_score: number;
  recency_score: number;
  structural_quality_score: number;
  corpus_alignment_score: number;
  composite_quality_score: number;
}

interface FormulationInput {
  text: string;
  source_firm?: string | null;
  deal_size_range?: string | null;
  year?: number | null;
}

// Weights for composite score
const WEIGHTS = {
  firm_tier: 0.15,
  deal_size: 0.10,
  recency: 0.15,
  structural_quality: 0.40,
  corpus_alignment: 0.20,
};

/**
 * Score a formulation on all quality signals.
 * structural_quality_score requires an AI call, so it's optional.
 * If not provided, uses a heuristic based on text characteristics.
 */
export function scoreFormulation(
  formulation: FormulationInput,
  structuralScore?: number
): QualityScores {
  const firmTier = scoreFirmTier(formulation);
  const dealSize = scoreDealSize(formulation.deal_size_range);
  const recency = scoreRecency(formulation.year);
  const structural = structuralScore ?? scoreStructuralHeuristic(formulation.text);
  const corpusAlignment = 0.50; // Default until centroid calculation

  const composite =
    WEIGHTS.firm_tier * firmTier +
    WEIGHTS.deal_size * dealSize +
    WEIGHTS.recency * recency +
    WEIGHTS.structural_quality * structural +
    WEIGHTS.corpus_alignment * corpusAlignment;

  return {
    firm_tier: round(firmTier),
    deal_size_score: round(dealSize),
    recency_score: round(recency),
    structural_quality_score: round(structural),
    corpus_alignment_score: round(corpusAlignment),
    composite_quality_score: round(composite),
  };
}

function scoreFirmTier(formulation: FormulationInput): number {
  // If source_firm is known, look it up directly
  if (formulation.source_firm) {
    return lookupFirmTier(formulation.source_firm);
  }
  // Otherwise try to identify from text
  const result = identifyFirm(formulation.text);
  return result.tier_score;
}

function scoreDealSize(dealSizeRange: string | null | undefined): number {
  if (!dealSizeRange) return 0.50;

  const lower = dealSizeRange.toLowerCase();
  if (lower.includes('mega') || lower.includes('10b') || lower.includes('>5b')) return 1.0;
  if (lower.includes('large') || lower.includes('1b') || lower.includes('5b')) return 0.90;
  if (lower.includes('upper-mid') || lower.includes('500m') || lower.includes('1000m')) return 0.80;
  if (lower.includes('mid') || lower.includes('100m') || lower.includes('500m')) return 0.70;
  if (lower.includes('lower-mid') || lower.includes('50m') || lower.includes('100m')) return 0.60;
  if (lower.includes('small') || lower.includes('<50m')) return 0.50;

  return 0.50;
}

function scoreRecency(year: number | null | undefined): number {
  if (!year) return 0.50;

  const currentYear = new Date().getFullYear();
  const age = currentYear - year;

  if (age <= 1) return 1.0;
  if (age <= 3) return 0.85;
  if (age <= 5) return 0.70;
  return 0.50;
}

/**
 * Heuristic structural quality score based on text characteristics.
 * A proper score would use Layer 2 AI evaluation.
 */
function scoreStructuralHeuristic(text: string): number {
  if (!text) return 0.30;

  let score = 0.50; // baseline

  // Length: very short provisions are lower quality
  if (text.length > 500) score += 0.10;
  if (text.length > 1000) score += 0.05;
  if (text.length > 3000) score += 0.05;

  // Defined terms (capitalized multi-word phrases in quotes)
  const definedTerms = (text.match(/"[A-Z][^"]+"/g) || []).length;
  if (definedTerms >= 3) score += 0.10;
  if (definedTerms >= 6) score += 0.05;

  // Cross-references (Section X.X patterns)
  const crossRefs = (text.match(/Section\s+\d+\.\d+/gi) || []).length;
  if (crossRefs >= 2) score += 0.05;
  if (crossRefs >= 5) score += 0.05;

  // Structured numbering
  const numbering = (text.match(/\([a-z]\)|\(i+\)|\(\d+\)/g) || []).length;
  if (numbering >= 3) score += 0.05;

  return Math.min(score, 1.0);
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
