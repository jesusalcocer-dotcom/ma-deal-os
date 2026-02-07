# Phase 20: Meta Agent + Control Plane + Learning Dashboard

## Prerequisites
- Phases 15-19 must be complete (full learning loop operational)
- All learning tables populated with data

## What You're Building

This phase builds the Meta Agent (the unsticker that handles failures and conflicts), the control plane UI (settings pages for managing the learning system), and the learning dashboard (observability into how the system is learning). This is the "management interface" — what the partner sees and controls.

## Reference
- `docs/LEARNING_ARCHITECTURE.md` — Sections 7 (Meta Agent), 8 (Control Plane), 9 (Dashboard)

## Steps

### Step 20.1: Meta Agent Implementation

**What:** Create the Meta Agent — an Opus-only agent that intervenes when other agents fail or conflict.

**Files to create:**
- `packages/ai/src/agents/meta/meta-agent.ts` — Core implementation
- `packages/ai/src/agents/meta/meta-prompts.ts` — System prompts
- `packages/ai/src/agents/meta/trigger-detector.ts` — Detects when Meta should activate

**Implementation details:**

```typescript
export class MetaAgent {
  /**
   * Called when a trigger condition is met. Always uses Opus.
   * Has read access to EVERYTHING: documents, emails, database, all MCP tools.
   */
  async intervene(trigger: MetaTrigger): Promise<MetaIntervention> {
    const context = await this.gatherFullContext(trigger);
    
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      system: META_AGENT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildMetaPrompt(trigger, context) }],
      tools: [...this.dealMCPTools, ...this.systemMCPTools], // full tool access
    });

    const decision = parseMetaDecision(response);
    
    // Execute the decision
    switch (decision.mode) {
      case 'reroute':
        await this.executeReroute(decision);
        break;
      case 'decompose':
        await this.executeDecompose(decision);
        break;
      case 'synthesize':
        await this.executeSynthesize(decision);
        break;
      case 'escalate':
        await this.executeEscalate(decision);
        break;
    }

    // Record intervention
    await this.recordIntervention(trigger, decision);
    return decision;
  }
}

export class TriggerDetector {
  /**
   * Checks if a Meta Agent intervention should be triggered.
   * Called after agent invocations, evaluation results, and consistency checks.
   */
  async checkTrigger(event: {
    type: 'agent_failure' | 'low_score' | 'max_retries' | 'contradiction' | 'agent_request';
    details: any;
  }): Promise<MetaTrigger | null> {
    switch (event.type) {
      case 'agent_failure':
        if (event.details.retryCount >= 3) return { reason: 'tool_failure', ...event.details };
        break;
      case 'low_score':
        if (event.details.score < 0.4) return { reason: 'low_score', ...event.details };
        break;
      case 'contradiction':
        if (event.details.severity === 'high' && !event.details.resolved) {
          return { reason: 'contradiction', ...event.details };
        }
        break;
    }
    return null;
  }
}
```

**Meta Agent system prompt should instruct:**
- Analyze the failure/conflict with full context
- Choose one of four modes: reroute, decompose, synthesize, escalate
- For escalation: provide specific problem + what was tried + 2-3 options with tradeoffs
- Never "help me figure this out" — always "choose A, B, or C"

**Test:**
```bash
# Trigger 1: Create a task that fails 3 times
# Verify Meta Agent activates, attempts to reroute or decompose
# Trigger 2: Create a self-evaluation with score < 0.4
# Verify Meta Agent activates
# Trigger 3: Create an unresolved high-severity consistency check
# Verify Meta Agent activates and either resolves or escalates
npx tsx scripts/test-meta-agent.ts
```
**Severity:** 🔴 CRITICAL

### Step 20.2: Wire Meta Agent Triggers into Agent Pipeline

**What:** Integrate the trigger detector into the existing agent invocation and evaluation pipelines.

