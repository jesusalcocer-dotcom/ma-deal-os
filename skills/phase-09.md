# Phase 9: Partner Constitution & Governance

## Prerequisites
- Phase 7 complete (Manager Agent functional)
- Phase 8 complete (Skills loaded into specialists)
- Approval framework operational (Phase 4)

## What You're Building

The Partner Constitution is the governance layer that shapes all agent behavior for a deal. You are building:
1. **Constitution data model** — hard constraints, preferences, strategic directives
2. **Conversational encoding interface** — partner speaks naturally, system structures into constitution
3. **Constitution enforcement** — Manager Agent loads and obeys constitution, consequence resolver checks actions against constraints
4. **Hard constraint blocking** — violating actions are blocked and escalated to Tier 3

## Reference
- SPEC-V2-COMPLETE.md Section 9 (Partner Constitution & Governance), 18.6 (Constitution API Routes)

## Steps

### Step 9.1: Constitution Data Model

**What:** Add the constitution field to the deals table and define the TypeScript types.

**Files to create/modify:**
- `packages/core/src/types/constitution.ts` — `PartnerConstitution`, `HardConstraint`, `Preference`, `StrategicDirective` interfaces
- ALTER TABLE deals to add `constitution JSONB` and `monitoring_level TEXT DEFAULT 'standard'` columns

