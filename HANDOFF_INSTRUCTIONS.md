# HANDOFF INSTRUCTIONS — Claude Code Session 0

## YOUR MISSION

You are a documentation session. You do NOT build product code. Your job is to produce the complete set of files that will guide all subsequent Claude Code build sessions.

**You will read:**
- `SPEC.md` (V1 spec — what has been built so far, ~1468 lines)
- `SPEC-V2.md` (V2 architecture spec — what needs to be built, ~1400 lines)
- `CLAUDE_CODE_MASTER_INSTRUCTIONS.md` (legacy build instructions — for reference on patterns)
- `TESTING_PROTOCOL.md` (legacy test protocol — for reference on test patterns)
- `docs/test-results/phase2_test_report.md` (proof of what exists and works)

**You will produce:**
1. `SPEC-V2-COMPLETE.md` — Merged comprehensive spec
2. `skills/phase-03.md` through `skills/phase-14.md` — 12 phase skill files
3. `scripts/autonomous-runner.sh` — Session restart script
4. `README.md` — Updated project README

**You will verify:**
- Every database table mentioned in the spec has a schema definition
- Every API route mentioned has a corresponding phase skill file that tells Claude Code to build it
- Every agent mentioned has implementation instructions in the appropriate skill file
- No orphan references (nothing mentions a table/route/component that isn't defined elsewhere)

---

## FILE 1: SPEC-V2-COMPLETE.md

This is the single source of truth for the entire project. Merge V1 and V2 into one document.

### Document Structure

Use this exact section structure:

```
1. Vision & Architecture Philosophy
   - From V2 Section 1 (three-layer design, design principles)
   - Add: relationship to existing codebase (Phases 0-2 complete)

2. Technology Stack & Repository Structure
   - From V1 Section 3-4 (repo structure, packages, dependencies)
   - Keep exactly as-is — this is what's already built

3. Three-Layer Architecture
   - From V2 Section 2 (Layer 1 deterministic, Layer 2 API, Layer 3 agents)
   - This is NEW — does not exist in V1

4. Database Schema
   - MERGE V1 Section 5 (existing 14 tables) WITH V2 Section 13 (new tables)
   - Present as one unified schema section
   - Clearly mark which tables exist already vs which need to be created
   - See detailed merge instructions below

5. Event Propagation Backbone
   - From V2 Section 3 (event types, consequence maps, action chains)
   - This is entirely NEW

6. Approval Framework
   - From V2 Section 4 (three tiers, approval policy, queue interface)
   - This is entirely NEW

7. Agent Architecture
   - From V2 Section 5 (Manager, Specialists, System Expert, communication protocol)
   - This is entirely NEW
   - REPLACES V1 Section 11-12 (AI/LLM pipeline and Cowork plugin)
   - But PRESERVE the concrete implementation details from V1 Sections 11-12
     that describe how to call Claude API, structure prompts, etc.
     Integrate them as "Layer 2 implementation details" within the agent architecture

8. Skills System
   - From V2 Section 6 (static, adaptive, dynamic skills, coding/testing agents)
   - This is entirely NEW

9. Partner Constitution & Governance
   - From V2 Section 7 (hard constraints, preferences, directives, enforcement)
   - This is entirely NEW

10. Precedent Intelligence Pipeline
    - From V2 Section 8 (EDGAR ingestion, quality scoring, retrieval)
    - EXTENDS V1 Section 7.6-7.8 (which describes basic precedent/embedding)
    - Keep V1's concrete implementation (Voyage embeddings, pgvector, existing tables)
    - Add V2's quality scoring layers and dynamic learning on top

11. Document Processing Pipeline
    - From V1 Section 7 (provision taxonomy, templates, v1-v4, segmentation, markup)
    - Keep exactly as-is for Sections 7.1-7.5 (already built)
    - Integrate V2's enhanced markup analysis and cross-reference management

12. Email & Communication Integration
    - From V1 Section 10 (Outlook OAuth, Graph API, email sync)
    - EXTEND with V2 email agent capabilities (position extraction,
      action item identification, negotiation state updates)

13. Google Drive Integration
    - From V1 Section 9
    - Keep exactly as-is — already built

14. Gap Coverage: New Workflows
    - From V2 Section 9 (disclosure schedules, negotiation state, third parties,
      client management, closing mechanics, negotiation strategy, knowledge capture)
    - These are all NEW workflows with new tables and new API routes

15. Observer & Self-Improvement System
    - From V2 Section 10 (Observer agent, evaluation criteria, improvement loop)
    - This is entirely NEW

16. Simulation Framework
    - From V2 Section 11 (dual instances, seeded scenarios, client agents)
    - This is entirely NEW

17. Knowledge & Learning Pipeline
    - From V2 Section 12 (feedback events, learning pipeline, conversational encoding)
    - This is entirely NEW

18. API Routes
    - MERGE V1 Section 6 (existing routes) WITH V2 Section 14 (new routes)
    - Present as one unified API reference
    - Mark existing vs new routes

19. Web Portal Pages & Components
    - From V1 Section 8 (existing pages)
    - EXTEND with new pages needed for V2 features:
      - Approval queue page
      - Negotiation state page
      - Disclosure schedules page
      - Closing checklist page
      - Client management page
      - Agent chat interface page
      - Observer dashboard page (simulation mode)

20. Implementation Phases
    - From V2 Section 15 (Phases 3-14)
    - PREPEND Phases 0-2 as "COMPLETED" with summary of what exists
    - Each phase should reference exactly which spec sections it implements

21. Cost Model & Token Economics
    - From V2 Section 16
    - This is entirely NEW

22. Environment & Credentials
    - Extract from legacy CLAUDE_CODE_MASTER_INSTRUCTIONS.md
    - Supabase connection details and constraints
    - Google Drive service account
    - Anthropic API
    - Microsoft/Outlook configuration
    - This section tells future Claude Code sessions how to connect to services
```

### Database Schema Merge Instructions

The merged schema section must contain:

**EXISTING TABLES (from V1, already in Supabase — do NOT recreate):**
1. `deals` — Add new columns: `constitution JSONB`, `monitoring_level TEXT DEFAULT 'standard'`
2. `checklist_items` — Add: `closing_checklist_id UUID` reference
3. `document_versions` — No changes
4. `users` — No changes
5. `deal_emails` — Add: `extracted_positions JSONB`, `extracted_action_items JSONB`
6. `provision_formulations` — No changes (quality scoring fields may be added)
7. `provision_types` — No changes
8. `provision_variants` — No changes
9. `dd_findings` — No changes
10. `dd_topics` — No changes
11. `drive_sync_records` — No changes
12. `activity_log` — No changes
13. `deal_team_members` — No changes
14. `deal_agent_memory` — Extend `memory_type` enum

**NEW TABLES (from V2, must be created):**
15. `propagation_events` — V2 Section 3.3
16. `action_chains` — V2 Section 3.6
17. `proposed_actions` — V2 Section 3.6
18. `approval_policies` — V2 Section 4.2
19. `agent_activations` — V2 Section 5.7
20. `disclosure_schedules` — V2 Section 9.1
21. `disclosure_entries` — V2 Section 9.1
22. `negotiation_positions` — V2 Section 9.2
23. `deal_third_parties` — V2 Section 9.3
24. `client_contacts` — V2 Section 9.4
25. `client_action_items` — V2 Section 9.4
26. `client_communications` — V2 Section 9.4
27. `closing_checklists` — V2 Section 9.5
28. `closing_conditions` — V2 Section 9.5
29. `closing_deliverables` — V2 Section 9.5
30. `post_closing_obligations` — V2 Section 9.5
31. `negotiation_roadmaps` — V2 Section 9.6
32. `deal_knowledge` — V2 Section 9.7
33. `feedback_events` — V2 Section 12.1
34. `skills_registry` — Tracks all skills with metadata
35. `observer_changelog` — Tracks Observer modifications

For each new table, include the full CREATE TABLE statement from V2. For existing tables with new columns, show ALTER TABLE statements.

### API Routes Merge Instructions

Present ALL routes in one table, grouped by domain. Mark each as EXISTING or NEW.

**EXISTING routes (from V1, already built):**
- `GET/POST /api/deals` — deal CRUD
- `GET/PATCH /api/deals/[dealId]` — single deal
- `GET /api/deals/[dealId]/checklist` — checklist items
- `POST /api/deals/[dealId]/parse-term-sheet` — term sheet parser
- `GET/POST /api/deals/[dealId]/documents` — document versions
- `GET /api/deals/[dealId]/documents/[docId]` — single document
- `POST /api/deals/[dealId]/documents/generate` — v1/v2/v3 generation
- `POST /api/provisions/seed` — seed provision types

**NEW routes:** All from V2 Section 14 (event backbone, approval queue, agent management, constitution, disclosure schedules, negotiation, closing, client management, third parties, knowledge/feedback, simulation/observer)

---

## FILES 2-13: SKILL FILES (skills/phase-03.md through skills/phase-14.md)

Each skill file must follow this exact format:

```markdown
# Phase {N}: {Title}

## Prerequisites
- Phase {N-1} must be complete
- {Any specific prerequisite steps}

## What You're Building
{2-3 paragraph overview of this phase's goals}

## Reference
- SPEC.md Sections: {list sections}
- Key types/interfaces: {list from spec}

## Steps

### Step {N}.1: {Step Name}

**What:** {What to build}

**Files to create/modify:**
- `{exact file path}` — {what this file does}
- `{exact file path}` — {what this file does}

**Implementation details:**
{Specific instructions — what functions to write, what patterns to follow,
what existing code to integrate with}

**Test:**
```bash
{Exact test command}
```
**Expected:** {What passing looks like}
**Severity:** 🔴 CRITICAL / 🟡 HIGH / 🟢 MEDIUM

### Step {N}.2: {Step Name}
...

## Phase Gate
All of the following must be true:
- [ ] {Gate condition 1}
- [ ] {Gate condition 2}
- [ ] `pnpm build` succeeds
- [ ] Dev server starts and existing pages still work
```

### Phase 3: MCP Infrastructure + Event Backbone

**Title:** MCP Infrastructure + Event Backbone
**SPEC Sections:** V2 Sections 3, 5.2-5.5 (MCP tools), 14

This is the most critical phase. It builds the infrastructure everything else depends on.

**Steps must include (in this order):**

1. **Deal Operations MCP Server setup** — Create `packages/mcp-server/` package structure. Install `@modelcontextprotocol/sdk`. Create the MCP server entry point. Register initial tools that wrap existing API routes: `get_deal_state`, `list_deals`, `get_checklist`, `get_documents`, `search_precedent`. These tools call the existing Next.js API routes internally (via fetch to localhost or by importing the route handlers directly). Test: MCP server starts, tools are listed, calling `get_deal_state` returns Mercury deal data.

2. **System Operations MCP Server** — Add system tools to the MCP server (or a separate server): `read_file`, `write_file`, `list_directory`, `run_command`, `run_tests`, `git_status`, `git_commit`, `git_diff`. These are wrappers around Node.js `fs` and `child_process`. Test: can read a file, run `pnpm build`, get git status.

3. **Event types and interfaces** — Create `packages/core/src/types/events.ts` with all event type definitions from V2 Section 3.2. Create `PropagationEvent`, `ActionChain`, `ProposedAction` interfaces from V2 Section 3.3 and 3.6. No database yet — just types.

4. **Propagation events table** — Add to Drizzle schema in `packages/db/src/schema/`. Create the table in Supabase via REST API (since drizzle-kit push doesn't work). Test: can insert and query propagation events.

5. **Action chains and proposed actions tables** — Same pattern: Drizzle schema + create in Supabase. Test: can insert action chain with proposed actions.

6. **Event bus implementation** — Create `packages/core/src/events/event-bus.ts`. Implement `emit()` and `process()` methods per V2 Section 3.7. The `process()` method should: look up consequence maps, generate proposed actions, create action chains. For now, use a simple in-process queue (no background worker yet). Test: emit a `deal.parameters_updated` event, verify action chain is created.

7. **Deterministic consequence maps** — Create `packages/core/src/rules/consequence-maps.ts`. Implement the maps from V2 Section 3.5. Start with 5-6 core maps: `dd.finding_confirmed`, `document.markup_received`, `email.position_extracted`, `checklist.item_overdue`, `deal.parameters_updated`. Test: emit each event type, verify correct consequences are generated.

8. **Event API routes** — Create `GET /api/deals/[dealId]/events` and `GET /api/deals/[dealId]/events/[eventId]`. Test: events are queryable via HTTP.

9. **Integration test** — End-to-end: create a deal, emit a DD finding event, verify action chain appears with correct proposed actions. This tests the full event → consequence → action chain pipeline.

**Phase Gate:**
- MCP server starts and lists tools
- `get_deal_state` returns real Mercury data
- Event can be emitted and produces action chain
- `pnpm build` succeeds
- All existing pages still render

### Phase 4: Approval Framework + Agent Invocation

**Title:** Approval Framework + Agent Invocation
**SPEC Sections:** V2 Sections 4, 5.6-5.7

**Steps must include:**

1. **Approval policy schema** — `approval_policies` table in Drizzle + Supabase. Define the `ApprovalPolicy` and `ApprovalRule` types. Create default policies per V2 Section 4.2.

2. **Tier assignment logic** — In `packages/core/src/rules/approval-engine.ts`. Given an action chain and a user's approval policy, assign each proposed action to Tier 1, 2, or 3. Test: a `checklist_status_update` action gets Tier 1, a `document_edit` gets Tier 2, a `client_communication_draft` gets Tier 3.

3. **Auto-execution for Tier 1** — Wire into the event bus: after action chain creation, auto-execute all Tier 1 actions immediately (call the appropriate API routes/database operations). Test: emit event that generates only Tier 1 actions, verify they execute without approval.

4. **Approval queue API routes** — All routes from V2 Section 14.2: list pending, get detail, approve chain, approve/reject/modify individual actions. Test: create action chain with Tier 2 actions, query approval queue, approve one action, verify it executes.

5. **Approval queue UI page** — `apps/web/src/app/approval-queue/page.tsx`. Card-based layout showing pending approval items across all deals. Each card shows: severity, summary, deal name, action count, Approve/Review buttons. Expandable detail view showing pre-rendered previews for each action.

6. **Agent activation framework** — `packages/ai/src/agents/agent-invoker.ts`. The framework for invoking Claude as an agent with: system prompt, tools (MCP), context loading, structured output. This is NOT the specific agents yet — it's the invocation machinery. Takes a `SpecialistConfig` (V2 Section 5.3) and produces a structured result. Test: invoke a simple agent with a test prompt and one MCP tool, get structured response.

7. **Agent activation tracking** — `agent_activations` table. Record every agent invocation with token counts, timing, cost. Test: invoke agent, verify activation record created with token counts.

8. **Agent cost dashboard** — API route `GET /api/deals/[dealId]/agent/cost-summary` and simple UI showing token spend by day, by agent type, by deal.

**Phase Gate:**
- Tier 1 actions auto-execute
- Tier 2 actions appear in approval queue
- Approval queue UI renders and is functional
- Agent can be invoked via framework and returns structured result
- Cost tracking records token usage

### Phase 5: New Workflows — Disclosure Schedules, Negotiation, Email Enhancement

**Title:** Disclosure Schedules, Negotiation Tracker, Email Enhancements
**SPEC Sections:** V2 Sections 9.1, 9.2, 9.6, 12 (email portions)

**Steps must include:**

1. **Disclosure schedule tables** — `disclosure_schedules` and `disclosure_entries` in Drizzle + Supabase per V2 Section 9.1.

2. **Disclosure schedule generation from SPA reps** — API route `POST /api/deals/[dealId]/disclosure-schedules/generate`. Uses Layer 2 API call: takes the SPA document text, identifies every rep with "except as set forth in Schedule X" language, creates a disclosure_schedule record for each. Test: run against Mercury's v3 SPA, verify schedules created for material reps.

3. **Disclosure questionnaire generation** — Given a disclosure schedule, generate a plain-language questionnaire for the client. Layer 2 API call: rep text → client-friendly question. Test: questionnaire is understandable by a non-lawyer.

4. **Disclosure cross-reference checking** — `POST /api/deals/[dealId]/disclosure-schedules/cross-reference`. Checks DD findings against disclosure entries. Flags gaps (finding exists but no corresponding disclosure). Test: create a DD finding, run cross-reference, verify gap flagged.

5. **Negotiation positions table** — `negotiation_positions` in Drizzle + Supabase per V2 Section 9.2.

6. **Negotiation state API routes** — `GET /api/deals/[dealId]/negotiation/positions` and update route.

7. **Negotiation position extraction from emails** — Enhance email classification pipeline (from Phase 2-3) to extract negotiation positions. When an email contains counterparty position language, create/update negotiation_positions records. Layer 2 API call. Test: feed a mock counterparty email, verify position extracted and stored.

8. **Negotiation roadmap** — `negotiation_roadmaps` table. `POST /api/deals/[dealId]/negotiation/roadmap/generate` — takes deal parameters, precedent market data, and constitution preferences to generate initial negotiation strategy. Test: generate roadmap for Mercury, verify it contains provision-level plans.

9. **Disclosure schedules UI** — Page showing all schedules for a deal, their entries, status, gap warnings.

10. **Negotiation state UI** — Page showing all tracked provisions, current positions from each side, history.

11. **Wire disclosure and negotiation events into event backbone** — Emit appropriate events when schedules/positions change, create consequence maps.

**Phase Gate:**
- Disclosure schedules generated from SPA
- Cross-reference check identifies gaps
- Negotiation positions can be created and queried
- Position extraction works on mock emails
- Events emit and propagate for disclosure/negotiation changes
- UI pages render

### Phase 6: Closing, Client Management, Third-Party Tracking

**Title:** Closing Mechanics, Client Management, Third-Party Tracking
**SPEC Sections:** V2 Sections 9.3, 9.4, 9.5

**Steps must include:**

1. **Third-party tables** — `deal_third_parties` per V2 Section 9.3.
2. **Third-party API routes and UI**
3. **Client management tables** — `client_contacts`, `client_action_items`, `client_communications` per V2 Section 9.4.
4. **Client action item workflow** — Create, assign, track, follow-up logic.
5. **Client communication generation** — Layer 2 API call to draft status updates, action item requests. Always Tier 3 approval (client-facing).
6. **Client management API routes and UI**
7. **Closing checklist tables** — `closing_checklists`, `closing_conditions`, `closing_deliverables` per V2 Section 9.5.
8. **Closing checklist generation from SPA** — Parse conditions article, generate condition records.
9. **Funds flow memo generation** — From deal parameters, purchase price mechanics.
10. **Post-closing obligations table** — `post_closing_obligations` per V2 Section 9.5.
11. **Closing dashboard UI** — Traffic light view of conditions, deliverables, readiness.
12. **Wire all new workflows into event backbone** — Events for closing conditions, third-party deliverables, client action items.

**Phase Gate:**
- Closing checklist generated from SPA conditions
- All new tables created and queryable
- Client action items can be created, tracked, and followed up
- Third-party deliverables tracked
- Events propagate for all new workflows
- UI pages render for closing, client, third-party

### Phase 7: Agent Layer (Manager, Specialists, System Expert)

**Title:** Manager Agent, Specialist Framework, System Expert
**SPEC Sections:** V2 Sections 5.2-5.5, 7

**Steps must include:**

1. **Manager Agent system prompt** — Create `packages/ai/src/agents/manager/system-prompt.ts`. Encode the Manager's role, responsibilities, and operating instructions per V2 Section 5.2. Include MCP tool descriptions. The prompt must reference: deal state, constitution, negotiation state, recent events, pending approvals.

2. **Manager Agent context loader** — `packages/ai/src/agents/manager/context-loader.ts`. Assembles the context the Manager needs on activation: deal parameters, checklist summary, negotiation state, active DD findings, recent activity, pending approvals, constitution, critical path, upcoming deadlines. Pulls from MCP tools / direct database queries.

3. **Manager Agent implementation** — `packages/ai/src/agents/manager/index.ts`. Uses the agent invocation framework from Phase 4. Loads system prompt + context, invokes Claude with MCP tools, processes structured output into action chains and/or specialist invocations.

4. **Specialist configuration framework** — `packages/ai/src/agents/specialists/framework.ts`. Implements the `SpecialistConfig` interface from V2 Section 5.3. Given a config, assembles: task-specific system prompt, relevant skills from the skills directory, context subset, tool access list. Invokes Claude and returns structured output.

5. **Drafter Specialist** — Configuration for document drafting tasks. System prompt encodes drafting conventions, cross-reference management, defined term consistency. Tools: precedent search, document generation.

6. **Analyst Specialist** — Configuration for DD investigation tasks. System prompt encodes DD methodology, risk classification, exposure quantification. Tools: document processor, finding creator, coverage analyzer.

7. **Email Specialist** — Configuration for email analysis. System prompt encodes position extraction, action item identification, communication classification. Tools: email classifier, position extractor.

8. **System Expert Agent** — Lightweight agent that knows the platform. System prompt includes system documentation, available tools, configuration options. Used for onboarding, troubleshooting, setup assistance.

9. **Agent communication protocol** — Implement the `AgentMessage` interface from V2 Section 5.5. Manager routes work to specialists, receives results, synthesizes.

10. **Agent activation triggers** — Implement event-driven, scheduled, and on-demand activation per V2 Section 5.6. Wire significance scoring from event backbone to Manager activation.

11. **Morning briefing endpoint** — `POST /api/deals/[dealId]/agent/briefing`. Manager compiles deal state and produces a structured briefing. Test: generate briefing for Mercury with real data.

12. **Agent chat interface** — UI page where user can chat with the Manager Agent. Messages go through the agent invocation framework. Manager can delegate to specialists mid-conversation.

**Phase Gate:**
- Manager Agent produces coherent briefing from real deal data
- Manager correctly routes a markup analysis task to Analyst Specialist
- Agent chat interface works for basic Q&A about a deal
- Specialist framework can configure and invoke different specialist types
- Activation triggers work (event-driven, on-demand)

### Phase 8: Skills System

**Title:** Skills System — Static, Adaptive, Dynamic
**SPEC Sections:** V2 Section 6

**Steps must include:**

1. **Skills directory structure** — Create `/skills/static/domain/`, `/skills/static/process/`, `/skills/static/meta/`, `/skills/adaptive/`, `/skills/dynamic/`.

2. **Skills registry table** — `skills_registry` tracking all skills with metadata (id, type, path, version, quality_score, applicable_agents, applicable_tasks).

3. **Static skills — domain** — Write the initial set of domain skills as markdown files: `markup-analysis.md`, `provision-drafting.md`, `negotiation-strategy.md`, `dd-methodology.md`, `closing-mechanics.md`, `disclosure-schedules.md`. Each follows the skill format from V2 Section 6.2 with: purpose, methodology, common patterns, common mistakes, examples.

4. **Static skills — process** — Write process skills: `action-chain-creation.md`, `approval-queue-formatting.md`, `email-communication.md`, `document-versioning.md`.

5. **Static skills — meta** — Write meta skills: `problem-decomposition.md`, `confidence-calibration.md`, `escalation-judgment.md`, `gap-recognition.md`.

6. **Skill loader** — `packages/ai/src/skills/skill-loader.ts`. Given a task type and agent type, loads relevant skills from the registry and file system. Returns markdown content to be injected into agent system prompts.

7. **Integrate skills into specialist framework** — When Manager configures a specialist, the skill loader provides appropriate skills. Specialist system prompts include loaded skill content.

8. **Adaptive skill creation from feedback** — When the learning pipeline (feedback events) detects a pattern (3+ similar modifications), generate an adaptive skill and store in `/skills/adaptive/`. This is a background process.

9. **Gap recognition in agents** — Add the `gap-recognition` meta skill to the Manager's default skill set. When the Manager encounters a situation no skill covers, it logs the gap and (optionally) initiates dynamic skill creation.

**Phase Gate:**
- Skills directory populated with 10+ static skills
- Skill loader correctly selects skills by task type
- Specialists receive relevant skills in their prompts
- Skills registry tracks all skills

### Phase 9: Partner Constitution

**Title:** Partner Constitution & Governance
**SPEC Sections:** V2 Section 7

**Steps must include:**

1. **Constitution data model** — Add `constitution JSONB` to deals table (may need ALTER TABLE via Supabase REST). Define TypeScript types for `PartnerConstitution`, `HardConstraint`, `Preference`, `StrategicDirective` per V2 Section 7.2.

2. **Constitution API routes** — `GET/PUT /api/deals/[dealId]/constitution`. `POST /api/deals/[dealId]/constitution/encode` for conversational creation.

3. **Conversational encoding** — An API endpoint that accepts natural language from the partner and structures it into constitutional provisions. Uses Layer 2 API call with a prompt that extracts hard constraints, preferences, and strategic directives.

4. **Constitution enforcement in Manager Agent** — Load constitution into Manager's system prompt. Explicitly instruct Manager to check proposed actions against hard constraints before creating action chains.

5. **Constitution enforcement in consequence resolver** — After action chain creation, run each proposed action against the constitution's hard constraints. Any violation → automatically escalate to Tier 3. Add `constitutional_violation: boolean` field to proposed_actions.

6. **Constitution UI** — Page showing current constitution, with edit capability. Conversational encoding interface (chat-style input → structured output).

7. **Test constitution enforcement** — Create a deal with a hard constraint ("no indemnification cap below 10%"). Generate an action chain that would violate it. Verify it gets blocked and escalated to Tier 3.

**Phase Gate:**
- Constitution can be created conversationally
- Hard constraints block violating actions
- Constitution is loaded into Manager Agent's context
- UI shows and allows editing of constitution

### Phase 10: Precedent Intelligence Pipeline

**Title:** Precedent Intelligence Pipeline
**SPEC Sections:** V2 Section 8, V1 Sections 7.6-7.8

**Steps must include:**

1. **Enhance precedent database schema** — Add quality scoring fields to `provision_formulations` if not present: `firm_tier`, `deal_size_score`, `recency_score`, `structural_quality_score`, `corpus_alignment_score`, `composite_quality_score`.

2. **EDGAR discovery and ingestion pipeline** — `packages/integrations/src/precedent/edgar-pipeline.ts`. Automated: search EDGAR → download exhibits → extract text → segment provisions → classify → score → embed → store. Per V2 Section 8.2.

3. **Automated quality scoring** — Implement Layer 1 signals (firm tier lookup, deal size proxy, recency decay) and Layer 2 signals (structural quality check via API call, paired evaluation via API call). Per V2 Section 8.2-8.3.

4. **Quality-weighted retrieval** — Modify the existing precedent search to weight results by quality score in addition to semantic similarity. Per V2 Section 8.3.

5. **Dynamic quality learning** — When feedback events indicate a formulation was used and approved vs. modified, update quality scores. Per V2 Section 8.4.

6. **What's-market analysis endpoint** — `GET /api/precedent/whats-market?provision_type=X&deal_profile=Y`. Returns market data: what percentage use each variant, quality-weighted. Test: query for indemnification basket type, get meaningful distribution.

7. **Ingestion dashboard** — UI showing precedent database status: count by provision type, quality distribution, ingestion history.

**Phase Gate:**
- EDGAR pipeline can ingest at least 5 new agreements
- Quality scores differentiate high-quality from low-quality formulations
- What's-market returns useful data for major provision types
- Quality-weighted retrieval produces better results than unweighted

### Phase 11: Observer, Coding Agent, Testing Agent

**Title:** Observer & Self-Improvement System
**SPEC Sections:** V2 Sections 10, 6.6

**Steps must include:**

1. **Observer changelog table** — `observer_changelog` tracking all Observer modifications.

2. **Observer Agent implementation** — `packages/ai/src/agents/observer/index.ts`. System prompt encodes: evaluation criteria (V2 Section 10.3), improvement loop protocol, git protocol, notification protocol. Has access to System MCP tools (read/write files, run commands, git operations) and Deal MCP tools (query deal state, events, feedback).

3. **Evaluation criteria framework** — Implement accuracy, efficiency, quality, coverage, and coordination criteria per V2 Section 10.3. Each as a measurable metric with threshold.

4. **Coding Agent configuration** — Specialist configuration for code modification tasks. System prompt includes: codebase patterns, coding conventions, testing requirements. Tools: System MCP (file read/write, bash, git). Per V2 Section 6.6.

5. **Testing Agent configuration** — Specialist configuration for test validation. Never modifies source code (only test files). Runs test suites, evaluates results, flags regressions. Per V2 Section 6.6.

6. **Improvement loop implementation** — Detect → Diagnose → Prescribe → Implement → Test → Deploy → Verify cycle per V2 Section 10.4. Observer detects issue from evaluation criteria, invokes Coding Agent to fix, invokes Testing Agent to validate, commits if passing.

7. **Observer notification channel** — Separate from the deal approval queue. Shows Observer changes with diffs, allows human to review and revert. Per V2 Section 10.5.

8. **Integration test** — Seed a deliberate weakness (e.g., a skill that misses a known pattern). Run Observer evaluation. Verify it detects the weakness, prescribes a fix, implements it via Coding Agent, and validates via Testing Agent.

**Phase Gate:**
- Observer can evaluate deal operations against criteria
- Coding Agent can modify a skill file and commit
- Testing Agent can run tests and report results
- Improvement loop completes end-to-end for a seeded weakness
- Observer changelog tracks all modifications

### Phase 12: Simulation Framework

**Title:** Simulation Framework
**SPEC Sections:** V2 Section 11

**Steps must include:**

1. **Simulation configuration schema** — Data model for simulation scenarios: target company profile, seeded issues, VDR manifest, term sheet, client instructions.

2. **Scenario seeding tools** — Scripts/endpoints to seed a simulation: create synthetic VDR documents, generate term sheet, create client instruction emails, configure client agent personalities.

3. **Client Agent implementation** — Autonomous agent simulating a business principal. Configured with deal objectives, personality, response patterns. Can respond to questionnaires, provide disclosures, make decisions. Uses agent invocation framework.

4. **Third-party Agent implementation** — Lightweight agents for escrow agent, R&W broker, etc. Respond to communications with standard deliverables.

5. **Simulation clock** — Mechanism for time compression. Agents respect simulated time for deadline calculations.

6. **Simulation runner** — Orchestrates the full deal simulation: Phase 0 (intake) through Phase 8 (post-closing). Manages turn-taking between sides.

7. **Simulation evaluation report** — Observer produces comprehensive report per V2 Section 11.5 after each run.

8. **Seed first scenario** — The mid-market tech acquisition from V2 Section 11.3. All VDR documents, term sheet, client instructions, seeded issues.

**Phase Gate:**
- Simulation can be configured and started
- Client agents respond to communications
- At least Phase 0-2 of simulation (intake + first draft) complete successfully
- Observer produces evaluation report
- Seeded issues are either caught or flagged as gaps

### Phase 13: Mobile Approval Interface

**Title:** Mobile Approval Interface
**SPEC Sections:** V2 Section 4.3-4.4

**Steps must include:**

1. **Mobile-optimized approval queue** — Responsive design for the approval queue page. Card-based layout optimized for phone screens.
2. **Push notification infrastructure** — Service worker for web push notifications. Notify on new Tier 2 and Tier 3 items.
3. **Swipe gestures** — Swipe-to-approve for Tier 2 items (if feasible in web app, otherwise large tap targets).
4. **Deal dashboard mobile view** — Responsive dashboard showing deal status, pending items, recent activity.
5. **Performance optimization** — Queue items load fast. Offline caching for queue state.

**Phase Gate:**
- Approval queue renders well on mobile viewport (375px width)
- Push notifications work in Chrome
- Approval actions work on mobile

### Phase 14: Knowledge Capture + Learning Pipeline

**Title:** Knowledge Capture & Learning Pipeline
**SPEC Sections:** V2 Sections 12, 9.7

**Steps must include:**

1. **Feedback event capture** — Wire feedback event creation into ALL approval workflows. Every approve, modify, reject generates a `FeedbackEvent` per V2 Section 12.1.
2. **Annotation prompt UI** — After any modification, show optional "Brief note on why?" field. Frictionless — skip button prominent.
3. **Learning pipeline background processor** — Processes feedback events: updates precedent quality scores, detects patterns for adaptive skills, adds test cases for rejected outputs.
4. **Conversational knowledge encoding** — Chat interface specifically for expert knowledge capture. Agent interviews partner per V2 Section 12.3. Structures responses into skills and scenario definitions.
5. **Deal post-mortem workflow** — After deal closes, system prompts for brief debrief. Auto-generates knowledge entries from deal data. Optional conversational debrief.
6. **Deal knowledge table** — `deal_knowledge` per V2 Section 9.7. Store negotiation outcomes, process learnings, attorney preferences, counterparty patterns.
7. **Cross-deal knowledge aggregation** — Query knowledge across deals for patterns. "How did deals with this counterparty firm typically resolve indemnification?"

**Phase Gate:**
- Feedback events generated on every approval action
- Learning pipeline updates precedent quality scores from feedback
- Conversational encoding produces structured knowledge
- Knowledge queryable across deals

---

## FILE 14: scripts/autonomous-runner.sh

Produce this script:

```bash
#!/bin/bash
# autonomous-runner.sh — Keeps Claude Code building across session boundaries
#
# Usage: bash scripts/autonomous-runner.sh
#
# This script runs in a loop:
# 1. Starts a Claude Code session
# 2. Claude Code reads CLAUDE.md, picks up from BUILD_STATE.json
# 3. When the session ends (timeout, context limit, completion)
# 4. Script checks if build is complete
# 5. If not complete, waits and restarts
#
# PREREQUISITES:
# - Claude Code CLI installed and authenticated
# - Git configured with push access to origin
# - Repository cloned locally
#
# CONFIGURATION:
RESTART_DELAY=60          # Seconds to wait between sessions
MAX_SESSIONS=50           # Safety limit on total sessions
LOG_FILE="build_log.txt"  # Session log

SESSION_COUNT=0

echo "=== M&A Deal OS Autonomous Builder ===" | tee -a "$LOG_FILE"
echo "Started: $(date)" | tee -a "$LOG_FILE"

while [ $SESSION_COUNT -lt $MAX_SESSIONS ]; do
  SESSION_COUNT=$((SESSION_COUNT + 1))
  echo "" | tee -a "$LOG_FILE"
  echo "--- Session $SESSION_COUNT starting at $(date) ---" | tee -a "$LOG_FILE"

  # Pull latest (in case of manual changes/GUIDANCE.md)
  git pull origin main 2>&1 | tee -a "$LOG_FILE"

  # Check if build is marked complete
  if [ -f BUILD_COMPLETE ]; then
    echo "BUILD COMPLETE! All phases finished." | tee -a "$LOG_FILE"
    exit 0
  fi

  # Check current state
  CURRENT_PHASE=$(python3 -c "import json; print(json.load(open('BUILD_STATE.json'))['current_phase'])" 2>/dev/null || echo "unknown")
  echo "Current phase: $CURRENT_PHASE" | tee -a "$LOG_FILE"

  # Start Claude Code session
  # NOTE: Adjust this command to match your Claude Code CLI invocation
  # Option A: Interactive mode (if you're watching)
  # claude
  #
  # Option B: With initial prompt (headless-ish)
  # claude --print "Read CLAUDE.md and continue building from BUILD_STATE.json. Do not ask for confirmation — just build."
  #
  # Option C: Pipe instruction
  # echo "Read CLAUDE.md and continue building from BUILD_STATE.json." | claude
  #
  # Uncomment the appropriate option:
  claude --print "Read CLAUDE.md and continue building from BUILD_STATE.json. Follow the autonomous build protocol." 2>&1 | tee -a "$LOG_FILE"

  EXIT_CODE=$?
  echo "Session $SESSION_COUNT ended with exit code $EXIT_CODE at $(date)" | tee -a "$LOG_FILE"

  # Pull any changes Claude Code pushed
  git pull origin main 2>&1 | tee -a "$LOG_FILE"

  # Log current state
  if [ -f BUILD_STATE.json ]; then
    echo "Build state after session:" | tee -a "$LOG_FILE"
    cat BUILD_STATE.json | tee -a "$LOG_FILE"
  fi

  # Check for blocking issues
  BLOCKERS=$(python3 -c "
import json
state = json.load(open('BUILD_STATE.json'))
blockers = state.get('blocking_issues', [])
if blockers:
    print('BLOCKED: ' + '; '.join(str(b) for b in blockers))
else:
    print('NO_BLOCKERS')
" 2>/dev/null || echo "COULD_NOT_CHECK")

  if [[ "$BLOCKERS" == BLOCKED* ]]; then
    echo "$BLOCKERS" | tee -a "$LOG_FILE"
    echo "Build is blocked. Waiting for human intervention (GUIDANCE.md)." | tee -a "$LOG_FILE"
    echo "Add GUIDANCE.md to repo root, commit, and push to unblock." | tee -a "$LOG_FILE"

    # Wait for GUIDANCE.md to appear
    while true; do
      sleep 120
      git pull origin main 2>/dev/null
      if [ -f GUIDANCE.md ]; then
        echo "GUIDANCE.md found. Resuming..." | tee -a "$LOG_FILE"
        break
      fi
      echo "Still waiting for guidance... ($(date))" | tee -a "$LOG_FILE"
    done
  fi

  echo "Waiting $RESTART_DELAY seconds before next session..." | tee -a "$LOG_FILE"
  sleep $RESTART_DELAY
done

echo "Reached max sessions ($MAX_SESSIONS). Check BUILD_STATE.json for status." | tee -a "$LOG_FILE"
```

Adapt the Claude Code CLI invocation to whatever the actual command is. The user may need to adjust this.

---

## FILE 15: README.md

Produce a comprehensive README that covers:

```markdown
# M&A Deal Operating System

## Overview
Automated M&A transaction management platform. Replaces a 4-5 person deal team with
an AI-powered system supervised by a partner through a mobile-first approval interface.

## Architecture
- Three-layer design: Deterministic backbone → AI API calls → Agents
- Event-driven propagation: every change triggers automated consequences
- Approval-gated execution: pre-rendered actions, one-tap approval
- Self-improving: Observer monitors, diagnoses, and fixes the system during operation

## Tech Stack
- Next.js 14 (App Router)
- Supabase (PostgreSQL + pgvector)
- Drizzle ORM
- Claude API (Anthropic)
- Google Drive API
- Microsoft Graph API
- MCP (Model Context Protocol) for agent tooling
- pnpm + Turborepo monorepo

## Repository Structure
[show the directory tree]

## Getting Started
[setup instructions — clone, install, env vars, run]

## Current Build Status
See BUILD_STATE.json for the current phase and step.
See docs/test-results/ for phase test reports.

## Architecture Documentation
See SPEC.md for the complete specification.

## Build Protocol
This project uses an autonomous build protocol. See CLAUDE.md for details.
```

---

## SELF-VERIFICATION CHECKLIST

Before finishing, verify ALL of the following:

1. **Schema completeness:** Every table mentioned anywhere in SPEC-V2-COMPLETE.md has a full schema definition in the Database Schema section.

2. **Route completeness:** Every API route mentioned anywhere in SPEC-V2-COMPLETE.md appears in the API Routes section AND has implementation instructions in the appropriate phase skill file.

3. **Agent completeness:** Every agent (Manager, each Specialist type, System Expert, Observer, Coding Agent, Testing Agent) has: a description in the Agent Architecture section AND implementation instructions in a skill file.

4. **Event completeness:** Every event type in the EventType union has: at least one consequence map defined AND is emitted by at least one workflow described in a skill file.

5. **Phase coverage:** Every section of the spec is covered by at least one phase's skill file. Nothing is described in the spec but never assigned to a build phase.

6. **Test coverage:** Every skill file step has at least one test with expected result and severity level.

7. **Dependency ordering:** No skill file references a table, route, or component that should be created in a later phase (unless explicitly noted as a dependency that will be stubbed).

8. **Backward compatibility:** Nothing in Phases 3+ would break the existing Phase 0-2 code. If a schema change is needed to an existing table, it's an ALTER TABLE (add column), never a destructive change.

9. **File path accuracy:** Every file path mentioned in skill files matches the actual repository structure.

10. **No orphan references:** Search for any table name, route path, or component name that appears exactly once. If something is mentioned but never defined or never used, it's an error.

Output a verification report at the end listing each check and its result.

---

## EXECUTION INSTRUCTIONS

1. Read all input files first. Do not start writing until you've read: SPEC.md, SPEC-V2.md, CLAUDE_CODE_MASTER_INSTRUCTIONS.md, TESTING_PROTOCOL.md, phase2_test_report.md.

2. Produce SPEC-V2-COMPLETE.md first. This is the foundation everything else references.

3. Produce skill files in order (phase-03 through phase-14). Each may reference the merged spec.

4. Produce autonomous-runner.sh and README.md.

5. Run the self-verification checklist.

6. Commit all produced files.
