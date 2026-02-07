/**
 * Evaluation Types — structures for the self-evaluation system
 */

export interface EvaluatorCriterion {
  name: string;
  weight: number;
  description: string;
}

export interface EvaluatorRubric {
  criteria: EvaluatorCriterion[];
  min_score_for_citation: number;
}

export interface CriterionScore {
  criterion: string;
  score: number;
  citation?: string; // required if score < min_score_for_citation
}

export interface SelfEvaluation {
  scores: CriterionScore[];
  overallScore: number;
  issues: CriterionScore[];
  modelUsed: string;
  tokenCount: number;
}

export interface ConsistencyResult {
  check_type: string;
  source_entity_type: string;
  source_entity_id: string;
  conflicting_entity_type: string;
  conflicting_entity_id: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface OutcomeSignal {
  deal_id: string;
  signal_type: string;
  agent_type: string;
  metric_name: string;
  metric_value: number;
  context?: Record<string, unknown>;
}
