/**
 * Learning System Types — used by Signal Aggregator, Reflection Engine, Pattern Lifecycle.
 */

export interface SignalBundle {
  totalSignals: number;
  period: { since: string; until: string };
  evaluations: SignalSummary;
  consistencyChecks: SignalSummary;
  variantComparisons: SignalSummary;
  outcomeSignals: SignalSummary;
  exemplarComparisons: SignalSummary;
  clusteredByAgent: Record<string, ClusterSummary>;
  clusteredByDealType: Record<string, ClusterSummary>;
}

export interface SignalSummary {
  count: number;
  text: string;
}

export interface ClusterSummary {
  signalCount: number;
  avgScore?: number;
  topIssues: string[];
}

export interface ReflectionResult {
  noNewSignals?: boolean;
  signalsProcessed: number;
  patternsCreated: string[];
  patternsUpdated: string[];
  patternsDecayed: string[];
  patternsPromoted: string[];
  reflectionRunId?: string;
}

export interface ReflectionDecision {
  newPatterns: ProposedPattern[];
  updatedPatterns: PatternUpdate[];
  decayedPatterns: PatternDecay[];
}

export interface ProposedPattern {
  description: string;
  patternType: string;
  agentType: string;
  instruction: string;
  conditions: Record<string, unknown>;
  supportingSignalIds: string[];
  initialConfidence: number;
}

export interface PatternUpdate {
  patternId: string;
  confidenceChange: number;
  reason: string;
  newSupportingSignals: string[];
}

export interface PatternDecay {
  patternId: string;
  confidenceReduction: number;
  reason: string;
  contradictingSignals: string[];
}

export interface LearnedPattern {
  id: string;
  pattern_type: string;
  agent_type: string;
  description: string;
  instruction: string;
  conditions: Record<string, unknown>;
  confidence: number;
  lifecycle_stage: string;
  supporting_count: number;
  contradicting_count: number;
  source_signals: unknown[];
  version: number;
  version_history: unknown[];
  last_applied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromotionDecision {
  promote: boolean;
  newStage?: string;
  newConfidence?: number;
  requiresHumanApproval?: boolean;
  proposedStage?: string;
}

export interface PatternImpact {
  patternId: string;
  applicationCount: number;
  avgScoreBefore: number;
  avgScoreAfter: number;
  improvement: number;
}
