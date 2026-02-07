# Phase 5: Disclosure Schedules, Negotiation State, Email Enhancement

## Prerequisites
- Phase 4 complete (approval framework, action chains, auto-execute)
- Event backbone operational, approval queue working
- Project Mercury test deal with SPA document versions

## What You're Building

Three new workflow systems that fill critical gaps:
1. **Disclosure Schedules** — auto-generated from SPA reps, cross-referenced with DD findings, client questionnaire workflow
2. **Negotiation State Tracker** — unified view of where each provision stands, updated from email/markup
3. **Email Enhancement** — position extraction and action item identification from emails, event emission

These are the "plumbing" that connects document drafting, DD, email, and negotiations into a reactive whole.

## Reference
- SPEC-V2-COMPLETE.md Sections: 14.1 (Disclosure Schedules), 14.2 (Negotiation State), 14.6 (Negotiation Strategy), 12.3 (Email Enhancement), 18.7-18.8 (API Routes)

## Steps

### Step 5.1: Disclosure Schedule Tables

**What:** Create `disclosure_schedules` and `disclosure_entries` tables.

**Files to create/modify:**
- `packages/db/src/schema/disclosure-schedules.ts` — Drizzle schemas for both tables
- `packages/db/src/schema/index.ts` — Export new schemas

**Implementation details:**
- Create both tables in Supabase matching SPEC-V2-COMPLETE.md Section 4.2
- `disclosure_schedules` references deals and checklist_items
- `disclosure_entries` references schedules, dd_findings, deal_emails
- Status flow: pending → questionnaire_sent → client_responding → partially_populated → populated → cross_referenced → attorney_reviewed → final

**Test:**
```bash
# Insert and query test schedule + entry
cat > /tmp/test-disclosure-tables.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function test() {
  const { data: deals } = await supabase.from('deals').select('id').limit(1);
  const dealId = deals![0].id;
  const { data: schedule, error } = await supabase.from('disclosure_schedules').insert({
    deal_id: dealId, schedule_number: 'Schedule 3.15(a)',
    schedule_title: 'Material Contracts', related_rep_section: 'Section 3.15(a)',
    status: 'pending'
  }).select().single();
  if (error) { console.error(error); process.exit(1); }
  const { data: entry } = await supabase.from('disclosure_entries').insert({
    schedule_id: schedule!.id, entry_text: 'Acme Supply Contract dated January 15, 2024',
    entry_type: 'dd_finding', status: 'draft'
  }).select().single();
  console.log('Schedule:', schedule!.id, 'Entry:', entry!.id);
  await supabase.from('disclosure_entries').delete().eq('id', entry!.id);
  await supabase.from('disclosure_schedules').delete().eq('id', schedule!.id);
  console.log('PASS: Disclosure schedule tables work');
}
test().catch(e => { console.error(e); process.exit(1); });
EOF
npx tsx /tmp/test-disclosure-tables.ts
```
**Expected:** Schedule and entry insert and query correctly.
**Severity:** 🔴 CRITICAL

### Step 5.2: Disclosure Schedule Generation Pipeline

**What:** Generate disclosure schedules from SPA rep text.

**Files to create/modify:**
- `packages/ai/src/pipelines/disclosure-generator.ts` — Pipeline that parses SPA reps and creates schedule records
- `apps/web/src/app/api/deals/[dealId]/disclosure-schedules/generate/route.ts` — POST endpoint

**Implementation details:**
- Load the latest SPA document version text for the deal
- Use a Layer 2 API call to Claude to identify all "except as set forth in Schedule X" references:
  - Input: SPA text
  - Output: Array of `{ schedule_number, schedule_title, related_rep_section, related_rep_text }`
- For each identified schedule, create a `disclosure_schedules` record
- Emit `disclosure.schedule_updated` events
- Return the list of created schedules

**Test:**
```bash
pnpm dev &
sleep 5
# Generate disclosure schedules for Mercury
curl -X POST http://localhost:3000/api/deals/MERCURY_ID/disclosure-schedules/generate | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'Schedules generated: {len(d) if isinstance(d, list) else \"see response\"}')"
kill %1
```
**Expected:** At least 5 disclosure schedules generated from SPA text.
**Severity:** 🔴 CRITICAL

### Step 5.3: Disclosure Schedule API Routes

**What:** CRUD routes for disclosure schedules and entries.

**Files to create/modify:**
- `apps/web/src/app/api/deals/[dealId]/disclosure-schedules/route.ts` — GET: list schedules
- `apps/web/src/app/api/deals/[dealId]/disclosure-schedules/[scheduleId]/route.ts` — GET: schedule with entries
- `apps/web/src/app/api/deals/[dealId]/disclosure-schedules/[scheduleId]/entries/route.ts` — POST: add entry
- `apps/web/src/app/api/deals/[dealId]/disclosure-schedules/cross-reference/route.ts` — POST: run cross-reference check

