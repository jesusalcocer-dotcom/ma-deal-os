# Phase 17: Variant Comparison, Exemplar Library, Distillation Pipeline

## Prerequisites
- Phase 16 must be complete (self-evaluation operational, signal tables populated)
- exemplar_library and distillation_trials tables exist (from Phase 15)

## What You're Building

This phase implements Signal Sources 3 and 5 (variant comparison and exemplar benchmarking) and the full distillation pipeline that makes Sonnet progressively better by learning from Opus outputs. This is the mechanism that drives cost down over time while maintaining quality.

**Cost note:** Variant comparison generates 3x outputs per task. This is expensive and should be off by default, enabled only for high-value task types or during testing periods.

## Reference
- `docs/LEARNING_ARCHITECTURE.md` — Sections 2 (Sources 3, 5), 5 (Distillation)

## Steps

### Step 17.1: Variant Generator

**What:** Create the service that generates 3 strategy variants for a task, has them evaluated, and selects the best.

**Files to create:**
- `packages/ai/src/evaluation/variant-generator.ts` — Generates variants
- `packages/ai/src/evaluation/variant-strategies.ts` — Strategy definitions per task type

**Implementation details:**

```typescript
export const VARIANT_STRATEGIES: Record<string, VariantStrategy[]> = {
  disclosure_generation: [
    { name: 'conservative', instruction: 'Disclose broadly. Include all potentially relevant items. Err on side of over-disclosure. Add more schedules rather than fewer.' },
    { name: 'standard', instruction: 'Match typical disclosure practice for this deal type and jurisdiction. Follow market norms.' },
    { name: 'aggressive', instruction: 'Disclose only what is legally required. Minimize schedule count. Narrow materiality qualifiers.' },
  ],
  negotiation_analysis: [
    { name: 'firm', instruction: 'Recommend holding strong positions. Identify leverage points. Push for favorable terms.' },
    { name: 'balanced', instruction: 'Recommend fair compromise positions. Identify mutual wins. Standard market approach.' },
    { name: 'conciliatory', instruction: 'Recommend strategic concessions to advance deal speed. Identify low-cost gives.' },
  ],
  document_generation: [
    { name: 'buyer_protective', instruction: 'Draft with maximum buyer protections. Broad reps, low baskets, no caps on fundamental reps.' },
    { name: 'market', instruction: 'Draft to market standard. Typical baskets, caps, and limitations.' },
    { name: 'deal_speed', instruction: 'Draft for speed to close. Simplify where possible. Minimize provisions that will trigger negotiation.' },
  ],
};

export class VariantGenerator {
  async generateAndCompare(params: {
    taskType: string;
    dealContext: DealContext;
    basePrompt: string;  // the normal agent prompt
    sourceDocuments: string[];
  }): Promise<VariantComparisonResult> {
    const strategies = VARIANT_STRATEGIES[params.taskType];
    if (!strategies) throw new Error('No variant strategies for: ' + params.taskType);

    // Generate all 3 variants in parallel
    const variants = await Promise.all(
      strategies.map(strategy =>
        this.generateVariant(params.basePrompt, strategy, params.dealContext)
      )
    );

    // Evaluate all 3 with the self-evaluator
    const evaluations = await Promise.all(
      variants.map(v =>
        this.selfEvaluator.evaluate({
          agentType: params.taskType,
          output: v.output,
          sourceDocuments: params.sourceDocuments,
          dealContext: params.dealContext,
        })
      )
    );

    // Select best
    const scored = variants.map((v, i) => ({ ...v, score: evaluations[i].overallScore }));
    const best = scored.reduce((a, b) => a.score > b.score ? a : b);

    // Store comparison
    await this.storeComparison(params.dealContext.dealId, params.taskType, scored, best);

    return { selected: best, all: scored };
  }
}
```

**Test:**
```bash
# Generate variants for a disclosure generation task
# Verify 3 different outputs produced
# Verify all 3 evaluated
# Verify best selected and stored in variant_comparisons
npx tsx scripts/test-variant-generation.ts
```
**Severity:** 🔴 CRITICAL

### Step 17.2: Exemplar Library Service

**What:** Create the service for managing the exemplar library — storing, querying, and matching exemplars to deal contexts.

**Files to create:**
- `packages/ai/src/evaluation/exemplar-service.ts` — CRUD + matching logic
- `apps/web/src/app/api/learning/exemplars/route.ts` — API routes

**Implementation details:**

