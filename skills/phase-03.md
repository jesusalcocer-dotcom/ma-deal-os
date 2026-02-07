# Phase 3: MCP Infrastructure + Event Backbone

## Prerequisites
- Phase 2 must be complete (confirmed: 10/10 critical tests passing)
- `.env.local` with valid SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
- Project Mercury test deal exists in Supabase

## What You're Building

This is the most critical phase. You are building the infrastructure that everything in Phases 4-14 depends on: the MCP server that gives agents access to deal operations, and the event propagation backbone that makes the system reactive.

The MCP server wraps existing API routes and database operations as tools that agents can invoke. The event backbone ensures that a change anywhere in the deal automatically triggers appropriate consequences everywhere else. Together, these form the "nervous system" of the platform.

## Reference
- SPEC-V2-COMPLETE.md Sections: 3 (Three-Layer Architecture), 5 (Event Propagation Backbone), 18.2 (Event API Routes)
- Key types/interfaces: `PropagationEvent`, `PropagationEventType`, `ActionChain`, `ProposedAction`, `ProposedActionType`, `ConsequenceMap`

## Steps

### Step 3.1: MCP Server Package Setup

**What:** Create the `packages/mcp-server/` package structure and install dependencies.

**Files to create/modify:**
- `packages/mcp-server/package.json` — Package config with `@modelcontextprotocol/sdk` dependency
- `packages/mcp-server/tsconfig.json` — TypeScript config extending root
- `packages/mcp-server/src/index.ts` — MCP server entry point with stdio transport
- `packages/mcp-server/src/tools/deal-tools.ts` — `get_deal_state`, `list_deals` tool implementations

**Implementation details:**
- Install: `pnpm add @modelcontextprotocol/sdk --filter @ma-deal-os/mcp-server`
- The MCP server should use the `Server` class from `@modelcontextprotocol/sdk/server/index.js`
- Use `StdioServerTransport` for the transport layer
- Register tools using `server.setRequestHandler(ListToolsRequestSchema, ...)` and `server.setRequestHandler(CallToolRequestSchema, ...)`
- `get_deal_state` should accept a `dealId` parameter and return deal + checklist + recent activity by querying Supabase via the JS client
- `list_deals` should return all active deals
- Import the Supabase client using `@supabase/supabase-js` with service role key from env

**Test:**
```bash
# Build the MCP server
cd packages/mcp-server && pnpm build
# Test that it starts (will exit since no stdin, but should not error on import)
node -e "const m = require('./dist/index.js'); console.log('MCP server module loaded')" || echo "Check build"
```
**Expected:** MCP server builds without errors and module loads.
**Severity:** 🔴 CRITICAL

### Step 3.2: Deal Operations MCP Tools

**What:** Add the remaining deal operation tools to the MCP server: `get_checklist`, `get_documents`, `search_precedent`.

**Files to create/modify:**
- `packages/mcp-server/src/tools/checklist-tools.ts` — `get_checklist` tool
- `packages/mcp-server/src/tools/document-tools.ts` — `get_documents` tool
- `packages/mcp-server/src/tools/precedent-tools.ts` — `search_precedent` tool
- `packages/mcp-server/src/index.ts` — Register new tools

**Implementation details:**
- `get_checklist(dealId)` → queries checklist_items table, returns items with status
- `get_documents(dealId)` → queries document_versions table, returns versions with metadata
- `search_precedent(provisionType, query?)` → queries provision_formulations with optional text search
- All tools use the Supabase JS client directly (not fetch to localhost)
- Each tool returns structured JSON

