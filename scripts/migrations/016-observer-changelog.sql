-- Migration 016: Observer Changelog Table
-- Phase 11.1: Observer, Coding Agent, Testing Agent

CREATE TABLE IF NOT EXISTS observer_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_type TEXT NOT NULL,
  file_path TEXT,
  description TEXT NOT NULL,
  diagnosis TEXT,
  prescribed_fix TEXT,
  git_commit_hash TEXT,
  test_results JSONB,
  confidence TEXT,
  reverted BOOLEAN DEFAULT FALSE,
  reverted_at TIMESTAMPTZ,
  needs_human_review BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE observer_changelog IS 'Tracks all modifications made by the Observer self-improvement agent';

CREATE INDEX IF NOT EXISTS idx_observer_changelog_type ON observer_changelog (change_type);
CREATE INDEX IF NOT EXISTS idx_observer_changelog_created ON observer_changelog (created_at DESC);
