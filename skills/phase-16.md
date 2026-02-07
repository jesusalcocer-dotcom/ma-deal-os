# Phase 16: Signal Collection — Self-Evaluation, Consistency Checks, Outcome Tracking

## Prerequisites
- Phase 15 must be complete (all learning tables exist, model router operational)
- Agent invocation framework (Phase 4) operational
- Self-evaluation tables queryable

## What You're Building

This phase implements three of the five signal sources. After this phase, every agent output gets automatically evaluated, cross-agent consistency is checked nightly, and downstream outcomes are tracked. These signals are the raw data the Reflection Engine (Phase 18) will process into learned patterns.

**Cost note:** Self-evaluation doubles the API calls for every agent invocation. Ensure learning spend tracking is active before enabling broadly.

## Reference
- `docs/LEARNING_ARCHITECTURE.md` — Section 2 (Signal Sources 1, 2, 4)
- SPEC.md — Agent types and their outputs

## Steps

### Step 16.1: Evaluator Rubric Framework

**What:** Create the evaluator rubric system — a set of criteria definitions per agent type that the evaluator uses to score outputs.

**Files to create:**
- `packages/ai/src/evaluation/rubrics.ts` — Rubric definitions per agent type
- `packages/ai/src/evaluation/types.ts` — Evaluation types

**Implementation details:**

```typescript
// packages/ai/src/evaluation/rubrics.ts
export const EVALUATOR_RUBRICS: Record<string, EvaluatorRubric> = {
  disclosure_generation: {
    criteria: [
      { name: 'completeness', weight: 0.20, description: 'All required schedules present for the rep type' },
      { name: 'cross_reference_accuracy', weight: 0.15, description: 'Schedule numbers match SPA section references' },
      { name: 'materiality_qualifiers', weight: 0.15, description: 'Appropriate materiality language included' },
      { name: 'jurisdiction_requirements', weight: 0.10, description: 'Jurisdiction-specific requirements addressed' },
      { name: 'factual_accuracy', weight: 0.20, description: 'Facts match source documents' },
      { name: 'formatting', weight: 0.05, description: 'Proper schedule numbering and structure' },
      { name: 'legal_precision', weight: 0.15, description: 'Terms of art used correctly' },
    ],
    min_score_for_citation: 0.7,
  },
  email_extraction: {
    criteria: [
      { name: 'position_identification', weight: 0.25, description: 'All negotiation positions correctly identified' },
      { name: 'party_attribution', weight: 0.20, description: 'Positions attributed to correct party' },
      { name: 'temporal_ordering', weight: 0.15, description: 'Timeline of positions correctly ordered' },
      { name: 'sentiment_classification', weight: 0.10, description: 'Tone and urgency accurately classified' },
      { name: 'action_item_extraction', weight: 0.15, description: 'Action items correctly identified with owners' },
      { name: 'completeness', weight: 0.15, description: 'No significant content missed' },
    ],
    min_score_for_citation: 0.7,
  },
  negotiation_tracking: {
    criteria: [
      { name: 'position_consistency', weight: 0.25, description: 'Position history is internally consistent' },
      { name: 'agreed_terms_accuracy', weight: 0.25, description: 'Agreed terms correctly captured' },
      { name: 'open_items_categorization', weight: 0.20, description: 'Open items properly categorized by status' },
      { name: 'priority_assessment', weight: 0.15, description: 'Priority levels appropriate for deal context' },
      { name: 'completeness', weight: 0.15, description: 'All tracked provisions accounted for' },
    ],
    min_score_for_citation: 0.7,
  },
  checklist_management: {
    criteria: [
      { name: 'item_appropriateness', weight: 0.20, description: 'Items appropriate for deal type and stage' },
      { name: 'dependency_mapping', weight: 0.20, description: 'Dependencies between items correctly identified' },
      { name: 'priority_assignment', weight: 0.15, description: 'Priorities reflect actual urgency' },
      { name: 'completeness', weight: 0.25, description: 'No missing items for this deal type' },
      { name: 'status_accuracy', weight: 0.20, description: 'Status reflects actual completion state' },
    ],
    min_score_for_citation: 0.7,
  },
  document_generation: {
    criteria: [
      { name: 'legal_accuracy', weight: 0.25, description: 'Legal provisions are accurate and enforceable' },
      { name: 'boilerplate_appropriateness', weight: 0.10, description: 'Standard language appropriate for deal type' },
      { name: 'defined_terms_consistency', weight: 0.15, description: 'Defined terms used consistently throughout' },
      { name: 'cross_references_resolve', weight: 0.15, description: 'All internal cross-references point to correct sections' },
      { name: 'deal_specific_accuracy', weight: 0.20, description: 'Deal-specific details (names, amounts, dates) are correct' },
      { name: 'formatting', weight: 0.05, description: 'Proper formatting and structure' },
      { name: 'completeness', weight: 0.10, description: 'All required sections present' },
    ],
    min_score_for_citation: 0.7,
  },
};
```