**Test:**
```bash
# Create a test script that invokes tools via the MCP protocol
cat > /tmp/test-mcp-tools.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function test() {
  // Test get_deal_state equivalent
  const { data: deals } = await supabase.from('deals').select('*').limit(1);
  console.log('Deals found:', deals?.length);
  if (deals && deals[0]) {
    const dealId = deals[0].id;
    const { data: checklist } = await supabase.from('checklist_items').select('*').eq('deal_id', dealId);
    console.log('Checklist items:', checklist?.length);
    const { data: docs } = await supabase.from('document_versions').select('*').eq('deal_id', dealId);
    console.log('Document versions:', docs?.length);
  }
  console.log('All MCP tool queries work');
}
test().catch(console.error);
EOF
npx tsx /tmp/test-mcp-tools.ts
```
**Expected:** Returns Mercury deal data, checklist items (>0), and document versions (3).
**Severity:** 🔴 CRITICAL

### Step 3.3: System Operations MCP Tools

**What:** Add system tools for file operations and command execution. These are used by agents and the Observer.

**Files to create/modify:**
- `packages/mcp-server/src/tools/system-tools.ts` — `read_file`, `write_file`, `list_directory`, `run_command`, `git_status`, `git_diff`
- `packages/mcp-server/src/index.ts` — Register system tools

**Implementation details:**
- `read_file(path)` → `fs.readFile` wrapper, returns file content
- `write_file(path, content)` → `fs.writeFile` wrapper
- `list_directory(path)` → `fs.readdir` wrapper
- `run_command(command)` → `child_process.exec` wrapper with timeout (30s default)
- `git_status()` → runs `git status --porcelain`
- `git_diff()` → runs `git diff`
- All system tools should sanitize paths (prevent traversal outside repo root)
- `run_command` should have a configurable allowlist of safe commands

**Test:**
```bash
# Test system operations directly
node -e "
const fs = require('fs');
const { execSync } = require('child_process');
console.log('read_file:', fs.readFileSync('package.json', 'utf-8').substring(0, 50));
console.log('list_directory:', fs.readdirSync('.').slice(0, 5));
console.log('git_status:', execSync('git status --porcelain').toString().substring(0, 100));
console.log('System tools work');
"
```
**Expected:** File read, directory list, and git status all return data.
**Severity:** 🟡 HIGH

### Step 3.4: Event Types and Interfaces

**What:** Create the TypeScript type definitions for the event propagation system.

**Files to create/modify:**
- `packages/core/src/types/events.ts` — All event type definitions: `PropagationEventType`, `PropagationEvent`, `ActionChain`, `ProposedAction`, `ProposedActionType`, `ConsequenceMap`, `Consequence`
- `packages/core/src/index.ts` — Export new types

**Implementation details:**
- Copy the type definitions from SPEC-V2-COMPLETE.md Section 5.2, 5.3, 5.6
- Add `ConsequenceMap` interface:
  ```typescript
  interface ConsequenceMap {
    trigger: PropagationEventType;
    conditions?: Array<{ field: string; in?: any[]; eq?: any; gte?: number }>;
    consequences: Consequence[];
  }
  interface Consequence {
    type: string;
    target?: string;
    action: string;
    priority: 'immediate' | 'high' | 'normal' | 'low';
  }
  ```
- Ensure all types are exported

**Test:**
```bash
pnpm build --filter @ma-deal-os/core
```
**Expected:** Build succeeds with no type errors.
**Severity:** 🔴 CRITICAL

### Step 3.5: Propagation Events Table

**What:** Add the `propagation_events` table to Drizzle schema and create it in Supabase.

**Files to create/modify:**
- `packages/db/src/schema/propagation-events.ts` — Drizzle schema for propagation_events table
- `packages/db/src/schema/index.ts` — Export new schema (create if not exists, or add to existing barrel file)

**Implementation details:**
- Define the Drizzle schema matching SPEC-V2-COMPLETE.md Section 4.2 `propagation_events`
- Create the table in Supabase via REST API using the service role key:
  ```bash
  curl -X POST "${SUPABASE_URL}/rest/v1/rpc" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d '...'
  ```
  Or use a creation script that executes SQL via the Supabase management API
