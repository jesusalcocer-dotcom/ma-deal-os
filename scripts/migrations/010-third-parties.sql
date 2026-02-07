-- Migration 010: deal_third_parties table (Phase 6.1)
-- Run in Supabase Dashboard SQL Editor

CREATE TABLE IF NOT EXISTS deal_third_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  firm_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  deliverables JSONB DEFAULT '[]'::jsonb,
  last_communication_at TIMESTAMPTZ,
  outstanding_items TEXT[],
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deal_third_parties_deal_idx ON deal_third_parties(deal_id);
CREATE INDEX IF NOT EXISTS deal_third_parties_role_idx ON deal_third_parties(role);