**Test:**
```bash
# Verify all agent types have rubrics defined
npx tsx -e "
import { EVALUATOR_RUBRICS } from './packages/ai/src/evaluation/rubrics';
const types = Object.keys(EVALUATOR_RUBRICS);
console.log('Rubrics defined for:', types.join(', '));
for (const type of types) {
  const totalWeight = EVALUATOR_RUBRICS[type].criteria.reduce((s, c) => s + c.weight, 0);
  console.log(type + ' total weight:', totalWeight.toFixed(2), totalWeight === 1.0 ? '✓' : '✗ WEIGHTS DO NOT SUM TO 1.0');
}
"
```
**Severity:** 🔴 CRITICAL

### Step 16.2: Self-Evaluation Service

**What:** Create the service that takes an agent output and produces a structured evaluation using a separate Claude call.

**Files to create:**
- `packages/ai/src/evaluation/self-evaluator.ts` — Core evaluator
- `packages/ai/src/evaluation/evaluator-prompts.ts` — System prompts for evaluator

**Implementation details:**

The evaluator is a DIFFERENT Claude invocation from the generator. Key design constraints:
- Different system prompt (focused entirely on evaluation)
- Access to source materials (for factual checking) but NOT the generator's reasoning
- Must score each criterion individually (0.0 to 1.0)
- Must cite specific examples for any score below 0.7
- Uses Sonnet by default (evaluation is a routing task)