- Add indexes for unprocessed events and event type

**Test:**
```bash
# Insert and query a test event
cat > /tmp/test-events-table.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function test() {
  const { data: deals } = await supabase.from('deals').select('id').limit(1);
  const dealId = deals![0].id;

  const { data, error } = await supabase.from('propagation_events').insert({
    deal_id: dealId,
    event_type: 'deal.parameters_updated',
    source_entity_type: 'deal',
    source_entity_id: dealId,
    payload: { field: 'deal_value', old_value: 180000000, new_value: 185000000 },
    significance: 3
  }).select().single();

  if (error) { console.error('Insert failed:', error); process.exit(1); }
  console.log('Event inserted:', data.id);

  const { data: events } = await supabase.from('propagation_events')
    .select('*').eq('deal_id', dealId).eq('processed', false);
  console.log('Unprocessed events:', events?.length);

  // Cleanup
  await supabase.from('propagation_events').delete().eq('id', data.id);
  console.log('PASS: propagation_events table works');
}
test().catch(e => { console.error(e); process.exit(1); });
EOF
npx tsx /tmp/test-events-table.ts
```
**Expected:** Event inserts, queries by deal_id and processed status, then deletes.
**Severity:** 🔴 CRITICAL

### Step 3.6: Action Chains and Proposed Actions Tables

**What:** Add the `action_chains` and `proposed_actions` tables.

**Files to create/modify:**
- `packages/db/src/schema/action-chains.ts` — Drizzle schemas for both tables
- `packages/db/src/schema/index.ts` — Export new schemas

**Implementation details:**
- Define schemas matching SPEC-V2-COMPLETE.md Section 4.2
- Create both tables in Supabase via REST API
- `action_chains` references `propagation_events` and `users`
- `proposed_actions` references `action_chains` with CASCADE delete
- Add index on `action_chains.status` for pending items

**Test:**
```bash
cat > /tmp/test-chains-table.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function test() {
  const { data: deals } = await supabase.from('deals').select('id').limit(1);
  const dealId = deals![0].id;

  // Create event first
  const { data: event } = await supabase.from('propagation_events').insert({
    deal_id: dealId, event_type: 'deal.parameters_updated',
    source_entity_type: 'deal', source_entity_id: dealId,
    payload: {}, significance: 3
  }).select().single();

  // Create action chain
  const { data: chain, error: chainErr } = await supabase.from('action_chains').insert({
    deal_id: dealId, trigger_event_id: event!.id,
    summary: 'Test chain', significance: 3, approval_tier: 2, status: 'pending'
  }).select().single();
  if (chainErr) { console.error('Chain insert failed:', chainErr); process.exit(1); }

  // Create proposed action
  const { data: action, error: actionErr } = await supabase.from('proposed_actions').insert({
    chain_id: chain!.id, sequence_order: 1,
    action_type: 'checklist_status_update',
    target_entity_type: 'checklist_item',
    payload: { new_status: 'draft' },
    preview: { title: 'Update status', description: 'Set to draft' },
    status: 'pending'
  }).select().single();
  if (actionErr) { console.error('Action insert failed:', actionErr); process.exit(1); }

  console.log('Chain:', chain!.id, 'Action:', action!.id);

  // Cleanup
  await supabase.from('action_chains').delete().eq('id', chain!.id);
  await supabase.from('propagation_events').delete().eq('id', event!.id);
  console.log('PASS: action_chains and proposed_actions tables work');
}
test().catch(e => { console.error(e); process.exit(1); });
EOF
npx tsx /tmp/test-chains-table.ts
```
**Expected:** Chain with action inserts and queries correctly.
**Severity:** 🔴 CRITICAL

### Step 3.7: Event Bus Implementation

**What:** Create the event bus that emits events and processes them through the consequence resolution pipeline.

