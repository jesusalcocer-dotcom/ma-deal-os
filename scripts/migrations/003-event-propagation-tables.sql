-- Phase 3: Event Propagation Tables
-- Run this in the Supabase Dashboard SQL Editor

CREATE TABLE IF NOT EXISTS propagation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  source_entity_type TEXT NOT NULL,
  source_entity_id UUID NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  significance INTEGER NOT NULL DEFAULT 3 CHECK (significance BETWEEN 1 AND 5),
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_propagation_events_unprocessed ON propagation_events (deal_id, processed) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_propagation_events_type ON propagation_events (event_type);

CREATE TABLE IF NOT EXISTS action_chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  trigger_event_id UUID REFERENCES propagation_events(id),
  summary TEXT NOT NULL,
  significance INTEGER NOT NULL DEFAULT 3 CHECK (significance BETWEEN 1 AND 5),
  approval_tier INTEGER NOT NULL CHECK (approval_tier BETWEEN 1 AND 3),
  status TEXT NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_chains_pending ON action_chains (status) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS proposed_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id UUID REFERENCES action_chains(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL,
  depends_on UUID[] DEFAULT '{}',
  action_type TEXT NOT NULL,
  target_entity_type TEXT,
  target_entity_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  preview JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  execution_result JSONB,
  constitutional_violation BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  executed_at TIMESTAMPTZ
);
