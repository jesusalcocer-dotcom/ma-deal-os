# CLAUDE.md — Autonomous Build Protocol for M&A Deal OS

## READ THIS FIRST, EVERY SESSION

You are building the M&A Deal Operating System. This file governs how you operate.

---

## SESSION START PROTOCOL

Every time you start a session, do these steps in order:

1. **Read `BUILD_STATE.json`** at the repo root. This tells you exactly where you are.
2. **Check for `GUIDANCE.md`** at the repo root. If it exists, read it — it contains instructions from the human operator. Follow them, then delete the file and commit.
3. **Read the skill file** for your current phase: `skills/phase-{NN}.md` where NN is `current_phase` from BUILD_STATE.json.
4. **Resume from the last completed step.** The skill file has numbered steps. BUILD_STATE.json tells you which step you're on.
5. **Start building.**

Do NOT read the full SPEC.md on every session — it's too large. The skill files contain everything you need for the current phase. Only consult SPEC.md if the skill file explicitly tells you to reference a specific section.

---

## THE BUILD-TEST-COMMIT LOOP

This is your core operating cycle. Repeat until the phase is complete:

```
BUILD a step (one logical unit of work)
    ↓
TEST it (run the tests specified in the skill file)
    ↓
EVALUATE test results:
    ├── All pass → COMMIT + PUSH + ADVANCE
    ├── Non-critical fail → COMMIT + PUSH + FLAG + ADVANCE
    └── Critical fail → FIX (up to 3 attempts)
         ├── Fixed → COMMIT + PUSH + ADVANCE
         └── Not fixed → COMMIT [WIP] + LOG BLOCKER + SKIP if possible
```

### What Counts as a "Step"

A step is one logical unit that can be built, tested, and committed independently. Examples:
- Create a new database table and its Drizzle schema
- Implement an API route
- Build a UI component
- Write a pipeline function
- Add a set of related tests

A step should take 10-30 minutes. If you're spending more than 45 minutes on a single step without committing, you're going too big. Break it down.

### How to Test

Each skill file specifies tests for each step. Run them. The tests fall into categories:

- **Programmatic tests:** `curl` commands, TypeScript test scripts, `pnpm build`
- **Database verification:** Query Supabase via REST API to verify data
- **UI verification:** Check HTTP status codes and page content via `curl`
- **Integration tests:** End-to-end flows through multiple systems

Always start the dev server (`pnpm dev`) before running HTTP-based tests. Kill it when done testing that step.

---

## SEVERITY AND GATING

### Test Severity Levels

🔴 **CRITICAL** — Must pass. Cannot advance to next step or phase.
🟡 **HIGH** — Should pass. Commit with flag, must fix before deployment. Can advance.
🟢 **MEDIUM** — Nice to have. Log it, defer it, advance.

### Phase Gate Rules

To advance from Phase N to Phase N+1:
- ALL 🔴 CRITICAL tests must pass
- 🟡 HIGH failures are logged in BUILD_STATE.json `deferred_items` array
- 🟢 MEDIUM failures are logged but don't appear in deferred_items

### The 3-Attempt Rule

If a critical test fails:
1. Analyze the failure. Fix the code. Re-run.
2. If still failing: try a different approach. Re-run.
3. If still failing: try one more approach. Re-run.

After 3 failed attempts:
- If there's a workaround that preserves functionality: use it, commit, document in BUILD_STATE.json
- If the step is blocking all subsequent steps: commit current state as `[WIP]`, log the blocker, and STOP. The human will provide guidance.
- If subsequent steps can proceed without this one: commit `[WIP]`, log blocker, skip to next step.

---

## GIT PROTOCOL

### Commit Messages

Format: `[Phase X.Y] Description — tests: N/M passing`