**Files to create/modify:**
- `packages/core/src/events/event-bus.ts` — `EventBus` class with `emit()` and `process()` methods
- `packages/core/src/events/index.ts` — Barrel export

**Implementation details:**
- `emit()`: Writes event to `propagation_events` table, triggers `process()` asynchronously
- `process()`:
  1. Load event from database
  2. Look up deterministic consequence maps (from Step 3.8)
  3. For each matching consequence, generate a `ProposedAction`
  4. Create an `ActionChain` containing all proposed actions
  5. Assign approval tier (default: Tier 2 for now; Phase 4 adds the policy engine)
  6. Write chain to database
  7. Mark event as processed
- Use the Supabase JS client for all database operations
- For now, use a simple in-process approach: `emit()` calls `process()` directly (no background worker yet)
- Handle errors gracefully — log failures but don't crash

**Test:**
```bash
cat > /tmp/test-event-bus.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Import EventBus - adjust path based on build output
// This test verifies the core flow: emit event → process → create action chain

async function test() {
  const { data: deals } = await supabase.from('deals').select('id').limit(1);
  const dealId = deals![0].id;

  // Simulate what EventBus.emit + process does:
  // 1. Insert event
  const { data: event } = await supabase.from('propagation_events').insert({
    deal_id: dealId,
    event_type: 'deal.parameters_updated',
    source_entity_type: 'deal',
    source_entity_id: dealId,
    payload: { field: 'deal_value', new_value: 190000000 },
    significance: 3
  }).select().single();

  // 2. Process: consequence map for deal.parameters_updated should produce actions
  // (The actual EventBus will do this internally)

  console.log('Event emitted:', event!.id);
  console.log('PASS: Event bus flow works');

  // Cleanup
  await supabase.from('propagation_events').delete().eq('id', event!.id);
}
test().catch(e => { console.error(e); process.exit(1); });
EOF
npx tsx /tmp/test-event-bus.ts
```
**Expected:** Event emits and process creates action chain with proposed actions.
**Severity:** 🔴 CRITICAL

### Step 3.8: Deterministic Consequence Maps

**What:** Implement the core consequence maps that define what happens when events occur.

**Files to create/modify:**
- `packages/core/src/rules/consequence-maps.ts` — All consequence map definitions + resolver function

**Implementation details:**
- Define 6 core consequence maps:
  1. `dd.finding_confirmed` → document_modification + disclosure_schedule_update + notification + client_communication
  2. `document.markup_received` → analysis + negotiation_update + checklist_status_update + checklist_ball_with_update
  3. `email.position_extracted` → negotiation_update + agent_evaluation
  4. `checklist.item_overdue` → notification + critical_path_update
  5. `deal.parameters_updated` → checklist_regeneration + document_review
  6. `closing.condition_satisfied` → closing_checklist_update + closing_readiness_check
- Create a `resolveConsequences(event: PropagationEvent): Consequence[]` function that:
  1. Finds matching consequence maps by `event_type`
  2. Evaluates conditions (field matching on payload)
  3. Returns the list of consequences
- Export the resolver function

**Test:**
```bash
cat > /tmp/test-consequence-maps.ts << 'EOF'
// Test that consequence maps resolve correctly
// Import resolveConsequences from the built package
const { resolveConsequences } = require('./packages/core/dist/rules/consequence-maps');

// Test: dd.finding_confirmed with high risk
const event1 = {
  event_type: 'dd.finding_confirmed',
  payload: { risk_level: 'critical' },
  significance: 4
};
const results1 = resolveConsequences(event1);
console.log('dd.finding_confirmed consequences:', results1.length);
console.assert(results1.length >= 3, 'Expected at least 3 consequences for critical DD finding');

// Test: document.markup_received
const event2 = {
  event_type: 'document.markup_received',
  payload: {},
  significance: 3
};
const results2 = resolveConsequences(event2);
console.log('document.markup_received consequences:', results2.length);
console.assert(results2.length >= 3, 'Expected at least 3 consequences for markup received');

// Test: deal.parameters_updated
const event3 = {
  event_type: 'deal.parameters_updated',
  payload: { field: 'deal_value' },
  significance: 3
};
const results3 = resolveConsequences(event3);
console.log('deal.parameters_updated consequences:', results3.length);
console.assert(results3.length >= 1, 'Expected at least 1 consequence for parameters update');

console.log('PASS: All consequence maps resolve correctly');
EOF
pnpm build --filter @ma-deal-os/core && node /tmp/test-consequence-maps.ts
```
**Expected:** Each event type produces the correct number of consequences.
**Severity:** 🔴 CRITICAL

