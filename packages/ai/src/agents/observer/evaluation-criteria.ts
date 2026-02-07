/**
 * Observer Evaluation Criteria
 * Defines the metrics interfaces that the Observer uses to evaluate system performance.
 */

export interface AccuracyCriteria {
  document_version_accuracy: number; // % of documents accepted without modification
  checklist_completeness: number; // % of checklist items properly tracked
  dd_finding_precision: number; // % of DD findings confirmed vs flagged
  provision_classification_accuracy: number; // % correctly classified
}

export interface EfficiencyCriteria {
  avg_tokens_per_activation: number;
  avg_cost_per_activation: number;
  avg_processing_time_ms: number;
  total_activations: number;
  total_cost_usd: number;
}

export interface QualityCriteria {
  tier2_modification_rate: number; // % of Tier 2 actions modified by humans
  tier2_rejection_rate: number; // % of Tier 2 actions rejected
  most_modified_action_type: string;
  modification_patterns: string[];
}

export interface CoverageCriteria {
  event_types_handled: number;
  event_types_total: number;
  unhandled_event_types: string[];
  consequence_map_coverage: number; // % of events with consequence maps
}

export interface CoordinationCriteria {
  cross_workstream_consistency: number; // 0-1 score
  deadline_tracking_accuracy: number; // % of deadlines properly tracked
  escalation_appropriateness: number; // % of escalations at correct tier
}

export interface SystemMetrics {
  accuracy: AccuracyCriteria;
  efficiency: EfficiencyCriteria;
  quality: QualityCriteria;
  coverage: CoverageCriteria;
  coordination: CoordinationCriteria;
  collected_at: string;
}

export interface ObserverIssue {
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  metric_name: string;
  current_value: number;
  threshold: number;
  description: string;
}

// Thresholds for triggering Observer investigation
export const THRESHOLDS = {
  tier2_modification_rate: 0.50, // > 50% modification = investigate
  tier2_rejection_rate: 0.20, // > 20% rejection = investigate
  avg_cost_per_activation: 0.50, // > $0.50 per activation = investigate
  document_version_accuracy: 0.70, // < 70% accuracy = investigate
  consequence_map_coverage: 0.80, // < 80% coverage = investigate
};
