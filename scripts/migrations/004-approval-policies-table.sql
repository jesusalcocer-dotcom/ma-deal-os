-- Phase 4: Approval Policies Table
-- Run this in the Supabase Dashboard SQL Editor

CREATE TABLE IF NOT EXISTS approval_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  scope_type TEXT NOT NULL DEFAULT 'default',
  scope_id UUID,
  rules JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_policies_scope ON approval_policies (scope_type, scope_id) WHERE is_active = true;
