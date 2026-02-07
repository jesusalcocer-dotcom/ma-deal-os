-- Migration 014: Constitution Column
-- Phase 9.1: Partner Constitution & Governance

ALTER TABLE deals ADD COLUMN IF NOT EXISTS constitution JSONB DEFAULT NULL;

COMMENT ON COLUMN deals.constitution IS 'Partner constitution: hard_constraints, preferences, strategic_directives';
