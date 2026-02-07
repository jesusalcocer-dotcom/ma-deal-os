/**
 * Model Routing Types
 */

export type ModelTier = 'sonnet' | 'opus';

export interface ModelSelection {
  model: ModelTier;
  modelId: string;
  reason: 'configured' | 'high_novelty' | 'auto_promoted' | 'fallback';
  noveltyScore?: number;
}

export interface DealContext {
  dealId?: string;
  dealType?: string;
  industry?: string;
  jurisdiction?: string;
  dealValue?: number;
}

export interface RoutingConfig {
  task_type: string;
  current_model: ModelTier;
  distillation_status: string;
  exemplar_count: number;
  consecutive_low_scores: number;
  consecutive_high_scores: number;
}

export interface NoveltyFactors {
  dealTypeNovel: boolean;
  industryNovel: boolean;
  jurisdictionNovel: boolean;
  valueOutlier: boolean;
}

export const MODEL_IDS: Record<ModelTier, string> = {
  opus: 'claude-opus-4-6',
  sonnet: 'claude-sonnet-4-5-20250929',
};
