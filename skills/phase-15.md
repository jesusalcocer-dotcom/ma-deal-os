# Phase 15: Learning Infrastructure — Database + Configuration + Model Routing

## Prerequisites
- Phase 14 must be complete (all deal workflows, agents, approval queue, feedback events operational)
- All existing tables functional in Supabase

## What You're Building

This phase creates the database foundation for the entire learning system. Every subsequent learning phase depends on these tables existing. You're also building the model routing configuration system — the control layer that determines which Claude model handles each task type.

**Critical principle:** Create ALL tables now, even before the code that populates them exists. Data starts accumulating the moment you wire signal collection in Phase 16. The tables cost nothing to have empty but are expensive to backfill.

## Reference
- `docs/LEARNING_ARCHITECTURE.md` — Sections 11 (full schema), 5 (model routing)
- SPEC.md — Existing database schema section (for table naming conventions)

## Steps

### Step 15.1: Learning Schema — Signal Collection Tables

**What:** Create the 6 signal collection tables in Supabase and add Drizzle schema definitions.

**Files to create/modify:**
- `packages/db/src/schema/learning-signals.ts` — Drizzle schema for signal tables
- `scripts/create-learning-tables.ts` — Script to create tables via Supabase REST API

**Implementation details:**

Create tables via Supabase REST API (remember: `drizzle-kit push` does NOT work in this environment). Use the SQL execution approach:

```typescript
const supabase = createClient(url, serviceRoleKey);

// Execute raw SQL via Supabase's rpc or REST
// Create tables: self_evaluations, consistency_checks, variant_comparisons,
// outcome_signals, exemplar_library, exemplar_comparisons
// See docs/LEARNING_ARCHITECTURE.md Section 11 for exact CREATE TABLE statements
```

Also create the Drizzle schema file so TypeScript types are generated:

```typescript
// packages/db/src/schema/learning-signals.ts
import { pgTable, uuid, text, float8, jsonb, timestamp, boolean, integer } from 'drizzle-orm/pg-core';

export const selfEvaluations = pgTable('self_evaluations', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealId: uuid('deal_id').references(() => deals.id),
  agentType: text('agent_type').notNull(),
  // ... complete schema
});
// ... all 6 tables
```

**Test:**
```bash
# Run the table creation script
npx tsx scripts/create-learning-tables.ts

# Verify tables exist via Supabase REST
curl -s "${SUPABASE_URL}/rest/v1/self_evaluations?select=*&limit=0" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
# Expected: empty array [], NOT an error

# Test insert into each table
npx tsx scripts/test-learning-tables.ts
# Expected: can insert and query a row from each table
```
**Severity:** 🔴 CRITICAL

### Step 15.2: Learning Schema — Reflection & Pattern Tables

**What:** Create learned_patterns, reflection_runs, skill_file_versions, generated_tools tables.

**Files to create/modify:**
- `packages/db/src/schema/learning-patterns.ts` — Drizzle schema
- Update `scripts/create-learning-tables.ts` to include these tables

**Implementation details:**
Follow same pattern as Step 15.1. The `learned_patterns` table is the most important — it's the core of the learning system. Ensure the `lifecycle_stage` column uses a CHECK constraint for valid values.

**Test:**
```bash
# Insert a test pattern
npx tsx -e "
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await sb.from('learned_patterns').insert({
  pattern_type: 'quality_improvement',
  description: 'Test pattern',
  condition: { deal_type: 'asset_purchase' },
  instruction: 'Always check environmental reps',
  confidence: 0.5,
  lifecycle_stage: 'proposed'
}).select().single();
console.log(error ? 'FAIL: ' + error.message : 'PASS: ' + data.id);
"
```
**Severity:** 🔴 CRITICAL

### Step 15.3: Learning Schema — Agent Communication Tables

**What:** Create deal_intelligence, agent_requests, meta_interventions tables.

**Files to create/modify:**
- `packages/db/src/schema/learning-communication.ts` — Drizzle schema
- Update `scripts/create-learning-tables.ts`

**Implementation details:**
The `deal_intelligence` table has a self-referencing `supersedes` column (UUID referencing same table). The `agent_requests` table needs the `chain_depth` column for deadlock prevention and `expires_at` with default of now + 1 hour.

**Test:**
```bash
# Insert deal intelligence entry
# Insert agent request with chain_depth=1
# Verify supersedes chain works
npx tsx scripts/test-communication-tables.ts
```
**Severity:** 🔴 CRITICAL

### Step 15.4: Learning Schema — Distillation & Routing Tables

**What:** Create distillation_trials, model_routing_config tables.

