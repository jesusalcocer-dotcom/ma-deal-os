-- Migration 011: Client management tables (Phase 6.2)
-- Run in Supabase Dashboard SQL Editor

CREATE TABLE IF NOT EXISTS client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  communication_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_contacts_deal_idx ON client_contacts(deal_id);

CREATE TABLE IF NOT EXISTS client_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  client_contact_id UUID REFERENCES client_contacts(id),
  description TEXT NOT NULL,
  detail TEXT,
  category TEXT,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'normal',
  blocks_checklist_items UUID[],
  related_disclosure_schedule_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  follow_up_count INTEGER NOT NULL DEFAULT 0,
  last_follow_up_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_action_items_deal_idx ON client_action_items(deal_id);
CREATE INDEX IF NOT EXISTS client_action_items_status_idx ON client_action_items(status);

CREATE TABLE IF NOT EXISTS client_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  client_contact_id UUID REFERENCES client_contacts(id),
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  approved_by UUID REFERENCES users(id),
  sent_at TIMESTAMPTZ,
  generated_by TEXT NOT NULL DEFAULT 'system',
  trigger_event_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_communications_deal_idx ON client_communications(deal_id);
CREATE INDEX IF NOT EXISTS client_communications_status_idx ON client_communications(status);
