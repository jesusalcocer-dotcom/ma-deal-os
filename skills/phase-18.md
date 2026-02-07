# Phase 18: Reflection Engine + Pattern Lifecycle Management

## Prerequisites
- Phase 16-17 must be complete (signals being collected, exemplar library operational)
- self_evaluations, consistency_checks, variant_comparisons, outcome_signals tables populated with data

## What You're Building

The Reflection Engine is the brain of the learning system. It processes raw signals into actionable patterns — things like "for healthcare deals, conservative disclosure strategy scores 30% higher" or "this email extraction rubric misses arbitration references consistently." It runs asynchronously (nightly or per-milestone) and manages the full pattern lifecycle from proposal through retirement.

## Reference
- `docs/LEARNING_ARCHITECTURE.md` — Section 3 (Reflection Engine), Section 10 (Governance)

## Steps

### Step 18.1: Signal Aggregator

**What:** Create the service that queries all recent signals and prepares them for reflection analysis.

**Files to create:**
- `packages/ai/src/learning/signal-aggregator.ts` — Queries and aggregates signals
- `packages/ai/src/learning/types.ts` — Learning types

**Implementation details:**

```typescript
export class SignalAggregator {
  /**
   * Gathers all signals since a given timestamp, grouped by type.
   * Returns a structured summary ready for the Reflection Engine.
   */
  async gatherSignals(since: Date, dealId?: string): Promise<SignalBundle> {
    const [evaluations, consistencyChecks, variantComparisons, outcomeSignals, exemplarComparisons] = await Promise.all([
      this.getEvaluationsSince(since, dealId),
      this.getConsistencyChecksSince(since, dealId),
      this.getVariantComparisonsSince(since, dealId),
      this.getOutcomeSignalsSince(since, dealId),
      this.getExemplarComparisonsSince(since, dealId),
    ]);

    return {
      totalSignals: evaluations.length + consistencyChecks.length + variantComparisons.length + outcomeSignals.length + exemplarComparisons.length,
      evaluations: this.summarizeEvaluations(evaluations),
      consistencyChecks: this.summarizeConsistencyChecks(consistencyChecks),
      variantComparisons: this.summarizeVariantComparisons(variantComparisons),
      outcomeSignals: this.summarizeOutcomeSignals(outcomeSignals),
      exemplarComparisons: this.summarizeExemplarComparisons(exemplarComparisons),
      clusteredByAgent: this.clusterByAgentType([...evaluations, ...consistencyChecks, ...outcomeSignals]),
      clusteredByDealType: this.clusterByDealCharacteristic([...evaluations, ...variantComparisons]),
    };
  }
}
```

The summarization functions should produce concise text summaries (not raw data) that can fit in a Claude context window. For example: "Email extraction: 23 evaluations, avg score 0.78, lowest criteria: 'position_identification' (avg 0.62), 4 consistency check contradictions involving email vs. disclosure."

**Test:**
```bash
# Seed at least 10 signals across different types
# Run aggregator
# Verify structured summary produced with counts and clusters
npx tsx scripts/test-signal-aggregator.ts
```
**Severity:** 🔴 CRITICAL

### Step 18.2: Reflection Engine Core

**What:** Create the Reflection Engine — a Claude Opus invocation that reads aggregated signals and proposes/updates/retires patterns.

**Files to create:**
- `packages/ai/src/learning/reflection-engine.ts` — Core engine
- `packages/ai/src/learning/reflection-prompts.ts` — System prompts

**Implementation details:**

The Reflection Engine is a Claude Opus call with a specific system prompt:

