# Learning Architecture — Self-Improving Agent System

## Reference Document (NOT build instructions — see skills/phase-15.md through phase-20.md)

---

## 1. Architecture Overview

The learning system has **four independent subsystems** that share data but are built, tested, and deployed independently:

1. **Signal Collection** — Instrumentation capturing quality data from every agent action
2. **Reflection Engine** — Processes signals into learned patterns asynchronously
3. **Knowledge Injection** — Assembles 5-layer prompts for each agent invocation
4. **Agent Communication** — Events, shared context, inter-agent requests

Each subsystem has independent on/off toggles, monitoring, and can be disabled without breaking the others.

---

## 2. Five Signal Sources (No Human Required)

### Signal Source 1: Self-Evaluation

Every agent output is reviewed by a **separate evaluator instance** — a different Claude invocation with a different prompt. The evaluator's only job is structured criticism against a rubric. The evaluator never sees the generator's reasoning, only the output + source documents.

**Evaluator rubrics by agent type:**

| Agent Type | Criteria |
|---|---|
| Disclosure Generator | Completeness, cross-reference accuracy, schedule numbering, materiality qualifiers, jurisdiction requirements |
| Email Extractor | Position identification, party attribution, temporal ordering, sentiment classification |
| Negotiation Tracker | Position history consistency, agreed terms accuracy, open items categorization |
| Checklist Manager | Items appropriate for deal type, dependencies mapped, priority assignments, nothing missing |
| Document Generator | Legal accuracy, boilerplate appropriateness, defined terms consistency, cross-references resolve |

**Evaluator design principles:**
- Different prompt from generator (prevents blind spots reinforcing)
- Access to source materials for factual checking
- Scores on 10-15 specific criteria, not a single quality score
- Must cite examples for scores below 0.7
- Separate API call, never same context window

### Signal Source 2: Cross-Agent Consistency Checks

A nightly **Consistency Agent** compares all work products across a deal. Detects:
- Disclosure schedule says "no litigation" but email agent extracted arbitration reference
- Negotiation tracker shows position "agreed" but later email reopens it
- Checklist item marked complete but subsequent document contradicts completion criteria
- Agent generated 8 schedules but SPA has 12 rep sections

### Signal Source 3: Variant Comparison / Competitive Self-Play

Agent generates 3 variants with different strategies:
- **Variant A:** Conservative (more schedules, more disclosure)
- **Variant B:** Standard (matches typical deal of this type)
- **Variant C:** Aggressive (minimal disclosure, legally required only)

Evaluator scores all three. Best one used. Over time, system learns which strategy works for which deal type. 3x API cost but strongest signal.

### Signal Source 4: Downstream Outcome Tracking

Metrics measured after the deal progresses:
- Which checklist items were never completed (unnecessary vs. missed?)
- How many times negotiation positions changed after marked "agreed"
- Disclosure schedules completely rewritten during process
- Time from document upload to extraction (getting faster?)
- Action items generated vs. actually acted on (calibration)

Ignored outputs are signal. If an agent generates 20 action items per email and the team acts on 3, the agent is noisy. If it generates 5 and all 5 are acted on, it's calibrated.

### Signal Source 5: External Validation / Exemplar Benchmark

Compare agent outputs against a gold-standard exemplar library:
- Wachtell Lipton disclosure schedules
- Sullivan & Cromwell negotiation memos
- High-scoring internal documents from past deals

Gap analysis: what's missing, what's different, what's better. Exemplars tagged with deal characteristics (industry, size, jurisdiction). Agent output compared to most similar exemplar.

### Signal Quality Hierarchy (for confidence scoring)

| Source | Confidence Boost |
|---|---|
| Human correction | +0.15 |
| External validation (exemplar match) | +0.10 |
| Self-evaluation gap | +0.05 |
| Consistency check | +0.05 |
| Variant comparison win | +0.03 |
| Outcome tracking | +0.02 |

---

## 3. Reflection Engine

A separate Claude instance that runs after each deal milestone or nightly. Reads all signals since last reflection. Asks:
- Do signals cluster around a specific agent, task type, or deal characteristic?
- Are existing patterns contradicted by new evidence? (decay confidence)
- Are new patterns with enough supporting signals to create? (minimum 3 signals)
- Are high-confidence patterns ready for promotion to hard rules?

### Pattern Lifecycle

