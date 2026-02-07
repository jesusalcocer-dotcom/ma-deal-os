/**
 * Distillation Pipeline Types
 */

export interface DistillationTrialResult {
  taskType: string;
  recommendation: 'approve_handoff' | 'reject_needs_more' | 'reject_quality_gap';
  reason: string;
  avgSonnetScore?: number;
  avgSonnetWithExemplarsScore?: number;
  avgOpusBaseline?: number;
  trials: TrialDetail[];
}

export interface TrialDetail {
  dealId: string | null;
  dealCharacteristics: Record<string, unknown>;
  opusScore: number;
  sonnetScore: number;
  sonnetWithExemplarsScore: number;
  exemplarIds: string[];
  exemplarCount: number;
  scoreGap: number;
}

export interface ShadowTestResult {
  taskType: string;
  dealId: string | null;
  opusOutput: string;
  sonnetOutput: string;
  opusScore: number;
  sonnetScore: number;
  scoreGap: number;
  exemplarIds: string[];
}

export interface SpotCheckResult {
  taskType: string;
  dealId: string | null;
  sonnetScore: number;
  opusScore: number;
  scoreGap: number;
  belowThreshold: boolean;
  consecutiveFailures: number;
  autoReverted: boolean;
}