```typescript
export class ExemplarService {
  // Store a new exemplar (external or internal)
  async addExemplar(params: {
    sourceType: 'external_firm' | 'internal_opus' | 'internal_approved';
    sourceFirm?: string;
    documentType: string;
    dealCharacteristics: DealCharacteristics;
    content: any;
    qualityScore: number;
    generationModel?: string;
    generationContext?: any;
    evaluatorScores?: any;
  }): Promise<string> { /* ... */ }

  // Find best exemplars for a given task context
  async findExemplars(params: {
    documentType: string;
    dealCharacteristics: DealCharacteristics;
    limit?: number;  // default 3
    preferDistillation?: boolean;  // prefer internal_opus for Sonnet injection
  }): Promise<Exemplar[]> {
    // Match on deal_characteristics overlap (deal_type, industry, jurisdiction)
    // Sort by: quality_score * relevance_score
    // If preferDistillation, boost internal_opus sources
    // If downstream_quality_impact tracked, prefer high-impact exemplars
  }

  // Compare agent output against best matching exemplar
  async compareToExemplar(agentOutput: string, dealContext: DealContext, taskType: string): Promise<ExemplarComparison> {
    const exemplars = await this.findExemplars({ documentType: taskType, dealCharacteristics: dealContext });
    if (exemplars.length === 0) return { noExemplarAvailable: true };

    // Use Claude to do gap analysis: what's missing, what's different, what's better
    const comparison = await this.runGapAnalysis(agentOutput, exemplars[0], dealContext);
    await this.storeComparison(dealContext.dealId, comparison);
    return comparison;
  }
}
```

**Test:**
```bash
# Add a sample external exemplar (e.g., a high-quality disclosure schedule)
# Query exemplars for matching deal characteristics
# Run comparison against an agent output
npx tsx scripts/test-exemplar-service.ts
```
**Severity:** 🔴 CRITICAL

### Step 17.3: Auto-Store High-Scoring Opus Outputs

**What:** Wire the self-evaluation pipeline to automatically store high-scoring Opus outputs as distillation candidates.

**Files to modify:**
- `packages/ai/src/agents/agent-invoker.ts` — After evaluation, check if output qualifies

**Implementation details:**

In the agent invoker, after self-evaluation completes:

```typescript
// After self-evaluation:
if (evaluation.overallScore >= 0.90 && modelUsed === 'opus') {
  await this.exemplarService.addExemplar({
    sourceType: 'internal_opus',
    documentType: taskType,
    dealCharacteristics: dealContext.characteristics,
    content: { output: agentOutput, prompt_summary: promptSummary },
    qualityScore: evaluation.overallScore,
    generationModel: 'opus',
    generationContext: { layers: promptLayers },
    evaluatorScores: evaluation.scores,
  });
  
  // Update distillation exemplar count for this task type
  await this.updateDistillationCount(taskType);
}
```

Also: when a user approves an output without modifications (via approval queue), store it as `internal_approved`.

**Test:**
```bash
# Invoke Opus on a task, ensure self-evaluation scores ≥ 0.90
# Verify new exemplar appears in exemplar_library with source_type='internal_opus'
# Verify model_routing_config.exemplar_count incremented
```
**Severity:** 🔴 CRITICAL

### Step 17.4: Distillation Trial Runner

**What:** Create the service that tests whether Sonnet + exemplars can match Opus quality for a task type.

**Files to create:**
- `packages/ai/src/distillation/trial-runner.ts` — Runs distillation trials
- `packages/ai/src/distillation/types.ts` — Types

**Implementation details:**

```typescript
export class DistillationTrialRunner {
  /**
   * Runs a distillation trial for a task type:
   * 1. Finds 3 historical deals where Opus scored ≥ 0.90 on this task type
   * 2. For each deal, runs Sonnet (no exemplars) and Sonnet (with exemplars)
   * 3. Compares scores to Opus baseline
   * 4. Records results in distillation_trials table
   * 5. Returns recommendation
   */
  async runTrial(taskType: string): Promise<DistillationTrialResult> {
    // Check if enough exemplars exist
    const config = await this.getRoutingConfig(taskType);
    if (config.exemplar_count < config.min_exemplars_for_testing) {
      return { recommendation: 'reject_needs_more', reason: `Only ${config.exemplar_count}/${config.min_exemplars_for_testing} exemplars` };
    }

    // Find historical high-scoring Opus invocations
    const historicalDeals = await this.findHighScoringOpusDeals(taskType, 3);
    if (historicalDeals.length < 3) {
      return { recommendation: 'reject_needs_more', reason: 'Not enough historical Opus data' };
    }

    const trials = [];
    for (const deal of historicalDeals) {
      // Get the original context (prompt layers, source documents)
      const context = await this.reconstructContext(deal);
      
      // Run Sonnet without exemplars
      const sonnetPlain = await this.runAgent(taskType, context, 'sonnet', []);
      const sonnetPlainEval = await this.evaluate(taskType, sonnetPlain, context);

      // Get best exemplars for this context
      const exemplars = await this.exemplarService.findExemplars({
        documentType: taskType,
        dealCharacteristics: context.dealCharacteristics,
        preferDistillation: true,
      });

      // Run Sonnet WITH exemplars injected in Layer 5
      const sonnetWithExemplars = await this.runAgent(taskType, context, 'sonnet', exemplars);
      const sonnetWithExemplarsEval = await this.evaluate(taskType, sonnetWithExemplars, context);

      trials.push({
        dealContext: context.dealCharacteristics,
        opusScore: deal.originalScore,
        sonnetScore: sonnetPlainEval.overallScore,
        sonnetWithExemplarsScore: sonnetWithExemplarsEval.overallScore,
        exemplarIds: exemplars.map(e => e.id),
        exemplarCount: exemplars.length,
        scoreGap: deal.originalScore - sonnetWithExemplarsEval.overallScore,
      });
    }

    // Store all trials
    for (const t of trials) {
      await this.storeTrial(taskType, t);
    }

    // Determine recommendation
    const avgSonnetWithExemplars = trials.reduce((s, t) => s + t.sonnetWithExemplarsScore, 0) / trials.length;
    const threshold = config.handoff_threshold;

    if (avgSonnetWithExemplars >= threshold) {
      return { recommendation: 'approve_handoff', avgScore: avgSonnetWithExemplars, trials };
    } else {
      return { recommendation: 'reject_needs_more', avgScore: avgSonnetWithExemplars, trials };
    }
  }
}
```