```
Signal detected (0.3, single occurrence)
  ↓
Pattern proposed (0.4, seen in 3 deals)
  ↓
Pattern confirmed (0.6, seen in 5 deals)
  ↓
Pattern established (0.8, seen in 8 deals, no contradictions)
  ↓
Pattern promoted to hard rule (0.95, consistent across 20+ deals)
  [or]
Pattern decayed (confidence dropped below 0.2, contradicted)
  ↓
Pattern retired
```

---

## 4. Knowledge Injection — 5-Layer Prompt Assembly

Every agent invocation assembles its prompt from 5 layers, bottom to top:

**Layer 1 (Constitutional):** Immutable rules, never modified by learning. "Never delete production data without approval." Read-only, lives outside repo.

**Layer 2 (Firm Knowledge):** Firm-specific practices, jurisdiction rules, client preferences. Manually curated, updated quarterly.

**Layer 3 (Learned Patterns):** Dynamically discovered patterns from Reflection Engine. Filtered by deal context. Only patterns with confidence > 0.5 injected. Capped at 10 per prompt.

**Layer 4 (Deal Intelligence):** Per-deal shared context from all agents. Counterparty stances, key risks, timeline pressures.

**Layer 5 (Task Exemplars):** Concrete examples of similar tasks done well. Includes distilled Opus outputs for Sonnet execution.

---

## 5. Multi-Model Routing with Distillation

### Routing Rules
- **Sonnet** is the floor (not Haiku — legal work has a quality minimum)
- Sonnet: Email extraction, checklist updates, classification, notifications, self-evaluation, consistency checks
- Opus: Disclosure generation, negotiation analysis, document review, reflection engine, Meta Agent, novel situations

### Dynamic Promotion/Demotion
- If Sonnet scores consistently below 0.70 on a task type (5 consecutive), auto-promote to Opus
- If Opus scores consistently 0.95+ on a task type (10 consecutive), suggest demotion to Sonnet (requires human approval)

### Novelty Score
Unfamiliar deal contexts automatically bump model tier:
- Deal type not in top 5 most common
- Industry not seen in last 20 deals
- Jurisdiction not in firm's primary 3
- Deal value in top/bottom 10%

### Distillation Pipeline

Every time Opus handles a task and the evaluator scores it ≥ 0.90, the output becomes a **distillation candidate**. Stored in `exemplar_library` with full input context and output.

When Sonnet later handles the same task type, the system retrieves top 2-3 Opus exemplars for that context and injects them as few-shot examples in Layer 5.

```
DISTILLATION LIFECYCLE:

Phase 1 (Deals 1-10): Opus handles all complex tasks. 
  Every high-scoring output → exemplar library.
  Cost: $20-40/deal.

Phase 2 (Deals 10-20): System has 10-15 Opus exemplars per task type.
  Shadow testing: Sonnet generates in parallel (not used), scores compared.
  Cost: $25-45/deal (higher during testing).

Phase 3 (Deals 20-50): Task types where Sonnet + exemplars ≥ 0.85 → handed to Sonnet.
  Periodic spot-checks (every 10th invocation also runs on Opus).
  Cost: $10-20/deal.

Phase 4 (Deals 50+): Most tasks on Sonnet + exemplars.
  Opus reserved for: novel situations, meta agent, reflection, validation.
  Cost: $5-12/deal.
```

**Distillation validation:** Before approving handoff, system runs Sonnet + exemplars against 3 historical deals where Opus scored ≥ 0.90. If Sonnet scores ≥ 0.85, approve. If < 0.85, reject and accumulate more exemplars.

**Exemplar curation:** Track which exemplars actually improve Sonnet's scores. Prefer high-impact + diverse + recent exemplars for injection.

---

## 6. Inter-Agent Communication (3 Mechanisms)

### Mechanism 1: Structured Events (existing event backbone)
Deterministic routing. Email agent extracts position → emits `negotiation.position_update` → consequence map triggers checklist update + notification.

### Mechanism 2: Shared Context Store (deal_intelligence)
All agents read/write to `deal_intelligence` table. Conflict resolution via `supersedes` chain. If insights contradict, Consistency Agent flags.

### Mechanism 3: Agent-to-Agent Requests
Agents delegate to each other. Disclosure agent needs information: creates task for DD agent. Orchestration layer monitors `agent_requests` table, activates target agent.

**Deadlock prevention:**
- Max 3-hop chain depth
- 5-minute timeout per request
- No circular requests
- Requests expire after 1 hour

---

## 7. Meta Agent (Unsticker)

Rarely called (~1-5% of invocations), always Opus. Full read access to everything.

**Triggers:**
- Tool failure after 3 retries
- Self-evaluation score below 0.4
- Max retries reached on task
- Unresolved contradiction flagged by Consistency Agent
- Agent explicitly requests Meta intervention

