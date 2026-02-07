-- Migration 012: Closing mechanics tables (Phase 6.4)
-- Run in Supabase Dashboard SQL Editor

CREATE TABLE IF NOT EXISTS closing_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft',
  target_closing_date DATE,
  conditions_satisfied INTEGER NOT NULL DEFAULT 0,
  conditions_total INTEGER NOT NULL DEFAULT 0,
  conditions_waived INTEGER NOT NULL DEFAULT 0,
  funds_flow JSONB,
  wire_instructions_confirmed BOOLEAN NOT NULL DEFAULT false,
  signature_pages_collected JSONB DEFAULT '{}'::jsonb,
  signature_pages_released BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS closing_checklists_deal_idx ON closing_checklists(deal_id);

CREATE TABLE IF NOT EXISTS closing_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_checklist_id UUID NOT NULL REFERENCES closing_checklists(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  condition_type TEXT NOT NULL,
  category TEXT,
  responsible_party TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  satisfied_at TIMESTAMPTZ,
  evidence TEXT,
  evidence_document_id UUID,
  blocks_closing BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS closing_conditions_checklist_idx ON closing_conditions(closing_checklist_id);
CREATE INDEX IF NOT EXISTS closing_conditions_deal_idx ON closing_conditions(deal_id);
CREATE INDEX IF NOT EXISTS closing_conditions_status_idx ON closing_conditions(status);

CREATE TABLE IF NOT EXISTS closing_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_checklist_id UUID NOT NULL REFERENCES closing_checklists(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  deliverable_type TEXT,
  responsible_party TEXT NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  received_at TIMESTAMPTZ,
  document_version_id UUID,
  drive_file_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS closing_deliverables_checklist_idx ON closing_deliverables(closing_checklist_id);
CREATE INDEX IF NOT EXISTS closing_deliverables_deal_idx ON closing_deliverables(deal_id);

CREATE TABLE IF NOT EXISTS post_closing_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  obligation_type TEXT,
  responsible_party TEXT NOT NULL,
  deadline DATE,
  recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_interval TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  estimated_value NUMERIC,
  actual_value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS post_closing_obligations_deal_idx ON post_closing_obligations(deal_id);
CREATE INDEX IF NOT EXISTS post_closing_obligations_status_idx ON post_closing_obligations(status);
