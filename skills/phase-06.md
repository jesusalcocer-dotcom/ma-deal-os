# Phase 6: Closing Mechanics, Client Management, Third-Party Tracking

## Prerequisites
- Phase 5 complete (disclosure schedules, negotiation tracker, email enhancement)
- Event backbone and approval framework operational

## What You're Building

Three workflow systems that complete the deal lifecycle:
1. **Closing Mechanics** — closing checklist, conditions, deliverables, funds flow, post-closing obligations
2. **Client Management** — contacts, action items, automated communications
3. **Third-Party Tracking** — escrow agents, R&W brokers, accountants, etc.

## Reference
- SPEC-V2-COMPLETE.md Sections: 14.3 (Third-Party), 14.4 (Client), 14.5 (Closing), 18.9-18.11 (API Routes)

## Steps

### Step 6.1: Third-Party Table + API

**What:** Create `deal_third_parties` table and CRUD API.

**Files to create/modify:**
- `packages/db/src/schema/third-parties.ts` — Drizzle schema
- `apps/web/src/app/api/deals/[dealId]/third-parties/route.ts` — GET, POST
- `apps/web/src/app/api/deals/[dealId]/third-parties/[tpId]/route.ts` — PATCH

**Implementation details:**
- Table matches SPEC-V2-COMPLETE.md Section 4.2
- GET: List third parties for deal with deliverable status summaries
- POST: Add third party with role, firm, contacts, deliverables
- PATCH: Update status, deliverables, communication dates

**Test:**
```bash
# Insert and query a third party
curl -X POST http://localhost:3000/api/deals/MERCURY_ID/third-parties \
  -H "Content-Type: application/json" \
  -d '{"role":"escrow_agent","firm_name":"JPMorgan Chase","contact_name":"John Smith","contact_email":"jsmith@jpmorgan.com"}'
```
**Expected:** Third party created. GET returns it.
**Severity:** 🔴 CRITICAL

### Step 6.2: Client Management Tables + API

**What:** Create `client_contacts`, `client_action_items`, `client_communications` tables and API routes.

**Files to create/modify:**
- `packages/db/src/schema/client-management.ts` — Drizzle schemas for all 3 tables
- `apps/web/src/app/api/deals/[dealId]/client/contacts/route.ts` — GET, POST
- `apps/web/src/app/api/deals/[dealId]/client/action-items/route.ts` — GET, POST
- `apps/web/src/app/api/deals/[dealId]/client/communications/route.ts` — GET
- `apps/web/src/app/api/deals/[dealId]/client/communications/generate/route.ts` — POST

**Implementation details:**
- Tables match SPEC-V2-COMPLETE.md Section 4.2
- Action items track what the client needs to do (disclosures, signatures, board approvals)
- Communications auto-generation: Layer 2 API call taking deal state → client-appropriate status update
- POST generate: Creates a draft client communication requiring Tier 3 approval
- Emit `client.action_item_created` and `client.communication_needed` events

**Test:**
```bash
# Create a client contact
curl -X POST http://localhost:3000/api/deals/MERCURY_ID/client/contacts \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Founder","email":"jane@target.com","role":"principal","is_primary":true}'

# Create an action item
curl -X POST http://localhost:3000/api/deals/MERCURY_ID/client/action-items \
  -H "Content-Type: application/json" \
  -d '{"description":"Provide employee census data","category":"financial_data","priority":"high"}'
```
**Expected:** Contact and action item created. GET returns them.
**Severity:** 🔴 CRITICAL

### Step 6.3: Client Communication Generation

**What:** Auto-generate client status updates and action item requests.

**Files to create/modify:**
- `packages/ai/src/pipelines/client-communication.ts` — Layer 2 pipeline for status updates

**Implementation details:**
- Input: Deal state summary (parameters, checklist status, key milestones, pending action items)
- Prompt: "Generate a professional client status update email. The client is [role]. Include: current status, recent progress, upcoming milestones, and any action items. Use [tone] tone."
- Output: `{ subject, body }` suitable for email
- Store as `client_communications` record with status='draft'
- These always require Tier 3 approval (per default constitution)

**Test:**
```bash
curl -X POST http://localhost:3000/api/deals/MERCURY_ID/client/communications/generate \
  -H "Content-Type: application/json" \
  -d '{"type":"status_update"}'
```
**Expected:** Draft communication created with professional status update text.
**Severity:** 🟡 HIGH

### Step 6.4: Closing Checklist Tables

**What:** Create `closing_checklists`, `closing_conditions`, `closing_deliverables`, `post_closing_obligations` tables.

**Files to create/modify:**
- `packages/db/src/schema/closing.ts` — Drizzle schemas for all 4 tables
- Also ALTER TABLE checklist_items to add `closing_checklist_id` column

**Implementation details:**
- Tables match SPEC-V2-COMPLETE.md Section 4.2
- `closing_checklists` is the parent with overall status, target date, funds flow, signatures
- `closing_conditions` tracks each condition (mutual, buyer, seller) with satisfaction evidence
- `closing_deliverables` tracks certificates, opinions, signature pages, etc.
- `post_closing_obligations` tracks earnouts, escrow releases, etc.

**Test:**
```bash
cat > /tmp/test-closing-tables.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function test() {
  const { data: deals } = await supabase.from('deals').select('id').limit(1);
  const dealId = deals![0].id;
  const { data: cl } = await supabase.from('closing_checklists').insert({
    deal_id: dealId, status: 'draft', conditions_total: 8
  }).select().single();
  const { data: cond } = await supabase.from('closing_conditions').insert({
    closing_checklist_id: cl!.id, deal_id: dealId,
    description: 'HSR clearance obtained', condition_type: 'mutual',
    category: 'regulatory', responsible_party: 'regulatory', status: 'pending'
  }).select().single();
  console.log('Checklist:', cl!.id, 'Condition:', cond!.id);
  await supabase.from('closing_conditions').delete().eq('id', cond!.id);
  await supabase.from('closing_checklists').delete().eq('id', cl!.id);
  console.log('PASS: Closing tables work');
}
test().catch(e => { console.error(e); process.exit(1); });
EOF
npx tsx /tmp/test-closing-tables.ts
```
**Expected:** All 4 tables accept data and cascade correctly.
**Severity:** 🔴 CRITICAL