**Four Response Modes:**
1. **Reroute:** Wrong agent for this task. Reassign.
2. **Decompose:** Task too complex. Break into subtasks.
3. **Synthesize:** Multiple agents produced conflicting outputs. Merge.
4. **Escalate:** Cannot resolve without human input. Structured problem + options.

---

## 8. Control Plane UI

### Model Routing Page (`/settings/models`)
Per-task model selection dropdown. Dynamic promotion/demotion toggles. Distillation status per task type (exemplars available, testing status, handoff approval).

### Learning System Toggles (`/settings/learning`)
Every component independently on/off:
- Signal Collection: Self-evaluation, Consistency checks, Variant comparison, Outcome tracking, Exemplar comparison
- Pattern Processing: Reflection engine schedule, Auto-promotion level, Skill evolution, Tool generation
- Knowledge Injection: Pattern injection (max patterns, min confidence), Exemplar injection, Deal intelligence

### Spend Controls (`/settings/spend`)
Monthly/per-deal/per-task budget caps. Learning overhead cap (% of spend going to learning vs. deal work). Current month breakdown by category.

---

## 9. Learning Dashboard UI

### Overview (`/learning`)
Active/retired pattern counts, avg agent score trend, human corrections trend, meta interventions, learning velocity chart, recent learning events feed.

### Pattern Explorer (`/learning/patterns`)
Click any pattern → plain-English description, conditions, confidence bar, evidence chain, lifecycle timeline, before/after impact metrics, version history, actions (edit/retire/revert).

### Agent Performance (`/learning/agents`)
Per agent: tasks completed, avg quality, model distribution, avg cost, avg latency, meta interventions, human corrections, score by criteria breakdown.

### Consistency Log (`/learning/consistency`)
Unresolved contradictions with severity, deal context, conflicting statements, resolution actions.

### Audit Trail (`/learning/audit`)
Every system change: who, what, when, why, before/after state, evidence. All reversible.

---

## 10. Governance

### Learning Governance (who can change system's behavior)
- L1: Auto-propose patterns (confidence 0.3-0.5)
- L2: Auto-establish patterns (confidence 0.5-0.8)
- L3: Human review for hard rules (confidence 0.8-0.95)
- L4: Human review for generated tools (confidence 0.95+)
- L5: Human review for skill file changes

### Operational Governance (what agents can do)
- O1: Read data (unrestricted)
- O2: Internal writes (deal intelligence, notes)
- O3: Generate documents (drafts, schedules)
- O4: External communications (emails, filings)
- O5: Delete/config changes (never without approval)

These are independent axes.

---

## 11. Database Schema — New Tables

### Signal Collection

