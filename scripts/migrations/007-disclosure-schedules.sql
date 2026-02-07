-- Migration 007: Disclosure Schedules and Entries Tables
-- Run this in Supabase Dashboard SQL Editor

CREATE TABLE IF NOT EXISTS disclosure_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  schedule_number TEXT NOT NULL,
  schedule_title TEXT NOT NULL,
  related_rep_section TEXT,
  related_rep_text TEXT,
  related_checklist_item_id UUID REFERENCES checklist_items(id),
  status TEXT NOT NULL DEFAULT 'pending',
  entry_count INTEGER NOT NULL DEFAULT 0,
  cross_reference_issues JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS disclosure_schedules_deal_idx ON disclosure_schedules(deal_id);
CREATE INDEX IF NOT EXISTS disclosure_schedules_status_idx ON disclosure_schedules(status);

CREATE TABLE IF NOT EXISTS disclosure_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES disclosure_schedules(id) ON DELETE CASCADE,
  entry_text TEXT NOT NULL,
  entry_type TEXT NOT NULL DEFAULT 'manual',
  source_dd_finding_id UUID,
  source_email_id UUID,
  source_client_response JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS disclosure_entries_schedule_idx ON disclosure_entries(schedule_id);
CREATE INDEX IF NOT EXISTS disclosure_entries_type_idx ON disclosure_entries(entry_type);
