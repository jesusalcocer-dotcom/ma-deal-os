# Phase 7: Agent Layer (Manager, Specialists, System Expert)

## Prerequisites
- Phases 3-6 complete (event backbone, approval framework, all workflow tables, MCP server)
- All deal data accessible via Supabase queries
- Event propagation and action chain pipeline operational

## What You're Building

The agent layer is where the system becomes proactive and strategic. You are building:
1. **Manager Agent** — the "senior associate" that maintains a holistic deal view, routes work, and synthesizes across workstreams
2. **Specialist Agents** — dynamically configured agents for specific tasks (drafting, analysis, negotiation, email)
3. **System Expert Agent** — platform knowledge guide
4. **Agent Chat Interface** — web-based chat for on-demand agent interaction

The agents use the MCP tools (Phase 3), the approval framework (Phase 4), and the workflow data (Phases 5-6).

## Reference
- SPEC-V2-COMPLETE.md Sections: 7 (Agent Architecture), 18.5 (Agent API Routes), 19.2 (Agent Chat page)

## Steps

### Step 7.1: Agent Types and Interfaces

**What:** Define the TypeScript types for agent configuration, messages, and activation.

**Files to create/modify:**
- `packages/ai/src/agents/types.ts` — All agent-related type definitions
- `packages/ai/src/agents/index.ts` — Barrel export

**Implementation details:**
- Define interfaces from SPEC: `SpecialistConfig`, `AgentMessage`, `AgentActivation`
- Define `ManagerContext` interface (what gets loaded when Manager activates):
  ```typescript
  interface ManagerContext {
    deal: Deal;
    checklist_summary: { total: number; by_status: Record<string, number> };
    negotiation_positions: NegotiationPosition[];
    active_dd_findings: DDFinding[];
    recent_activity: ActivityLogEntry[];
    pending_approvals: ActionChain[];
    constitution?: PartnerConstitution;
    critical_path: { next_deadline: string; blocking_items: string[] };
    upcoming_deadlines: Array<{ description: string; date: string; days_remaining: number }>;
  }
  ```
- Define `SpecialistResult` interface for structured specialist output

**Test:**
```bash
pnpm build --filter @ma-deal-os/ai
```
**Expected:** Types build without errors.
**Severity:** 🔴 CRITICAL

### Step 7.2: Manager Agent Context Loader

**What:** Function that loads the full deal context needed by the Manager Agent.

**Files to create/modify:**
- `packages/ai/src/agents/manager/context-loader.ts` — `loadManagerContext(dealId): Promise<ManagerContext>`

**Implementation details:**
- Query Supabase for all required data:
  - Deal record with parameters
  - Checklist items with status counts
  - Negotiation positions (all non-closed)
  - DD findings (active, ordered by risk_level)
  - Activity log (last 48 hours)
  - Pending action chains
  - Upcoming deadlines (checklist items with due dates in next 14 days)
- Return as structured `ManagerContext`
- Optimize: only load summaries, not full text content

**Test:**
```bash
cat > /tmp/test-context-loader.ts << 'EOF'
// Test that context loader returns structured data for Mercury deal
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function test() {
  const { data: deals } = await supabase.from('deals').select('*').limit(1);
  const deal = deals![0];
  console.log('Deal:', deal.name);

  const { data: checklist } = await supabase.from('checklist_items').select('status').eq('deal_id', deal.id);
  const statusCounts: Record<string, number> = {};
  checklist?.forEach(item => { statusCounts[item.status] = (statusCounts[item.status] || 0) + 1; });
  console.log('Checklist by status:', statusCounts);

  console.log('PASS: Context loader data accessible');
}
test().catch(console.error);
EOF
npx tsx /tmp/test-context-loader.ts
```
**Expected:** Returns Mercury deal with checklist counts.
**Severity:** 🔴 CRITICAL

### Step 7.3: Manager Agent System Prompt

**What:** Create the Manager Agent's system prompt template.

**Files to create/modify:**
- `packages/ai/src/agents/manager/system-prompt.ts` — Prompt template with context injection

**Implementation details:**
- The system prompt should:
  1. Define the Manager's role ("You are the Manager Agent for this M&A deal...")
  2. Describe the three-layer architecture (what to handle vs. delegate)
  3. List available tools (MCP tools from Phase 3)
  4. Include the current ManagerContext (serialized)
  5. Include the Partner Constitution if it exists
  6. Define output format expectations
  7. Include escalation rules (when to create Tier 3 items)