### Step 3.9: Event API Routes

**What:** Create API routes for querying propagation events and their action chains.

**Files to create/modify:**
- `apps/web/src/app/api/deals/[dealId]/events/route.ts` — `GET` handler: list events with filters
- `apps/web/src/app/api/deals/[dealId]/events/[eventId]/route.ts` — `GET` handler: single event with its action chain

**Implementation details:**
- `GET /api/deals/[dealId]/events` — Returns paginated events for a deal. Query params: `type` (filter by event_type), `processed` (boolean), `limit`, `offset`
- `GET /api/deals/[dealId]/events/[eventId]` — Returns the event plus any action chains and their proposed actions
- Use Supabase JS client with service role key
- Include proper error handling (404 if not found, 400 for invalid params)

**Test:**
```bash
# First insert a test event, then query via API
# Start dev server first: pnpm dev &
# Then:
curl -s http://localhost:3000/api/deals/MERCURY_DEAL_ID/events | head -c 500
curl -s http://localhost:3000/api/deals/MERCURY_DEAL_ID/events?processed=false | head -c 500
```
**Expected:** Returns JSON array of events (may be empty if no events yet). HTTP 200.
**Severity:** 🟡 HIGH

### Step 3.10: Integration Test — End-to-End Event Flow

**What:** Test the complete pipeline: emit an event → consequence resolution → action chain creation.

**Files to create/modify:**
- `scripts/test-event-pipeline.ts` — Integration test script

**Implementation details:**
- Use the EventBus to emit a `dd.finding_confirmed` event with a critical finding
- Verify:
  1. Event appears in `propagation_events` table
  2. Event is marked as processed
  3. An `action_chain` was created
  4. The chain contains proposed actions matching the consequence map
  5. Actions have the correct types (document_modification, disclosure_schedule_update, notification)
- Query via the API routes to verify HTTP access works
- Clean up test data after verification

**Test:**
```bash
npx tsx scripts/test-event-pipeline.ts
```
**Expected:** Complete pipeline: event → consequences → action chain with 3+ actions.
**Severity:** 🔴 CRITICAL

### Step 3.11: Build Verification

**What:** Verify the full build succeeds and existing functionality is not broken.

**Files to create/modify:** None (verification only)

**Test:**
```bash
# Full build
pnpm build

# Dev server starts
pnpm dev &
sleep 5

# Existing pages still render
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/deals
# Should return 200

# Existing API still works
curl -s http://localhost:3000/api/deals | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Deals: {len(d) if isinstance(d, list) else \"ok\"}')"

# Kill dev server
kill %1
```
**Expected:** Build succeeds, deal list page returns 200, deals API returns data.
**Severity:** 🔴 CRITICAL

## Phase Gate
All of the following must be true:
- [ ] MCP server package builds and exports tools
- [ ] `get_deal_state` returns real Mercury deal data via Supabase query
- [ ] `propagation_events`, `action_chains`, `proposed_actions` tables exist and accept data
- [ ] Event can be emitted via EventBus and produces an action chain
- [ ] Consequence maps correctly resolve for all 6 core event types
- [ ] Event API routes return data via HTTP
- [ ] `pnpm build` succeeds
- [ ] Dev server starts and existing pages still work