```typescript
export class SelfEvaluator {
  async evaluate(params: {
    agentType: string;
    output: string;
    sourceDocuments: string[];  // for factual verification
    dealContext: DealContext;
  }): Promise<SelfEvaluation> {
    const rubric = EVALUATOR_RUBRICS[params.agentType];
    if (!rubric) throw new Error(`No rubric for agent type: ${params.agentType}`);

    const model = await this.modelRouter.getModel('self_evaluation');
    
    const response = await anthropic.messages.create({
      model: model.model === 'opus' ? 'claude-opus-4-6' : 'claude-sonnet-4-5-20250929',
      system: buildEvaluatorPrompt(rubric, params.agentType),
      messages: [{
        role: 'user',
        content: `## Agent Output to Evaluate\n${params.output}\n\n## Source Documents\n${params.sourceDocuments.join('\n---\n')}`
      }],
      // Force structured output
    });

    // Parse structured scores
    const scores = parseEvaluatorResponse(response);
    const overallScore = calculateWeightedScore(scores, rubric);

    // Store in self_evaluations table
    await this.storeEvaluation({
      dealId: params.dealContext.dealId,
      agentType: params.agentType,
      outputSnapshot: params.output,
      criteriaScores: scores,
      issuesFound: scores.filter(s => s.score < 0.7).map(s => s.citation),
      overallScore,
      modelUsed: model.model,
    });

    return { scores, overallScore, issues: scores.filter(s => s.score < 0.7) };
  }
}
```

**Test:**
```bash
# Evaluate a sample agent output
npx tsx scripts/test-self-evaluation.ts
# Expected: 
# - Structured scores returned for each criterion
# - Overall score between 0.0 and 1.0
# - Record stored in self_evaluations table
# - Any score < 0.7 has a citation
```
**Severity:** 🔴 CRITICAL

### Step 16.3: Wire Self-Evaluation into Agent Invoker

**What:** Modify the agent invocation framework to automatically evaluate every output.

**Files to modify:**
- `packages/ai/src/agents/agent-invoker.ts` — Add post-invocation evaluation

**Implementation details:**

After every agent invocation completes, if `learning.self_evaluation.enabled` is true in configuration, call the SelfEvaluator. The evaluation runs asynchronously — don't block the response.

```typescript
// In agent-invoker.ts, after agent produces output:
if (await this.isLearningEnabled('self_evaluation')) {
  // Fire and forget — don't block the user-facing response
  this.selfEvaluator.evaluate({
    agentType: config.taskType,
    output: agentOutput,
    sourceDocuments: context.sourceDocuments,
    dealContext: context.deal,
  }).then(evaluation => {
    // Record score for model routing
    this.modelRouter.recordScore(config.taskType, evaluation.overallScore, modelUsed);
    // Log to audit
    this.auditLog.record('self_evaluation_completed', { score: evaluation.overallScore, agentType: config.taskType });
  }).catch(err => {
    console.error('Self-evaluation failed:', err);
    // Don't let evaluation failure affect agent output delivery
  });
}
```

**Test:**
```bash
# Invoke an agent for a real task (e.g., email extraction on test data)
# After invocation completes, query self_evaluations table
# Expected: new row with criteria_scores and overall_score
```
**Severity:** 🔴 CRITICAL

### Step 16.4: Consistency Check Agent

**What:** Create the Consistency Agent that compares all work products across a deal to find contradictions.

**Files to create:**
- `packages/ai/src/evaluation/consistency-checker.ts` — Consistency check logic
- `packages/ai/src/evaluation/consistency-prompts.ts` — Prompts for consistency analysis

**Implementation details:**

The Consistency Agent queries all recent work products for a deal:
- Disclosure schedule entries
- Negotiation positions
- Email extractions (positions, action items)
- Checklist item statuses
- DD findings

Then passes them through a Claude call that looks for contradictions. Uses Sonnet (this is a classification task).

```typescript
export class ConsistencyChecker {
  async checkDeal(dealId: string): Promise<ConsistencyResult[]> {
    // 1. Gather all work products
    const disclosures = await this.getDisclosureEntries(dealId);
    const positions = await this.getNegotiationPositions(dealId);
    const emailExtractions = await this.getRecentEmailExtractions(dealId);
    const checklistItems = await this.getChecklistItems(dealId);
    const ddFindings = await this.getDDFindings(dealId);

    // 2. Build comparison prompt
    const prompt = buildConsistencyPrompt({
      disclosures, positions, emailExtractions, checklistItems, ddFindings
    });

    // 3. Call Claude to identify contradictions
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      system: CONSISTENCY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    // 4. Parse and store contradictions
    const contradictions = parseConsistencyResponse(response);
    for (const c of contradictions) {
      await this.storeCheck(dealId, c);
    }
    return contradictions;
  }
}
```

Check types to detect:
- "Disclosure says X but email says Y" (disclosure vs. email)
- "Position marked agreed but later email reopens" (position vs. email)
- "Checklist item complete but document contradicts" (checklist vs. document)
- "N schedules generated but M rep sections exist" (count mismatch)

**Test:**
```bash
# Seed a deliberate contradiction in test deal:
# 1. Create a disclosure entry saying "no pending litigation"
# 2. Create an email extraction mentioning "ongoing arbitration"
# 3. Run consistency check
npx tsx scripts/test-consistency-check.ts
# Expected: contradiction detected between disclosure and email extraction
# Stored in consistency_checks table with severity
```
**Severity:** 🔴 CRITICAL

### Step 16.5: Nightly Consistency Check Scheduler

**What:** Create a mechanism to run consistency checks on all active deals nightly.

**Files to create:**
- `packages/core/src/scheduling/nightly-checks.ts` — Scheduler logic
- `apps/web/src/app/api/learning/consistency/run/route.ts` — Manual trigger API

**Implementation details:**

For now, the "nightly" check is triggered by an API call (a cron job will call this endpoint). In production, this would be a Vercel cron job or similar. Create both:
1. An API route that triggers consistency checks for all active deals
2. An API route that triggers consistency check for a single deal

```typescript
// POST /api/learning/consistency/run
// Body: { dealId?: string } — if dealId provided, check that deal only. Otherwise check all active deals.
```

**Test:**
```bash
# Trigger consistency check via API
curl -X POST http://localhost:3000/api/learning/consistency/run \
  -H "Content-Type: application/json" \
  -d '{"dealId":"MERCURY_DEAL_ID"}'
# Expected: 200 with { checks_run: N, contradictions_found: M }
```
**Severity:** 🟡 HIGH

### Step 16.6: Outcome Signal Tracker

**What:** Create the service that tracks downstream outcomes — what happens AFTER an agent produces output.

**Files to create:**
- `packages/ai/src/evaluation/outcome-tracker.ts` — Outcome tracking logic
- `apps/web/src/app/api/learning/outcomes/route.ts` — API for querying outcomes

**Implementation details:**

The outcome tracker hooks into existing approval workflows and deal state changes to record metrics:

```typescript
export class OutcomeTracker {
  // Called when a checklist item is never completed after N days
  async trackUnusedChecklistItem(dealId: string, itemId: string, agentType: string) {
    await this.recordSignal(dealId, 'ignored_output', agentType, 'checklist_item_unused', 1.0, { itemId });
  }