- Template function: `buildManagerPrompt(context: ManagerContext): string`
- Keep prompt under 200K tokens (compress context if needed)

**Test:**
```bash
# Generate prompt and verify length
pnpm build --filter @ma-deal-os/ai
node -e "
const { buildManagerPrompt } = require('./packages/ai/dist/agents/manager/system-prompt');
const mockContext = {
  deal: { name: 'Mercury', parameters: {} },
  checklist_summary: { total: 15, by_status: { draft: 5, identified: 10 } },
  negotiation_positions: [],
  active_dd_findings: [],
  recent_activity: [],
  pending_approvals: [],
  critical_path: { next_deadline: '2026-03-15', blocking_items: [] },
  upcoming_deadlines: []
};
const prompt = buildManagerPrompt(mockContext);
console.log('Prompt length:', prompt.length, 'chars');
console.log('First 200 chars:', prompt.substring(0, 200));
"
```
**Expected:** Prompt generates with deal context embedded. Under 50K characters.
**Severity:** 🔴 CRITICAL

### Step 7.4: Manager Agent Implementation

**What:** The Manager Agent's activation function — handles on-demand queries, event-driven evaluation, and scheduled tasks.

**Files to create/modify:**
- `packages/ai/src/agents/manager/manager-agent.ts` — `activateManager(dealId, trigger, query?)` function

**Implementation details:**
- Uses Anthropic API with the Manager system prompt
- For on-demand queries (chat): Send user query + context, return response
- For event-driven activation: Send event summary + context, get recommended action chains
- For scheduled tasks (briefing): Send "generate morning briefing" instruction
- Track activation in `agent_activations` table (tokens, cost, duration)
- Parse structured output into action chains when appropriate
- Model: `claude-opus-4-6` for strategic synthesis, `claude-sonnet-4-5-20250929` for routine queries

**Test:**
```bash
cat > /tmp/test-manager-agent.ts << 'EOF'
// Test Manager Agent with a simple query
// This makes a real API call to Claude
const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic.default();

async function test() {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1000,
    system: 'You are the Manager Agent for Project Mercury, a $185M stock purchase deal. Provide brief, actionable responses.',
    messages: [{ role: 'user', content: 'What are the top 3 priorities I should focus on this morning?' }]
  });
  console.log('Manager response:', response.content[0].text.substring(0, 300));
  console.log('Tokens used:', response.usage.input_tokens + response.usage.output_tokens);
  console.log('PASS: Manager Agent activation works');
}
test().catch(console.error);
EOF
npx tsx /tmp/test-manager-agent.ts
```
**Expected:** Manager produces coherent strategic advice. Uses real Claude API.
**Severity:** 🔴 CRITICAL

### Step 7.5: Specialist Configuration Framework

**What:** Framework for dynamically configuring specialist agents.

**Files to create/modify:**
- `packages/ai/src/agents/specialists/specialist-factory.ts` — `createSpecialist(config: SpecialistConfig): SpecialistRunner`
- `packages/ai/src/agents/specialists/configs/` — Pre-built configurations for drafter, analyst, negotiation, email, closing specialists

**Implementation details:**
- `SpecialistRunner` is a function that: loads skills, loads context, builds prompt, calls Claude, parses output
- Each specialist config defines: task_type, skills to load, context to gather, tools available, output schema
- Specialist configs for each type:
  - `drafter-config.ts`: document drafting, cross-references
  - `analyst-config.ts`: DD investigation, risk classification
  - `negotiation-config.ts`: strategy, concession analysis
  - `email-config.ts`: communication, position extraction
  - `closing-config.ts`: closing mechanics, condition tracking
- Model: `claude-sonnet-4-5-20250929` for all specialists

**Test:**
```bash
pnpm build --filter @ma-deal-os/ai
node -e "
const { createSpecialist } = require('./packages/ai/dist/agents/specialists/specialist-factory');
const config = {
  task_type: 'document_drafting',
  skills: [],
  context: { documents: [], deal_state_subset: [] },
  tools: [],
  output_schema: {},
  instructions: 'Test configuration'
};
const specialist = createSpecialist(config);
console.log('Specialist created:', typeof specialist);
console.log('PASS: Specialist factory works');
"
```
**Expected:** Factory returns a callable specialist runner.
**Severity:** 🟡 HIGH

### Step 7.6: System Expert Agent

**What:** Lightweight agent for platform questions and configuration help.

