# Phase 4: Approval Framework + Agent Cost Tracking

## Prerequisites
- Phase 3 complete (MCP server, event backbone, action chains working)
- `propagation_events`, `action_chains`, `proposed_actions` tables exist
- EventBus emitting events and creating action chains

## What You're Building

The approval framework is the human-in-the-loop control layer. It determines which system-generated actions execute automatically (Tier 1), which need one-tap approval (Tier 2), and which require the partner's strategic judgment (Tier 3). You are also building the agent cost tracking system and the web UI for the approval queue.

## Reference
- SPEC-V2-COMPLETE.md Sections: 6 (Approval Framework), 7.6-7.7 (Agent Activation/Cost), 18.3-18.5 (API Routes), 19.2 (New Pages)

## Steps

### Step 4.1: Approval Policy Schema and Defaults

**What:** Create the `approval_policies` table and seed the default partner policy.

**Files to create/modify:**
- `packages/db/src/schema/approval-policies.ts` — Drizzle schema
- `packages/core/src/rules/approval-policy.ts` — Default policy definitions, tier assignment function

**Implementation details:**
- Create `approval_policies` table in Supabase
- Implement `assignApprovalTier(actionType, context, policy)` function that:
  1. Loads the applicable policy (deal-specific > user-specific > role-based > default)
  2. Evaluates rules in order (more specific conditions first)
  3. Returns the tier (1, 2, or 3)
- Seed the default partner policy from SPEC-V2-COMPLETE.md Section 6.2

**Test:**
```bash
# Test tier assignment logic
pnpm build --filter @ma-deal-os/core
node -e "
const { assignApprovalTier } = require('./packages/core/dist/rules/approval-policy');
console.assert(assignApprovalTier('notification', {}) === 1, 'notification should be Tier 1');
console.assert(assignApprovalTier('document_edit', {}) === 2, 'document_edit should be Tier 2');
console.assert(assignApprovalTier('client_communication_draft', {}) === 3, 'client_communication should be Tier 3');
console.assert(assignApprovalTier('document_edit', { financial_impact: true }) === 3, 'financial doc edit should be Tier 3');
console.log('PASS: Tier assignment works correctly');
"
```
**Expected:** All tier assignments match the default policy.
**Severity:** 🔴 CRITICAL

### Step 4.2: Auto-Execute Engine for Tier 1

**What:** When the EventBus creates an action chain with Tier 1 approval, auto-execute its actions immediately.

**Files to create/modify:**
- `packages/core/src/events/action-executor.ts` — `executeAction(action)` function for each ProposedActionType
- `packages/core/src/events/event-bus.ts` — Integrate auto-execute after chain creation

**Implementation details:**
- `executeAction(action: ProposedAction)` switches on `action_type`:
  - `checklist_status_update` → updates checklist_items row
  - `checklist_ball_with_update` → updates ball_with field
  - `status_update` → updates the target entity's status
  - `notification` → writes to activity_log
  - `timeline_update` → updates deal dates
- After creating an action chain: if `approval_tier === 1`, iterate through actions and execute each, marking them as `'executed'`, then mark the chain as `'approved'`
- Tier 2 and 3 chains remain `'pending'` in the approval queue

**Test:**
```bash
cat > /tmp/test-auto-execute.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function test() {
  // Emit an event that should trigger Tier 1 consequences (e.g., notification)
  // Verify the action chain was auto-executed
  const { data: chains } = await supabase.from('action_chains')
    .select('*, proposed_actions(*)').eq('approval_tier', 1).eq('status', 'approved').limit(5);
  console.log('Auto-executed chains:', chains?.length || 0);
  console.log('PASS: Auto-execute engine works');
}
test().catch(console.error);
EOF
npx tsx /tmp/test-auto-execute.ts
```
**Expected:** Tier 1 action chains are automatically approved and their actions executed.
**Severity:** 🔴 CRITICAL

### Step 4.3: Approval Queue API Routes

**What:** Create the API routes for the approval queue.

