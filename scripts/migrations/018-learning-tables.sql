-- Migration 018: Learning Infrastructure Tables
-- Phase 15: Signal Collection + Reflection + Communication + Distillation + Governance
-- Run this in Supabase Dashboard SQL Editor

-- ============================================================
-- SIGNAL COLLECTION TABLES (Step 15.1)
-- ============================================================

CREATE TABLE IF NOT EXISTS self_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id),
  agent_type TEXT NOT NULL,
  task_id UUID,
  output_snapshot JSONB NOT NULL,
  criteria_scores JSONB NOT NULL,
  issues_found JSONB DEFAULT '[]',
  overall_score FLOAT NOT NULL,
  model_used TEXT NOT NULL,
  token_count INTEGER,
  evaluated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consistency_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id),
  check_type TEXT NOT NULL,
  source_entity_type TEXT NOT NULL,
  source_entity_id UUID NOT NULL,
  conflicting_entity_type TEXT NOT NULL,
  conflicting_entity_id UUID NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  resolution TEXT,
  resolved_by TEXT,
  detected_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS variant_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id),
  task_type TEXT NOT NULL,
  variants JSONB NOT NULL,
  selected_variant TEXT NOT NULL,
  selection_reasoning TEXT,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outcome_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id),
  signal_type TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value FLOAT NOT NULL,
  context JSONB,
  measured_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exemplar_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,
  source_firm TEXT,
  document_type TEXT NOT NULL,
  deal_characteristics JSONB,
  content JSONB NOT NULL,
  quality_score FLOAT NOT NULL,
  generation_model TEXT,
  generation_context JSONB,
  evaluator_scores JSONB,
  distillation_eligible BOOLEAN DEFAULT false,
  used_as_exemplar_count INTEGER DEFAULT 0,
  downstream_quality_impact FLOAT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exemplar_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id),
  agent_output_id UUID,
  exemplar_id UUID REFERENCES exemplar_library(id),
  gaps_identified JSONB DEFAULT '[]',
  improvements_suggested JSONB DEFAULT '[]',
  similarity_score FLOAT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- LEARNING & REFLECTION TABLES (Step 15.2)
-- ============================================================

CREATE TABLE IF NOT EXISTS learned_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT,
  pattern_type TEXT NOT NULL,
  description TEXT NOT NULL,
  condition JSONB NOT NULL,
  instruction TEXT NOT NULL,
  confidence FLOAT NOT NULL DEFAULT 0.3,
  source_signals UUID[] DEFAULT '{}',
  supporting_count INTEGER DEFAULT 0,
  contradicting_count INTEGER DEFAULT 0,
  lifecycle_stage TEXT NOT NULL DEFAULT 'proposed'
    CHECK (lifecycle_stage IN ('proposed', 'confirmed', 'established', 'hard_rule', 'decayed', 'retired')),
  version INTEGER DEFAULT 1,
  version_history JSONB DEFAULT '[]',
  last_applied_at TIMESTAMPTZ,
  last_evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reflection_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type TEXT NOT NULL,
  deal_id UUID,
  signals_processed INTEGER NOT NULL,
  patterns_created INTEGER DEFAULT 0,
  patterns_updated INTEGER DEFAULT 0,
  patterns_decayed INTEGER DEFAULT 0,
  patterns_promoted INTEGER DEFAULT 0,
  summary TEXT,
  model_used TEXT NOT NULL,
  token_count INTEGER,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skill_file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path TEXT NOT NULL,
  version INTEGER NOT NULL,
  changes JSONB NOT NULL,
  validation_results JSONB,
  approved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS generated_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name TEXT NOT NULL UNIQUE,
  source_pattern_id UUID REFERENCES learned_patterns(id),
  description TEXT NOT NULL,
  function_code TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  deprecated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- AGENT COMMUNICATION TABLES (Step 15.3)
-- ============================================================

CREATE TABLE IF NOT EXISTS deal_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) NOT NULL,
  topic TEXT NOT NULL,
  insight TEXT NOT NULL,
  confidence FLOAT DEFAULT 0.7,
  source_agent TEXT NOT NULL,
  source_evidence JSONB,
  supersedes UUID REFERENCES deal_intelligence(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) NOT NULL,
  requesting_agent TEXT NOT NULL,
  target_agent TEXT NOT NULL,
  request_type TEXT NOT NULL,
  description TEXT NOT NULL,
  context JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  response JSONB,
  chain_depth INTEGER DEFAULT 1,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '1 hour'),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS meta_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id),
  trigger_reason TEXT NOT NULL,
  trigger_entity_id UUID,
  mode TEXT NOT NULL,
  input_context JSONB NOT NULL,
  output_decision JSONB NOT NULL,
  human_escalation BOOLEAN DEFAULT false,
  escalation_options JSONB,
  resolution_time_seconds INTEGER,
  model_used TEXT DEFAULT 'opus',
  token_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- DISTILLATION & ROUTING TABLES (Step 15.4)