### Step 6.5: Closing Checklist Generation

**What:** Auto-generate closing checklist from SPA conditions article.

**Files to create/modify:**
- `packages/ai/src/pipelines/closing-generator.ts` — Layer 2 pipeline parsing conditions article
- `apps/web/src/app/api/deals/[dealId]/closing/generate/route.ts` — POST endpoint
- `apps/web/src/app/api/deals/[dealId]/closing/route.ts` — GET endpoint

**Implementation details:**
- Load latest SPA text
- Layer 2 API call to identify all closing conditions from the SPA
- Output: Array of `{ description, condition_type, category, responsible_party, blocks_closing }`
- Create `closing_checklists` record + `closing_conditions` records
- Also generate standard closing deliverables (certificates, opinions, signatures)
- Emit `closing.condition_satisfied` events as conditions are marked satisfied

**Test:**
```bash
curl -X POST http://localhost:3000/api/deals/MERCURY_ID/closing/generate | python3 -c "
import sys,json; d=json.load(sys.stdin); print(f'Conditions: {d.get(\"conditions_total\", 0)}')"
```
**Expected:** Closing checklist with 6+ conditions generated from SPA.
**Severity:** 🔴 CRITICAL

### Step 6.6: Closing API Routes

**What:** Condition and deliverable update endpoints.

**Files to create/modify:**
- `apps/web/src/app/api/deals/[dealId]/closing/conditions/[conditionId]/route.ts` — PATCH
- `apps/web/src/app/api/deals/[dealId]/closing/deliverables/[deliverableId]/route.ts` — PATCH
- `apps/web/src/app/api/deals/[dealId]/closing/funds-flow/route.ts` — GET
- `apps/web/src/app/api/deals/[dealId]/post-closing/route.ts` — GET

**Implementation details:**
- PATCH condition: Update status to satisfied/waived/failed with evidence. Emit closing events.
- PATCH deliverable: Update status to received/reviewed/approved. Update received_at.
- GET funds-flow: Generate from deal parameters (purchase price, escrow, adjustments). Layer 2 if complex.
- GET post-closing: List post-closing obligations for the deal.

**Test:**
```bash
curl -s http://localhost:3000/api/deals/MERCURY_ID/closing | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin), indent=2)[:500])"
```
**Expected:** Returns closing checklist with conditions and deliverables.
**Severity:** 🟡 HIGH

### Step 6.7: Closing Dashboard Web UI

**What:** Create the closing dashboard page with traffic light condition view.

**Files to create/modify:**
- `apps/web/src/app/deals/[id]/closing/page.tsx` — Server component
- `apps/web/src/components/closing/ClosingDashboard.tsx` — Client component
- `apps/web/src/components/closing/ConditionCard.tsx` — Condition with status indicator
- `apps/web/src/components/closing/ReadinessBar.tsx` — Progress bar showing N/M conditions met

**Implementation details:**
- Traffic light: green=satisfied, yellow=pending, red=failed/blocked
- Readiness bar: `conditions_satisfied / conditions_total` as a progress bar
- Sections: Conditions (grouped by type), Deliverables (grouped by responsible party), Funds Flow, Post-Closing
- Each condition has a "Mark Satisfied" button that emits the event

**Test:**
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/deals/MERCURY_ID/closing
```
**Expected:** Page returns HTTP 200 with closing dashboard.
**Severity:** 🟡 HIGH

### Step 6.8: Client Management Web UI

**What:** Client management page.

**Files to create/modify:**
- `apps/web/src/app/deals/[id]/client/page.tsx` — Server component
- `apps/web/src/components/client/ClientDashboard.tsx` — Contacts, action items, communications

**Implementation details:**
- Three tabs: Contacts, Action Items, Communications
- Action items: table with description, category, due date, status, follow-up count
- Communications: list of drafts and sent communications with approval status

**Test:**
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/deals/MERCURY_ID/client
```
**Expected:** Page returns HTTP 200.
**Severity:** 🟡 HIGH

### Step 6.9: Third-Party Web UI

**What:** Third-party tracking page.

**Files to create/modify:**
- `apps/web/src/app/deals/[id]/third-parties/page.tsx` — Server component
- `apps/web/src/components/third-party/ThirdPartyList.tsx` — Third party cards with deliverable status

**Test:**
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/deals/MERCURY_ID/third-parties
```
**Expected:** Page returns HTTP 200.
**Severity:** 🟢 MEDIUM

### Step 6.10: Build Verification

**Test:**
```bash
pnpm build
pnpm dev &
sleep 5
for page in closing client third-parties; do
  echo -n "$page: "
  curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/deals/MERCURY_ID/$page
  echo
done
kill %1
```
**Expected:** Build succeeds. All new pages return 200.
**Severity:** 🔴 CRITICAL

## Phase Gate
- [ ] All 7 new tables created and accept data
- [ ] Third-party CRUD API works
- [ ] Client contacts, action items, communications API works
- [ ] Client communication auto-generation produces professional text
- [ ] Closing checklist generated from SPA (6+ conditions)
- [ ] Condition satisfaction updates emit events
- [ ] Closing dashboard page with traffic light view renders
- [ ] Client management page renders
- [ ] Third-party page renders
- [ ] `pnpm build` succeeds
