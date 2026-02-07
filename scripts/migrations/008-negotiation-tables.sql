-- Migration 008: Negotiation Positions and Roadmaps Tables
-- Run this in Supabase Dashboard SQL Editor

CREATE TABLE IF NOT EXISTS negotiation_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  provision_type TEXT NOT NULL,
  provision_label TEXT NOT NULL,
  our_current_position TEXT,
  their_current_position TEXT,
  our_opening_position TEXT,
  their_opening_position TEXT,
  agreed_position TEXT,
  position_history JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'open',
  significance INTEGER NOT NULL DEFAULT 3,
  financial_impact BOOLEAN NOT NULL DEFAULT FALSE,
  category TEXT,
  notes TEXT,
  last_updated_from TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS negotiation_positions_deal_idx ON negotiation_positions(deal_id);
CREATE INDEX IF NOT EXISTS negotiation_positions_status_idx ON negotiation_positions(status);
CREATE INDEX IF NOT EXISTS negotiation_positions_provision_idx ON negotiation_positions(provision_type);

CREATE TABLE IF NOT EXISTS negotiation_roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  strategy_summary TEXT,
  key_leverage_points JSONB DEFAULT '[]',
  concession_priorities JSONB DEFAULT '[]',
  red_lines JSONB DEFAULT '[]',
  fallback_positions JSONB DEFAULT '{}',
  generated_by TEXT DEFAULT 'system',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS negotiation_roadmaps_deal_idx ON negotiation_roadmaps(deal_id);
