-- Migration 015: Quality Score Columns on provision_formulations
-- Phase 10.1: Precedent Intelligence Pipeline

ALTER TABLE provision_formulations ADD COLUMN IF NOT EXISTS firm_tier DECIMAL(3,2) DEFAULT NULL;
ALTER TABLE provision_formulations ADD COLUMN IF NOT EXISTS deal_size_score DECIMAL(3,2) DEFAULT NULL;
ALTER TABLE provision_formulations ADD COLUMN IF NOT EXISTS recency_score DECIMAL(3,2) DEFAULT NULL;
ALTER TABLE provision_formulations ADD COLUMN IF NOT EXISTS structural_quality_score DECIMAL(3,2) DEFAULT NULL;
ALTER TABLE provision_formulations ADD COLUMN IF NOT EXISTS corpus_alignment_score DECIMAL(3,2) DEFAULT NULL;
ALTER TABLE provision_formulations ADD COLUMN IF NOT EXISTS composite_quality_score DECIMAL(3,2) DEFAULT NULL;

COMMENT ON COLUMN provision_formulations.firm_tier IS 'Tier score of originating firm (0.0-1.0)';
COMMENT ON COLUMN provision_formulations.composite_quality_score IS 'Weighted average of all quality signals (0.0-1.0)';

-- Index for quality-weighted queries
CREATE INDEX IF NOT EXISTS idx_formulations_quality ON provision_formulations (composite_quality_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_formulations_type_quality ON provision_formulations (provision_type_id, composite_quality_score DESC NULLS LAST);