**Test:**
```bash
# This requires existing Opus evaluations. Seed test data if needed:
# 1. Create 3 fake self_evaluations for Opus with score ≥ 0.90
# 2. Create 15+ exemplars for the task type
# 3. Run trial
npx tsx scripts/test-distillation-trial.ts
# Expected: trial completes, recommendation returned, results in distillation_trials table
```
**Severity:** 🔴 CRITICAL

### Step 17.5: Shadow Testing Mode

**What:** Create a mode where Sonnet runs in parallel with Opus on tasks, but Sonnet's output is discarded. Scores are compared silently.

**Files to create:**
- `packages/ai/src/distillation/shadow-runner.ts` — Shadow execution logic

**Implementation details:**

When shadow testing is enabled for a task type (`distillation_status = 'testing'`), the agent invoker:
1. Runs Opus as normal (this output goes to the user)
2. In parallel, runs Sonnet with exemplar injection
3. Evaluates the Sonnet output
4. Stores the comparison as a distillation trial
5. Does NOT show the Sonnet output to anyone

```typescript
// In agent-invoker.ts:
if (config.distillation_status === 'testing' && modelUsed === 'opus') {
  // Fire-and-forget shadow test
  this.shadowRunner.runShadow(taskType, promptLayers, dealContext).catch(console.error);
}
```

**Test:**
```bash
# Enable shadow testing for a task type
# Invoke the agent (should use Opus)
# Verify: Opus output returned to user
# Verify: distillation_trial created in background with Sonnet scores
```
**Severity:** 🟡 HIGH

### Step 17.6: Handoff Approval + Spot-Check After Handoff

**What:** Create the API and logic for approving a model handoff and the periodic spot-check mechanism.

**Files to create:**
- `apps/web/src/app/api/learning/routing/handoff/route.ts` — POST to approve/reject handoff
- `packages/ai/src/distillation/spot-checker.ts` — Periodic validation after handoff

**Implementation details:**

Handoff approval updates `model_routing_config.current_model` to 'sonnet' and `distillation_status` to 'handed_off'. Logged in audit trail.

Spot-checker: after handoff, every Nth invocation (configurable, default 10th), the system also runs Opus on the same input and compares scores. If Sonnet's score drops below `revert_threshold` (default 0.80) for 3 consecutive spot-checks, auto-revert to Opus.

**Test:**
```bash
# Approve handoff for a task type via API
# Verify model_routing_config updated
# Verify audit log entry created
# Simulate spot-check: invoke agent, verify spot-check runs on configured frequency
```
**Severity:** 🟡 HIGH

### Step 17.7: Distillation Status API Routes

**What:** Create API routes for monitoring distillation progress.

**Files to create:**
- `apps/web/src/app/api/learning/distillation/status/route.ts` — Overall distillation status
- `apps/web/src/app/api/learning/distillation/trials/route.ts` — Trial results

**Test:**
```bash
curl -s http://localhost:3000/api/learning/distillation/status | jq
# Expected: per-task-type status with exemplar counts, testing status, scores
```
**Severity:** 🟢 MEDIUM

## Phase Gate
All of the following must be true:
- [ ] Variant generator produces 3 distinct outputs per task
- [ ] Exemplar library stores and retrieves exemplars by deal context
- [ ] High-scoring Opus outputs auto-stored as distillation candidates
- [ ] Distillation trial runner produces meaningful score comparisons
- [ ] Shadow testing runs Sonnet in parallel without affecting users
- [ ] Handoff approval updates routing config
- [ ] Spot-check mechanism works after handoff
- [ ] `pnpm build` succeeds
- [ ] Dev server starts and all existing pages still work
