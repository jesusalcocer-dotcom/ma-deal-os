# NEEDS HUMAN ACTION

**Date:** 2026-02-07
**Phase:** 3 (MCP Infrastructure + Event Backbone)
**Blocker Type:** Environment — No database DDL access

## What Happened

Phase 3 code is 100% complete (Steps 3.1-3.9). All TypeScript builds pass. However, the integration tests (Step 3.10) and full build verification (Step 3.11) require three database tables that the Build Agent cannot create because:

1. Direct PostgreSQL connection (`db.*.supabase.co`) does not resolve from this environment
2. Supabase connection pooler returns "Tenant or user not found"
3. No `psql` CLI or Supabase CLI access token available
4. Supabase REST API does not support DDL (CREATE TABLE) operations

The Build Agent has been looping on this for 2+ turns with zero progress.

## What You Need To Do

### Step 1: Run the migration SQL

Go to your **Supabase Dashboard** → **SQL Editor** → **New query**

Paste and run the contents of: `scripts/migrations/003-event-propagation-tables.sql`

Or copy-paste this:

```sql
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
```

### Step 2: Verify tables were created

Run this in the SQL Editor to confirm:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('propagation_events', 'action_chains', 'proposed_actions');
```

Expected: 3 rows returned.

### Step 3: Restart the Build Agent

After tables are created, delete this file and `GUIDANCE.md`, then restart the Build Agent. It will:
1. Run the integration test: `npx tsx scripts/test-event-pipeline.ts`
2. Complete build verification (Step 3.11)
3. Finalize the Phase 3 test report
4. Advance to Phase 4

## Questions for Human

None — the action required is clear. This is a pure environment constraint, not a spec or code issue.