```sql
CREATE TABLE self_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id),
  agent_type TEXT NOT NULL,
  task_id UUID,
  output_snapshot JSONB NOT NULL,
  criteria_scores JSONB NOT NULL,      -- { "completeness": 0.85, "accuracy": 0.92, ... }
  issues_found JSONB DEFAULT '[]',
  overall_score FLOAT NOT NULL,
  model_used TEXT NOT NULL,            -- 'sonnet' | 'opus'
  token_count INTEGER,
  evaluated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE consistency_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id),
  check_type TEXT NOT NULL,            -- 'nightly' | 'milestone' | 'on_demand'
  source_entity_type TEXT NOT NULL,
  source_entity_id UUID NOT NULL,
  conflicting_entity_type TEXT NOT NULL,
  conflicting_entity_id UUID NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',  -- 'high' | 'medium' | 'low'
  resolution TEXT,                      -- null if unresolved
  resolved_by TEXT,                     -- 'auto' | 'human' | agent name
  detected_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE variant_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id),
  task_type TEXT NOT NULL,
  variants JSONB NOT NULL,             -- [{ strategy: 'conservative', output: '...', score: 0.87 }, ...]
  selected_variant TEXT NOT NULL,
  selection_reasoning TEXT,
  context JSONB,                       -- deal characteristics that influenced selection
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE outcome_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id),
  signal_type TEXT NOT NULL,           -- 'ignored_output' | 'rewrite' | 'position_reopened' | 'calibration'
  agent_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value FLOAT NOT NULL,
  context JSONB,
  measured_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE exemplar_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,           -- 'external_firm' | 'internal_opus' | 'internal_approved'
  source_firm TEXT,                    -- 'wachtell' | 'sullivan_cromwell' | null for internal
  document_type TEXT NOT NULL,
  deal_characteristics JSONB,          -- { deal_type, industry, jurisdiction, size_range }
  content JSONB NOT NULL,              -- the exemplar content
  quality_score FLOAT NOT NULL,
  -- Distillation-specific fields
  generation_model TEXT,               -- 'opus' | 'sonnet' | null for external
  generation_context JSONB,            -- full prompt layers 1-5 that produced this
  evaluator_scores JSONB,              -- per-criteria scores from self-evaluation
  distillation_eligible BOOLEAN DEFAULT false,
  used_as_exemplar_count INTEGER DEFAULT 0,
  downstream_quality_impact FLOAT,     -- did injecting this improve Sonnet's scores?
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE exemplar_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id),
  agent_output_id UUID,
  exemplar_id UUID REFERENCES exemplar_library(id),
  gaps_identified JSONB DEFAULT '[]',
  improvements_suggested JSONB DEFAULT '[]',
  similarity_score FLOAT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Learning & Reflection

```sql
CREATE TABLE learned_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT,                     -- null = applies to all agents
  pattern_type TEXT NOT NULL,          -- 'quality_improvement' | 'error_prevention' | 'strategy_preference' | 'context_rule'
  description TEXT NOT NULL,           -- plain-English description
  condition JSONB NOT NULL,            -- when this pattern applies: { deal_type, industry, jurisdiction, ... }
  instruction TEXT NOT NULL,           -- what to do: injected into agent prompt
  confidence FLOAT NOT NULL DEFAULT 0.3,
  source_signals UUID[] DEFAULT '{}',
  supporting_count INTEGER DEFAULT 0,
  contradicting_count INTEGER DEFAULT 0,
  lifecycle_stage TEXT NOT NULL DEFAULT 'proposed', -- 'proposed' | 'confirmed' | 'established' | 'hard_rule' | 'decayed' | 'retired'
  version INTEGER DEFAULT 1,
  version_history JSONB DEFAULT '[]',
  last_applied_at TIMESTAMPTZ,
  last_evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reflection_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type TEXT NOT NULL,          -- 'nightly' | 'milestone' | 'manual'
  deal_id UUID,                        -- null for cross-deal reflections
  signals_processed INTEGER NOT NULL,
  patterns_created INTEGER DEFAULT 0,
  patterns_updated INTEGER DEFAULT 0,
  patterns_decayed INTEGER DEFAULT 0,
  patterns_promoted INTEGER DEFAULT 0,
  summary TEXT,
  model_used TEXT NOT NULL,
  token_count INTEGER,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE skill_file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path TEXT NOT NULL,
  version INTEGER NOT NULL,
  changes JSONB NOT NULL,              -- diffs from previous version
  validation_results JSONB,            -- test results against historical deals
  approved_by TEXT,                    -- 'auto' | user UUID
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE generated_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name TEXT NOT NULL UNIQUE,
  source_pattern_id UUID REFERENCES learned_patterns(id),
  description TEXT NOT NULL,
  function_code TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  deprecated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Agent Communication

```sql
CREATE TABLE deal_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) NOT NULL,
  topic TEXT NOT NULL,                 -- 'counterparty_stance' | 'key_risk' | 'timeline_pressure' | 'strategy_note'
  insight TEXT NOT NULL,
  confidence FLOAT DEFAULT 0.7,
  source_agent TEXT NOT NULL,
  source_evidence JSONB,               -- what led to this insight
  supersedes UUID REFERENCES deal_intelligence(id),  -- previous insight this updates
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE agent_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) NOT NULL,
  requesting_agent TEXT NOT NULL,
  target_agent TEXT NOT NULL,
  request_type TEXT NOT NULL,          -- 'information_needed' | 'review_requested' | 'action_needed'
  description TEXT NOT NULL,
  context JSONB,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'in_progress' | 'completed' | 'expired' | 'failed'
  response JSONB,
  chain_depth INTEGER DEFAULT 1,       -- for deadlock prevention (max 3)
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '1 hour'),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
```

### Meta Agent