**Files to modify:**
- `packages/ai/src/agents/agent-invoker.ts` — Check for meta triggers after failures and evaluations
- `packages/ai/src/evaluation/self-evaluator.ts` — Check for low score trigger
- `packages/ai/src/evaluation/consistency-checker.ts` — Check for unresolved contradiction trigger

**Test:**
```bash
# End-to-end: invoke agent that fails → meta agent activates → resolves
```
**Severity:** 🟡 HIGH

### Step 20.3: Model Routing Settings Page

**What:** Create the UI for managing model routing configuration.

**Files to create:**
- `apps/web/src/app/settings/models/page.tsx` — Model routing settings page
- `apps/web/src/components/learning/model-routing-table.tsx` — Table component

**Implementation details:**

The page shows a table with one row per task type:

| Task | Current Model | Distillation Status | Exemplars | Actions |
|---|---|---|---|---|
| Email Extraction | Sonnet ▼ | Handed off ✓ | 23 | [Run Trial] |
| Disclosure Gen | Opus ▼ | Testing... | 11/15 | [View Trials] |
| Document Drafting | Opus ▼ | Not ready | 4/15 | — |

Plus settings:
- Dynamic promotion toggle (auto-escalate underperforming tasks)
- Promotion threshold slider (default 0.70)
- Dynamic demotion toggle (suggest downgrade for high-scoring tasks)
- Demotion threshold slider (default 0.95)
- Min exemplars for testing (default 15)
- Handoff threshold (default 0.85)
- Spot-check frequency (default every 10th)

All settings read/write via the `/api/learning/routing` and `/api/learning/config` API routes.

**Test:**
```bash
# Start dev server
pnpm dev
# Navigate to /settings/models
# Verify table renders with all task types
# Change a model dropdown → verify API called and config updated
# Toggle dynamic promotion → verify config updated
```
**Severity:** 🟡 HIGH

### Step 20.4: Learning Toggles Settings Page

**What:** Create the UI for enabling/disabling individual learning components.

**Files to create:**
- `apps/web/src/app/settings/learning/page.tsx` — Learning settings page
- `apps/web/src/components/learning/toggle-group.tsx` — Toggle group component

**Implementation details:**

Organized into sections:
- **Signal Collection:** Self-evaluation ○/●, Consistency checks ○/●, Variant comparison ○/● (with task type selector), Outcome tracking ○/●, Exemplar comparison ○/●
- **Pattern Processing:** Reflection engine ○/● (with schedule selector: per-milestone/nightly/weekly), Auto-promotion max level (dropdown: Proposed/Confirmed/Established), Skill evolution ○/●, Tool generation ○/●
- **Knowledge Injection:** Pattern injection ○/● (max patterns slider, min confidence slider), Exemplar injection ○/● (max exemplars slider), Deal intelligence ○/●

Each toggle reads/writes to `learning_configuration` table via API.

**Test:**
```bash
# Navigate to /settings/learning
# Toggle self-evaluation off → verify config updated
# Change max patterns slider → verify API call
```
**Severity:** 🟡 HIGH

### Step 20.5: Spend Controls Settings Page

**What:** Create the UI for managing learning spend caps.

**Files to create:**
- `apps/web/src/app/settings/spend/page.tsx` — Spend settings page
- `apps/web/src/components/learning/spend-breakdown.tsx` — Spend breakdown chart

**Implementation details:**

Shows:
- Monthly budget cap input ($)
- Per-deal budget cap input ($)
- Learning overhead cap (% slider)
- Behavior when exceeded (dropdown: pause & notify / hard stop / warn only)

Current month breakdown chart:
- Deal execution spend (agents doing work)
- Self-evaluation spend
- Consistency checks spend
- Reflection engine spend
- Variant comparison spend
- Meta agent interventions spend
- Total vs. cap visualization

Data sourced from agent_activations token counts + model pricing.

**Test:**
```bash
# Navigate to /settings/spend
# Set monthly cap to $100
# Verify breakdown chart renders
# Verify cap is persisted to config
```
**Severity:** 🟡 HIGH

