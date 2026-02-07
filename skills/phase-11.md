# Phase 11: Observer, Coding Agent, Testing Agent

## Prerequisites
- All prior phases complete (3-10)
- Full deal pipeline operational: events → consequences → action chains → approval → execution
- Agent layer functional (Manager, Specialists, Skills)
- Precedent pipeline with quality scoring

## What You're Building

The Observer is a separate agent that watches system operation, detects weaknesses, and implements improvements autonomously. You are also building the Coding Agent and Testing Agent that the Observer uses to make code-level changes.

This is the self-improvement system. It makes the platform better over time without human intervention (though all changes are auditable via git).

## Reference
- SPEC-V2-COMPLETE.md Section 15 (Observer & Self-Improvement), Section 8.6 (Coding/Testing Agents)

## Steps

### Step 11.1: Observer Changelog Table

**What:** Create the `observer_changelog` table for tracking all Observer modifications.

**Files to create/modify:**
- `packages/db/src/schema/observer-changelog.ts` — Drizzle schema

**Implementation details:**
- Create `observer_changelog` table in Supabase matching SPEC-V2-COMPLETE.md Section 4.2
- Fields: change_type, file_path, description, diagnosis, git_commit_hash, test_results, reverted, reverted_at

**Test:**
```bash
cat > /tmp/test-observer-table.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function test() {
  const { data, error } = await supabase.from('observer_changelog').insert({
    change_type: 'skill_update',
    file_path: 'skills/static/domain/markup-analysis.md',
    description: 'Added qualifier tracking instruction',
    diagnosis: 'Markup analyzer missed knowledge qualifier changes'
  }).select().single();
  if (error) { console.error(error); process.exit(1); }
  console.log('Changelog entry:', data.id);
  await supabase.from('observer_changelog').delete().eq('id', data.id);
  console.log('PASS: Observer changelog table works');
}
test().catch(e => { console.error(e); process.exit(1); });
EOF
npx tsx /tmp/test-observer-table.ts
```
**Expected:** Table accepts changelog entries.
**Severity:** 🔴 CRITICAL

### Step 11.2: Evaluation Criteria Framework

**What:** Define the metrics that the Observer evaluates.

**Files to create/modify:**
- `packages/ai/src/agents/observer/evaluation-criteria.ts` — All criteria interfaces and data collection functions
- `packages/ai/src/agents/observer/metrics-collector.ts` — Functions that query databases to compute each metric

**Implementation details:**
- Define interfaces from SPEC: `AccuracyCriteria`, `EfficiencyCriteria`, `QualityCriteria`, `CoverageCriteria`, `CoordinationCriteria`
- Metrics collection functions:
  - `getAccuracyMetrics(dealId)`: Query document versions, checklist items, DD findings for accuracy indicators
  - `getEfficiencyMetrics(dealId)`: Query agent_activations for token costs, processing times
  - `getQualityMetrics(dealId)`: Query action_chains for modification/rejection rates
  - `getCoverageMetrics(dealId)`: Identify gaps in event handling, missing consequence maps
  - `getCoordinationMetrics(dealId)`: Check cross-workstream consistency

**Test:**
```bash
pnpm build --filter @ma-deal-os/ai
node -e "
const { getEfficiencyMetrics } = require('./packages/ai/dist/agents/observer/metrics-collector');
console.log('Metrics collector module loads');
console.log('PASS');
"
```
**Expected:** Module builds and exports metric collection functions.
**Severity:** 🔴 CRITICAL

### Step 11.3: Observer Agent Implementation

**What:** The Observer Agent that monitors, diagnoses, and prescribes improvements.

**Files to create/modify:**
- `packages/ai/src/agents/observer/observer-agent.ts` — Main Observer logic
- `packages/ai/src/agents/observer/system-prompt.ts` — Observer system prompt

**Implementation details:**
- The Observer runs periodically (triggered by a scheduled task or manual invocation)
- Activation flow:
  1. Collect all evaluation metrics
  2. Compare against thresholds (e.g., modification rate > 50% = investigate)
  3. For any violated threshold, diagnose the cause:
     - What skill/prompt/code is responsible?
     - What specific input patterns trigger the issue?
  4. Prescribe a fix (skill update, prompt modification, or code change)
  5. Create an observer_changelog entry describing the issue and proposed fix
- Observer system prompt defines the role, available metrics, and improvement methodology
- Model: `claude-opus-4-6` (requires complex reasoning)
- Output: `{ issues_found, diagnosis, prescribed_fixes, confidence }`

**Test:**
```bash
# Test Observer with mock metrics
cat > /tmp/test-observer.ts << 'EOF'
const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic.default();
async function test() {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1000,
    system: `You are the Observer Agent for the M&A Deal OS platform. Your job is to analyze system performance metrics and identify areas for improvement. Respond with structured JSON.`,
    messages: [{ role: 'user', content: `
System metrics for the last 24 hours:
- Human modification rate on Tier 2 actions: 65% (threshold: 50%)
- Most modified action type: email_draft (modified 8 of 10 times)
- Common modification pattern: tone changed from "formal" to "direct and professional"
- Agent activation efficiency: 82%
- Average processing time: 3.2 seconds