Examples:
```
[Phase 3.1] Add propagation_events table and Drizzle schema — tests: 3/3 passing
[Phase 3.2] Implement event bus with background processor — tests: 5/5 passing
[Phase 3.3] [WIP] Consequence maps - deterministic rules — tests: 4/6 passing (2 HIGH deferred)
[Phase 4.1] Approval policy schema and defaults — tests: 2/2 passing
```

### Push Protocol

Push after EVERY successful commit. Do not batch commits.

```bash
git add -A
git commit -m "[Phase X.Y] Description — tests: N/M passing"
git push origin main
```

If push fails (conflict, auth error): log the error in BUILD_STATE.json and stop. Do not force push. Do not rebase.

### BUILD_STATE.json Update

After every commit-and-push, update BUILD_STATE.json:

```bash
# Update the state file
# (modify the JSON to reflect new current_step, attempts, etc.)
git add BUILD_STATE.json
git commit -m "state: completed Phase X step Y"
git push origin main
```

This is a separate commit so the state file always reflects the latest committed code.

---

## ENVIRONMENT CONSTRAINTS

These are hard constraints from the existing build. Do not fight them.

### Database: Supabase via REST API for testing
- Direct PostgreSQL connection (`db.*.supabase.co`) does NOT resolve in Claude Code's environment
- Do NOT attempt `drizzle-kit push` — the schema is managed externally
- For ALL testing queries, use the Supabase JS client with the service role key
- Production code uses Drizzle ORM with `DATABASE_URL` — this is correct, don't change it

### Real API Keys
- Anthropic API: Real key, make real calls. Do not mock AI responses.
- Google Drive: Real service account. Test real file operations.
- Microsoft/Outlook: OAuth requires browser. Build correctly, verify config, cannot complete handshake.

### Credentials
All credentials are in `.env.local` at repo root (and copied to `apps/web/.env.local` and `packages/db/.env.local`). If these files don't exist, check BUILD_STATE.json for instructions or create them from the values in the environment.

### Package Management
- Use `pnpm` (not npm, not yarn)
- The repo is a Turborepo monorepo
- Install new dependencies in the correct package (`pnpm add <pkg> --filter @ma-deal-os/core`)

---

## WHAT'S ALREADY BUILT (DO NOT REBUILD)

Phases 0-2 are complete. This code exists and works:

- **Monorepo structure:** apps/web, packages/core, packages/db, packages/ai, packages/integrations
- **Database:** 14 tables in Supabase (deals, checklist_items, document_versions, users, deal_emails, provision_formulations, provision_types, provision_variants, dd_findings, dd_topics, drive_sync_records, activity_log, deal_team_members, deal_agent_memory)
- **Deal CRUD:** API routes for create, read, update, list deals
- **Term sheet parser:** Claude API integration, extracts deal parameters
- **Checklist generator:** Generates checklist from deal parameters, differentiates SPA/APA/Merger
- **Document pipeline:** v1 (template) → v2 (precedent via Claude) → v3 (deal scrub via Claude)
- **Provision taxonomy:** 50 SPA provision types seeded
- **EDGAR precedent database:** 10 real deals harvested
- **Provision segmenter:** Breaks documents into 30-60 tagged sections
- **Google Drive integration:** Service account, folder creation, file upload
- **Web UI:** Deal list, deal detail, checklist page, documents page with version history
- **DOCX generation:** Creates downloadable Word documents

**Test deal "Project Mercury"** exists in Supabase with checklist items and 3 document versions.

DO NOT recreate, overwrite, or refactor this code unless a skill file explicitly tells you to modify specific files for integration purposes.

---

## FILE STRUCTURE CONVENTIONS