-- ============================================================

CREATE TABLE IF NOT EXISTS distillation_trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type TEXT NOT NULL,
  deal_context JSONB NOT NULL,
  opus_score FLOAT NOT NULL,
  sonnet_score FLOAT,
  sonnet_with_exemplars_score FLOAT,
  exemplar_ids UUID[] NOT NULL,
  exemplar_count INTEGER NOT NULL,
  score_gap FLOAT,
  recommendation TEXT NOT NULL,
  applied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS model_routing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type TEXT NOT NULL UNIQUE,
  current_model TEXT NOT NULL DEFAULT 'opus',
  distillation_status TEXT DEFAULT 'not_started',
  exemplar_count INTEGER DEFAULT 0,
  min_exemplars_for_testing INTEGER DEFAULT 15,
  handoff_threshold FLOAT DEFAULT 0.85,
  revert_threshold FLOAT DEFAULT 0.80,
  spot_check_frequency INTEGER DEFAULT 10,
  consecutive_low_scores INTEGER DEFAULT 0,
  consecutive_high_scores INTEGER DEFAULT 0,
  last_spot_check_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- GOVERNANCE & CONFIGURATION TABLES (Step 15.5)
-- ============================================================

CREATE TABLE IF NOT EXISTS learning_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  description TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB,
  reasoning TEXT,
  evidence JSONB,
  deal_id UUID,
  reversible BOOLEAN DEFAULT true,
  reversed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Signal queries
CREATE INDEX IF NOT EXISTS idx_self_eval_deal ON self_evaluations(deal_id);
CREATE INDEX IF NOT EXISTS idx_self_eval_agent ON self_evaluations(agent_type, overall_score);
CREATE INDEX IF NOT EXISTS idx_consistency_deal ON consistency_checks(deal_id, severity);
CREATE INDEX IF NOT EXISTS idx_consistency_unresolved ON consistency_checks(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_outcome_deal ON outcome_signals(deal_id, signal_type);
CREATE INDEX IF NOT EXISTS idx_exemplar_type ON exemplar_library(document_type, source_type);
CREATE INDEX IF NOT EXISTS idx_exemplar_distillation ON exemplar_library(distillation_eligible, generation_model);

-- Pattern queries
CREATE INDEX IF NOT EXISTS idx_patterns_stage ON learned_patterns(lifecycle_stage, confidence);
CREATE INDEX IF NOT EXISTS idx_patterns_agent ON learned_patterns(agent_type, lifecycle_stage);

-- Communication queries
CREATE INDEX IF NOT EXISTS idx_intelligence_deal ON deal_intelligence(deal_id, topic);
CREATE INDEX IF NOT EXISTS idx_requests_status ON agent_requests(status, target_agent);
CREATE INDEX IF NOT EXISTS idx_requests_deal ON agent_requests(deal_id);

-- Distillation queries
CREATE INDEX IF NOT EXISTS idx_distillation_task ON distillation_trials(task_type, recommendation);
CREATE INDEX IF NOT EXISTS idx_routing_task ON model_routing_config(task_type);

-- Audit queries
CREATE INDEX IF NOT EXISTS idx_audit_entity ON learning_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_time ON learning_audit_log(created_at DESC);

-- Enable Row Level Security (tables accessible via service role key)
ALTER TABLE self_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consistency_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE exemplar_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE exemplar_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE learned_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflection_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_file_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE distillation_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_routing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_configuration ENABLE ROW LEVEL SECURITY;

-- RLS policies for service role access
CREATE POLICY "service_role_all" ON self_evaluations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON consistency_checks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON variant_comparisons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON outcome_signals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON exemplar_library FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON exemplar_comparisons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON learned_patterns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON reflection_runs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON skill_file_versions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON generated_tools FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON deal_intelligence FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON agent_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON meta_interventions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON distillation_trials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON model_routing_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON learning_audit_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON learning_configuration FOR ALL USING (true) WITH CHECK (true);