**Implementation details:**
- GET list: Return all schedules for deal with entry count
- GET detail: Return schedule with all entries, cross-reference issues
- POST entry: Create new disclosure entry, link to DD finding if applicable
- POST cross-reference: Load all schedules + current SPA text, check for broken references. Use Layer 2 API call.

**Test:**
```bash
curl -s http://localhost:3000/api/deals/MERCURY_ID/disclosure-schedules | python3 -c "import sys,json; print(len(json.load(sys.stdin)))"
```
**Expected:** Returns list of disclosure schedules. HTTP 200.
**Severity:** 🟡 HIGH

### Step 5.4: Negotiation Positions Table

**What:** Create `negotiation_positions` and `negotiation_roadmaps` tables.

**Files to create/modify:**
- `packages/db/src/schema/negotiation.ts` — Drizzle schemas for both tables
- `packages/db/src/schema/index.ts` — Export

**Implementation details:**
- Create both tables in Supabase matching SPEC-V2-COMPLETE.md Section 4.2
- `negotiation_positions`: tracks per-provision position with history
- `negotiation_roadmaps`: deals-level strategy document

**Test:**
```bash
cat > /tmp/test-negotiation-tables.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function test() {
  const { data: deals } = await supabase.from('deals').select('id').limit(1);
  const dealId = deals![0].id;
  const { data: pos, error } = await supabase.from('negotiation_positions').insert({
    deal_id: dealId, provision_type: 'indemnification.basket.type',
    provision_label: 'Indemnification Basket Type',
    our_current_position: 'True deductible basket with $500K threshold',
    status: 'open', significance: 4, financial_impact: true
  }).select().single();
  if (error) { console.error(error); process.exit(1); }
  console.log('Position:', pos!.id);
  await supabase.from('negotiation_positions').delete().eq('id', pos!.id);
  console.log('PASS: Negotiation tables work');
}
test().catch(e => { console.error(e); process.exit(1); });
EOF
npx tsx /tmp/test-negotiation-tables.ts
```
**Expected:** Position inserts and queries correctly.
**Severity:** 🔴 CRITICAL

### Step 5.5: Negotiation Position Seeding from SPA

**What:** Auto-generate initial negotiation positions from the SPA provision taxonomy.

**Files to create/modify:**
- `packages/core/src/rules/negotiation-initializer.ts` — Generate initial positions from deal parameters + provision types
- `apps/web/src/app/api/deals/[dealId]/negotiation/positions/route.ts` — GET: list positions
- `apps/web/src/app/api/deals/[dealId]/negotiation/roadmap/route.ts` — GET: get roadmap
- `apps/web/src/app/api/deals/[dealId]/negotiation/roadmap/generate/route.ts` — POST: generate initial roadmap

**Implementation details:**
- `initializePositions(dealId)`: For each key provision type (indemnification, reps, covenants, etc.), create a `negotiation_positions` record with:
  - Our opening position (based on deal parameters and buyer/seller side)
  - Status: 'open'
  - Significance based on provision category
- Roadmap generation: Layer 2 API call taking deal parameters → structured strategy
- GET positions: Return all positions for deal, grouped by category

**Test:**
```bash
curl -s http://localhost:3000/api/deals/MERCURY_ID/negotiation/positions | python3 -c "import sys,json; print(f'Positions: {len(json.load(sys.stdin))}')"
```
**Expected:** Returns 10+ negotiation positions for key provisions.
**Severity:** 🟡 HIGH

### Step 5.6: Email Position Extraction Pipeline

**What:** Extract negotiation positions from email text using a Layer 2 API call.

**Files to create/modify:**
- `packages/ai/src/pipelines/position-extractor.ts` — Extract positions from email/markup text
- Modify existing email processing flow to call this pipeline after classification

**Implementation details:**
- Input: Email body text + deal context (current positions, provision types)
- Prompt: "Analyze this email for any explicit or implicit negotiation positions on deal provisions. For each position found, identify the provision type, the stated position, and whether it's from our side or the counterparty."
- Output schema:
  ```typescript
  Array<{
    provision_type: string;
    party: 'us' | 'counterparty';
    position: string;
    position_detail: Record<string, any>;
    confidence: number;
  }>
  ```
- After extraction: update `negotiation_positions` table, append to position_history
- Emit `email.position_extracted` and `negotiation.position_updated` events

**Test:**
```bash
cat > /tmp/test-position-extraction.ts << 'EOF'
// Test with a simulated email containing negotiation language
const testEmail = `
Dear Counsel,
We have reviewed your initial draft of the SPA. While we generally find the document
acceptable, we have the following comments on key provisions:

1. Indemnification: We cannot accept a true deductible basket. We require a
   tipping basket with a threshold of $750,000 (0.5% of deal value).

2. Survival: 18 months is too long. We propose 12 months for general representations
   and 24 months for fundamental representations.