**Files to create/modify:**
- `apps/web/src/app/api/approval-queue/route.ts` — `GET`: list pending chains across all deals
- `apps/web/src/app/api/approval-queue/[chainId]/route.ts` — `GET`: chain detail with actions and previews
- `apps/web/src/app/api/approval-queue/[chainId]/approve/route.ts` — `POST`: approve all actions
- `apps/web/src/app/api/approval-queue/[chainId]/actions/[actionId]/approve/route.ts` — `POST`: approve single
- `apps/web/src/app/api/approval-queue/[chainId]/actions/[actionId]/reject/route.ts` — `POST`: reject single
- `apps/web/src/app/api/approval-queue/[chainId]/actions/[actionId]/modify/route.ts` — `POST`: modify and approve
- `apps/web/src/app/api/approval-queue/stats/route.ts` — `GET`: queue depth, avg resolution time

**Implementation details:**
- `GET /api/approval-queue` — Return chains where `status = 'pending'`, ordered by significance DESC, created_at ASC. Include actions in each chain.
- `POST .../approve` — Set chain status to `'approved'`, execute each action via `executeAction()`, mark actions as `'executed'`
- `POST .../reject` — Set action status to `'rejected'`
- `POST .../modify` — Accept modified payload in request body, update action, then execute
- Stats: count pending chains, average time from creation to approval for recent approved chains

**Test:**
```bash
# Start dev server, create a test chain, then exercise API
pnpm dev &
sleep 5

# Create a Tier 2 test chain
curl -s http://localhost:3000/api/approval-queue | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin), indent=2)[:500])"

# If chains exist, try approving one
# curl -X POST http://localhost:3000/api/approval-queue/{chainId}/approve

kill %1
```
**Expected:** Approval queue API returns pending chains. Approve endpoint marks chain as approved.
**Severity:** 🔴 CRITICAL

### Step 4.4: Approval Policy API Routes

**What:** API for viewing and updating approval policies.

**Files to create/modify:**
- `apps/web/src/app/api/deals/[dealId]/approval-policy/route.ts` — `GET`, `PUT`
- `apps/web/src/app/api/approval-policy/defaults/route.ts` — `GET`

**Implementation details:**
- `GET /api/deals/[dealId]/approval-policy` — Return the effective policy for this deal (deal-specific if exists, else default)
- `PUT /api/deals/[dealId]/approval-policy` — Upsert deal-specific policy
- `GET /api/approval-policy/defaults` — Return the default partner policy

**Test:**
```bash
curl -s http://localhost:3000/api/approval-policy/defaults | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Rules: {len(d.get(\"rules\", []))}')"
```
**Expected:** Returns default policy with 10+ rules.
**Severity:** 🟡 HIGH

### Step 4.5: Agent Activations Table + Cost Tracking

**What:** Create the `agent_activations` table and cost tracking utilities.

**Files to create/modify:**
- `packages/db/src/schema/agent-activations.ts` — Drizzle schema
- `packages/core/src/agents/cost-tracker.ts` — Cost tracking utility: `trackActivation()`, `getCostSummary()`

**Implementation details:**
- Create `agent_activations` table in Supabase
- `trackActivation(params)` — Insert a record with token counts, cost, timing
- `getCostSummary(dealId, dateRange?)` — Query total cost by agent type, by day
- Cost calculation: `total_cost_usd = (input_tokens * input_price + output_tokens * output_price)` where prices are per-model constants
- Model pricing constants:
  - claude-sonnet: $3/M input, $15/M output
  - claude-opus: $15/M input, $75/M output

