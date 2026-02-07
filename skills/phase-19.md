# Phase 19: Knowledge Injection + Deal Intelligence + Agent Communication

## Prerequisites
- Phase 18 must be complete (patterns exist in learned_patterns table)
- Exemplar library populated (from Phase 17)
- Agent invocation framework operational

## What You're Building

This phase closes the learning loop. Patterns discovered by the Reflection Engine and exemplars from the library get injected into agent prompts, making every agent invocation benefit from everything the system has learned. You're also building the inter-agent communication layer — deal intelligence sharing and agent-to-agent request delegation.

## Reference
- `docs/LEARNING_ARCHITECTURE.md` — Sections 4 (Knowledge Injection), 6 (Agent Communication)

## Steps

### Step 19.1: 5-Layer Prompt Assembler

**What:** Create the prompt assembly service that builds every agent prompt from 5 layers.

**Files to create:**
- `packages/ai/src/prompts/prompt-assembler.ts` — Core assembler
- `packages/ai/src/prompts/layers/constitutional.ts` — Layer 1 (immutable rules)
- `packages/ai/src/prompts/layers/firm-knowledge.ts` — Layer 2 (firm practices)
- `packages/ai/src/prompts/layers/learned-patterns.ts` — Layer 3 (dynamic patterns)
- `packages/ai/src/prompts/layers/deal-intelligence.ts` — Layer 4 (per-deal context)
- `packages/ai/src/prompts/layers/exemplars.ts` — Layer 5 (examples + distillation)

**Implementation details:**

```typescript
export class PromptAssembler {
  /**
   * Assembles a complete prompt from 5 layers for any agent invocation.
   */
  async assemble(params: {
    agentType: string;
    taskType: string;
    dealId: string;
    baseSystemPrompt: string;  // the agent's core system prompt
    taskContent: string;       // the specific task/user message
  }): Promise<AssembledPrompt> {
    
    // Layer 1: Constitutional (immutable, never changes)
    const constitutional = await this.getConstitutionalRules();
    // e.g., "Never delete production data. Never bypass approval for Tier 3 actions.
    //        Never send external communications without explicit approval.
    //        Always show reasoning. Always maintain audit trail."

    // Layer 2: Firm Knowledge (manually curated)
    const firmKnowledge = await this.getFirmKnowledge(params.agentType);
    // e.g., "For Delaware asset purchases, always include Schedule 3.22 for environmental."
    //        Loaded from a curated file or database table.

    // Layer 3: Learned Patterns (dynamic, from Reflection Engine)
    const patterns = await this.getRelevantPatterns(params.agentType, params.dealId);
    // Query: SELECT * FROM learned_patterns
    //        WHERE (agent_type = ? OR agent_type IS NULL)
    //        AND confidence > config.min_confidence
    //        AND lifecycle_stage IN ('confirmed', 'established', 'hard_rule')
    //        AND condition matches deal characteristics
    //        ORDER BY confidence DESC LIMIT config.max_patterns

    // Layer 4: Deal Intelligence (per-deal shared context)
    const dealIntelligence = await this.getDealIntelligence(params.dealId);
    // Query: SELECT * FROM deal_intelligence
    //        WHERE deal_id = ? AND supersedes IS NULL (latest only)
    //        ORDER BY confidence DESC

    // Layer 5: Task Exemplars (concrete examples + distilled Opus outputs)
    const exemplars = await this.getExemplars(params.taskType, params.dealId);
    // From exemplar_library: best matching examples for this task type + deal context

    return {
      systemPrompt: [
        params.baseSystemPrompt,
        '\n\n## CONSTITUTIONAL RULES (NEVER OVERRIDE)\n' + constitutional,
        '\n\n## FIRM PRACTICES\n' + firmKnowledge,
        patterns.length > 0 ? '\n\n## LEARNED PATTERNS (apply where relevant)\n' + this.formatPatterns(patterns) : '',
        dealIntelligence.length > 0 ? '\n\n## DEAL INTELLIGENCE (what the team knows)\n' + this.formatIntelligence(dealIntelligence) : '',
        exemplars.length > 0 ? '\n\n## REFERENCE EXAMPLES\n' + this.formatExemplars(exemplars) : '',
      ].join(''),
      userMessage: params.taskContent,
      metadata: {
        patternsInjected: patterns.map(p => p.id),
        exemplarsInjected: exemplars.map(e => e.id),
        intelligenceInjected: dealIntelligence.map(i => i.id),
      },
    };
  }
}
```