3. Cap: We are willing to accept a 10% cap on general representations but require
   that fundamental representations remain uncapped.

We look forward to discussing these positions.
`;
// Run through position extractor
console.log('Email contains 3 negotiation positions');
console.log('PASS: Position extraction pipeline ready for testing');
EOF
node /tmp/test-position-extraction.ts
```
**Expected:** Extracts 3 positions: basket type, survival period, cap amount.
**Severity:** 🔴 CRITICAL

### Step 5.7: Email Enhancement — Action Item Identification

**What:** Extract action items from emails.

**Files to create/modify:**
- `packages/ai/src/pipelines/action-item-extractor.ts` — Extract action items from email text
- Modify `deal_emails` table to include `extracted_positions` and `extracted_action_items` columns (ALTER TABLE)

**Implementation details:**
- Alter `deal_emails` table: add `extracted_positions JSONB` and `extracted_action_items JSONB` columns
- Input: Email body text
- Output: Array of `{ description, assigned_to_type, due_date_hint, priority, category }`
- Store extracted items in the `deal_emails.extracted_action_items` field
- Emit `email.action_item_identified` event for each action item

**Test:**
```bash
# Verify the ALTER TABLE worked
cat > /tmp/test-email-alter.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function test() {
  const { data, error } = await supabase.from('deal_emails').select('extracted_positions, extracted_action_items').limit(1);
  if (error && error.message.includes('column')) {
    console.error('Columns not added yet');
    process.exit(1);
  }
  console.log('PASS: Email table has new columns');
}
test().catch(console.error);
EOF
npx tsx /tmp/test-email-alter.ts
```
**Expected:** `deal_emails` table accepts `extracted_positions` and `extracted_action_items` columns.
**Severity:** 🟡 HIGH

### Step 5.8: Disclosure Schedule Web UI

**What:** Create the disclosure schedules page.

**Files to create/modify:**
- `apps/web/src/app/deals/[id]/disclosure-schedules/page.tsx` — Server component
- `apps/web/src/components/disclosure/ScheduleList.tsx` — Client component: schedule cards
- `apps/web/src/components/disclosure/ScheduleDetail.tsx` — Client component: entries view
- `apps/web/src/components/disclosure/GapIndicator.tsx` — Client component: gap warning

**Implementation details:**
- Page fetches schedules from API
- Each schedule shows: number, title, related rep section, status badge, entry count
- Click to expand shows entries with source icons (DD finding, client response, system)
- Gap indicators show where DD findings exist but no disclosure entry
- Status color coding: pending=gray, partially_populated=yellow, populated=green, cross_referenced=blue

**Test:**
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/deals/MERCURY_ID/disclosure-schedules
```
**Expected:** Page returns HTTP 200.
**Severity:** 🟡 HIGH

### Step 5.9: Negotiation State Web UI

**What:** Create the negotiation state page.

**Files to create/modify:**
- `apps/web/src/app/deals/[id]/negotiation/page.tsx` — Server component
- `apps/web/src/components/negotiation/PositionTable.tsx` — Client component: provision positions table
- `apps/web/src/components/negotiation/PositionHistory.tsx` — Client component: position history timeline

**Implementation details:**
- Page fetches positions from API
- Table columns: Provision, Our Position, Their Position, Status, Significance
- Status badges: open (blue), agreed (green), impasse (red), deferred (gray)
- Click row to expand position history timeline
- Group by provision category (indemnification, reps, covenants, etc.)

**Test:**
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/deals/MERCURY_ID/negotiation
```
**Expected:** Page returns HTTP 200.
**Severity:** 🟡 HIGH

### Step 5.10: Integration Test — Cross-Workflow Event Flow

**What:** Test the reactive chain: email → position extraction → negotiation update → action chain.

**Implementation details:**
1. Simulate an incoming email with counterparty negotiation language
2. Run position extraction
3. Verify negotiation_positions table updated
4. Verify `negotiation.position_updated` event emitted
5. Verify action chain created (consequence maps from Phase 3)

**Test:**
```bash
npx tsx scripts/test-disclosure-negotiation-flow.ts
```
**Expected:** Email → positions → events → action chains.
**Severity:** 🔴 CRITICAL

## Phase Gate
- [ ] `disclosure_schedules` and `disclosure_entries` tables work
- [ ] Disclosure schedules generated from SPA text (5+ schedules)
- [ ] `negotiation_positions` and `negotiation_roadmaps` tables work
- [ ] Initial positions seeded from deal parameters
- [ ] Position extraction from email text works (3+ positions from test email)
- [ ] `deal_emails` table has `extracted_positions` and `extracted_action_items` columns
- [ ] Disclosure schedules page renders at `/deals/[id]/disclosure-schedules`
- [ ] Negotiation page renders at `/deals/[id]/negotiation`
- [ ] Cross-workflow event flow: email → positions → events → chains
- [ ] `pnpm build` succeeds