### Step 20.6: Learning Dashboard — Overview Page

**What:** Create the main learning dashboard showing system-wide learning metrics.

**Files to create:**
- `apps/web/src/app/learning/page.tsx` — Dashboard overview
- `apps/web/src/components/learning/learning-velocity-chart.tsx` — Score improvement over time
- `apps/web/src/components/learning/recent-events-feed.tsx` — Recent learning events

**Implementation details:**

Dashboard cards:
- Active patterns (count + change this month)
- Retired patterns (count + change this month)
- Avg agent score (current + % improvement)
- Human corrections (count + trend arrow)
- Meta interventions (count + trend arrow)
- Deals processed (current period + lifetime)

Learning velocity chart: line chart showing avg agent score over time (X = deal count, Y = avg score). Separate lines per agent type. Uses recharts.

Recent events feed: scrolling list of "Pattern promoted to Established", "Model auto-promoted for negotiation_analysis", "New pattern proposed: [description]". Each with timestamp and [View Details] link.

**API route needed:**
- `apps/web/src/app/api/learning/dashboard/route.ts` — Aggregated dashboard data

```typescript
// GET /api/learning/dashboard
// Returns: { activePatterns, retiredPatterns, avgScore, scoreImprovement,
//            humanCorrections, metaInterventions, dealsProcessed, recentEvents, velocityData }
```

**Test:**
```bash
# Navigate to /learning
# Verify all cards render with data (even if small)
# Verify velocity chart renders (even with limited data points)
# Verify recent events feed shows learning events
```
**Severity:** 🟡 HIGH

### Step 20.7: Pattern Explorer Page

**What:** Create the detailed pattern explorer where users can inspect, edit, and manage learned patterns.

**Files to create:**
- `apps/web/src/app/learning/patterns/page.tsx` — Pattern list page
- `apps/web/src/app/learning/patterns/[patternId]/page.tsx` — Pattern detail page
- `apps/web/src/components/learning/pattern-card.tsx` — Pattern card component
- `apps/web/src/components/learning/confidence-bar.tsx` — Visual confidence bar
- `apps/web/src/components/learning/evidence-chain.tsx` — Evidence display

**Implementation details:**

Pattern list: filterable by lifecycle_stage, agent_type, confidence range. Each card shows description, confidence bar, conditions, lifecycle stage badge.

Pattern detail page shows:
- Plain-English description
- Applies when (conditions rendered as readable text)
- Confidence bar with supporting/contradicting signal counts
- Evidence chain (every signal that contributed, with expandable details)
- Lifecycle timeline (visual progression through stages)
- Impact metrics (before/after score comparison)
- Version history with diffs
- Actions: [Edit] [Retire] [Revert to Previous Version]

**Test:**
```bash
# Navigate to /learning/patterns
# Verify pattern list renders
# Click a pattern → verify detail page loads with all sections
# Edit a pattern description → verify saved
# Retire a pattern → verify lifecycle_stage changes
```
**Severity:** 🟡 HIGH

### Step 20.8: Agent Performance Page

**What:** Create the per-agent performance dashboard.

**Files to create:**
- `apps/web/src/app/learning/agents/page.tsx` — Agent performance page
- `apps/web/src/components/learning/agent-performance-card.tsx` — Card per agent type

**Implementation details:**

For each agent type, show:
- Tasks completed (count)
- Avg quality score (current, with trend)
- Model distribution pie chart (% Sonnet vs. Opus)
- Avg cost per task
- Avg latency
- Meta interventions (count + trend)
- Score by criteria (breakdown showing weakest dimension)
- Active patterns count

Data aggregated from self_evaluations, agent_activations, meta_interventions tables.

**Test:**
```bash
# Navigate to /learning/agents
# Verify each agent type has a card with metrics
```
**Severity:** 🟢 MEDIUM

### Step 20.9: Consistency Log + Audit Trail Pages

**What:** Create the consistency log and audit trail pages.