**Pattern formatting for injection:**
```
Pattern: For healthcare deals over $50M, conservative disclosure strategy scores 30% higher.
When: deal_type = 'asset_purchase' AND industry = 'healthcare' AND deal_value > 50000000
Instruction: Use conservative disclosure approach — include all potentially relevant items, add additional schedules for HIPAA and PHI data handling.
Confidence: 0.75 (established, 8 supporting signals)
```

**Test:**
```bash
# Assemble a prompt for disclosure_generation on Mercury deal
# Verify all 5 layers present in output
# Verify learned patterns filtered by deal context
# Verify exemplars selected by task type
npx tsx scripts/test-prompt-assembler.ts
```
**Severity:** 🔴 CRITICAL

### Step 19.2: Integrate Prompt Assembler into Agent Invoker

**What:** Replace the existing prompt construction in the agent invoker with the 5-layer assembler.

**Files to modify:**
- `packages/ai/src/agents/agent-invoker.ts` — Use PromptAssembler instead of direct prompt construction

**Implementation details:**

Before: agent invoker built prompts by concatenating system prompt + task content.
After: agent invoker calls `PromptAssembler.assemble()` which adds all 5 layers.

```typescript
// Before:
const systemPrompt = config.systemPrompt;
const response = await anthropic.messages.create({ model, system: systemPrompt, messages: [...] });

// After:
const assembled = await this.promptAssembler.assemble({
  agentType: config.agentType,
  taskType: config.taskType,
  dealId: dealContext.dealId,
  baseSystemPrompt: config.systemPrompt,
  taskContent: userMessage,
});
const response = await anthropic.messages.create({
  model, system: assembled.systemPrompt, messages: [{ role: 'user', content: assembled.userMessage }]
});
// Track which patterns and exemplars were injected (for impact analysis)
await this.patternTracker.recordApplications(assembled.metadata.patternsInjected, config.taskType, evaluationScore);
```

**Test:**
```bash
# Invoke an agent via the standard pathway
# Verify the assembled prompt contains patterns and exemplars
# Log the assembled prompt to verify 5-layer structure
```
**Severity:** 🔴 CRITICAL

### Step 19.3: Deal Intelligence Service

**What:** Create the shared context store where agents read/write per-deal intelligence.

**Files to create:**
- `packages/ai/src/communication/deal-intelligence.ts` — CRUD + conflict resolution
- `apps/web/src/app/api/deals/[dealId]/intelligence/route.ts` — API routes

**Implementation details:**

```typescript
export class DealIntelligenceService {
  async addInsight(params: {
    dealId: string;
    topic: string;      // 'counterparty_stance' | 'key_risk' | 'timeline_pressure' | 'strategy_note'
    insight: string;
    confidence: number;
    sourceAgent: string;
    sourceEvidence: any;
  }): Promise<DealIntelligence> {
    // Check if there's an existing insight on this topic
    const existing = await this.getLatestInsight(params.dealId, params.topic, params.sourceAgent);
    
    // If updating, set supersedes to create chain
    const insertData = existing
      ? { ...params, supersedes: existing.id }
      : params;

    return await this.insert(insertData);
  }

  async getActiveInsights(dealId: string): Promise<DealIntelligence[]> {
    // Get all insights where supersedes IS NULL (latest in each chain)
    // Exclude superseded insights
    return await this.query(dealId, { superseded: false });
  }

  async getInsightChain(insightId: string): Promise<DealIntelligence[]> {
    // Follow supersedes chain backwards to show history of an insight
  }
}
```

**Wire agents to write intelligence:**
- Email extraction agent: when it identifies a counterparty stance, write to deal_intelligence
- DD agent: when it identifies a key risk, write to deal_intelligence
- Negotiation tracker: when a significant position change occurs, write to deal_intelligence

**Test:**
```bash
# Add an insight: "Counterparty is firm on 18-month non-compete"
# Add a superseding insight: "Counterparty softened to 12-month non-compete in latest email"
# Query active insights → should only show the latest
# Query insight chain → should show both, ordered by time
```
**Severity:** 🔴 CRITICAL

### Step 19.4: Agent-to-Agent Request System

**What:** Create the mechanism for agents to delegate work to each other.

**Files to create:**
- `packages/ai/src/communication/agent-requests.ts` — Request management
- `packages/ai/src/communication/request-orchestrator.ts` — Processes incoming requests

