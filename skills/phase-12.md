# Phase 12: Simulation Framework

## Prerequisites
- All Phases 3-11 complete (full deal pipeline, agents, Observer)
- Real API keys for Claude, Google Drive
- Email integration infrastructure (from Phase 5 enhancements)

## What You're Building

The simulation framework is the comprehensive test harness. Two platform instances running a full deal lifecycle against each other:
1. **Dual instance infrastructure** — two separate deal contexts simulating buyer and seller sides
2. **Simulation clock** — controls time progression (real-time, compressed, skip-ahead)
3. **Client agents** — simulate business principals with objectives and imperfections
4. **Third-party agents** — simulate escrow agents, R&W brokers, etc.
5. **Scenario seeding tools** — VDR documents, term sheet, client instructions
6. **Evaluation report generation** — comprehensive simulation scoring

## Reference
- SPEC-V2-COMPLETE.md Section 16 (Simulation Framework), 18.14 (Simulation API Routes)

## Steps

### Step 12.1: Simulation Infrastructure

**What:** Create the simulation management framework.

**Files to create/modify:**
- `packages/core/src/simulation/simulation-manager.ts` — SimulationManager class
- `packages/core/src/simulation/simulation-clock.ts` — Time control
- `packages/core/src/types/simulation.ts` — Simulation types

**Implementation details:**
- `SimulationManager`: Manages simulation lifecycle (setup, run, pause, evaluate)
  - Creates two deal contexts (buyer side, seller side) in the same database with different deal IDs
  - Manages simulation state (phase, clock, active agents)
  - Coordinates cross-side communication via simulated email
- `SimulationClock`: Controls time progression
  - Real-time mode: events at actual speed
  - Compressed mode: each simulated day = N minutes
  - Skip-ahead mode: jump past waiting periods
  - All date-based logic uses `clock.now()` instead of `Date.now()`
- Types: `SimulationConfig`, `SimulationState`, `SimulationPhase`

**Test:**
```bash
pnpm build --filter @ma-deal-os/core
node -e "
const { SimulationClock } = require('./packages/core/dist/simulation/simulation-clock');
const clock = new SimulationClock({ mode: 'compressed', ratio: 100 });
console.log('Clock mode:', clock.mode);
console.log('Current sim time:', clock.now());
clock.advance(86400000); // advance 1 day
console.log('After advance:', clock.now());
console.log('PASS');
"
```
**Expected:** Simulation clock advances time correctly.
**Severity:** 🔴 CRITICAL

### Step 12.2: Scenario Seeding

**What:** Tools to seed a simulation scenario with VDR documents, term sheet, and client instructions.

**Files to create/modify:**
- `packages/core/src/simulation/scenario-seeder.ts` — `seedScenario(config): Promise<ScenarioContext>`
- `test-data/simulation/` — Seed data files (term sheet, client instructions, sample contracts)

**Implementation details:**
- Create seed data files based on SPEC-V2-COMPLETE.md Section 16.2:
  - `test-data/simulation/term-sheet.md` — The $150M stock purchase term sheet
  - `test-data/simulation/seller-client-instructions.md` — Founder CEO email to seller's counsel
  - `test-data/simulation/buyer-client-instructions.md` — PE fund partner email to buyer's counsel
  - `test-data/simulation/vdr-manifest.json` — Manifest of VDR documents (50-100 entries with metadata)
- `seedScenario()`:
  1. Create buyer-side deal record
  2. Create seller-side deal record
  3. Parse term sheet into deal parameters for both sides
  4. Seed DD findings (8 seeded issues from SPEC) as hidden data to be "discovered"
  5. Create initial checklist items on both sides
  6. Return simulation context with both deal IDs

**Test:**
```bash
cat > /tmp/test-scenario-seed.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function test() {
  // Verify seed data files exist
  const fs = require('fs');
  const files = [
    'test-data/simulation/term-sheet.md',
    'test-data/simulation/seller-client-instructions.md',
    'test-data/simulation/buyer-client-instructions.md'
  ];
  for (const f of files) {
    if (!fs.existsSync(f)) { console.error('Missing:', f); process.exit(1); }
    console.log('EXISTS:', f);
  }
  console.log('PASS: Seed data files exist');
}
test().catch(console.error);
EOF
npx tsx /tmp/test-scenario-seed.ts
```
**Expected:** All seed data files exist with realistic content.
**Severity:** 🔴 CRITICAL

### Step 12.3: Client Agent Implementation

**What:** Autonomous agents simulating business principals (seller CEO, buyer PE partner).

**Files to create/modify:**
- `packages/ai/src/agents/simulation/client-agent.ts` — Client agent that responds to requests
- `packages/ai/src/agents/simulation/client-configs.ts` — Buyer and seller client configurations

**Implementation details:**
- Client agents are configured with:
  - `objectives`: What they want from the deal
  - `personality`: responsive vs. slow, detailed vs. terse, anxious vs. confident
  - `knowledge`: What they know about the target/acquisition
  - `imperfections`: Delayed responses, incomplete info, occasional contradictions