Identify issues and prescribe fixes.
` }]
  });
  console.log('Observer analysis:', response.content[0].text.substring(0, 500));
  console.log('PASS: Observer Agent works');
}
test().catch(console.error);
EOF
npx tsx /tmp/test-observer.ts
```
**Expected:** Observer identifies the email tone issue and prescribes a skill/prompt update.
**Severity:** 🔴 CRITICAL

### Step 11.4: Coding Agent Configuration

**What:** Specialist agent configuration for code-level changes.

**Files to create/modify:**
- `packages/ai/src/agents/specialists/configs/coding-agent-config.ts` — Coding Agent specialist config

**Implementation details:**
- The Coding Agent is a specialist configured with:
  - Skills: system architecture, coding conventions, testing patterns
  - Tools: file_read, file_write, run_command (via MCP)
  - Authority: create files, modify non-governance code, run tests, commit
  - Constraints: follows existing patterns, writes tests, commits every change
- This is used by the Observer to implement code fixes
- Output: `{ files_created, files_modified, tests_created, test_results, git_commit_hash }`

**Test:**
```bash
pnpm build --filter @ma-deal-os/ai
node -e "
const config = require('./packages/ai/dist/agents/specialists/configs/coding-agent-config');
console.log('Coding agent config loaded');
console.log('PASS');
"
```
**Expected:** Config module exports specialist configuration.
**Severity:** 🟡 HIGH

### Step 11.5: Testing Agent Configuration

**What:** Specialist agent configuration for testing and validation.

**Files to create/modify:**
- `packages/ai/src/agents/specialists/configs/testing-agent-config.ts` — Testing Agent specialist config

**Implementation details:**
- Testing Agent configuration:
  - Skills: testing methodology, regression detection, edge case generation
  - Tools: test_runner (MCP), file_read, run_command
  - Constraints: never modifies source code, only creates test files
  - Authority: create tests, run test suite, report results, flag regressions
- Output: `{ tests_run, tests_passed, tests_failed, regression_detected, report }`

**Test:**
```bash
pnpm build --filter @ma-deal-os/ai
```
**Expected:** Config builds without errors.
**Severity:** 🟡 HIGH

### Step 11.6: Observer Improvement Loop

**What:** The full detect → diagnose → prescribe → implement → test → deploy cycle.

**Files to create/modify:**
- `packages/ai/src/agents/observer/improvement-loop.ts` — `runImprovementLoop(dealId?)`

**Implementation details:**
- Full cycle:
  1. **Detect:** Collect metrics, compare thresholds
  2. **Diagnose:** Observer analyzes the root cause
  3. **Prescribe:** Observer proposes specific change (skill update, prompt change, or code fix)
  4. **Implement:** If skill/prompt change → write file directly. If code change → invoke Coding Agent.
  5. **Test:** Invoke Testing Agent to validate the fix
  6. **Deploy:** If tests pass → git commit with descriptive message → update observer_changelog
  7. **Verify:** Flag for monitoring to check if issue recurs
- Max 3 iterations per issue
- If all 3 fail → escalate to human (write to observer_changelog with `needs_human_review = true`)

**Test:**
```bash
# This is a dry run test — don't actually modify code
npx tsx -e "
const { runImprovementLoop } = require('./packages/ai/dist/agents/observer/improvement-loop');
console.log('Improvement loop function exists:', typeof runImprovementLoop);
console.log('PASS');
"
```
**Expected:** Function exists and is callable.
**Severity:** 🟡 HIGH

### Step 11.7: Observer API Routes + Dashboard

**What:** API and UI for viewing Observer activity.

**Files to create/modify:**
- `apps/web/src/app/api/simulation/observer/changelog/route.ts` — GET: Observer change log
- `apps/web/src/app/api/simulation/observer/revert/[commitHash]/route.ts` — POST: Revert a change
- `apps/web/src/app/observer/page.tsx` — Observer dashboard page
- `apps/web/src/components/observer/ChangelogList.tsx` — Client component

**Implementation details:**
- GET changelog: Return observer_changelog entries ordered by created_at DESC
- POST revert: `git revert <commitHash>`, mark changelog entry as reverted
- Dashboard: List of Observer changes with: type, description, diagnosis, test results, revert button
- Each entry shows a diff link (git commit hash)

**Test:**
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/observer
```
**Expected:** Observer dashboard page returns HTTP 200.
**Severity:** 🟡 HIGH

### Step 11.8: Build Verification

**Test:**
```bash
pnpm build
```
**Expected:** Build succeeds.
**Severity:** 🔴 CRITICAL

## Phase Gate
- [ ] observer_changelog table works
- [ ] Evaluation criteria framework collects metrics
- [ ] Observer Agent analyzes metrics and identifies issues
- [ ] Coding Agent and Testing Agent configurations exist
- [ ] Improvement loop function exists (detect → diagnose → prescribe → implement → test → deploy)
- [ ] Observer API returns changelog
- [ ] Observer dashboard renders
- [ ] `pnpm build` succeeds