**Implementation details:**

```typescript
export class AgentRequestService {
  async createRequest(params: {
    dealId: string;
    requestingAgent: string;
    targetAgent: string;
    requestType: 'information_needed' | 'review_requested' | 'action_needed';
    description: string;
    context: any;
  }): Promise<AgentRequest> {
    // Deadlock prevention checks
    const existingChain = await this.getRequestChain(params.dealId, params.requestingAgent);
    if (existingChain.length >= 3) {
      throw new Error('Max request chain depth (3) exceeded');
    }
    
    // Check for circular requests
    const reverseRequest = await this.findRequest(params.dealId, params.targetAgent, params.requestingAgent, 'pending');
    if (reverseRequest) {
      throw new Error('Circular request detected — ' + params.targetAgent + ' already has pending request to ' + params.requestingAgent);
    }

    const request = await this.insert({
      ...params,
      status: 'pending',
      chainDepth: existingChain.length + 1,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    // Trigger orchestrator to activate target agent
    await this.orchestrator.processRequest(request);
    return request;
  }
}

export class RequestOrchestrator {
  async processRequest(request: AgentRequest): Promise<void> {
    // 1. Mark request as in_progress
    // 2. Activate the target agent with the request as context
    // 3. When target agent responds, update request with response
    // 4. Notify requesting agent (if it's still active)
  }
}
```

**Test:**
```bash
# Disclosure agent creates request: "Need environmental DD findings for Schedule 3.15"
# Target: DD agent
# Verify request created with status='pending'
# Verify DD agent is activated
# Simulate DD agent responding
# Verify request status='completed' with response
# Test deadlock: try to create circular request → should fail
# Test chain depth: create 3-hop chain → 4th should fail
npx tsx scripts/test-agent-requests.ts
```
**Severity:** 🔴 CRITICAL

### Step 19.5: Agent Communication API Routes

**What:** Create API routes for monitoring agent communication.

**Files to create:**
- `apps/web/src/app/api/deals/[dealId]/intelligence/route.ts` — Deal intelligence CRUD
- `apps/web/src/app/api/deals/[dealId]/agent-requests/route.ts` — Agent request monitoring

**Test:**
```bash
curl -s http://localhost:3000/api/deals/DEAL_ID/intelligence | jq '.[] | {topic, insight, source_agent}'
curl -s http://localhost:3000/api/deals/DEAL_ID/agent-requests | jq '.[] | {requesting_agent, target_agent, status}'
```
**Severity:** 🟡 HIGH

### Step 19.6: Exemplar Injection for Distillation

**What:** When Sonnet handles a task that's been handed off from Opus, inject the best Opus exemplars as Layer 5 few-shot examples.

**Files to modify:**
- `packages/ai/src/prompts/layers/exemplars.ts` — Add distillation-specific exemplar selection

**Implementation details:**

When the model router returns Sonnet for a task that has `distillation_status = 'handed_off'`, the exemplar layer should:
1. Query exemplar_library for `source_type = 'internal_opus'` matching this task type + deal context
2. Rank by `downstream_quality_impact` (if tracked) > `quality_score` > recency
3. Select top 2-3 diverse exemplars (different deal subtypes to show range)
4. Format as few-shot examples in the prompt

```typescript
// In exemplars.ts layer:
if (routingConfig.distillation_status === 'handed_off' && selectedModel === 'sonnet') {
  const distillationExemplars = await this.exemplarService.findExemplars({
    documentType: taskType,
    dealCharacteristics: dealContext.characteristics,
    preferDistillation: true,
    limit: 3,
  });
  // Format as: "Here is an example of a high-quality [task_type] for a similar deal: ..."
}
```

**Test:**
```bash
# Hand off a task type to Sonnet
# Invoke the agent
# Verify Layer 5 contains Opus exemplars
# Compare Sonnet output quality with and without exemplars
```
**Severity:** 🟡 HIGH

## Phase Gate
All of the following must be true:
- [ ] 5-layer prompt assembler produces correctly structured prompts
- [ ] Learned patterns injected into agent prompts based on deal context
- [ ] Exemplars injected for distilled tasks
- [ ] Deal intelligence shared between agents via deal_intelligence table
- [ ] Agent-to-agent requests work with deadlock prevention
- [ ] Agent invoker uses prompt assembler for all invocations
- [ ] `pnpm build` succeeds
- [ ] Dev server starts and all existing pages still work