- When invoked (e.g., "Client needs to provide employee census data"):
  1. Load client config
  2. Generate response based on personality + knowledge
  3. Introduce realistic imperfections (e.g., incomplete data, wrong format, delayed)
  4. Return response content
- Seller client: Founder CEO, confident, speed-focused, defensive about employees, doesn't fully understand contractor risk
- Buyer client: PE partner, thorough, price-sensitive, wants strong protections

**Test:**
```bash
cat > /tmp/test-client-agent.ts << 'EOF'
const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic.default();
async function test() {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 500,
    system: `You are simulating the Founder CEO of a mid-market SaaS company being acquired. You are confident, speed-focused, and protective of your employees. You sometimes provide incomplete information. You honestly believe your independent contractors are properly classified (they are not).`,
    messages: [{ role: 'user', content: 'We need you to confirm the employment classification of your independent contractors. Can you provide details?' }]
  });
  console.log('Client response:', response.content[0].text.substring(0, 300));
  console.log('PASS: Client agent simulation works');
}
test().catch(console.error);
EOF
npx tsx /tmp/test-client-agent.ts
```
**Expected:** Client responds in character with realistic imperfections.
**Severity:** 🟡 HIGH

### Step 12.4: Third-Party Agent Implementation

**What:** Lightweight agents simulating escrow agents, R&W brokers, etc.

**Files to create/modify:**
- `packages/ai/src/agents/simulation/third-party-agent.ts` — Third-party agent
- `packages/ai/src/agents/simulation/third-party-configs.ts` — Configs for each third-party type

**Implementation details:**
- Simpler than client agents. Each third-party:
  - Receives instructions (engagement letter, instructions)
  - Produces standard deliverables after a configurable delay
  - Responds to comments with generic professional responses
  - Can introduce delays ("We need additional information from...") to test follow-up logic

**Test:**
```bash
pnpm build --filter @ma-deal-os/ai
```
**Expected:** Third-party agent module builds.
**Severity:** 🟢 MEDIUM

### Step 12.5: Simulation Execution Engine

**What:** The engine that runs a simulation from start to finish.

**Files to create/modify:**
- `packages/core/src/simulation/simulation-runner.ts` — `runSimulation(config): Promise<SimulationReport>`

**Implementation details:**
- Orchestrates the 9 simulation phases:
  1. Intake: Both sides process client instructions, parse term sheet
  2. First Draft: Seller generates SPA draft
  3. DD + Markup: Buyer reviews VDR, marks up SPA
  4. Negotiation: 3-4 rounds of markup exchange
  5. Disclosure Schedules: Client agent populates, cross-reference check
  6. Third-Party Coordination: Escrow, R&W insurance
  7. Closing Preparation: Checklist, conditions, funds flow
  8. Closing: Condition satisfaction, signature release
  9. Post-Closing: Obligation tracking
- Each phase emits events via the event backbone
- The simulation clock controls pacing
- Observer monitors throughout

**Test:**
```bash
# Test that simulation runner initializes (don't run full simulation)
pnpm build --filter @ma-deal-os/core
node -e "
const { SimulationRunner } = require('./packages/core/dist/simulation/simulation-runner');
console.log('SimulationRunner class loaded');
console.log('PASS');
"
```
**Expected:** Module loads without errors.
**Severity:** 🟡 HIGH

### Step 12.6: Simulation Evaluation Report

**What:** Generate the comprehensive evaluation report after a simulation run.

**Files to create/modify:**
- `packages/ai/src/agents/observer/simulation-report.ts` — Report generation
- `apps/web/src/app/api/simulation/report/route.ts` — GET: simulation report
- `apps/web/src/app/api/simulation/status/route.ts` — GET: simulation status

**Implementation details:**
- Report includes: accuracy scores, efficiency scores, quality scores, coverage scores, coordination scores, total cost, observer changes, remaining gaps, recommendations
- Generated by Observer Agent after simulation completes
- Stored in database for historical comparison

**Test:**
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/simulation/status
```
**Expected:** Returns HTTP 200 (may return empty/initial state if no simulation run).
**Severity:** 🟡 HIGH

### Step 12.7: Simulation Web UI

**What:** Simulation control and monitoring page.

**Files to create/modify:**
- `apps/web/src/app/simulation/page.tsx` — Simulation dashboard
- `apps/web/src/components/simulation/SimulationControls.tsx` — Start/pause/speed controls
- `apps/web/src/components/simulation/SimulationTimeline.tsx` — Phase progress visualization

**Test:**
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/simulation
```
**Expected:** Page returns HTTP 200.
**Severity:** 🟢 MEDIUM

### Step 12.8: Build Verification

**Test:**
```bash
pnpm build
```
**Expected:** Build succeeds.
**Severity:** 🔴 CRITICAL

## Phase Gate
- [ ] Simulation clock with real-time/compressed/skip-ahead modes
- [ ] Scenario seeding creates buyer + seller deals with seed data
- [ ] Client agents respond in character with realistic imperfections
- [ ] Third-party agent configurations exist
- [ ] Simulation runner initializes and manages phase progression
- [ ] Simulation status API works
- [ ] Simulation page renders
- [ ] `pnpm build` succeeds
