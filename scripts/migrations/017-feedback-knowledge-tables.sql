-- Migration 017: Feedback Events + Deal Knowledge tables
-- Phase 14: Knowledge Capture + Learning Pipeline

CREATE TABLE IF NOT EXISTS feedback_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id),
  event_type TEXT NOT NULL, -- 'approved', 'modified', 'rejected', 'escalated', 'annotation'
  target_type TEXT NOT NULL, -- 'proposed_action', 'document_version', 'email_draft'
  target_id UUID,
  original_output JSONB,
  modified_output JSONB,
  modification_delta JSONB,
  annotation TEXT,
  agent_confidence DECIMAL(4,3),
  agent_context_summary TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feedback_events_deal ON feedback_events(deal_id);
CREATE INDEX idx_feedback_events_type ON feedback_events(event_type);
CREATE INDEX idx_feedback_events_target ON feedback_events(target_type, target_id);

CREATE TABLE IF NOT EXISTS deal_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id),
  knowledge_type TEXT NOT NULL, -- 'negotiation_outcome', 'process_learning', 'attorney_preference', 'counterparty_pattern', 'deal_post_mortem', 'provision_outcome'
  content JSONB NOT NULL,
  confidence DECIMAL(4,3),
  sample_size INTEGER DEFAULT 1,
  source_feedback_ids JSONB,
  tags JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deal_knowledge_deal ON deal_knowledge(deal_id);
CREATE INDEX idx_deal_knowledge_type ON deal_knowledge(knowledge_type);