**Files to create:**
- `apps/web/src/app/learning/consistency/page.tsx` — Consistency log
- `apps/web/src/app/learning/audit/page.tsx` — Audit trail

**Implementation details:**

Consistency log: table of unresolved contradictions (severity badge, deal name, conflicting statements, detection time, [Resolve] [View Evidence] buttons). Below: resolved this week feed.

Audit trail: searchable table of all learning_audit_log entries. Columns: timestamp, event type, actor, description, [View Details]. Filterable by event_type, entity_type, date range.

**Test:**
```bash
# Navigate to /learning/consistency — verify unresolved contradictions shown
# Navigate to /learning/audit — verify audit entries shown
```
**Severity:** 🟢 MEDIUM

### Step 20.10: "How It Works" Explanation Page

**What:** Create the plain-English explanation page for lawyers.

**Files to create:**
- `apps/web/src/app/how-it-works/page.tsx` — Explanation page

**Implementation details:**

This is a static content page with light interactivity. Written for lawyers, not engineers.

Sections:
1. **The Short Version** — "System gets better like a junior associate — by doing deals, getting feedback, remembering what works."
2. **How It Works (4-step loop)** — DO → CHECK → SPOT PATTERNS → APPLY
3. **What You Control** — Links to settings pages
4. **Trust & Safety** — What the system NEVER does / ALWAYS does
5. **FAQ** — Common concerns

Optional: interactive system diagram (clickable boxes: agents → shared knowledge → quality control → learning engine → pattern library).

**Test:**
```bash
# Navigate to /how-it-works
# Verify all sections render
# Verify links to settings pages work
```
**Severity:** 🟢 MEDIUM

### Step 20.11: Learning System Navigation

**What:** Add learning pages to the app navigation.

**Files to modify:**
- `apps/web/src/components/nav/` or wherever the main navigation lives — Add learning section

**Implementation details:**

Add to sidebar/nav:
- **Settings** group: Models, Learning, Spend (if not already in settings)
- **Learning** group: Overview, Patterns, Agents, Consistency, Audit
- **How It Works** link

**Test:**
```bash
# Navigate through all new pages via sidebar links
# Verify no broken links
```
**Severity:** 🟡 HIGH

### Step 20.12: Integration Test — Full Learning Loop

**What:** End-to-end test that exercises the entire learning system.

**Files to create:**
- `scripts/test-full-learning-loop.ts` — Comprehensive integration test

**Implementation details:**

The test should:
1. Create a test deal
2. Invoke an agent (triggers self-evaluation, signal creation)
3. Create a deliberate consistency contradiction
4. Run consistency check (detects contradiction)
5. Run reflection engine (should propose a pattern from accumulated signals)
6. Verify pattern created in learned_patterns
7. Invoke the agent again — verify the pattern is injected via prompt assembler
8. Verify self-evaluation score improved (or at least pattern was applied)
9. Trigger a meta agent intervention (via low score or failure)
10. Verify meta agent resolves or escalates
11. Check dashboard API returns non-zero data for all metrics
12. Check audit trail has entries for all actions

**Test:**
```bash
npx tsx scripts/test-full-learning-loop.ts
# Expected: All 12 steps complete. Summary shows: signals collected, pattern created, pattern applied, meta agent tested, dashboard populated.
```
**Severity:** 🔴 CRITICAL

## Phase Gate
All of the following must be true:
- [ ] Meta Agent activates on trigger conditions and produces coherent interventions
- [ ] Model routing settings page functional (read/write config)
- [ ] Learning toggles settings page functional
- [ ] Spend controls settings page functional with breakdown chart
- [ ] Learning dashboard overview renders with real data
- [ ] Pattern explorer shows patterns with detail view
- [ ] Agent performance page shows per-agent metrics
- [ ] Consistency log shows contradictions
- [ ] Audit trail shows all learning events
- [ ] "How It Works" page renders
- [ ] Full learning loop integration test passes
- [ ] `pnpm build` succeeds
- [ ] Dev server starts and ALL pages (new and existing) render correctly
