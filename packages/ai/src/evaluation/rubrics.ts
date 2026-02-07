/**
 * Evaluator Rubrics — criteria definitions per agent type
 */

import type { EvaluatorRubric } from './types';

export const EVALUATOR_RUBRICS: Record<string, EvaluatorRubric> = {
  disclosure_generation: {
    criteria: [
      { name: 'completeness', weight: 0.20, description: 'All required schedules present for the rep type' },
      { name: 'cross_reference_accuracy', weight: 0.15, description: 'Schedule numbers match SPA section references' },
      { name: 'materiality_qualifiers', weight: 0.15, description: 'Appropriate materiality language included' },
      { name: 'jurisdiction_requirements', weight: 0.10, description: 'Jurisdiction-specific requirements addressed' },
      { name: 'factual_accuracy', weight: 0.20, description: 'Facts match source documents' },
      { name: 'formatting', weight: 0.05, description: 'Proper schedule numbering and structure' },
      { name: 'legal_precision', weight: 0.15, description: 'Terms of art used correctly' },
    ],
    min_score_for_citation: 0.7,
  },
  email_extraction: {
    criteria: [
      { name: 'position_identification', weight: 0.25, description: 'All negotiation positions correctly identified' },
      { name: 'party_attribution', weight: 0.20, description: 'Positions attributed to correct party' },
      { name: 'temporal_ordering', weight: 0.15, description: 'Timeline of positions correctly ordered' },
      { name: 'sentiment_classification', weight: 0.10, description: 'Tone and urgency accurately classified' },
      { name: 'action_item_extraction', weight: 0.15, description: 'Action items correctly identified with owners' },
      { name: 'completeness', weight: 0.15, description: 'No significant content missed' },
    ],
    min_score_for_citation: 0.7,
  },
  negotiation_tracking: {
    criteria: [
      { name: 'position_consistency', weight: 0.25, description: 'Position history is internally consistent' },
      { name: 'agreed_terms_accuracy', weight: 0.25, description: 'Agreed terms correctly captured' },
      { name: 'open_items_categorization', weight: 0.20, description: 'Open items properly categorized by status' },
      { name: 'priority_assessment', weight: 0.15, description: 'Priority levels appropriate for deal context' },
      { name: 'completeness', weight: 0.15, description: 'All tracked provisions accounted for' },
    ],
    min_score_for_citation: 0.7,
  },
  checklist_management: {
    criteria: [
      { name: 'item_appropriateness', weight: 0.20, description: 'Items appropriate for deal type and stage' },
      { name: 'dependency_mapping', weight: 0.20, description: 'Dependencies between items correctly identified' },
      { name: 'priority_assignment', weight: 0.15, description: 'Priorities reflect actual urgency' },
      { name: 'completeness', weight: 0.25, description: 'No missing items for this deal type' },
      { name: 'status_accuracy', weight: 0.20, description: 'Status reflects actual completion state' },
    ],
    min_score_for_citation: 0.7,
  },
  document_generation: {
    criteria: [
      { name: 'legal_accuracy', weight: 0.25, description: 'Legal provisions are accurate and enforceable' },
      { name: 'boilerplate_appropriateness', weight: 0.10, description: 'Standard language appropriate for deal type' },
      { name: 'defined_terms_consistency', weight: 0.15, description: 'Defined terms used consistently throughout' },
      { name: 'cross_references_resolve', weight: 0.15, description: 'All internal cross-references point to correct sections' },
      { name: 'deal_specific_accuracy', weight: 0.20, description: 'Deal-specific details (names, amounts, dates) are correct' },
      { name: 'formatting', weight: 0.05, description: 'Proper formatting and structure' },
      { name: 'completeness', weight: 0.10, description: 'All required sections present' },
    ],
    min_score_for_citation: 0.7,
  },
};

/**
 * Calculate weighted overall score from criterion scores.
 */
export function calculateWeightedScore(
  scores: Array<{ criterion: string; score: number }>,
  rubric: EvaluatorRubric
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const score of scores) {
    const criterion = rubric.criteria.find(c => c.name === score.criterion);
    if (criterion) {
      weightedSum += score.score * criterion.weight;
      totalWeight += criterion.weight;
    }
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}