**Files to create/modify:**
- `packages/db/src/schema/learning-distillation.ts` — Drizzle schema
- Update `scripts/create-learning-tables.ts`

**Implementation details:**
The `model_routing_config` table should be seeded with initial routing configuration for all known task types:

```typescript
const defaultRouting = [
  { task_type: 'email_extraction', current_model: 'sonnet', distillation_status: 'not_started' },
  { task_type: 'checklist_update', current_model: 'sonnet', distillation_status: 'not_started' },
  { task_type: 'disclosure_generation', current_model: 'opus', distillation_status: 'not_started' },
  { task_type: 'negotiation_analysis', current_model: 'opus', distillation_status: 'not_started' },
  { task_type: 'document_drafting', current_model: 'opus', distillation_status: 'not_started' },
  { task_type: 'self_evaluation', current_model: 'sonnet', distillation_status: 'not_started' },
  { task_type: 'consistency_check', current_model: 'sonnet', distillation_status: 'not_started' },
  { task_type: 'reflection', current_model: 'opus', distillation_status: 'not_started' },
  { task_type: 'meta_intervention', current_model: 'opus', distillation_status: 'not_started' },
];
```

**Test:**
```bash
# Seed routing config
npx tsx scripts/seed-model-routing.ts
# Verify all task types present
# Query: SELECT COUNT(*) FROM model_routing_config
# Expected: 9+ rows
```
**Severity:** 🔴 CRITICAL

### Step 15.5: Learning Schema — Governance & Audit Tables

**What:** Create learning_audit_log, learning_configuration tables. Create all indexes from the schema.

**Files to create/modify:**
- `packages/db/src/schema/learning-governance.ts` — Drizzle schema
- Update `scripts/create-learning-tables.ts` with indexes

**Implementation details:**
Seed `learning_configuration` with default values:

```typescript
const defaultConfig = [
  { config_key: 'learning.enabled', config_value: { enabled: true } },
  { config_key: 'learning.self_evaluation.enabled', config_value: { enabled: true } },
  { config_key: 'learning.consistency_checks.enabled', config_value: { enabled: true, schedule: 'nightly' } },
  { config_key: 'learning.variant_comparison.enabled', config_value: { enabled: false } }, // off by default — 3x cost
  { config_key: 'learning.outcome_tracking.enabled', config_value: { enabled: true } },
  { config_key: 'learning.exemplar_comparison.enabled', config_value: { enabled: true } },
  { config_key: 'learning.reflection.enabled', config_value: { enabled: true, schedule: 'nightly' } },
  { config_key: 'learning.reflection.auto_promotion_max', config_value: { max_stage: 'established' } },
  { config_key: 'learning.injection.max_patterns_per_prompt', config_value: { max: 10 } },
  { config_key: 'learning.injection.min_confidence', config_value: { min: 0.5 } },
  { config_key: 'learning.injection.max_exemplars_per_prompt', config_value: { max: 3 } },
  { config_key: 'learning.spend.monthly_cap', config_value: { cap_usd: 500 } },
  { config_key: 'learning.spend.per_deal_cap', config_value: { cap_usd: 50 } },
  { config_key: 'learning.spend.overhead_cap_pct', config_value: { cap_pct: 40 } },
  { config_key: 'learning.spend.behavior_when_exceeded', config_value: { behavior: 'warn_only' } },
];
```

**Test:**
```bash
# Verify all config seeded
# Query learning_configuration for all keys
# Verify audit_log insert works
npx tsx scripts/test-governance-tables.ts
```
**Severity:** 🔴 CRITICAL

### Step 15.6: Model Router Service

**What:** Create the model routing service that agents use to determine which Claude model to call.

**Files to create/modify:**
- `packages/ai/src/routing/model-router.ts` — Core routing logic
- `packages/ai/src/routing/types.ts` — Routing types
- `packages/ai/src/routing/novelty-scorer.ts` — Novelty score calculation

**Implementation details:**

```typescript
// packages/ai/src/routing/model-router.ts
export class ModelRouter {
  /**
   * Given a task type and deal context, returns which model to use.
   * Checks: model_routing_config table → novelty score → dynamic promotion rules
   */
  async getModel(taskType: string, dealContext?: DealContext): Promise<ModelSelection> {
    // 1. Look up configured model for this task type
    const config = await this.getRoutingConfig(taskType);
    
    // 2. Calculate novelty score if deal context provided
    if (dealContext) {
      const novelty = await this.calculateNovelty(dealContext);
      if (novelty > 0.7) return { model: 'opus', reason: 'high_novelty' };
    }
    
    // 3. Check dynamic promotion (consecutive low scores)
    if (config.consecutive_low_scores >= 5 && config.current_model === 'sonnet') {
      return { model: 'opus', reason: 'auto_promoted' };
    }
    
    // 4. Return configured model
    return { model: config.current_model, reason: 'configured' };
  }

  /**
   * After each agent invocation, record the score and update routing stats.
   */
  async recordScore(taskType: string, score: number, model: string): Promise<void> {
    // Update consecutive_low_scores or consecutive_high_scores
    // If Sonnet consistently low → auto-promote
    // If Opus consistently high → flag for demotion review
  }
}
```