```typescript
export class ReflectionEngine {
  async reflect(params: { triggerType: 'nightly' | 'milestone' | 'manual'; dealId?: string }): Promise<ReflectionResult> {
    // 1. Get last reflection time
    const lastRun = await this.getLastReflectionRun(params.triggerType);
    const since = lastRun?.created_at || new Date(0);

    // 2. Gather signals since last run
    const signals = await this.signalAggregator.gatherSignals(since, params.dealId);
    if (signals.totalSignals === 0) return { noNewSignals: true };

    // 3. Get existing patterns for context
    const existingPatterns = await this.getActivePatterns();

    // 4. Call Claude Opus
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      system: REFLECTION_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: buildReflectionPrompt(signals, existingPatterns)
      }],
    });

    // 5. Parse structured response
    const decisions = parseReflectionResponse(response);
    // Decisions include: new patterns to propose, existing patterns to update (confidence up/down),
    // patterns to promote, patterns to decay/retire

    // 6. Apply decisions
    const result = await this.applyDecisions(decisions);

    // 7. Record reflection run
    await this.recordRun(params.triggerType, params.dealId, signals.totalSignals, result);

    return result;
  }
}
```

**Reflection system prompt key instructions:**
- "You are analyzing quality signals from an M&A deal automation system."
- "Identify clusters of signals that suggest systematic patterns."
- "For each pattern: describe it in plain English, specify when it applies (conditions), and write an instruction that would improve future agent performance."
- "Minimum 3 supporting signals to propose a new pattern."
- "If existing patterns are contradicted by new evidence, reduce their confidence."
- "Output as structured JSON with: new_patterns[], updated_patterns[], decayed_patterns[]"

**Test:**
```bash
# Seed 10+ signals showing a pattern (e.g., 5 evaluations where email_extraction scores low on 'position_identification' for healthcare deals)
# Run reflection engine
# Expected: new pattern proposed related to email extraction position identification for healthcare
npx tsx scripts/test-reflection-engine.ts
```
**Severity:** 🔴 CRITICAL

### Step 18.3: Pattern Lifecycle Manager

**What:** Create the service that manages pattern confidence, promotion, decay, and retirement.

**Files to create:**
- `packages/ai/src/learning/pattern-lifecycle.ts` — Lifecycle management

**Implementation details:**

```typescript
export class PatternLifecycle {
  /**
   * Promotion rules:
   * proposed (0.3-0.4) → confirmed (0.5-0.6): seen in 5 deals, no contradictions
   * confirmed (0.5-0.6) → established (0.7-0.8): seen in 8 deals, no contradictions
   * established (0.7-0.8) → hard_rule (0.95): 20+ deals, requires human approval (L3)
   */
  async evaluatePromotion(pattern: LearnedPattern): Promise<PromotionDecision> {
    const autoPromotionMax = await this.getConfig('learning.reflection.auto_promotion_max');
    
    if (pattern.lifecycle_stage === 'proposed' && pattern.supporting_count >= 5 && pattern.contradicting_count === 0) {
      return { promote: true, newStage: 'confirmed', newConfidence: 0.6 };
    }
    if (pattern.lifecycle_stage === 'confirmed' && pattern.supporting_count >= 8 && pattern.contradicting_count === 0) {
      if (autoPromotionMax === 'established' || autoPromotionMax === 'hard_rule') {
        return { promote: true, newStage: 'established', newConfidence: 0.8 };
      }
    }
    if (pattern.lifecycle_stage === 'established' && pattern.supporting_count >= 20) {
      // Hard rule promotion requires human approval (L3 governance)
      return { promote: false, requiresHumanApproval: true, proposedStage: 'hard_rule' };
    }
    return { promote: false };
  }

  /**
   * Decay: when contradicting signals arrive, reduce confidence.
   * Below 0.2 → retired.
   */
  async applyDecay(patternId: string, contradictionCount: number): Promise<void> {
    const pattern = await this.getPattern(patternId);
    const newConfidence = pattern.confidence - (contradictionCount * 0.05);
    
    if (newConfidence < 0.2) {
      await this.retirePattern(patternId);
    } else {
      await this.updatePattern(patternId, {
        confidence: newConfidence,
        contradicting_count: pattern.contradicting_count + contradictionCount,
      });
    }
  }

  async promotePattern(patternId: string, newStage: string, newConfidence: number): Promise<void> {
    const pattern = await this.getPattern(patternId);
    const oldVersion = { stage: pattern.lifecycle_stage, confidence: pattern.confidence, timestamp: new Date() };
    
    await this.updatePattern(patternId, {
      lifecycle_stage: newStage,
      confidence: newConfidence,
      version: pattern.version + 1,
      version_history: [...(pattern.version_history || []), oldVersion],
    });

    // Audit log
    await this.auditLog.record('pattern_promoted', {
      entityType: 'pattern', entityId: patternId,
      description: `Pattern promoted from ${pattern.lifecycle_stage} to ${newStage}`,
      beforeState: { stage: pattern.lifecycle_stage, confidence: pattern.confidence },
      afterState: { stage: newStage, confidence: newConfidence },
    });
  }
}
```

