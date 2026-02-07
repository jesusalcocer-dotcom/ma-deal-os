-- Migration 013: Skills Registry
-- Phase 8.1: Skills System

CREATE TABLE IF NOT EXISTS skills_registry (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL, -- 'domain', 'process', 'meta', 'adaptive', 'dynamic'
  path TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  quality_score REAL NOT NULL DEFAULT 0.8,
  applicable_agents JSONB DEFAULT '[]'::jsonb,
  applicable_tasks JSONB DEFAULT '[]'::jsonb,
  depends_on JSONB DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'static',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_skills_registry_type ON skills_registry(type);
CREATE INDEX IF NOT EXISTS idx_skills_registry_source ON skills_registry(source);