```
ma-deal-os/
├── CLAUDE.md                    ← You are here
├── BUILD_STATE.json             ← Session continuity
├── SPEC.md                      ← Complete V2 specification (reference only)
├── GUIDANCE.md                  ← Human operator instructions (check + delete)
├── skills/                      ← Phase-specific build instructions
│   ├── phase-03.md
│   ├── phase-04.md
│   └── ...
├── apps/
│   └── web/                     ← Next.js app
│       ├── src/
│       │   ├── app/             ← Pages and API routes
│       │   └── components/      ← React components
│       └── .env.local
├── packages/
│   ├── core/                    ← Business logic, types, rules
│   │   └── src/
│   ├── db/                      ← Drizzle schema and migrations
│   │   └── src/
│   ├── ai/                      ← Claude API pipelines
│   │   └── src/
│   ├── integrations/            ← Drive, email, external services
│   │   └── src/
│   └── mcp-server/              ← MCP server (to be built)
│       └── src/
├── config/                      ← Credentials
├── scripts/                     ← Build and test scripts
├── test-data/                   ← Test fixtures
└── docs/
    └── test-results/            ← Phase test reports
```

When creating new code:
- Types and interfaces → `packages/core/src/types/`
- Business logic and rules → `packages/core/src/`
- Database schema → `packages/db/src/schema/`
- AI pipelines → `packages/ai/src/pipelines/`
- External integrations → `packages/integrations/src/`
- API routes → `apps/web/src/app/api/`
- UI pages → `apps/web/src/app/`
- UI components → `apps/web/src/components/`
- MCP tools → `packages/mcp-server/src/`

---

## TEST REPORT FORMAT

After completing each phase, create `docs/test-results/phase{N}_test_report.md`:

```markdown
# Phase {N} Test Report — {Phase Title}

**Date**: {date}
**Status**: {PASS / PARTIAL / BLOCKED}
**Score**: X/Y PASS, Z DEFERRED

## Test Results
| Test ID | Name | Severity | Result | Notes |
|---------|------|----------|--------|-------|
| P{N}-T01 | ... | 🔴/🟡/🟢 | PASS/FAIL/DEFERRED | ... |

## Issues Found and Fixed
| Issue | Severity | Fix | Verified |
|-------|----------|-----|----------|

## Deferred Items
| Item | Severity | Reason | Impact |
|------|----------|--------|--------|

## Gate Decision
Ready for Phase {N+1}: YES / NO
Blocking issues: {list if NO}
```

---

## WHEN TO STOP

Stop building and wait for human guidance when:
- A critical test fails after 3 fix attempts AND no workaround exists AND subsequent steps depend on it
- You encounter an environment limitation you can't work around (new one, not the known Supabase/OAuth ones)
- BUILD_STATE.json `blocking_issues` has 3+ unresolved items
- You've been working on the same step for more than 60 minutes without progress
- Git push fails

When stopping: commit everything, update BUILD_STATE.json with a clear description of the blocker, and end the session. The human will see the state file and provide guidance.

---

## REMEMBER

1. **Small commits, frequent pushes.** Every step committed separately.
2. **The skill file is your guide.** Follow it step by step. Don't skip ahead.
3. **BUILD_STATE.json is sacred.** Always accurate. Always committed after changes.
4. **Don't rebuild what works.** Phases 0-2 are done. Extend, don't rewrite.
5. **When in doubt, commit and push.** Half-done code in the repo is better than perfect code lost to a session timeout.
6. **Read GUIDANCE.md first.** The human may have left you instructions.

# CLAUDE.md ADDENDUM — Learning System (Phases 15-20)

## Add this section to the existing CLAUDE.md after "WHAT'S ALREADY BUILT"

---

## LEARNING SYSTEM ARCHITECTURE (Phases 15-20)

### Reference Document
Before building any learning system phase, read `docs/LEARNING_ARCHITECTURE.md`. This is the comprehensive reference document describing the four subsystems, five signal sources, reflection engine, knowledge injection, distillation pipeline, meta agent, and all database schemas. The skill files reference it frequently.

### New Packages and Directories
Learning system code goes in these locations:

```
packages/ai/src/
  evaluation/           ← Self-evaluation, consistency checks, variant comparison
    rubrics.ts
    self-evaluator.ts
    consistency-checker.ts
    variant-generator.ts
    outcome-tracker.ts
    exemplar-service.ts
    spend-tracker.ts
  learning/             ← Reflection engine, pattern lifecycle
    signal-aggregator.ts
    reflection-engine.ts
    pattern-lifecycle.ts
    pattern-tracker.ts
  prompts/              ← 5-layer prompt assembly
    prompt-assembler.ts
    layers/
      constitutional.ts
      firm-knowledge.ts
      learned-patterns.ts
      deal-intelligence.ts
      exemplars.ts
  communication/        ← Inter-agent communication
    deal-intelligence.ts
    agent-requests.ts
    request-orchestrator.ts
  distillation/         ← Distillation pipeline
    trial-runner.ts
    shadow-runner.ts
    spot-checker.ts
  routing/              ← Model routing
    model-router.ts
    novelty-scorer.ts
  agents/meta/          ← Meta agent
    meta-agent.ts
    meta-prompts.ts
    trigger-detector.ts

packages/db/src/schema/
  learning-signals.ts       ← Signal collection tables
  learning-patterns.ts      ← Pattern and reflection tables
  learning-communication.ts ← Agent communication tables
  learning-distillation.ts  ← Distillation and routing tables
  learning-governance.ts    ← Audit and config tables

apps/web/src/app/
  settings/models/      ← Model routing settings UI
  settings/learning/    ← Learning toggle settings UI
  settings/spend/       ← Spend control settings UI
  learning/             ← Learning dashboard
    patterns/           ← Pattern explorer
    agents/             ← Agent performance
    consistency/        ← Consistency log
    audit/              ← Audit trail
  how-it-works/         ← Explanation page
```

### Key Patterns for Learning Code

**1. Always check if learning is enabled before running learning operations:**
```typescript
const enabled = await getLearningConfig('learning.self_evaluation.enabled');
if (!enabled?.enabled) return; // Skip if disabled
```

**2. Fire-and-forget for non-blocking learning operations:**
```typescript
// Self-evaluation should NOT block the agent's response
this.selfEvaluator.evaluate(params).catch(err => console.error('Eval failed:', err));
```

**3. All learning changes go through audit log:**
```typescript
await auditLog.record('pattern_created', {
  entityType: 'pattern', entityId: pattern.id,
  description: '...', beforeState: null, afterState: pattern,
  reasoning: reflection.reasoning,
});
```

**4. Supabase REST API for all table creation and testing queries:**
```typescript
// Create tables via SQL execution
const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
// Or if rpc not available, use the Supabase Dashboard SQL Editor for initial table creation,
// then verify via REST API queries

// All CRUD via Supabase client
const { data } = await supabase.from('learned_patterns').select('*').eq('lifecycle_stage', 'confirmed');
```

**5. Model selection always goes through the ModelRouter:**
```typescript
// NEVER hardcode model selection in learning phases
const selection = await modelRouter.getModel(taskType, dealContext);
// Then use: selection.model === 'opus' ? 'claude-opus-4-6' : 'claude-sonnet-4-5-20250929'
```

### Testing Learning System Code

Learning system tests require actual data in the learning tables. For initial phases, seed test data before running tests. As the system accumulates real signals, tests can use production data.

```bash
# Seed test data for learning system
npx tsx scripts/seed-learning-test-data.ts

# Run learning-specific tests
npx tsx scripts/test-self-evaluation.ts
npx tsx scripts/test-consistency-check.ts
npx tsx scripts/test-reflection-engine.ts
npx tsx scripts/test-prompt-assembler.ts
npx tsx scripts/test-full-learning-loop.ts

# Verify all learning tables
npx tsx scripts/verify-learning-schema.ts
```

### Environment Variables (no new ones needed)
The learning system uses the existing Anthropic API key and Supabase credentials. No additional environment variables are required.