```sql
CREATE TABLE meta_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id),
  trigger_reason TEXT NOT NULL,        -- 'tool_failure' | 'low_score' | 'max_retries' | 'contradiction' | 'agent_request'
  trigger_entity_id UUID,              -- the failed task / evaluation / check
  mode TEXT NOT NULL,                  -- 'reroute' | 'decompose' | 'synthesize' | 'escalate'
  input_context JSONB NOT NULL,
  output_decision JSONB NOT NULL,
  human_escalation BOOLEAN DEFAULT false,
  escalation_options JSONB,            -- structured options if escalated
  resolution_time_seconds INTEGER,
  model_used TEXT DEFAULT 'opus',
  token_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Distillation Tracking

```sql
CREATE TABLE distillation_trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type TEXT NOT NULL,
  deal_context JSONB NOT NULL,
  opus_score FLOAT NOT NULL,
  sonnet_score FLOAT,                  -- without exemplars
  sonnet_with_exemplars_score FLOAT,   -- with Opus exemplars injected
  exemplar_ids UUID[] NOT NULL,
  exemplar_count INTEGER NOT NULL,
  score_gap FLOAT,                     -- opus_score - sonnet_with_exemplars_score
  recommendation TEXT NOT NULL,        -- 'approve_handoff' | 'reject_needs_more' | 'reject_too_complex'
  applied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE model_routing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type TEXT NOT NULL UNIQUE,
  current_model TEXT NOT NULL DEFAULT 'opus',       -- 'sonnet' | 'opus'
  distillation_status TEXT DEFAULT 'not_started',   -- 'not_started' | 'collecting' | 'testing' | 'handed_off'
  exemplar_count INTEGER DEFAULT 0,
  min_exemplars_for_testing INTEGER DEFAULT 15,
  handoff_threshold FLOAT DEFAULT 0.85,
  revert_threshold FLOAT DEFAULT 0.80,
  spot_check_frequency INTEGER DEFAULT 10,          -- every Nth invocation
  consecutive_low_scores INTEGER DEFAULT 0,         -- for auto-promotion
  consecutive_high_scores INTEGER DEFAULT 0,        -- for demotion suggestion
  last_spot_check_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Governance & Configuration

```sql
CREATE TABLE learning_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,            -- 'pattern_created' | 'pattern_promoted' | 'model_promoted' | 'tool_generated' | 'skill_updated' | ...
  actor TEXT NOT NULL,                 -- 'system:reflection_engine' | 'system:meta_agent' | 'user:email'
  entity_type TEXT NOT NULL,           -- 'pattern' | 'model_config' | 'tool' | 'skill' | ...
  entity_id UUID,
  description TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB,
  reasoning TEXT,
  evidence JSONB,
  deal_id UUID,
  reversible BOOLEAN DEFAULT true,
  reversed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE learning_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Indexes

```sql
-- Signal queries
CREATE INDEX idx_self_eval_deal ON self_evaluations(deal_id);
CREATE INDEX idx_self_eval_agent ON self_evaluations(agent_type, overall_score);
CREATE INDEX idx_consistency_deal ON consistency_checks(deal_id, severity);
CREATE INDEX idx_consistency_unresolved ON consistency_checks(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX idx_outcome_deal ON outcome_signals(deal_id, signal_type);
CREATE INDEX idx_exemplar_type ON exemplar_library(document_type, source_type);
CREATE INDEX idx_exemplar_distillation ON exemplar_library(distillation_eligible, generation_model);

-- Pattern queries
CREATE INDEX idx_patterns_stage ON learned_patterns(lifecycle_stage, confidence);
CREATE INDEX idx_patterns_agent ON learned_patterns(agent_type, lifecycle_stage);

-- Communication queries
CREATE INDEX idx_intelligence_deal ON deal_intelligence(deal_id, topic);
CREATE INDEX idx_requests_status ON agent_requests(status, target_agent);
CREATE INDEX idx_requests_deal ON agent_requests(deal_id);

-- Distillation queries
CREATE INDEX idx_distillation_task ON distillation_trials(task_type, recommendation);
CREATE INDEX idx_routing_task ON model_routing_config(task_type);

-- Audit queries
CREATE INDEX idx_audit_entity ON learning_audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_time ON learning_audit_log(created_at DESC);
```

---

## 12. Implementation Notes

### Supabase Constraint Reminder
All table creation must use Supabase REST API or SQL Editor — NOT `drizzle-kit push`. Direct PostgreSQL connections do not resolve in Claude Code's environment. Pattern:

```typescript
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// For table creation, use Supabase SQL RPC or the management API
// For CRUD operations, use the supabase client directly
```

Drizzle schema files should still be created for type generation and production use, but testing during build uses the Supabase JS client.

### API Cost Management
Learning overhead adds ~40% to base deal costs. The system should track learning spend separately from deal execution spend. Default learning overhead cap: 40% of total spend.

### Phased Rollout
Start logging signals from day one (even before dashboard exists). Data accumulates for later analysis. The tables should be created in the first learning phase, with actual signal collection, reflection, and injection built incrementally after.