**Test:**
```bash
cat > /tmp/test-cost-tracking.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function test() {
  const { data: deals } = await supabase.from('deals').select('id').limit(1);
  const dealId = deals![0].id;

  const { data, error } = await supabase.from('agent_activations').insert({
    deal_id: dealId,
    agent_type: 'manager',
    trigger_type: 'event',
    trigger_source: 'dd.finding_confirmed',
    input_tokens: 50000,
    output_tokens: 2000,
    total_cost_usd: 0.18,
    model_used: 'claude-sonnet-4-5-20250929',
    steps: 3,
    tool_calls: 5,
    specialist_invocations: 1,
    duration_ms: 15000
  }).select().single();

  if (error) { console.error(error); process.exit(1); }
  console.log('Activation recorded:', data.id, 'cost:', data.total_cost_usd);

  // Cleanup
  await supabase.from('agent_activations').delete().eq('id', data.id);
  console.log('PASS: Agent activation tracking works');
}
test().catch(e => { console.error(e); process.exit(1); });
EOF
npx tsx /tmp/test-cost-tracking.ts
```
**Expected:** Activation record inserts with cost data.
**Severity:** 🟡 HIGH

### Step 4.6: Agent Management API Routes

**What:** API for agent activation and cost summary.

**Files to create/modify:**
- `apps/web/src/app/api/deals/[dealId]/agent/activations/route.ts` — `GET`: list activations
- `apps/web/src/app/api/deals/[dealId]/agent/cost-summary/route.ts` — `GET`: cost summary
- `apps/web/src/app/api/deals/[dealId]/agent/monitoring-level/route.ts` — `PUT`: set monitoring level

**Implementation details:**
- `GET .../activations` — Return agent activations for the deal, ordered by created_at DESC, paginated
- `GET .../cost-summary` — Return: total cost, cost by agent type, cost by day (for last 30 days)
- `PUT .../monitoring-level` — Update deal's `monitoring_level` field

**Test:**
```bash
curl -s http://localhost:3000/api/deals/MERCURY_ID/agent/cost-summary
```
**Expected:** Returns cost summary JSON (may be zeros if no activations yet).
**Severity:** 🟡 HIGH

### Step 4.7: Approval Queue Web UI

**What:** Create the approval queue page in the web portal.

**Files to create/modify:**
- `apps/web/src/app/approval-queue/page.tsx` — Server component: approval queue page
- `apps/web/src/components/approval-queue/ApprovalCard.tsx` — Client component: single chain card
- `apps/web/src/components/approval-queue/ActionPreview.tsx` — Client component: expandable action preview
- `apps/web/src/components/approval-queue/QueueStats.tsx` — Client component: queue metrics

**Implementation details:**
- Page fetches pending chains from `/api/approval-queue`
- Each chain renders as a card showing: significance (badge), deal name, summary, action count, Approve All / Review buttons
- Clicking "Review" expands the card to show each proposed action with its preview
- Each action has individual Approve / Reject buttons
- Use shadcn/ui components: Card, Badge, Button, Collapsible
- Significance color coding: 1-2 green, 3 yellow, 4-5 red
- Show queue stats at the top: pending count, avg resolution time

**Test:**
```bash
pnpm dev &
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/approval-queue
```
**Expected:** Page returns HTTP 200 and renders approval queue.
**Severity:** 🔴 CRITICAL

### Step 4.8: Integration Test — Full Approval Flow

**What:** End-to-end test of the approval pipeline.

**Implementation details:**
1. Emit an event (e.g., `document.markup_received`) via EventBus
2. Verify action chain is created with Tier 2
3. Query the approval queue API — chain should appear
4. POST to approve the chain
5. Verify all actions are now `'executed'`
6. Verify the chain is now `'approved'`

**Test:**
```bash
npx tsx scripts/test-approval-flow.ts
```
**Expected:** Full cycle: event → chain → approve → execute.
**Severity:** 🔴 CRITICAL

## Phase Gate
- [ ] Approval tiers correctly assigned (Tier 1=auto, 2=approve, 3=review)
- [ ] Tier 1 actions auto-execute on event
- [ ] Approval queue API returns pending chains
- [ ] Approve/reject/modify endpoints work
- [ ] Agent activations table accepts cost data
- [ ] Cost summary API returns aggregated costs
- [ ] Approval queue web page renders at `/approval-queue`
- [ ] End-to-end: event → chain → approve → execute
- [ ] `pnpm build` succeeds
