-- Migration 005: Agent Activations Table
-- Run this in Supabase Dashboard SQL Editor

CREATE TABLE IF NOT EXISTS agent_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_source TEXT,
  trigger_event_id UUID,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,
  model_used TEXT,
  steps INTEGER NOT NULL DEFAULT 0,
  tool_calls INTEGER NOT NULL DEFAULT 0,
  specialist_invocations INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_activations_deal_idx ON agent_activations(deal_id);
CREATE INDEX IF NOT EXISTS agent_activations_type_idx ON agent_activations(agent_type);
CREATE INDEX IF NOT EXISTS agent_activations_created_idx ON agent_activations(created_at);