**Test:**
```bash
# Create a pattern with supporting_count=5, lifecycle_stage='proposed'
# Run promotion check → should promote to 'confirmed'
# Create a pattern with 3 contradictions → should decay confidence
# Create a pattern with confidence < 0.2 → should retire
npx tsx scripts/test-pattern-lifecycle.ts
```
**Severity:** 🔴 CRITICAL

### Step 18.4: Reflection Trigger API + Scheduler

**What:** Create API routes to trigger reflection manually and wire up nightly scheduling.

**Files to create:**
- `apps/web/src/app/api/learning/reflection/run/route.ts` — Manual trigger
- `apps/web/src/app/api/learning/reflection/history/route.ts` — Past reflection runs
- `apps/web/src/app/api/learning/patterns/route.ts` — CRUD for patterns

**Implementation details:**

```typescript
// POST /api/learning/reflection/run
// Body: { trigger_type: 'manual' | 'nightly', deal_id?: string }
// Returns: { signals_processed, patterns_created, patterns_updated, patterns_decayed, patterns_promoted }

// GET /api/learning/patterns
// Query: ?lifecycle_stage=confirmed&agent_type=email_extraction&min_confidence=0.5
// Returns: Pattern[] with full details

// PATCH /api/learning/patterns/[patternId]
// Body: { lifecycle_stage?, confidence?, instruction? }
// For manual edits / human review of promotions
```

**Test:**
```bash
# Trigger reflection
curl -X POST http://localhost:3000/api/learning/reflection/run \
  -H "Content-Type: application/json" \
  -d '{"trigger_type":"manual"}'
# Expected: 200 with signal processing summary

# Query active patterns
curl -s http://localhost:3000/api/learning/patterns?lifecycle_stage=confirmed | jq '.[] | .description'
```
**Severity:** 🟡 HIGH

### Step 18.5: Pattern Application Tracking

**What:** When a pattern is injected into an agent prompt (Phase 19 will do the injection), track whether the output improved.

**Files to create:**
- `packages/ai/src/learning/pattern-tracker.ts` — Tracks pattern application and impact

**Implementation details:**

Every time a pattern is injected into a prompt, record:
- Which pattern was applied
- What agent/task it was applied to
- What the evaluation score was

This enables calculating "impact metrics" — before pattern vs. after pattern score improvement.

```typescript
export class PatternTracker {
  async recordApplication(patternId: string, agentType: string, evaluationScore: number): Promise<void> {
    await this.updatePattern(patternId, {
      last_applied_at: new Date(),
      // Optionally maintain running average of scores when this pattern is applied
    });
  }

  async getPatternImpact(patternId: string): Promise<PatternImpact> {
    // Query evaluations before and after pattern was created
    // Calculate average score improvement
  }
}
```

**Test:**
```bash
# Record a pattern application, verify last_applied_at updated
```
**Severity:** 🟢 MEDIUM

## Phase Gate
All of the following must be true:
- [ ] Signal aggregator gathers and summarizes signals from all sources
- [ ] Reflection Engine (Opus) produces pattern proposals from signals
- [ ] Patterns can be created, promoted, decayed, and retired
- [ ] Pattern lifecycle follows defined promotion rules
- [ ] Reflection can be triggered manually via API
- [ ] Past reflection runs are queryable
- [ ] Patterns queryable via API with filtering
- [ ] Audit log captures all pattern changes
- [ ] `pnpm build` succeeds
- [ ] Dev server starts and all existing pages still work
