# Phase 14: Knowledge Capture + Learning Pipeline

## Prerequisites
- All prior phases complete (3-13)
- Approval framework with approve/modify/reject tracking
- Agent layer operational
- Skills system with adaptive skill directory
- Precedent pipeline with quality scoring

## What You're Building

The learning pipeline that makes the system better with every deal:
1. **Feedback event capture** — every human action (approve, modify, reject) generates a feedback event
2. **Learning pipeline** — updates precedent quality scores, generates adaptive skills, creates test cases
3. **Conversational knowledge encoding** — expert interview interface for capturing partner knowledge
4. **Deal post-mortem** — automated debrief and knowledge extraction at deal close
5. **Cross-deal knowledge aggregation** — patterns across multiple deals

## Reference
- SPEC-V2-COMPLETE.md Sections: 17 (Knowledge & Learning Pipeline), 14.7 (Knowledge Capture), 18.12 (API Routes)

## Steps

### Step 14.1: Feedback Events Table

**What:** Create the `feedback_events` and `deal_knowledge` tables.

**Files to create/modify:**
- `packages/db/src/schema/feedback.ts` — Drizzle schemas for both tables

**Implementation details:**
- Create both tables in Supabase matching SPEC-V2-COMPLETE.md Section 4.2
- `feedback_events`: captures every human action on system output
  - event_type: 'approved', 'modified', 'rejected', 'escalated', 'annotation'
  - Stores original output, modified output, modification delta
  - Optional annotation text
  - Agent context summary and confidence at time of generation
- `deal_knowledge`: structured knowledge entries
  - knowledge_type: 'negotiation_outcome', 'process_learning', 'attorney_preference', 'counterparty_pattern', 'deal_post_mortem', 'provision_outcome'
  - content: JSONB with type-specific structure
  - confidence and sample_size for statistical tracking

**Test:**
```bash
cat > /tmp/test-feedback-tables.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function test() {
  const { data: deals } = await supabase.from('deals').select('id').limit(1);
  const dealId = deals![0].id;

  // Test feedback_events
  const { data: fe, error: feErr } = await supabase.from('feedback_events').insert({
    deal_id: dealId, event_type: 'modified', target_type: 'proposed_action', target_id: dealId,
    original_output: { text: 'Original email draft' },
    modified_output: { text: 'Modified email with different tone' },
    modification_delta: { changed: ['tone'] },
    annotation: 'Tone too formal',
    agent_confidence: 0.75
  }).select().single();
  if (feErr) { console.error(feErr); process.exit(1); }

  // Test deal_knowledge
  const { data: dk, error: dkErr } = await supabase.from('deal_knowledge').insert({
    deal_id: dealId, knowledge_type: 'attorney_preference',
    content: { preference_type: 'basket_type', value: 'true_deductible', confidence: 0.90, sample_size: 4 },
    confidence: 0.90, sample_size: 4
  }).select().single();
  if (dkErr) { console.error(dkErr); process.exit(1); }

  console.log('Feedback event:', fe!.id, 'Knowledge:', dk!.id);
  await supabase.from('feedback_events').delete().eq('id', fe!.id);
  await supabase.from('deal_knowledge').delete().eq('id', dk!.id);
  console.log('PASS: Feedback and knowledge tables work');
}
test().catch(e => { console.error(e); process.exit(1); });
EOF
npx tsx /tmp/test-feedback-tables.ts
```
**Expected:** Both tables accept and return structured data.
**Severity:** 🔴 CRITICAL

### Step 14.2: Feedback Capture Integration

**What:** Integrate feedback event generation into the approval queue workflow.

**Files to modify:**
- `apps/web/src/app/api/approval-queue/[chainId]/approve/route.ts` — Add feedback event generation
- `apps/web/src/app/api/approval-queue/[chainId]/actions/[actionId]/approve/route.ts` — Add feedback
- `apps/web/src/app/api/approval-queue/[chainId]/actions/[actionId]/reject/route.ts` — Add feedback
- `apps/web/src/app/api/approval-queue/[chainId]/actions/[actionId]/modify/route.ts` — Add feedback + delta

**Implementation details:**
- On approve: Create feedback_event with event_type='approved'
- On reject: Create feedback_event with event_type='rejected'
- On modify: Create feedback_event with event_type='modified', include original_output, modified_output, and compute modification_delta
- After modify, prompt for optional annotation: "Brief note on why? (optional)"
- Include the agent_confidence from the proposed_action record