The novelty scorer checks:
- Is deal_type in the top 5 most common? (query deals table)
- Is industry seen in last 20 deals?
- Is jurisdiction in firm's primary 3?
- Is deal value in top/bottom 10%?

**Test:**
```bash
# Test model selection for known task types
npx tsx -e "
import { ModelRouter } from './packages/ai/src/routing/model-router';
const router = new ModelRouter();
const result = await router.getModel('email_extraction');
console.log(result.model === 'sonnet' ? 'PASS' : 'FAIL: expected sonnet, got ' + result.model);
const result2 = await router.getModel('disclosure_generation');
console.log(result2.model === 'opus' ? 'PASS' : 'FAIL: expected opus, got ' + result2.model);
"
```
**Severity:** 🔴 CRITICAL

### Step 15.7: Integrate Model Router into Agent Invocation Framework

**What:** Modify the existing agent invoker (from Phase 4) to use the ModelRouter instead of hardcoded model selection.

**Files to modify:**
- `packages/ai/src/agents/agent-invoker.ts` — Add model router integration
- Any agent configuration files that hardcode model selection

**Implementation details:**
Before this change, agents call Claude with a hardcoded model. After, they call `ModelRouter.getModel()` first, then use the returned model. The invoker should also call `ModelRouter.recordScore()` after the evaluator scores the output.

```typescript
// In agent-invoker.ts
const selection = await this.modelRouter.getModel(config.taskType, dealContext);
const response = await anthropic.messages.create({
  model: selection.model === 'opus' ? 'claude-opus-4-6' : 'claude-sonnet-4-5-20250929',
  // ...
});
// After evaluation:
await this.modelRouter.recordScore(config.taskType, evaluationScore, selection.model);
```

**Test:**
```bash
# Invoke an agent and verify:
# 1. Model router was consulted (check logs or model_routing_config update)
# 2. Correct model was used based on task type
# 3. Score was recorded after evaluation
```
**Severity:** 🟡 HIGH

### Step 15.8: Learning Configuration API Routes

**What:** Create API routes for reading and updating learning configuration.

**Files to create:**
- `apps/web/src/app/api/learning/config/route.ts` — GET/PUT learning configuration
- `apps/web/src/app/api/learning/routing/route.ts` — GET/PUT model routing config

**Implementation details:**
Standard CRUD routes querying `learning_configuration` and `model_routing_config` tables via Supabase REST API.

**Test:**
```bash
# Start dev server
pnpm dev &

# GET config
curl -s http://localhost:3000/api/learning/config | jq '.[] | .config_key'
# Expected: list of all config keys

# GET routing
curl -s http://localhost:3000/api/learning/routing | jq '.[] | {task_type, current_model}'
# Expected: all task types with their models

# PUT - update a config value
curl -X PUT http://localhost:3000/api/learning/config \
  -H "Content-Type: application/json" \
  -d '{"config_key":"learning.variant_comparison.enabled","config_value":{"enabled":true}}'
# Expected: 200 OK
```
**Severity:** 🟡 HIGH

### Step 15.9: Table Creation Verification Script

**What:** Create a comprehensive script that verifies ALL learning tables exist and have correct schema.

**Files to create:**
- `scripts/verify-learning-schema.ts` — Checks all tables, columns, indexes

**Implementation details:**
Query Supabase's `information_schema.columns` to verify every expected column exists in every table. Report any missing tables or columns.

**Test:**
```bash
npx tsx scripts/verify-learning-schema.ts
# Expected: "All 16 learning tables verified. 0 issues found."
```
**Severity:** 🔴 CRITICAL

## Phase Gate
All of the following must be true:
- [ ] All 16 learning tables created in Supabase
- [ ] All tables can insert and query via Supabase REST API
- [ ] Drizzle schema files created for all tables
- [ ] Model routing config seeded with default values
- [ ] Learning configuration seeded with default values
- [ ] ModelRouter correctly selects model by task type
- [ ] Agent invoker uses ModelRouter for model selection
- [ ] Configuration API routes return correct data
- [ ] Verification script passes with 0 issues
- [ ] `pnpm build` succeeds
- [ ] Dev server starts and all existing pages still work