**Files to create/modify:**
- `packages/ai/src/agents/system-expert/system-expert.ts` — `activateSystemExpert(query)` function
- `packages/ai/src/agents/system-expert/system-prompt.ts` — System knowledge prompt

**Implementation details:**
- Smaller context than Manager: system documentation, API routes, table schemas, configuration options
- Answers questions like "What tables store negotiation data?", "How do I configure approval tiers?"
- Model: `claude-sonnet-4-5-20250929` (cheaper, simpler context)
- Does NOT access deal state — only system knowledge

**Test:**
```bash
# Test with a system question
cat > /tmp/test-system-expert.ts << 'EOF'
const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic.default();
async function test() {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 500,
    system: 'You are the System Expert for the M&A Deal OS platform. You know all system capabilities, data locations, and configuration options. Be concise.',
    messages: [{ role: 'user', content: 'What types of events does the propagation system support?' }]
  });
  console.log('System Expert:', response.content[0].text.substring(0, 200));
  console.log('PASS: System Expert works');
}
test().catch(console.error);
EOF
npx tsx /tmp/test-system-expert.ts
```
**Expected:** Returns helpful system information.
**Severity:** 🟡 HIGH

### Step 7.7: Morning Briefing Generation

**What:** Scheduled Agent task that produces a daily deal briefing.

**Files to create/modify:**
- `packages/ai/src/agents/manager/briefing-generator.ts` — `generateBriefing(dealId): Promise<Briefing>`
- `apps/web/src/app/api/deals/[dealId]/agent/briefing/route.ts` — POST endpoint

**Implementation details:**
- Load ManagerContext
- Prompt Manager: "Generate a morning briefing. Include: deal status summary, overnight activity, pending approvals, critical deadlines (next 7 days), recommended priorities for today."
- Output schema:
  ```typescript
  interface Briefing {
    summary: string;
    overnight_activity: string[];
    pending_approvals: number;
    critical_deadlines: Array<{ item: string; date: string; status: string }>;
    recommended_priorities: string[];
    risk_flags: string[];
  }
  ```
- Track cost in agent_activations

**Test:**
```bash
curl -X POST http://localhost:3000/api/deals/MERCURY_ID/agent/briefing | python3 -c "
import sys,json; d=json.load(sys.stdin); print('Briefing summary:', d.get('summary', 'N/A')[:200])"
```
**Expected:** Returns structured briefing with priorities and deadlines.
**Severity:** 🟡 HIGH

### Step 7.8: Agent Chat API + Web UI

**What:** Chat interface for on-demand agent interaction.

**Files to create/modify:**
- `apps/web/src/app/api/deals/[dealId]/agent/chat/route.ts` — POST: send message, get response
- `apps/web/src/app/deals/[id]/agent/page.tsx` — Chat page
- `apps/web/src/components/agent/ChatInterface.tsx` — Client component: message input, response display

**Implementation details:**
- POST `/agent/chat`: Accept `{ message, agent_type: 'manager' | 'system_expert' }`, return response
- Chat page: conversation history, message input, agent type selector
- Display: markdown-formatted responses, action chain previews if agent recommends actions
- Track each chat message as an agent activation for cost

**Test:**
```bash
curl -X POST http://localhost:3000/api/deals/MERCURY_ID/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is the current status of this deal?","agent_type":"manager"}'
```
**Expected:** Returns coherent response about Mercury deal state.
**Severity:** 🔴 CRITICAL

### Step 7.9: Integration Test — Agent-Driven Action Chain

**What:** Test that Manager Agent can create action chains from event analysis.

**Implementation details:**
1. Emit a `dd.finding_confirmed` event with critical risk level
2. Activate Manager Agent with the event
3. Manager should analyze the finding and recommend actions
4. Verify action chain is created with appropriate proposed actions
5. Verify cost tracking records the activation

**Test:**
```bash
npx tsx scripts/test-agent-action-chain.ts
```
**Expected:** Manager analyzes event and produces action chain with 2+ actions.
**Severity:** 🔴 CRITICAL

## Phase Gate
- [ ] Manager Agent activates with deal context and produces coherent output
- [ ] Specialist factory creates configured specialist runners
- [ ] System Expert answers platform questions
- [ ] Morning briefing generates structured output
- [ ] Chat API returns agent responses
- [ ] Chat page renders at `/deals/[id]/agent`
- [ ] Manager creates action chains from event analysis
- [ ] Agent activations tracked with cost data
- [ ] `pnpm build` succeeds