  // Called when a negotiation position changes after being marked "agreed"
  async trackReopenedPosition(dealId: string, positionId: string) {
    await this.recordSignal(dealId, 'position_reopened', 'negotiation_tracking', 'agreed_then_changed', 1.0, { positionId });
  }

  // Called when a disclosure schedule is completely rewritten
  async trackScheduleRewrite(dealId: string, scheduleId: string) {
    await this.recordSignal(dealId, 'rewrite', 'disclosure_generation', 'schedule_rewritten', 1.0, { scheduleId });
  }

  // Called periodically to compute calibration metrics
  async trackActionItemCalibration(dealId: string) {
    const generated = await this.getGeneratedActionItems(dealId);
    const actedOn = generated.filter(i => i.status !== 'ignored');
    const calibration = actedOn.length / generated.length;
    await this.recordSignal(dealId, 'calibration', 'email_extraction', 'action_item_calibration', calibration, {
      generated: generated.length, acted_on: actedOn.length
    });
  }
}
```

Wire these hooks into:
- Approval queue (when actions are approved/rejected/modified → feedback events already exist from Phase 14, extend them to also create outcome signals)
- Checklist updates (when items are marked complete/skipped)
- Negotiation position changes
- Disclosure schedule edits

**Test:**
```bash
# Create an action item via agent, then mark it as ignored
# Verify outcome_signal created with signal_type='ignored_output'
npx tsx scripts/test-outcome-tracking.ts
```
**Severity:** 🟡 HIGH

### Step 16.7: Signal Collection API Routes

**What:** Create API routes for querying collected signals.

**Files to create:**
- `apps/web/src/app/api/learning/signals/evaluations/route.ts` — Query self-evaluations
- `apps/web/src/app/api/learning/signals/consistency/route.ts` — Query consistency checks
- `apps/web/src/app/api/learning/signals/outcomes/route.ts` — Query outcome signals
- `apps/web/src/app/api/deals/[dealId]/learning/signals/route.ts` — All signals for a deal

**Implementation details:**
Standard query routes with filtering by deal_id, agent_type, date range, severity. Include aggregations (avg score by agent type, count by severity, etc.).

**Test:**
```bash
# Query evaluations
curl -s http://localhost:3000/api/learning/signals/evaluations?agent_type=email_extraction | jq '.count'

# Query consistency for a deal
curl -s http://localhost:3000/api/deals/DEAL_ID/learning/signals | jq '.consistency_checks | length'
```
**Severity:** 🟡 HIGH

### Step 16.8: Learning Spend Tracker

**What:** Create a service that tracks API spend specifically for learning activities (evaluations, consistency checks, etc.) separate from deal execution.

**Files to create:**
- `packages/ai/src/evaluation/spend-tracker.ts` — Spend tracking logic

**Implementation details:**

Every learning-related API call (self-evaluation, consistency check) should record its token count and estimated cost. The tracker checks against configured spend caps and can pause learning activities if limits are exceeded.

```typescript
export class LearningSpendTracker {
  async recordSpend(category: string, inputTokens: number, outputTokens: number, model: string) {
    const cost = this.calculateCost(inputTokens, outputTokens, model);
    // Store in a running tally (could use learning_configuration or a dedicated counter)
    // Check against caps
    const monthlySpend = await this.getMonthlySpend();
    const cap = await this.getConfig('learning.spend.monthly_cap');
    if (monthlySpend + cost > cap) {
      const behavior = await this.getConfig('learning.spend.behavior_when_exceeded');
      if (behavior === 'hard_stop') throw new Error('Learning spend cap exceeded');
      if (behavior === 'warn_only') console.warn('Learning spend approaching cap');
    }
  }
}
```

**Test:**
```bash
# Run a self-evaluation, verify spend is recorded
# Check that spend tracker can read monthly totals
```
**Severity:** 🟡 HIGH

## Phase Gate
All of the following must be true:
- [ ] Self-evaluation produces structured scores for each criterion
- [ ] Self-evaluation runs automatically after agent invocations
- [ ] Consistency checker detects seeded contradictions
- [ ] Outcome tracker records signals when deal state changes
- [ ] All signals stored in correct tables and queryable via API
- [ ] Learning spend tracked separately from deal execution
- [ ] Spend cap enforcement works (at least warn_only mode)
- [ ] `pnpm build` succeeds
- [ ] Dev server starts and all existing pages still work