**Test:**
```bash
# Exercise approval flow and verify feedback events are created
cat > /tmp/test-feedback-capture.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function test() {
  const { data } = await supabase.from('feedback_events').select('*').limit(5);
  console.log('Feedback events in DB:', data?.length || 0);
  console.log('PASS: Feedback capture system ready');
}
test().catch(console.error);
EOF
npx tsx /tmp/test-feedback-capture.ts
```
**Expected:** Feedback events created on every approval/reject/modify action.
**Severity:** 🔴 CRITICAL

### Step 14.3: Learning Pipeline — Precedent Quality Updates

**What:** Process feedback events to update precedent formulation quality scores.

**Files to create/modify:**
- `packages/core/src/learning/precedent-quality-updater.ts` — Process feedback for formulation quality
- `packages/core/src/learning/learning-pipeline.ts` — Main pipeline orchestrator

**Implementation details:**
- When a feedback event involves a document_edit or document_generate action:
  1. Identify which precedent formulations were used (from the action's payload/context)
  2. If event_type='approved': increase composite_quality_score by 0.02
  3. If event_type='modified': decrease by 0.02, store partner's version as new formulation with score 0.85
  4. If event_type='rejected': decrease by 0.05
- Run as a background job after each feedback event

**Test:**
```bash
pnpm build --filter @ma-deal-os/core
node -e "
const { processQualityFeedback } = require('./packages/core/dist/learning/precedent-quality-updater');
console.log('Quality updater loaded:', typeof processQualityFeedback);
console.log('PASS');
"
```
**Expected:** Function exists and is callable.
**Severity:** 🟡 HIGH

### Step 14.4: Learning Pipeline — Adaptive Skill Generation

**What:** Detect patterns in feedback events and generate adaptive skills.

**Files to create/modify:**
- `packages/core/src/learning/adaptive-skill-generator.ts` — Pattern detection and skill generation
- `packages/ai/src/pipelines/skill-generator.ts` — Layer 2 pipeline to generate skill from pattern

**Implementation details:**
- Pattern detection:
  1. Group feedback events by target_type + action_type
  2. For each group, analyze modification_deltas
  3. If the same kind of modification appears 3+ times → pattern detected
  4. Examples: "Partner always changes basket type from tipping to true deductible", "Partner always changes tone from formal to direct"
- Skill generation:
  1. Collect the pattern (what was changed, how, when)
  2. Use Layer 2 API call: "Generate an adaptive skill from this pattern: [description]. Format as a skill markdown file."
  3. Write to `skills/adaptive/partner-preferences/` or appropriate subdirectory
  4. Register in skills_registry table

**Test:**
```bash
pnpm build --filter @ma-deal-os/core
node -e "
const { detectPatterns } = require('./packages/core/dist/learning/adaptive-skill-generator');
console.log('Pattern detector loaded:', typeof detectPatterns);
console.log('PASS');
"
```
**Expected:** Pattern detection function exists.
**Severity:** 🟡 HIGH

### Step 14.5: Learning Pipeline — Test Case Generation

**What:** Every rejected or heavily modified action becomes a test case.

**Files to create/modify:**
- `packages/core/src/learning/test-case-generator.ts` — Generate test cases from feedback

**Implementation details:**
- For each rejected or modified feedback event:
  1. Extract: input context (what the agent had), system output, human modification, annotation
  2. Generate structured test case:
     ```typescript
     interface GeneratedTestCase {
       id: string;
       source_feedback_event_id: string;
       input_context: Record<string, any>;
       system_output: Record<string, any>;
       expected_output: Record<string, any>; // The human's version
       annotation?: string;
       created_at: string;
     }
     ```
  3. Store in a `test-data/generated-test-cases/` directory as JSON files
- These are used by the Observer (Phase 11) for regression testing

**Test:**
```bash
pnpm build --filter @ma-deal-os/core
```
**Expected:** Build succeeds.
**Severity:** 🟢 MEDIUM

### Step 14.6: Feedback API Route

**What:** API for submitting feedback events and querying knowledge.

**Files to create/modify:**
- `apps/web/src/app/api/feedback/route.ts` — POST: submit feedback event
- `apps/web/src/app/api/deals/[dealId]/knowledge/route.ts` — GET: deal knowledge entries

**Implementation details:**
- POST `/feedback`: Accept feedback event data, validate, insert, trigger learning pipeline
- GET `/deals/[dealId]/knowledge`: Return knowledge entries for the deal, filterable by knowledge_type

**Test:**
```bash
curl -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"deal_id":"MERCURY_ID","event_type":"annotation","target_type":"document_version","target_id":"some-id","annotation":"This provision needs stronger language"}'
```
**Expected:** Feedback event created. HTTP 201.
**Severity:** 🟡 HIGH

### Step 14.7: Conversational Knowledge Encoding

**What:** Chat interface for expert knowledge capture.

**Files to create/modify:**
- `apps/web/src/app/api/knowledge/encode/route.ts` — POST: knowledge encoding endpoint
- `packages/ai/src/pipelines/knowledge-encoder.ts` — Layer 2 pipeline for structuring expert input

**Implementation details:**
- Encoding flow:
  1. System presents a question (from a template library or dynamic based on gaps)
  2. Partner responds naturally
  3. System structures into knowledge entries + skill annotations
  4. Store in deal_knowledge and update relevant skills
- Question templates:
  - "For a [deal_type] in [industry], what provisions do you focus on first?"
  - "Here are three formulations. Which is best and why?"
  - "What's your typical approach to [negotiation_issue]?"
- The AI call: "Structure this expert input into deal knowledge entries with types: [list]. Also identify any skill annotations (preferences, patterns, conventions)."

**Test:**
```bash
curl -X POST http://localhost:3000/api/knowledge/encode \
  -H "Content-Type: application/json" \
  -d '{"message":"For mid-market tech deals, I always start with indemnification. True deductible basket, 15% cap, 18 month survival. Non-negotiable below 12 months."}'
```
**Expected:** Returns structured knowledge entries extracted from natural language.
**Severity:** 🟡 HIGH

### Step 14.8: Deal Post-Mortem Pipeline

**What:** Automated knowledge extraction at deal close.

**Files to create/modify:**
- `packages/ai/src/pipelines/deal-post-mortem.ts` — Post-mortem analysis pipeline

**Implementation details:**
- Triggered when deal status changes to 'closed' or 'terminated'
- Auto-generates knowledge entries:
  1. Negotiation outcomes: For every negotiation_position that reached 'agreed', capture opening/closing/final positions
  2. Provision outcomes: For every precedent formulation used, capture whether it was accepted/modified
  3. Process timeline: How long each phase took (from activity_log timestamps)
  4. Feedback patterns: Aggregate modification patterns from feedback_events
- Optionally invites partner to conversational debrief
- Store all entries in deal_knowledge table

**Test:**
```bash
pnpm build --filter @ma-deal-os/ai
```
**Expected:** Build succeeds.
**Severity:** 🟢 MEDIUM

### Step 14.9: Precedent Quality Report

**What:** API endpoint showing quality distribution across the precedent database.

**Files to create/modify:**
- `apps/web/src/app/api/precedent/quality-report/route.ts` — GET: quality distribution

**Implementation details:**
- Query provision_formulations aggregated by:
  - Quality score distribution (histogram: 0-0.2, 0.2-0.4, 0.4-0.6, 0.6-0.8, 0.8-1.0)
  - Count by provision_type
  - Count by source (EDGAR, system_generated, partner_authored)
  - Average quality by provision_type
- Return structured report

**Test:**
```bash
curl -s http://localhost:3000/api/precedent/quality-report | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin), indent=2)[:500])"
```
**Expected:** Returns quality distribution data.
**Severity:** 🟢 MEDIUM

### Step 14.10: Build Verification

**Test:**
```bash
pnpm build
```
**Expected:** Full build succeeds.
**Severity:** 🔴 CRITICAL

## Phase Gate
- [ ] feedback_events and deal_knowledge tables work
- [ ] Feedback events auto-generated on approve/modify/reject
- [ ] Learning pipeline updates precedent quality scores from feedback
- [ ] Adaptive skill detection identifies patterns from 3+ similar modifications
- [ ] Test cases generated from rejected/modified actions
- [ ] Feedback API endpoint works
- [ ] Conversational knowledge encoding extracts structured knowledge from natural language
- [ ] Deal post-mortem pipeline generates knowledge entries
- [ ] Precedent quality report shows distribution
- [ ] `pnpm build` succeeds