**Implementation details:**
- Types match SPEC-V2-COMPLETE.md Section 9.1 exactly
- ALTER TABLE via Supabase REST API or SQL execution
- Constitution is stored as JSONB on the deal record (not a separate table — it's deal-specific)
- Default: null (no constitution = no additional constraints beyond system defaults)

**Test:**
```bash
cat > /tmp/test-constitution-column.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function test() {
  const { data: deals } = await supabase.from('deals').select('id, constitution, monitoring_level').limit(1);
  console.log('Deal constitution:', deals![0].constitution);
  console.log('Monitoring level:', deals![0].monitoring_level);

  // Update with a test constitution
  const testConstitution = {
    hard_constraints: [
      { id: '1', category: 'negotiation', description: 'No indemnification cap below 10%',
        rule: 'Block if indemnification_cap < 0.10 * deal_value', consequence: 'block_and_escalate' }
    ],
    preferences: [
      { id: '1', category: 'drafting', description: 'Use true deductible basket',
        default_behavior: 'Draft with true deductible', override_condition: 'If counterparty insists and we get cap concession' }
    ],
    strategic_directives: [
      { id: '1', description: 'Speed matters — competitive auction', applies_to: ['document_pipeline'], priority: 'primary' }
    ]
  };

  const { error } = await supabase.from('deals').update({ constitution: testConstitution }).eq('id', deals![0].id);
  if (error) { console.error(error); process.exit(1); }

  // Clear it back
  await supabase.from('deals').update({ constitution: null }).eq('id', deals![0].id);
  console.log('PASS: Constitution column works');
}
test().catch(e => { console.error(e); process.exit(1); });
EOF
npx tsx /tmp/test-constitution-column.ts
```
**Expected:** Constitution JSONB field accepts and returns structured data.
**Severity:** 🔴 CRITICAL

### Step 9.2: Constitution API Routes

**What:** API for viewing, updating, and encoding constitutions.

**Files to create/modify:**
- `apps/web/src/app/api/deals/[dealId]/constitution/route.ts` — GET, PUT
- `apps/web/src/app/api/deals/[dealId]/constitution/encode/route.ts` — POST: conversational encoding

**Implementation details:**
- GET: Return the deal's current constitution (or null if not set)
- PUT: Replace the entire constitution. Validate structure (must have hard_constraints, preferences, strategic_directives arrays)
- POST `/encode`: Accept `{ message }` from partner. Use Layer 2 API call:
  - System prompt: "You are structuring a partner's deal preferences into a constitution. Extract hard constraints (inviolable rules), preferences (defaults with override conditions), and strategic directives from the following natural language input."
  - Return: Proposed additions/modifications to the constitution
  - The UI then shows the proposed changes for confirmation

**Test:**
```bash
pnpm dev &
sleep 5

# Get constitution (should be null initially)
curl -s http://localhost:3000/api/deals/MERCURY_ID/constitution

# Set a constitution
curl -X PUT http://localhost:3000/api/deals/MERCURY_ID/constitution \
  -H "Content-Type: application/json" \
  -d '{
    "hard_constraints": [{"id":"1","category":"communication","description":"Nothing to client without approval","rule":"All client_facing actions require Tier 3","consequence":"block_and_escalate"}],
    "preferences": [{"id":"1","category":"drafting","description":"True deductible basket","default_behavior":"Draft with true deductible","override_condition":"Counterparty insists + cap concession"}],
    "strategic_directives": [{"id":"1","description":"Competitive auction - speed matters","applies_to":["document_pipeline","email_communication"],"priority":"primary"}]
  }'

# Verify it was saved
curl -s http://localhost:3000/api/deals/MERCURY_ID/constitution | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Constraints: {len(d.get(\"hard_constraints\",[]))}')"

kill %1
```
**Expected:** Constitution saved and retrieved correctly.
**Severity:** 🔴 CRITICAL

### Step 9.3: Conversational Encoding Pipeline

**What:** The AI pipeline that converts natural language partner input into constitutional provisions.

**Files to create/modify:**
- `packages/ai/src/pipelines/constitution-encoder.ts` — `encodeConstitution(message, existingConstitution?): Promise<ConstitutionDelta>`

**Implementation details:**
- Input: Partner's natural language text + current constitution (if any)
- Prompt: Analyze the message for:
  1. Hard constraints (things that MUST/MUST NOT happen)
  2. Preferences (default behaviors with exceptions)
  3. Strategic directives (overall approach guidance)
- Output:
  ```typescript
  interface ConstitutionDelta {
    add_constraints: HardConstraint[];
    add_preferences: Preference[];
    add_directives: StrategicDirective[];
    modify: Array<{ id: string; changes: Partial<HardConstraint | Preference | StrategicDirective> }>;
    reasoning: string; // Why these were extracted
  }
  ```
- Model: `claude-sonnet-4-5-20250929`

**Test:**
```bash
curl -X POST http://localhost:3000/api/deals/MERCURY_ID/constitution/encode \
  -H "Content-Type: application/json" \
  -d '{"message":"I want a clean exit for my client. No long-tail indemnification beyond the escrow. And nothing goes to the counterparty without my approval."}'
```
**Expected:** Returns structured delta with 2+ constraints/preferences extracted.
**Severity:** 🟡 HIGH

### Step 9.4: Constitution Enforcement in Manager Agent

**What:** Update the Manager Agent to load and obey the constitution.

**Files to modify:**
- `packages/ai/src/agents/manager/system-prompt.ts` — Include constitution in system prompt
- `packages/ai/src/agents/manager/context-loader.ts` — Load constitution from deal record

**Implementation details:**
- When building Manager prompt, inject constitution section:
  ```
  ## PARTNER CONSTITUTION
  You MUST obey these rules at all times.

  ### Hard Constraints (INVIOLABLE)
  [List each constraint with its rule]

  ### Preferences (DEFAULTS)
  [List each preference with default and override condition]

  ### Strategic Directives
  [List each directive]
  ```
- In the Manager's instructions, explicitly state:
  - "If any proposed action would violate a hard constraint, do NOT propose it. Instead, create a Tier 3 escalation explaining the conflict."
  - "Follow preferences unless you have a justified reason to deviate. If deviating, explain why."
  - "Use strategic directives to guide all decision-making."

**Test:**
```bash
# Set a constitution on Mercury, then ask the Manager to propose something that violates it
curl -X POST http://localhost:3000/api/deals/MERCURY_ID/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Draft an email to the counterparty counsel about our position on indemnification cap","agent_type":"manager"}'
# The response should reference the constitution if one is set
```
**Expected:** Manager's response acknowledges constitutional constraints.
**Severity:** 🔴 CRITICAL

### Step 9.5: Constitution Enforcement in Consequence Resolver

**What:** Check action chains against the constitution before routing to approval queue.

**Files to modify:**
- `packages/core/src/events/event-bus.ts` — Add constitution check after action chain creation

**Implementation details:**
- After generating an action chain, before writing to DB:
  1. Load the deal's constitution
  2. For each proposed action, check against hard constraints:
     - `client_facing` actions + constraint blocking client communication → flag
     - `financial_impact` actions + financial constraint → flag
     - Document edits violating indemnification floor → flag
  3. Any flagged action gets: `constitutional_violation = true`, `approval_tier = 3`
  4. Add a note to the action's preview explaining the constitutional issue
- This is deterministic (Layer 1) — pattern matching on action type and payload against constraint rules

**Test:**
```bash
# Create a constitution with a hard constraint, then trigger an event that would violate it
cat > /tmp/test-constitution-enforcement.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function test() {
  const { data: deals } = await supabase.from('deals').select('id').limit(1);
  const dealId = deals![0].id;

  // Set constitution: no client communication without approval
  await supabase.from('deals').update({
    constitution: {
      hard_constraints: [
        { id: '1', category: 'communication', description: 'No client communication without approval',
          rule: 'client_facing_actions_require_tier3', consequence: 'block_and_escalate' }
      ],
      preferences: [],
      strategic_directives: []
    }
  }).eq('id', dealId);

  console.log('Constitution set. Testing enforcement...');
  // An action chain with a client_communication_draft should be auto-elevated to Tier 3

  // Clear constitution
  await supabase.from('deals').update({ constitution: null }).eq('id', dealId);
  console.log('PASS: Constitution enforcement test ready');
}
test().catch(e => { console.error(e); process.exit(1); });
EOF
npx tsx /tmp/test-constitution-enforcement.ts
```
**Expected:** Client-facing actions automatically elevated to Tier 3 when constitution requires it.
**Severity:** 🔴 CRITICAL

### Step 9.6: Constitution Web UI

**What:** Page for viewing and editing the constitution.

**Files to create/modify:**
- `apps/web/src/app/deals/[id]/constitution/page.tsx` — Server component
- `apps/web/src/components/constitution/ConstitutionEditor.tsx` — Client component: structured editor
- `apps/web/src/components/constitution/ConversationalEncoder.tsx` — Client component: natural language input + preview

**Implementation details:**
- Page shows current constitution in structured format:
  - Hard constraints (red border) with rule text
  - Preferences (yellow border) with default and override
  - Strategic directives (blue border) with applies_to tags
- "Add via conversation" button opens natural language input
- User types natural language → calls encode API → shows proposed changes → confirm to merge
- Each item has edit/delete buttons
- Shows a "No constitution set" state with "Create Constitution" button

**Test:**
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/deals/MERCURY_ID/constitution
```
**Expected:** Page returns HTTP 200.
**Severity:** 🟡 HIGH

### Step 9.7: Build Verification

**Test:**
```bash
pnpm build
```
**Expected:** Full build succeeds.
**Severity:** 🔴 CRITICAL

## Phase Gate
- [ ] Constitution JSONB field on deals table works
- [ ] GET/PUT API for constitution
- [ ] Conversational encoding extracts constraints/preferences/directives from natural language
- [ ] Manager Agent loads constitution into system prompt
- [ ] Consequence resolver checks actions against hard constraints
- [ ] Violating actions auto-elevated to Tier 3
- [ ] Constitution page renders with structured view
- [ ] `pnpm build` succeeds
