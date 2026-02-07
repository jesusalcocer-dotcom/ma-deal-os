# M&A Deal Operating System — V2 Architecture Specification

## Agent-Driven Deal Execution, Self-Improving Simulation, and Reactive Automation

**Version:** 0.2
**Date:** February 6, 2026
**Builds on:** `SPEC.md` v0.1 (Technical Implementation Specification)

---

## TABLE OF CONTENTS

1. [Vision & Architecture Philosophy](#1-vision--architecture-philosophy)
2. [Three-Layer Architecture](#2-three-layer-architecture)
3. [Event Propagation Backbone](#3-event-propagation-backbone)
4. [Approval Framework](#4-approval-framework)
5. [Agent Architecture](#5-agent-architecture)
6. [Skills System](#6-skills-system)
7. [Partner Constitution & Governance](#7-partner-constitution--governance)
8. [Precedent Intelligence Pipeline](#8-precedent-intelligence-pipeline)
9. [Gap Coverage: New Workflows](#9-gap-coverage-new-workflows)
10. [Observer & Self-Improvement System](#10-observer--self-improvement-system)
11. [Simulation Framework](#11-simulation-framework)
12. [Knowledge & Learning Pipeline](#12-knowledge--learning-pipeline)
13. [Database Schema Additions](#13-database-schema-additions)
14. [API Additions](#14-api-additions)
15. [Updated Implementation Phases](#15-updated-implementation-phases)
16. [Cost Model & Token Economics](#16-cost-model--token-economics)

---

## 1. VISION & ARCHITECTURE PHILOSOPHY

### 1.1 The Goal

Build a system where an M&A deal can be executed to completion by a two-person team: a human partner making strategic decisions, and an agent system doing everything else — drafting, analyzing, monitoring, coordinating, communicating, and improving itself over time.

The system replaces 3-4 human associates (junior, mid-level, senior) with three layers of automation:

- **Deterministic code** replaces mechanical task execution
- **Traditional AI API calls** replace analytical task execution
- **Agents** replace strategic judgment, initiative, and coordination

### 1.2 Design Principles

**Backbone first, agents on top.** The deterministic code and API call layers handle 90% of volume at 10% of cost. Agents handle the 10% of volume where 90% of strategic value lives. Never use an agent where an API call suffices. Never use an API call where deterministic code suffices.

**Pre-compute everything, approve once.** The system doesn't flag problems and ask the human what to do. It identifies problems, figures out exactly what to do, stages the complete solution, and asks for a yes/no. Approval is confirmation, not delegation.

**Git is the safety net.** Every system modification — by humans, agents, or the Observer — is a git commit. Nothing is ever lost. This allows maximum autonomy within full auditability.

**The deal never sleeps.** The backbone processes events continuously. Agents activate selectively. The human engages on their schedule. The system is always working, always monitoring, always ready.

**Self-improvement is continuous.** The system observes its own performance, identifies weaknesses, implements fixes, and validates improvements — during simulation runs, not between them.

### 1.3 Relationship to SPEC.md v0.1

This specification extends `SPEC.md` v0.1. The original spec defines:

- Repository structure and technology stack (Section 3-4)
- Database schema for core tables (Section 5)
- Backend API routes (Section 6)
- Cowork plugin specification (Section 7)
- Web portal pages and components (Section 8)
- Google Drive integration (Section 9)
- Outlook email integration (Section 10)
- AI/LLM pipeline (Section 11)
- Document processing pipeline (Section 12)
- Implementation phases (Section 13)

This V2 spec adds the reactive backbone, agent hierarchy, approval system, skills architecture, self-improvement loop, simulation framework, and several missing deal workflows. Where V2 modifies or extends V1, the changes are noted explicitly. Where V1 remains unchanged, it is referenced rather than repeated.

---

## 2. THREE-LAYER ARCHITECTURE

### 2.1 Layer 1: Deterministic Code

Pure TypeScript logic. No AI involved. Cheap, reliable, predictable, testable.

**What it handles:**
- Checklist generation rules engine (deal parameters → document checklist)
- Document lifecycle state machine (status transitions, validations)
- Event propagation triggers (state change → downstream evaluation)
- Dependency graph resolution (which items block which)
- Cross-reference validation (defined terms, section references)
- Timeline calculations (critical path, deadline warnings)
- Data transformations (schema mappings, format conversions)
- Approval routing (tier assignment based on policy configuration)

**Design rule:** If the logic can be expressed as `if/then/else` with enumerated inputs and outputs, it belongs in Layer 1.

### 2.2 Layer 2: Traditional AI API Calls

Single-turn, scoped calls to Claude with structured inputs and outputs. Each call has a defined task, narrow context, and expected output schema.

**What it handles:**
- Term sheet parsing (text → Deal Parameter Object)
- Email classification (email content → classification + extracted data)
- Provision classification (contract text → provision type + variant)
- Markup analysis (two document versions → provision-level change list)
- Document drafting (parameters + precedent + instructions → draft text)
- DD document analysis (VDR document + topic taxonomy → findings)
- Disclosure schedule pre-population (DD findings → schedule entries)
- Negotiation position extraction (email text → structured positions)
- Quality scoring (provision text → quality assessment)
- Client communication drafting (deal state + template → client-appropriate narrative)

**Design rule:** If the task has a defined input, a defined output schema, and can be completed in a single reasoning pass without needing to decide what to look at next, it belongs in Layer 2.

**Implementation:** All Layer 2 calls go through `packages/ai` as defined in SPEC.md v0.1 Section 11. Every call has retry logic (3 attempts, exponential backoff), structured output validation, and cost tracking.

### 2.3 Layer 3: Agents

Multi-step reasoning with tool access, persistent context, and autonomous decision-making. Agents decide what to investigate, what tools to use, when they have enough information, and what to recommend.

**What it handles:**
- Strategic synthesis across workstreams
- Multi-step investigation (following inferential chains)
- Proactive monitoring (identifying issues nobody asked about)
- Negotiation strategy formulation
- Inter-agent coordination and work routing
- Gap recognition (identifying when capabilities are missing)
- Quality review of Layer 1 and Layer 2 outputs

**Design rule:** If the task requires deciding what information to gather, reasoning across multiple data sources, or exercising judgment that can't be reduced to a prompt template, it belongs in Layer 3.

**Cost control:** Agents activate selectively (see Section 5.6 on activation triggers). Dormant mode uses Layers 1-2 only. Active mode invokes agents for specific purposes with defined scope.

---

## 3. EVENT PROPAGATION BACKBONE

The event propagation backbone is the reactive automation layer that replaces the passive data relationships in SPEC.md v0.1. It ensures that a change anywhere in the deal automatically triggers appropriate consequences everywhere else.

### 3.1 Core Concepts

**Propagation Event:** A record that something meaningful changed in the deal state. Every significant database write emits a propagation event.

**Consequence Resolver:** The module that evaluates a propagation event and determines what downstream actions are needed. Uses Layer 1 (deterministic rules) for known consequence patterns and Layer 2 (API calls) for non-obvious connections.

**Action Chain:** An ordered list of proposed actions generated by the consequence resolver. Represents a complete response to an event — all the things that should happen as a result.

**Proposed Action:** A single concrete action within an action chain. Fully specified: what to do, to what artifact, with what content. Ready to execute on approval.

### 3.2 Event Types

```typescript
// packages/core/src/types/events.ts

type PropagationEventType =
  // Deal-level events
  | 'deal.created'
  | 'deal.parameters_updated'
  | 'deal.status_changed'
  | 'deal.timeline_updated'

  // Checklist events
  | 'checklist.generated'
  | 'checklist.item_status_changed'
  | 'checklist.item_assigned'
  | 'checklist.item_overdue'
  | 'checklist.dependency_resolved'

  // Document events
  | 'document.version_created'
  | 'document.markup_received'
  | 'document.markup_analyzed'
  | 'document.sent_to_counterparty'
  | 'document.attorney_reviewed'

  // DD events
  | 'dd.finding_created'
  | 'dd.finding_confirmed'
  | 'dd.finding_resolved'
  | 'dd.coverage_gap_identified'
  | 'dd.request_sent'
  | 'dd.response_received'

  // Email events
  | 'email.received'
  | 'email.classified'
  | 'email.position_extracted'
  | 'email.action_item_identified'
  | 'email.attachment_processed'

  // Negotiation events
  | 'negotiation.position_updated'
  | 'negotiation.concession_detected'
  | 'negotiation.impasse_detected'
  | 'negotiation.round_completed'

  // Disclosure schedule events
  | 'disclosure.schedule_updated'
  | 'disclosure.gap_identified'
  | 'disclosure.client_response_received'
  | 'disclosure.cross_reference_broken'

  // Third-party events
  | 'third_party.deliverable_received'
  | 'third_party.deliverable_overdue'
  | 'third_party.communication_received'

  // Client events
  | 'client.action_item_created'
  | 'client.action_item_completed'
  | 'client.communication_needed'
  | 'client.approval_requested'

  // Closing events
  | 'closing.condition_satisfied'
  | 'closing.condition_waived'
  | 'closing.deliverable_received'
  | 'closing.blocking_issue_identified'

  // System events
  | 'system.deadline_approaching'
  | 'system.critical_path_changed'
  | 'system.agent_activation_triggered';
```

### 3.3 Propagation Event Structure

```typescript
interface PropagationEvent {
  id: string;                    // UUID
  deal_id: string;               // Which deal
  event_type: PropagationEventType;
  source_entity_type: string;    // 'checklist_item', 'document_version', 'dd_finding', 'email', etc.
  source_entity_id: string;      // UUID of the source record
  payload: Record<string, any>;  // Event-specific data
  significance: 1 | 2 | 3 | 4 | 5;  // 1=routine, 5=critical
  created_at: string;            // ISO timestamp
  processed: boolean;
  processed_at?: string;
}
```

### 3.4 Consequence Resolution Flow

```
Event Emitted
     │
     ▼
┌─────────────────────┐
│  Layer 1: Rules      │  Deterministic consequence mapping
│  (always runs)       │  e.g., DD finding type → affected provisions
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Layer 2: API Call   │  Non-obvious connection detection
│  (runs if needed)    │  Sends event + deal context to Claude
└──────────┬──────────┘  Asks: "What else is affected?"
           │
           ▼
┌─────────────────────┐
│  Significance Check  │  Is this important enough to
│                      │  activate the agent layer?
└──────────┬──────────┘
           │
      ┌────┴────┐
      │         │
   Low (1-2)  High (3-5)
      │         │
      ▼         ▼
┌──────────┐ ┌──────────────┐
│ Generate │ │ Layer 3:     │
│ Actions  │ │ Agent Review │
│ Directly │ │ + Synthesis  │
└────┬─────┘ └──────┬───────┘
     │               │
     ▼               ▼
┌─────────────────────────┐
│  Action Chain Created    │
│  → Approval Queue        │
└─────────────────────────┘
```

### 3.5 Deterministic Consequence Maps

These are the known, codified relationships between events and consequences. Implemented in `packages/core/src/rules/consequence-maps.ts`.

```typescript
// Example consequence maps (non-exhaustive)

const consequenceMaps: ConsequenceMap[] = [
  {
    trigger: 'dd.finding_confirmed',
    conditions: [
      { field: 'payload.risk_level', in: ['critical', 'high'] }
    ],
    consequences: [
      {
        type: 'document_modification',
        target: 'affected_provisions',  // resolved from finding.affects_provisions
        action: 'propose_enhancement',
        priority: 'high'
      },
      {
        type: 'disclosure_schedule_update',
        target: 'matching_schedule',
        action: 'add_entry',
        priority: 'high'
      },
      {
        type: 'notification',
        target: 'deal_lead',
        action: 'alert',
        priority: 'immediate'
      },
      {
        type: 'client_communication',
        target: 'client_contact',
        action: 'draft_notification',
        priority: 'normal'
      }
    ]
  },

  {
    trigger: 'document.markup_received',
    consequences: [
      {
        type: 'analysis',
        action: 'analyze_markup',
        priority: 'high'
      },
      {
        type: 'negotiation_update',
        action: 'extract_positions',
        priority: 'high'
      },
      {
        type: 'checklist_update',
        target: 'related_checklist_item',
        action: 'update_status_to_markup_received',
        priority: 'normal'
      },
      {
        type: 'checklist_update',
        target: 'related_checklist_item',
        action: 'update_ball_with_to_us',
        priority: 'normal'
      }
    ]
  },

  {
    trigger: 'email.position_extracted',
    consequences: [
      {
        type: 'negotiation_update',
        action: 'update_provision_positions',
        priority: 'normal'
      },
      {
        type: 'agent_evaluation',
        action: 'assess_negotiation_impact',
        priority: 'normal'
      }
    ]
  },

  {
    trigger: 'negotiation.position_updated',
    conditions: [
      { field: 'payload.provision_type', in: ['indemnification.*', 'purchase_price.*'] }
    ],
    consequences: [
      {
        type: 'document_modification',
        target: 'all_related_documents',
        action: 'cascade_change',
        priority: 'high'
      },
      {
        type: 'disclosure_schedule_update',
        action: 'cross_reference_check',
        priority: 'normal'
      }
    ]
  },

  {
    trigger: 'checklist.item_overdue',
    consequences: [
      {
        type: 'notification',
        target: 'assigned_attorney',
        action: 'overdue_alert',
        priority: 'high'
      },
      {
        type: 'critical_path_update',
        action: 'recalculate',
        priority: 'normal'
      }
    ]
  },

  {
    trigger: 'closing.condition_satisfied',
    consequences: [
      {
        type: 'closing_checklist_update',
        action: 'mark_condition_met',
        priority: 'normal'
      },
      {
        type: 'closing_readiness_check',
        action: 'evaluate_all_conditions',
        priority: 'normal'
      }
    ]
  }
];
```

### 3.6 Action Chain Structure

```typescript
interface ActionChain {
  id: string;
  deal_id: string;
  trigger_event_id: string;       // The propagation event that created this chain
  summary: string;                 // Human-readable summary
  significance: 1 | 2 | 3 | 4 | 5;
  approval_tier: 1 | 2 | 3;       // See Section 4
  status: 'pending' | 'approved' | 'partially_approved' | 'rejected' | 'expired';

  actions: ProposedAction[];
  created_at: string;
  approved_at?: string;
  approved_by?: string;
}

interface ProposedAction {
  id: string;
  chain_id: string;
  sequence_order: number;          // Execution order within chain
  depends_on: string[];            // IDs of other actions that must complete first

  action_type: ProposedActionType;
  target_entity_type: string;
  target_entity_id?: string;
  payload: Record<string, any>;    // The complete action content

  // Pre-rendered output (what the human sees in the approval queue)
  preview: {
    title: string;
    description: string;
    diff?: string;                 // For document modifications, the actual redline
    draft?: string;                // For email drafts, the actual email text
  };

  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
  execution_result?: Record<string, any>;
  created_at: string;
  executed_at?: string;
}

type ProposedActionType =
  | 'document_edit'                // Modify a document provision
  | 'document_generate'            // Generate a new document version
  | 'checklist_status_update'      // Update checklist item status
  | 'checklist_ball_with_update'   // Update who has the ball
  | 'checklist_add_item'           // Add new checklist item
  | 'disclosure_schedule_entry'    // Add/modify disclosure schedule entry
  | 'disclosure_schedule_remove'   // Remove a schedule entry
  | 'email_draft'                  // Draft an email
  | 'email_send'                   // Send an approved email
  | 'dd_finding_create'            // Create a new DD finding
  | 'dd_request_create'            // Create a DD follow-up request
  | 'negotiation_position_update'  // Update negotiation state tracker
  | 'client_action_item_create'    // Create client deliverable
  | 'client_communication_draft'   // Draft client update
  | 'third_party_communication'    // Draft third-party message
  | 'closing_checklist_update'     // Update closing checklist
  | 'notification'                 // Send internal notification
  | 'agent_activation'             // Trigger agent for deeper analysis
  | 'status_update'                // General status field update
  | 'timeline_update';             // Update deal timeline

```

### 3.7 Implementation: Event Bus

The event bus is database-backed for durability and auditability. Events are written to the `propagation_events` table and processed by a background worker.

```typescript
// packages/core/src/events/event-bus.ts

export class EventBus {
  /**
   * Emit a propagation event. Called by API routes, background jobs,
   * and agent actions whenever deal state changes.
   */
  async emit(event: Omit<PropagationEvent, 'id' | 'created_at' | 'processed'>): Promise<string> {
    // 1. Write event to propagation_events table
    // 2. Trigger consequence resolution (async)
    // 3. Return event ID
  }

  /**
   * Process a propagation event through the consequence resolution pipeline.
   */
  async process(eventId: string): Promise<ActionChain[]> {
    // 1. Load event
    // 2. Run Layer 1 deterministic consequence maps
    // 3. If needed, run Layer 2 API call for non-obvious connections
    // 4. Evaluate significance for potential Layer 3 agent activation
    // 5. Generate action chain(s)
    // 6. Assign approval tiers based on approval policy
    // 7. Write action chains to database
    // 8. Route to approval queue
    // 9. Auto-execute Tier 1 actions immediately
    // 10. Mark event as processed
  }
}
```

**Background processing:** Events are processed by a worker that polls the `propagation_events` table for unprocessed events. In the prototype, this is a simple `setInterval` loop. In production, replace with a proper job queue (BullMQ or similar).

**Ordering guarantees:** Events for the same deal are processed sequentially to prevent race conditions. Events across different deals are processed in parallel.

---

## 4. APPROVAL FRAMEWORK

### 4.1 Approval Tiers

**Tier 1 — Auto-execute.** The system acts without asking. These are low-risk, high-frequency actions where requiring approval would create noise.

Examples:
- Checklist status field updates (e.g., "markup_received" when markup arrives via email)
- `ball_with` updates based on unambiguous signals (counterparty sent document = ball with us)
- Activity log entries
- Internal notification dispatches
- Drive sync operations
- Coverage gap flags in DD
- Timeline recalculations
- Deadline warning notifications

**Tier 2 — Approve-to-execute.** The system has done the work, produced the specific output, and is asking for a green light. One tap approves. The work is pre-rendered — the human sees the actual artifact (redline, email draft, schedule entry), not a description of what will happen.

Examples:
- Document modifications (provision edits, schedule entries)
- Email drafts to counterparty counsel
- DD finding confirmations
- Negotiation position updates
- Closing checklist updates
- Third-party communication drafts
- Client action item creation

**Tier 3 — Review required.** The system surfaces the situation with context and analysis but cannot propose a specific action with sufficient confidence. The human needs to think and decide.

Examples:
- Novel legal issues not covered by precedent
- Conflicting DD findings
- Fundamental shifts in counterparty negotiation posture
- Anything touching deal economics (price adjustments, earnout mechanics, indemnification caps)
- Situations where the agent's confidence is below threshold
- Constitutional constraint violations (proposed action conflicts with partner directives)
- Inter-workstream conflicts (DD finding contradicts a negotiation concession)

### 4.2 Approval Policy

The approval tier for each action type is configurable per deal, per user role. This is the "trust dial" that lets different attorneys customize their experience.

```typescript
interface ApprovalPolicy {
  id: string;
  deal_id?: string;               // Deal-specific policy (overrides user default)
  user_id?: string;               // User-specific policy
  role?: string;                  // Role-based policy ('partner', 'senior_associate', etc.)

  rules: ApprovalRule[];
}

interface ApprovalRule {
  action_type: ProposedActionType | ProposedActionType[];
  conditions?: {
    significance_gte?: number;     // Only apply if significance >= this
    provision_type?: string[];     // Only apply for specific provision types
    counterparty_facing?: boolean; // Only apply if action is visible to counterparty
    client_facing?: boolean;       // Only apply if action is visible to client
    financial_impact?: boolean;    // Only apply if action affects deal economics
  };
  tier: 1 | 2 | 3;
}
```

**Default policy for partners:**
```typescript
const defaultPartnerPolicy: ApprovalRule[] = [
  // Auto-execute: internal bookkeeping
  { action_type: ['status_update', 'notification', 'timeline_update'], tier: 1 },
  { action_type: 'checklist_ball_with_update', tier: 1 },
  { action_type: 'checklist_status_update', tier: 1 },

  // Approve-to-execute: substantive but standard
  { action_type: 'document_edit', tier: 2 },
  { action_type: 'document_generate', tier: 2 },
  { action_type: 'email_draft', tier: 2 },
  { action_type: 'dd_finding_create', tier: 2 },
  { action_type: 'disclosure_schedule_entry', tier: 2 },
  { action_type: 'closing_checklist_update', tier: 2 },
  { action_type: 'third_party_communication', tier: 2 },
  { action_type: 'client_action_item_create', tier: 2 },

  // Review required: strategic or high-stakes
  { action_type: 'email_draft', conditions: { client_facing: true }, tier: 3 },
  { action_type: 'document_edit', conditions: { financial_impact: true }, tier: 3 },
  { action_type: 'negotiation_position_update', conditions: { significance_gte: 4 }, tier: 3 },
  { action_type: 'client_communication_draft', tier: 3 },
];
```

### 4.3 Approval Queue Interface

The approval queue is the partner's primary interface to the system. It must work on mobile.

**Queue item display:**
```
┌─────────────────────────────────────────────┐
│ 🔴 HIGH  │  Project Mercury                │
│                                             │
│ DD Finding: Undisclosed CoC provision in     │
│ Acme Supply Contract (~$12M exposure)        │
│                                             │
│ 5 proposed actions:                          │
│  • Enhance material contracts rep (SPA §3.15)│
│  • Add Schedule 3.15(a) entry                │
│  • Add special indemnity line item           │
│  • Draft client notification email           │
│  • Create DD follow-up request               │
│                                             │
│          [Approve All]  [Review]             │
└─────────────────────────────────────────────┘
```

**Review mode (expanded):**
Each proposed action expands to show the pre-rendered output:
- Document edits show the actual redline
- Email drafts show the full email
- Schedule entries show the exact entry text
- Each action has individual Approve / Modify / Reject controls

**Key metrics:**
- Time from notification to resolution (target: <10 seconds for Tier 2)
- Human modification rate (percentage of Tier 2 actions modified vs. approved as-is)
- Queue depth (pending items — target: <10 at any time)

### 4.4 Mobile-First Design

The approval queue is designed for mobile-first interaction:

- Push notifications for new Tier 2 and Tier 3 items
- Swipe-to-approve gesture for Tier 2 items
- Card-based layout optimized for phone screens
- Offline support: queue items cached locally, approvals synced when connected
- Voice note option for Tier 3 items: partner speaks their decision, system transcribes and executes

**Dashboard view:** All pending approvals across all deals, sorted by urgency. Morning routine: 5 minutes approving the overnight queue.

---

## 5. AGENT ARCHITECTURE

### 5.1 Agent Hierarchy Overview

```
                    ┌─────────────────────┐
                    │   Human Partner     │
                    │   (Approval Queue    │
                    │    + Chat Interface) │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Manager Agent     │  ← Holistic deal view
                    │   (Senior Associate) │     Strategic synthesis
                    └──┬───────────────┬──┘     Work routing
                       │               │
          ┌────────────▼──┐    ┌───────▼────────────┐
          │ System Expert │    │ Specialist Agents   │  ← Dynamic
          │ (Always on)   │    │ (Spun up per task)  │     configuration
          └───────────────┘    └────────────────────┘
```

### 5.2 The Manager Agent

**Role:** The senior associate who runs the deal. Maintains the holistic deal model, routes work to specialists, synthesizes across workstreams, and communicates with the partner.

**Responsibilities:**
- Maintain the strategic picture: where the deal stands, key risks, negotiation dynamics, critical path
- Route work to specialist agents when deep domain expertise is needed
- Synthesize specialist outputs into strategic recommendations
- Generate morning briefings and real-time alerts
- Formulate negotiation strategy and update it as the deal evolves
- Monitor all deal workstreams for cross-cutting issues
- Operate within the Partner's Constitution (see Section 7)

**What the Manager does NOT do:**
- Draft documents (delegates to Drafter Specialist)
- Analyze individual DD documents (delegates to Analyst Specialist)
- Handle system configuration (delegates to System Expert)
- Make final strategic decisions (escalates to human partner)

**Context loaded on activation:**
- Deal Parameter Object (full)
- Current checklist with status summary
- Negotiation state tracker (positions by provision)
- Active DD findings (summary)
- Recent activity log (last 48 hours)
- Pending approval queue items
- Partner Constitution
- Critical path analysis
- Upcoming deadlines (next 14 days)

**Tool access:**
- All MCP tools defined in SPEC.md v0.1 Section 7.4
- Action chain creation tools
- Specialist agent invocation tools
- Notification dispatch tools
- Negotiation state update tools
- Approval queue management tools

### 5.3 Specialist Agents (Dynamically Configured)

Specialist agents are not permanent entities. They are configured dynamically by the Manager for specific tasks by assembling:
- A task-specific system prompt
- Relevant domain skills from the skills library
- Appropriate context (documents, precedent, deal state subset)
- Task-specific tool access

**When the Manager invokes a specialist, it specifies:**
```typescript
interface SpecialistConfig {
  task_type: 'markup_analysis' | 'document_drafting' | 'dd_investigation'
    | 'email_analysis' | 'disclosure_review' | 'closing_preparation'
    | 'negotiation_analysis' | 'precedent_research';
  skills: string[];               // Skill IDs to load from skills library
  context: {
    documents: string[];           // Document IDs to load
    provisions?: string[];         // Specific provision types in scope
    deal_state_subset: string[];   // Which parts of deal state to include
    precedent_query?: string;      // Precedent to retrieve
  };
  tools: string[];                 // Specific tools this specialist can use
  output_schema: object;           // Expected structured output format
  instructions: string;            // Manager's specific instructions for this task
}
```

**Specialist types and their typical configurations:**

**Drafter Specialist:**
- Skills: document drafting conventions, provision taxonomy, cross-reference management, defined term consistency
- Context: current document draft, relevant precedent formulations, deal parameters, negotiation positions for relevant provisions, related documents (for cross-references)
- Tools: precedent search, document generation, redline generation
- Output: document version with change manifest

**Analyst Specialist:**
- Skills: DD methodology, risk classification framework, exposure quantification, regulatory knowledge
- Context: VDR documents under review, DD topic taxonomy, existing findings, deal parameters
- Tools: document processor, finding creator, coverage analyzer
- Output: structured findings with citations and confidence levels

**Negotiation Specialist:**
- Skills: negotiation strategy, concession analysis, market data interpretation
- Context: full negotiation history, current positions, precedent market data, deal dynamics
- Tools: precedent search, what's-market query, negotiation state tracker
- Output: strategy recommendation with trade-off analysis

**Email Specialist:**
- Skills: legal communication patterns, negotiation position extraction, action item identification
- Context: email thread, deal context, contact registry, negotiation state
- Tools: email classifier, position extractor, action item creator
- Output: classified email with extracted positions and recommended actions

**Closing Specialist:**
- Skills: closing mechanics, condition satisfaction tracking, funds flow preparation
- Context: closing checklist, outstanding conditions, signature page status, financial data
- Tools: closing checklist manager, funds flow generator
- Output: closing readiness assessment or closing package

### 5.4 The System Expert Agent

**Role:** Platform knowledge expert. Knows everything about how the system works — what data is where, what workflows exist, what tools are available, what the current configuration is.

**Responsibilities:**
- Guide onboarding and deal setup
- Help configure approval policies
- Assist with Partner Constitution creation (conversational encoding)
- Explain system behavior when asked
- Troubleshoot issues
- Help create and modify skills

**Context:** System documentation, current configuration, approval policies, skills library manifest, API documentation.

**Operating cost:** Very low. Small context (system docs, not deal state), infrequent activation (mostly during setup and when explicitly invoked).

**Note:** The System Expert is always available as a lightweight companion. It does not participate in deal execution or strategic decisions.

### 5.5 Agent Communication Protocol

Agents communicate through structured messages, not free-form text.

```typescript
interface AgentMessage {
  from: 'manager' | 'specialist' | 'system_expert' | 'observer';
  to: 'manager' | 'specialist' | 'system_expert' | 'observer' | 'human';
  type: 'task_assignment' | 'task_result' | 'escalation' | 'notification'
    | 'query' | 'recommendation' | 'alert';
  content: {
    summary: string;               // Brief description
    detail: Record<string, any>;   // Structured content
    confidence: number;            // 0.0-1.0
    reasoning?: string;            // Why this conclusion/recommendation
    alternatives?: any[];          // Other options considered
  };
  priority: 'routine' | 'normal' | 'high' | 'urgent';
  requires_response: boolean;
  deal_id: string;
  timestamp: string;
}
```

**Routing model: Hub and spoke.** The Manager is the hub. All specialist results flow to the Manager. The Manager synthesizes and routes to the human (via approval queue or chat) or to other specialists (for dependent work).

Specialists never communicate directly with each other or with the human. This ensures the Manager maintains the complete deal picture and prevents conflicting or redundant actions.

### 5.6 Agent Activation Triggers

Agents are not always running. They activate selectively based on three trigger types:

**Event-driven activation:** Certain propagation events are significant enough to warrant the Manager's attention. The significance scoring (1-5) determines whether to activate:
- Significance 1-2: Handled entirely by Layers 1-2, no agent activation
- Significance 3: Manager evaluates via a lightweight check (single API call: "Given this event summary and the current deal state summary, is agent-level analysis needed? Yes/No")
- Significance 4-5: Manager activates automatically with full context

**Scheduled activation:** Defined intervals for proactive monitoring:
- Morning briefing: once per day per active deal
- End-of-day review: once per day per active deal
- Weekly strategic assessment: once per week per active deal
- Deadline proximity check: daily scan of all deadlines within 7 days

**On-demand activation:** Human invokes the agent via:
- Chat interface in the web portal
- Cowork commands
- Approval queue (requesting more analysis on a Tier 3 item)

### 5.7 Agent Cost Control

```typescript
interface AgentActivation {
  id: string;
  deal_id: string;
  agent_type: 'manager' | 'specialist' | 'system_expert';
  trigger_type: 'event' | 'scheduled' | 'on_demand';
  trigger_source: string;

  // Token tracking
  input_tokens: number;
  output_tokens: number;
  total_cost_usd: number;
  model_used: string;

  // Multi-step tracking
  steps: number;
  tool_calls: number;
  specialist_invocations: number;

  // Timing
  started_at: string;
  completed_at: string;
  duration_ms: number;
}
```

**Cost controls:**
- Per-deal daily token budget (configurable, default $50/day)
- Per-activation token limit (default 200K input, 20K output per activation)
- Multi-step limit (default 10 steps per investigation)
- Specialist invocation limit (default 3 per Manager activation)
- Real-time cost dashboard showing spend by deal, by day, by agent type

**Monitoring level setting (per deal):**
- **Conservative:** Agent activates only on-demand and for scheduled briefings. ~$10-20/day.
- **Standard:** Adds event-driven activation for significance 4-5 events. ~$30-50/day.
- **Aggressive:** Agent evaluates every significance 3+ event. ~$50-100/day.

---

## 6. SKILLS SYSTEM

### 6.1 Skills Architecture

Skills are structured knowledge and procedure modules that agents load to perform specific tasks. They function like the institutional training and playbook that associates accumulate through practice.

```
/skills/
├── static/                        ← Pre-built, ships with the system
│   ├── domain/                    ← M&A legal knowledge
│   │   ├── markup-analysis.md
│   │   ├── provision-drafting.md
│   │   ├── negotiation-strategy.md
│   │   ├── dd-methodology.md
│   │   ├── closing-mechanics.md
│   │   ├── disclosure-schedules.md
│   │   ├── regulatory-filings.md
│   │   ├── cross-reference-management.md
│   │   └── defined-term-consistency.md
│   ├── process/                   ← System operation procedures
│   │   ├── action-chain-creation.md
│   │   ├── approval-queue-formatting.md
│   │   ├── email-communication.md
│   │   ├── document-versioning.md
│   │   ├── closing-coordination.md
│   │   └── client-communication.md
│   └── meta/                      ← Higher-order reasoning
│       ├── problem-decomposition.md
│       ├── confidence-calibration.md
│       ├── escalation-judgment.md
│       ├── gap-recognition.md
│       ├── skill-scoping.md
│       └── objective-conflict-resolution.md
│
├── adaptive/                      ← Learned from experience
│   ├── partner-preferences/       ← Per-partner learned preferences
│   ├── counterparty-patterns/     ← Per-firm/counsel patterns
│   ├── deal-type-refinements/     ← Deal-structure-specific learnings
│   └── firm-conventions/          ← Firm-specific drafting/process norms
│
└── dynamic/                       ← Created on-the-fly by agents
    ├── generated/                 ← Skills created during operation
    └── pending-review/            ← Skills awaiting human validation
```

### 6.2 Skill Format

Skills are structured markdown documents with metadata:

```markdown
---
skill_id: domain/markup-analysis
version: 1.2
type: domain
applicable_agents: [specialist]
applicable_tasks: [markup_analysis]
depends_on: [domain/provision-drafting]
last_updated: 2026-02-06
quality_score: 0.85
source: static
---

# Markup Analysis

## Purpose
Analyze a counterparty markup of a transaction document, identifying every
substantive change at the provision level, classifying its significance and
favorability, and recommending a response strategy.

## Methodology

### Step 1: Structural Comparison
[detailed instructions...]

### Step 2: Provision-Level Classification
[detailed instructions...]

### Step 3: Change Significance Assessment
[framework with examples...]

### Step 4: Favorability Scoring
[methodology...]

### Step 5: Response Recommendation
[decision framework...]

## Common Patterns
[specific patterns to watch for, with examples...]

## Common Mistakes to Avoid
[anti-patterns and failure modes...]

## Examples
[annotated examples of good markup analysis...]
```

### 6.3 Static Skills (Pre-Built Library)

These encode the foundational M&A knowledge that all agents need. They are maintained in version control and updated based on Observer findings and human feedback.

**Domain skills — what to know:**
- `markup-analysis.md` — How to analyze counterparty markups at the provision level
- `provision-drafting.md` — Conventions and best practices for drafting specific provision types
- `negotiation-strategy.md` — Frameworks for negotiation planning and concession analysis
- `dd-methodology.md` — Systematic DD review procedures by workstream
- `closing-mechanics.md` — Pre-closing, closing day, and post-closing procedures
- `disclosure-schedules.md` — Schedule generation, cross-referencing, and gap detection
- `regulatory-filings.md` — HSR, CFIUS, and state-specific filing requirements
- `cross-reference-management.md` — Maintaining section references across documents
- `defined-term-consistency.md` — Ensuring defined terms are consistent across all deal documents
- `indemnification-structures.md` — Deep knowledge of basket types, caps, survival, carve-outs
- `purchase-price-mechanics.md` — Working capital, earnout, escrow, holdback structures
- `employment-matters.md` — Non-competes, employment agreements, retention, WARN Act
- `ip-assessment.md` — IP diligence methodology and common issues
- `financial-statement-review.md` — How to read target financials for DD purposes
- `third-party-coordination.md` — Managing escrow agents, R&W brokers, lenders

**Process skills — how to operate:**
- `action-chain-creation.md` — How to create well-structured action chains
- `approval-queue-formatting.md` — How to format items for maximum clarity and fast approval
- `email-communication.md` — Tone, format, and content guidelines for deal emails
- `document-versioning.md` — Version labeling, change manifest creation
- `closing-coordination.md` — Signature page management, funds flow, closing call protocol
- `client-communication.md` — Client-appropriate language, status update structure

**Meta skills — how to think:**
- `problem-decomposition.md` — Breaking complex legal questions into manageable sub-questions
- `confidence-calibration.md` — Accurately assessing own uncertainty
- `escalation-judgment.md` — Deciding what warrants partner attention
- `gap-recognition.md` — Identifying when a needed capability or information is missing
- `skill-scoping.md` — Defining what a new skill needs to do before building it
- `objective-conflict-resolution.md` — Handling conflicts between competing deal objectives

### 6.4 Adaptive Skills (Learned from Experience)

These emerge from running deals and are stored per-partner, per-firm, or per-deal-type.

**Creation process:**
1. The learning pipeline (Section 12) identifies a pattern from feedback events
2. A draft adaptive skill is generated (e.g., "Partner X prefers cumulative language over aggregate for basket provisions")
3. The skill is stored in `skills/adaptive/` with the source pattern and confidence score
4. The skill is automatically loaded by the Manager when configuring specialists for matching contexts

**Examples:**
```markdown
---
skill_id: adaptive/partner-preferences/partner-x-indemnification
type: adaptive
source: feedback_pattern
confidence: 0.90
sample_size: 7
---

# Partner X: Indemnification Preferences

## Basket Type
- Strongly prefers true deductible over tipping basket
- Modification rate when system proposes tipping: 100% (changed in all 4 instances)

## Cap Language
- Prefers "cumulative" over "aggregate" (modified in 3 of 3 instances)
- Standard cap range: 10-15% of deal value for general reps

## Survival Period
- Opening position always 18 months
- Will concede to 15 months but treats 12 months as a Tier 3 decision
- Never agrees to less than 12 months without client approval
```

### 6.5 Dynamic Skills (Created On-the-Fly)

When an agent encounters a situation that no existing skill covers, it follows this process:

**Step 1 — Gap Recognition.**
The agent identifies the missing capability using the `gap-recognition` meta skill.
```
"I need to generate a checklist for a concurrent spin-off transaction.
Available skills cover: stock purchase, asset purchase, merger.
Gap: no skill for spin-off mechanics."
```

**Step 2 — Scope Definition.**
The agent defines what the skill needs to cover using the `skill-scoping` meta skill.
```
"New skill required: spin-off-mechanics.md
Must cover: transition services, Section 355 requirements, separate
regulatory filings, independent board approvals, shared contract
allocation, employee transfer mechanics."
```

**Step 3 — Research.**
The agent uses available tools (web search, precedent database, existing skills) to gather information for the new skill.

**Step 4 — Build.**
Two paths:

*Knowledge skill (default):* The agent writes a new markdown skill document following the standard skill format. This is loaded as context in future invocations. No code changes required.

*Code skill (when programmatic logic is needed):* The agent invokes a **Coding Agent** — a specialist configured specifically for code generation and testing.

```typescript
// Coding Agent configuration
const codingAgentConfig: SpecialistConfig = {
  task_type: 'code_generation',
  skills: ['meta/skill-scoping', 'process/system-architecture'],
  context: {
    // Load relevant existing code for patterns
    codebase_paths: ['packages/core/src/rules/', 'packages/ai/src/pipelines/'],
    // The specification for what to build
    specification: scopeDefinition,
  },
  tools: ['file_read', 'file_write', 'bash_execute', 'test_runner'],
  output_schema: {
    files_created: 'string[]',
    files_modified: 'string[]',
    tests_created: 'string[]',
    test_results: 'object',
    git_commit_hash: 'string'
  },
  instructions: 'Implement the specified skill as code. Write tests. Run tests. Commit if passing.'
};
```

**Step 5 — Test.**
A separate **Testing Agent** validates the new skill:
- For knowledge skills: the Testing Agent runs the skill against synthetic scenarios and evaluates the output quality
- For code skills: the Testing Agent runs the test suite, evaluates edge cases, and checks for regressions

**Step 6 — Deploy.**
- Knowledge skills are immediately available (added to the skills directory)
- Code skills are committed to git with full change documentation
- Both types are logged in the skill creation changelog

**Step 7 — Archive.**
The skill is documented with its origin (which gap triggered it), its validation results, and its usage history. Future deals with similar needs automatically benefit.

### 6.6 Coding Agent and Testing Agent

These are specialized agent configurations for code-level system modification.

**Coding Agent:**
- Model: Claude (via Claude Code or equivalent)
- Tools: file system access, bash execution, git operations
- Skills: system architecture knowledge, coding conventions, testing patterns
- Constraints: follows existing patterns in the codebase, writes tests for all new code, commits every change
- Authority: can create files, modify non-governance code, run tests, commit to git

**Testing Agent:**
- Model: Claude
- Tools: test runner, file system access, bash execution
- Skills: testing methodology, regression detection, edge case generation
- Constraints: never modifies source code (only test code), runs full test suite after any change
- Authority: can create test files, run tests, report results, flag regressions

**Interaction pattern:**
```
Manager identifies gap
     │
     ▼
Coding Agent receives specification
     │
     ▼
Coding Agent writes code + tests
     │
     ▼
Testing Agent runs tests
     │
     ├── Pass → Coding Agent commits → Skill available
     │
     └── Fail → Coding Agent receives failure report → iterates
                (max 3 iterations, then escalate to human)
```

---

## 7. PARTNER CONSTITUTION & GOVERNANCE

### 7.1 Overview

The Partner Constitution is a structured set of instructions, constraints, and preferences that governs the behavior of the entire agent hierarchy for a deal. It is the partner's way of saying "here's how I want this deal run."

### 7.2 Constitution Structure

```typescript
interface PartnerConstitution {
  id: string;
  deal_id: string;
  partner_id: string;
  created_at: string;
  updated_at: string;

  hard_constraints: HardConstraint[];
  preferences: Preference[];
  strategic_directives: StrategicDirective[];
}

interface HardConstraint {
  id: string;
  category: 'communication' | 'negotiation' | 'approval' | 'disclosure' | 'financial';
  description: string;           // Natural language description
  rule: string;                  // Structured rule for enforcement
  consequence: 'block_and_escalate';  // Hard constraints always block and escalate
}

interface Preference {
  id: string;
  category: 'drafting' | 'negotiation' | 'communication' | 'process' | 'risk_tolerance';
  description: string;
  default_behavior: string;      // What the system does by default
  override_condition: string;    // When deviation is acceptable (with justification)
}

interface StrategicDirective {
  id: string;
  description: string;           // Natural language strategic guidance
  applies_to: string[];          // Which workstreams this affects
  priority: 'primary' | 'secondary';
}
```

### 7.3 Example Constitution

```yaml
# Constitution for Project Mercury — Partner: [Name]

hard_constraints:
  - category: communication
    description: "Nothing goes to the client without my explicit approval"
    rule: "All client_facing actions require Tier 3 approval"

  - category: negotiation
    description: "Never propose or accept an indemnification cap below 10% of deal value"
    rule: "Block any document_edit or negotiation_position_update where indemnification cap < 0.10 * deal_value"

  - category: communication
    description: "Never send email to counterparty counsel without my approval"
    rule: "All email_draft actions where recipient matches counterparty contacts require Tier 2 minimum"

  - category: disclosure
    description: "Never share DD findings with counterparty"
    rule: "Block any communication containing DD finding content directed to counterparty"

preferences:
  - category: drafting
    description: "Use true deductible basket, not tipping"
    default_behavior: "Draft with true deductible basket language"
    override_condition: "If counterparty specifically insists and we get concession on cap amount"

  - category: negotiation
    description: "Opening position on survival: 18 months. Floor: 12 months."
    default_behavior: "Propose 18-month survival. Concede to 15 if needed."
    override_condition: "Going below 12 months requires my approval (Tier 3)"

  - category: communication
    description: "Firm but professional tone in all counterparty communications"
    default_behavior: "Professional, direct, avoid adversarial language"

  - category: process
    description: "Prioritize speed over perfection"
    default_behavior: "Send documents when 90% ready rather than holding for 100%"
    override_condition: "Never send anything with known errors or inconsistencies"

strategic_directives:
  - description: "This is a competitive auction. Speed matters. Get documents out fast and clean up in later rounds."
    applies_to: [document_pipeline, email_communication]
    priority: primary

  - description: "The big issues are the earnout mechanics and R&W insurance program. Everything else is secondary."
    applies_to: [negotiation, markup_analysis]
    priority: primary

  - description: "Founders care about employee welfare. Over-index on employment protections even if it costs us something on indemnification."
    applies_to: [negotiation, document_pipeline, client_communication]
    priority: secondary
```

### 7.4 Constitution Creation: Conversational Encoding

The constitution is created through a conversation between the partner and the Manager Agent (assisted by the System Expert) at deal kickoff. The partner talks naturally about how they want the deal run, and the system structures it.

**Kickoff conversation flow:**

1. Manager presents the deal parameters extracted from the term sheet
2. Manager asks: "How do you want to approach this deal? What are the key priorities?"
3. Partner responds naturally (voice or text)
4. Manager + System Expert translate into constitutional provisions
5. Manager presents the structured constitution for confirmation
6. Partner approves, modifies, or adds provisions

**Living document:** The constitution is updated throughout the deal. The partner can modify it at any time via conversation or direct edit. Changes are version-tracked.

### 7.5 Constitution Enforcement

The constitution is loaded into the Manager Agent's system prompt on every activation. The Manager is instructed to:

- **Hard constraints:** Treat as inviolable. If any proposed action would violate a hard constraint, block it and create a Tier 3 escalation. Never override.
- **Preferences:** Treat as defaults. Follow unless there's a justified reason to deviate. If deviating, explain why in the action chain.
- **Strategic directives:** Use as interpretive guidance for all decisions. When two courses of action are equally valid, the directive resolves the tie.

The consequence resolver also checks action chains against the constitution before routing to the approval queue. Any action that violates a hard constraint is automatically escalated to Tier 3 regardless of the approval policy.

---

## 8. PRECEDENT INTELLIGENCE PIPELINE

### 8.1 Overview

The precedent database provides data-driven intelligence about deal terms, provision formulations, and negotiation patterns. It must answer: "What's market for this provision in deals like mine?" and "Give me the best language for this provision given my client's position."

The core schema for provision storage is defined in SPEC.md v0.1 Section 5.1 (`provision_types`, `provision_variants`, `provision_formulations`). This section specifies the ingestion, quality scoring, and retrieval pipeline.

### 8.2 EDGAR Ingestion Pipeline

**Automated pipeline to build the precedent database from public filings:**

```
EDGAR Search → Download Exhibits → Extract Text → Segment Provisions
     → Classify Provisions → Score Quality → Embed → Store
```

**Step 1: Discovery**
```typescript
// packages/integrations/src/precedent/edgar-discovery.ts

interface EdgarSearchParams {
  form_types: string[];           // ['8-K', 'DEF 14A', 'S-4']
  date_range: { from: string; to: string };
  keywords: string[];             // ['stock purchase agreement', 'merger agreement']
  size_filter?: { min: number; max: number };  // Deal value range
}

// Use EDGAR EFTS (full-text search) API
// Returns list of filings with exhibit URLs
```

**Step 2: Extraction and Decomposition**
```typescript
// Process each agreement exhibit:
// 1. Download exhibit (HTML or plain text from EDGAR)
// 2. Convert to clean text
// 3. Run provision segmenter (Layer 2 API call) to break into provisions
// 4. Classify each provision by type and variant (Layer 2 API call)
```

**Step 3: Quality Scoring (Automated Signals)**

Each provision receives a composite quality score based on automated signals. No manual annotation required.

```typescript
interface ProvisionQualityScore {
  composite: number;              // 0.0-1.0 weighted average

  // Individual signals
  firm_tier: number;              // 0.0-1.0 based on firm identification
  deal_size: number;              // 0.0-1.0 based on transaction value
  recency: number;                // 0.0-1.0 based on filing date (decay function)
  structural_quality: number;     // 0.0-1.0 based on drafting quality checks
  corpus_alignment: number;       // 0.0-1.0 based on similarity to corpus center
  negotiation_survival: number;   // 0.0-1.0 if we can detect it survived negotiation
}
```

**Signal: Firm Tier**
```typescript
const firmTiers: Record<string, number> = {
  // Tier 1: 1.0
  'Wachtell': 1.0, 'Sullivan & Cromwell': 1.0, 'Cravath': 1.0,
  'Simpson Thacher': 1.0, 'Skadden': 1.0,
  // Tier 2: 0.85
  'Latham': 0.85, 'Kirkland': 0.85, 'Davis Polk': 0.85,
  'Cleary': 0.85, 'Debevoise': 0.85, 'Paul Weiss': 0.85,
  // Tier 3: 0.70
  // Other Am Law 50
  // Tier 4: 0.50 (regional/small firms)
  // Unknown: 0.40
};
// Firm identified from signature blocks or filing metadata
```

**Signal: Structural Quality**
```typescript
// Automated structural quality checks (Layer 2 single-turn API call):
// - Are defined terms used consistently throughout?
// - Are cross-references valid (do referenced sections exist)?
// - Is the syntax unambiguous?
// - Are standard drafting conventions followed?
// - Is the provision complete (doesn't trail off or reference missing schedules)?
// Score: percentage of checks passed
```

**Signal: Corpus Alignment**
```typescript
// After building an initial corpus, compute centroid embedding for each
// provision type/variant combination. Score each provision by cosine
// similarity to its type/variant centroid.
// High alignment = standard, well-trodden language
// Low alignment = outlier (innovative or problematic — disambiguate with other signals)
```

**Signal: Paired Evaluation (Batch Process)**
```typescript
// For each provision type with 10+ formulations:
// 1. Sample 20 pairs
// 2. For each pair, single-turn API call:
//    "Which of these two [provision type] formulations is better drafted
//     and why? Consider clarity, completeness, enforceability."
// 3. Build relative ranking from pairwise comparisons (Elo-style)
// 4. Normalize to 0.0-1.0 score
// This is a batch process run periodically, not on every ingestion
```

**Step 4: Embedding and Storage**
```typescript
// Generate vector embedding (Voyage or OpenAI as configured)
// Store in provision_formulations table with all quality metadata
// Update IVFFlat index for similarity search
```

### 8.3 Quality-Weighted Retrieval

When the system retrieves precedent formulations (for drafting, for what's-market analysis, for markup evaluation), results are ranked by a combination of semantic similarity and quality score:

```typescript
interface PrecedentQuery {
  provision_type: string;
  variant?: string;
  deal_profile: {
    deal_size_range: string;
    industry: string;
    buyer_type: string;
    deal_structure: string;
  };
  query_text?: string;            // Optional natural language query
  min_quality: number;            // Minimum quality score (default 0.5)
  max_results: number;            // Default 10
}

// Retrieval scoring:
// final_score = (0.6 * semantic_similarity) + (0.4 * quality_score)
// Filtered by: deal_profile match, min_quality threshold
// Boosted by: recency, deal_size proximity, industry match
```

### 8.4 Dynamic Quality Learning

As the system is used, quality scores are updated based on usage and feedback:

- **Positive signal:** Agent uses a formulation and the human approves without modification. Quality score increases.
- **Negative signal:** Agent uses a formulation and the human rewrites it. Quality score decreases.
- **Strong positive:** A formulation is used across multiple deals by multiple partners. Quality score increases significantly.
- **Deprecation:** A formulation is never selected by the retrieval system. After 6 months of non-use, it's flagged for review.

```typescript
interface QualityFeedbackEvent {
  formulation_id: string;
  event_type: 'used_approved' | 'used_modified' | 'used_rejected' | 'not_selected';
  deal_id: string;
  partner_id: string;
  modification_delta?: string;    // What the partner changed
  context: {                      // Context in which it was used/evaluated
    deal_profile: object;
    task_type: string;
  };
}
```

---

## 9. GAP COVERAGE: NEW WORKFLOWS

These workflows are missing from SPEC.md v0.1 and must be added. Each section defines the data model, the workflow, and how it integrates with the event propagation backbone.

### 9.1 Disclosure Schedule Management

**The problem:** Disclosure schedules are the most labor-intensive part of most deals and the most common bottleneck to signing. They require client input, cross-reference against DD findings, and must stay synchronized with the SPA reps as they evolve through negotiation.

**New tables:**

```sql
-- ============================================
-- DISCLOSURE SCHEDULES
-- ============================================
CREATE TABLE disclosure_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  checklist_item_id UUID REFERENCES checklist_items(id),  -- The SPA checklist item

  -- Schedule identification
  schedule_number TEXT NOT NULL,          -- 'Schedule 3.15(a)'
  schedule_title TEXT NOT NULL,           -- 'Material Contracts'
  related_rep_section TEXT NOT NULL,      -- 'Section 3.15(a)' — the SPA rep this schedules against
  related_rep_text TEXT,                  -- Current text of the rep

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  -- 'pending', 'questionnaire_sent', 'client_responding', 'partially_populated',
  -- 'populated', 'cross_referenced', 'attorney_reviewed', 'final'

  -- Content
  entries JSONB DEFAULT '[]',            -- Array of DisclosureEntry objects
  questionnaire_sent_at TIMESTAMPTZ,
  client_response_received_at TIMESTAMPTZ,

  -- Cross-reference tracking
  last_cross_reference_check TIMESTAMPTZ,
  cross_reference_issues JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE disclosure_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES disclosure_schedules(id) ON DELETE CASCADE,

  -- Entry content
  entry_text TEXT NOT NULL,
  entry_type TEXT,                       -- 'client_disclosed', 'dd_finding', 'system_generated'

  -- Source
  source_dd_finding_id UUID REFERENCES dd_findings(id),
  source_client_response TEXT,
  source_email_id UUID REFERENCES deal_emails(id),

  -- Status
  status TEXT DEFAULT 'draft',           -- 'draft', 'confirmed', 'removed'
  confirmed_by UUID REFERENCES users(id),

  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Workflow:**
1. When SPA reps are drafted (or updated), the system auto-generates a disclosure schedule record for every rep that contains "except as set forth in Schedule X" language
2. A disclosure questionnaire is generated from the reps (Layer 2 API call: rep text → plain-language question for the client)
3. The questionnaire is sent to the client (via email or client portal)
4. Client responses are parsed and mapped to schedule entries
5. DD findings are automatically cross-referenced against schedules and pre-populate entries
6. When reps change in negotiation (counterparty markup), schedules are re-evaluated:
   - Rep narrowed → some entries may no longer be needed (flagged for review)
   - Rep broadened → new disclosures may be required (flagged for client follow-up)
   - Rep deleted → schedule can be removed
7. Gap detection: if a DD finding exists but no corresponding schedule entry, the system flags it

**Events emitted:**
- `disclosure.schedule_updated` — when entries are added, modified, or removed
- `disclosure.gap_identified` — when a DD finding lacks a corresponding disclosure
- `disclosure.client_response_received` — when client provides disclosure information
- `disclosure.cross_reference_broken` — when a rep change invalidates a schedule reference

### 9.2 Negotiation State Tracker

**The problem:** Negotiation positions are currently scattered across email threads, markup analyses, and action items. There is no unified view of where each provision stands in the negotiation.

**New table:**

```sql
CREATE TABLE negotiation_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  provision_type TEXT NOT NULL,           -- 'indemnification.basket.type'
  provision_label TEXT NOT NULL,          -- Human-readable: 'Indemnification Basket Type'

  -- Current state
  our_current_position TEXT,              -- Our last stated position
  our_current_position_detail JSONB,      -- Structured: {value: 'true_deductible', threshold: '$500K'}
  their_current_position TEXT,
  their_current_position_detail JSONB,

  -- History
  position_history JSONB DEFAULT '[]',   -- Array of {date, party, position, source_type, source_id}

  -- Status
  status TEXT DEFAULT 'open',             -- 'open', 'agreed', 'impasse', 'deferred', 'withdrawn'
  agreed_position TEXT,                   -- Final agreed position (when status = 'agreed')
  agreed_position_detail JSONB,

  -- Significance
  significance INTEGER DEFAULT 3,         -- 1-5, how important is this provision
  financial_impact BOOLEAN DEFAULT false,
  constitutional_constraint BOOLEAN DEFAULT false,  -- Is this governed by a hard constraint?

  -- Source tracking
  last_updated_from TEXT,                 -- 'markup_round_2', 'email_2026-02-05', 'call_notes'
  last_updated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Integration with event backbone:**
- `email.position_extracted` → updates `negotiation_positions` for affected provisions
- `document.markup_analyzed` → updates positions based on markup changes
- `negotiation.position_updated` → triggers consequence resolver for cascading impacts
- `negotiation.impasse_detected` → escalates to partner (Tier 3)
- Manager Agent uses negotiation state tracker for strategic synthesis and briefings

### 9.3 Third-Party Management

**New table:**

```sql
CREATE TABLE deal_third_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,

  -- Identity
  role TEXT NOT NULL,                     -- 'escrow_agent', 'rw_insurance_broker', 'lenders_counsel',
                                          -- 'accountant_qoe', 'environmental_consultant', 'title_company',
                                          -- 'transfer_agent', 'tax_advisor', 'ip_counsel'
  firm_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,

  -- Deliverables
  deliverables JSONB DEFAULT '[]',       -- Array of {description, due_date, status, checklist_item_id}

  -- Communication tracking
  last_communication_at TIMESTAMPTZ,
  outstanding_items TEXT[],

  -- Status
  status TEXT DEFAULT 'active',           -- 'active', 'pending_engagement', 'completed', 'disengaged'

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Events:** `third_party.deliverable_received`, `third_party.deliverable_overdue`, `third_party.communication_received`

### 9.4 Client Management

**New tables:**

```sql
CREATE TABLE client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT,                              -- 'principal', 'cfo', 'general_counsel', 'board_member'
  is_primary BOOLEAN DEFAULT false,
  communication_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE client_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  client_contact_id UUID REFERENCES client_contacts(id),

  description TEXT NOT NULL,
  detail TEXT,
  category TEXT,                          -- 'disclosure', 'document_review', 'board_action',
                                          -- 'financial_data', 'third_party_coordination', 'signature'
  due_date DATE,
  priority TEXT DEFAULT 'normal',

  -- Dependencies
  blocks_checklist_items UUID[],          -- Checklist items blocked until this is done
  related_disclosure_schedule_id UUID,

  -- Status
  status TEXT DEFAULT 'pending',          -- 'pending', 'sent', 'acknowledged', 'in_progress', 'completed', 'overdue'
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Follow-up tracking
  follow_up_count INTEGER DEFAULT 0,
  last_follow_up_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE client_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  client_contact_id UUID REFERENCES client_contacts(id),

  type TEXT NOT NULL,                     -- 'status_update', 'action_item_request', 'decision_memo',
                                          -- 'dd_notification', 'closing_preparation', 'general'
  subject TEXT NOT NULL,
  body TEXT NOT NULL,

  -- Approval
  status TEXT DEFAULT 'draft',            -- 'draft', 'approved', 'sent'
  approved_by UUID REFERENCES users(id),
  sent_at TIMESTAMPTZ,

  -- Source
  generated_by TEXT DEFAULT 'system',     -- 'system', 'manual'
  trigger_event_id UUID,                  -- Propagation event that triggered this

  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Automated client communication types:**
- Weekly status update (auto-generated from deal state, requires Tier 3 approval per default constitution)
- Action item requests (generated when client deliverables are identified)
- Decision memos (when the partner needs client input on a substantive position)
- DD notification (when a significant finding requires client awareness)
- Closing preparation (instructions for closing deliverables, signatures, etc.)

### 9.5 Closing Mechanics

**New tables:**

```sql
CREATE TABLE closing_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,

  status TEXT DEFAULT 'draft',            -- 'draft', 'active', 'closing_imminent', 'closed', 'post_closing'

  -- Pre-closing
  target_closing_date DATE,
  conditions_satisfied INTEGER DEFAULT 0,
  conditions_total INTEGER DEFAULT 0,
  conditions_waived INTEGER DEFAULT 0,

  -- Funds flow
  funds_flow JSONB,                       -- Structured funds flow memo data
  wire_instructions_confirmed BOOLEAN DEFAULT false,

  -- Signature tracking
  signature_pages_collected JSONB DEFAULT '{}',
  signature_pages_released BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE closing_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_checklist_id UUID REFERENCES closing_checklists(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,

  description TEXT NOT NULL,
  condition_type TEXT NOT NULL,           -- 'mutual', 'buyer', 'seller'
  category TEXT,                          -- 'accuracy_of_reps', 'compliance_with_covenants',
                                          -- 'regulatory', 'third_party_consent', 'financing',
                                          -- 'no_mae', 'legal_opinion', 'certificate'
  responsible_party TEXT,                 -- 'us', 'counterparty', 'third_party', 'regulatory'

  status TEXT DEFAULT 'pending',          -- 'pending', 'satisfied', 'waived', 'failed'
  satisfied_at TIMESTAMPTZ,
  evidence TEXT,                          -- Description of how condition was satisfied
  evidence_document_id UUID,

  blocks_closing BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE closing_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_checklist_id UUID REFERENCES closing_checklists(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,

  description TEXT NOT NULL,
  deliverable_type TEXT,                  -- 'certificate', 'opinion', 'signature_page',
                                          -- 'payoff_letter', 'consent', 'filing', 'resolution'
  responsible_party TEXT NOT NULL,        -- 'us', 'counterparty', 'client', 'third_party'
  due_date DATE,

  status TEXT DEFAULT 'pending',          -- 'pending', 'received', 'reviewed', 'approved', 'waived'
  received_at TIMESTAMPTZ,
  document_version_id UUID,
  drive_file_id TEXT,

  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- POST-CLOSING OBLIGATIONS
-- ============================================
CREATE TABLE post_closing_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,

  description TEXT NOT NULL,
  obligation_type TEXT,                   -- 'working_capital_trueup', 'earnout_calculation',
                                          -- 'tsa_performance', 'retention_period', 'regulatory_filing',
                                          -- 'escrow_release', 'holdback_release', 'non_compete_period'
  responsible_party TEXT NOT NULL,
  deadline DATE,
  recurring BOOLEAN DEFAULT false,
  recurrence_interval TEXT,              -- 'monthly', 'quarterly', 'annually'

  status TEXT DEFAULT 'pending',          -- 'pending', 'in_progress', 'completed', 'overdue', 'disputed'
  completed_at TIMESTAMPTZ,

  -- Financial
  estimated_value NUMERIC,
  actual_value NUMERIC,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Closing workflow:**
1. When deal status changes to 'closing', the system generates the closing checklist from the SPA's conditions to closing (Layer 2 API call parsing the conditions article)
2. Closing deliverables are generated from the SPA and ancillary agreements
3. Conditions are tracked with evidence of satisfaction
4. Funds flow memo is auto-generated from deal parameters, purchase price mechanics, escrow amounts, and expense allocations
5. Signature page tracking: who needs to sign what, collected vs. outstanding
6. Closing readiness dashboard: all conditions, all deliverables, traffic light status
7. Post-closing obligations are generated from the executed agreements

### 9.6 Negotiation Strategy Module

**New table:**

```sql
CREATE TABLE negotiation_roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,

  -- Strategy
  overall_strategy TEXT,                  -- 'aggressive', 'collaborative', 'defensive', 'expedient'
  strategy_rationale TEXT,

  -- Provision-level plans
  provision_plans JSONB DEFAULT '[]',
  -- Array of: {
  --   provision_type, significance, our_target, our_opening, our_floor,
  --   predicted_counterparty_position, concession_sequence,
  --   trade_opportunities: [{give_provision, get_provision}],
  --   status: 'planned' | 'in_progress' | 'resolved'
  -- }

  -- Dynamic updates
  round_summaries JSONB DEFAULT '[]',    -- Summary of each negotiation round
  strategy_adjustments JSONB DEFAULT '[]', -- Log of strategy changes and why

  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Integration:** The Manager Agent creates the initial negotiation roadmap at deal kickoff based on deal parameters, precedent data, and the partner's constitution. The roadmap is updated after each negotiation round. The Manager uses it for all strategic recommendations.

### 9.7 Knowledge Capture

**New table:**

```sql
CREATE TABLE deal_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id),

  knowledge_type TEXT NOT NULL,           -- 'negotiation_outcome', 'process_learning',
                                          -- 'attorney_preference', 'counterparty_pattern',
                                          -- 'deal_post_mortem', 'provision_outcome'

  content JSONB NOT NULL,
  -- For negotiation_outcome: {provision_type, our_opening, their_opening, final, rounds, concession_pattern}
  -- For process_learning: {phase, observation, recommendation}
  -- For attorney_preference: {attorney_id, preference_type, preference_value, confidence, sample_size}
  -- For counterparty_pattern: {firm, counsel, pattern_type, pattern_detail}
  -- For deal_post_mortem: {what_worked, what_didnt, key_learnings}
  -- For provision_outcome: {provision_type, formulation_used, accepted, modified, partner_version}

  -- Quality
  confidence DECIMAL(3,2),
  sample_size INTEGER DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Automated knowledge capture:** After each deal closes (or is terminated), the system auto-generates knowledge entries:
- Negotiation outcomes for every provision that was negotiated
- Usage/acceptance data for every precedent formulation that was used
- Process timeline data (how long each phase took, what caused delays)

**Post-mortem prompt:** The system invites the partner to do a brief conversational debrief (optional). The knowledge encoding agent captures the partner's reflections and structures them as knowledge entries.

---

## 10. OBSERVER & SELF-IMPROVEMENT SYSTEM

### 10.1 Overview

The Observer is a separate agent system that watches the deal simulation (or live operation) unfold, identifies weaknesses, implements fixes, and validates improvements — all during operation, not between runs.

### 10.2 Observer Agent Architecture

The Observer operates independently from the deal agent hierarchy. It does not participate in deal execution.

**Access:**
- All events in the `propagation_events` table
- All action chains and their approval outcomes
- The approval queue and all human decisions (including rejections and modifications)
- All email traffic
- Token consumption data for every agent activation
- Timing data for every operation
- The human tester's feedback events
- Git history of all changes

**Authority:**
- Can modify any file in the codebase: skills, prompts, code, schema, configuration
- Every modification is a git commit with a detailed message
- Cannot force-push or rebase away commits
- Must request human approval (via a separate approval channel) to modify:
  - The Partner Constitution structure (not deal-specific content, but the enforcement mechanism)
  - The approval tier framework (the tier definitions themselves)
  - The Observer's own evaluation criteria
  - This list of human-approval-required modifications

### 10.3 Evaluation Criteria Framework

The Observer evaluates against structured criteria organized by category:

**Accuracy Criteria:**
```typescript
interface AccuracyCriteria {
  // Did the system produce correct outputs?
  term_sheet_extraction_accuracy: number;      // % of parameters correctly extracted
  checklist_completeness: number;              // % of required items generated
  markup_analysis_completeness: number;        // % of changes correctly identified
  dd_finding_accuracy: number;                 // % of seeded issues caught
  cross_reference_validity: number;            // % of cross-references that are correct
  defined_term_consistency: number;            // % of defined terms used consistently
  disclosure_schedule_completeness: number;    // % of required disclosures identified
}
```

**Efficiency Criteria:**
```typescript
interface EfficiencyCriteria {
  tokens_per_action_chain: number;             // Average token cost to generate an action chain
  redundant_api_calls: number;                 // API calls that produced no new information
  agent_activation_efficiency: number;         // % of agent activations that produced actionable output
  time_to_process_email: number;               // Seconds from receipt to classification
  time_to_generate_action_chain: number;       // Seconds from event to action chain
  unnecessary_agent_activations: number;       // Times agent was invoked but Layer 1-2 would have sufficed
}
```

**Quality Criteria:**
```typescript
interface QualityCriteria {
  human_modification_rate: number;             // % of Tier 2 actions the human modifies
  human_rejection_rate: number;                // % of Tier 2 actions the human rejects
  provision_drafting_quality: number;          // Assessed by paired evaluation against gold standard
  email_communication_appropriateness: number; // Tone, completeness, accuracy
  approval_queue_clarity: number;              // Are items clear enough for fast decisions?
  strategic_recommendation_quality: number;    // Assessed by human feedback on agent recommendations
}
```

**Coverage Criteria:**
```typescript
interface CoverageCriteria {
  deal_phases_handled: string[];               // Which phases completed without manual intervention
  workflow_gaps: string[];                      // Points where the system stalled
  missing_event_types: string[];               // Events that should have been emitted but weren't
  missing_consequence_maps: string[];          // Consequences that should have been triggered but weren't
  unhandled_email_types: string[];             // Emails that couldn't be classified
}
```

**Coordination Criteria:**
```typescript
interface CoordinationCriteria {
  propagation_accuracy: number;                // % of events that triggered correct consequences
  cross_workstream_detection: number;          // % of cross-workstream impacts correctly identified
  disclosure_schedule_sync: number;            // Are schedules in sync with current reps?
  negotiation_state_accuracy: number;          // Does the tracker reflect actual positions?
  timeline_accuracy: number;                   // Do timeline projections match actual progress?
}
```

### 10.4 Improvement Loop

```
Observer monitors continuously
         │
         ▼
┌──────────────────┐
│ Detect Issue     │  Criteria threshold violated or pattern identified
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Diagnose Cause   │  Analyze prompts, code, skills, data flow
└────────┬─────────┘  Access actual API call inputs/outputs
         │
         ▼
┌──────────────────┐
│ Prescribe Fix    │  Define specific change needed
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Implement        │  Modify skill / prompt / code
└────────┬─────────┘  Via Coding Agent if code change needed
         │
         ▼
┌──────────────────┐
│ Test             │  Run specific test case + regression suite
└────────┬─────────┘  Via Testing Agent
         │
    ┌────┴────┐
    │         │
  Pass      Fail
    │         │
    ▼         ▼
┌────────┐ ┌──────────┐
│ Commit │ │ Iterate  │  (max 3 iterations)
│ Deploy │ │ or       │
│ Notify │ │ Escalate │
└────────┘ └──────────┘
         │
         ▼
┌──────────────────┐
│ Verify           │  Watch for recurrence
└──────────────────┘
```

### 10.5 Observer Notification Channel

The Observer communicates via a separate notification channel from the deal approval queue:

```
┌─────────────────────────────────────────────┐
│ 🔧 SYSTEM IMPROVEMENT  │  Observer          │
│                                             │
│ Issue: Markup analyzer missed knowledge     │
│ qualifier change in defined terms            │
│                                             │
│ Diagnosis: Prompt doesn't instruct model    │
│ to check qualifier changes in definitions   │
│                                             │
│ Fix: Updated markup-analysis skill with     │
│ specific instruction for qualifier tracking │
│                                             │
│ Test: Re-ran against 5 markup samples.      │
│ All qualifier changes now detected.         │
│                                             │
│ Commit: abc123f                             │
│                                             │
│           [View Diff]  [Revert]             │
└─────────────────────────────────────────────┘
```

The human can review changes asynchronously without blocking the improvement process.

---

## 11. SIMULATION FRAMEWORK

### 11.1 Simulation Architecture

```
┌─────────────────────────────────────────────────┐
│                 SIMULATION                       │
│                                                  │
│  ┌──────────────┐         ┌──────────────┐      │
│  │  SELLER SIDE │  Email  │  BUYER SIDE  │      │
│  │              │◄───────►│              │      │
│  │  Partner:    │         │  Partner:    │      │
│  │   Agent      │         │   HUMAN      │      │
│  │  Manager:    │         │  Manager:    │      │
│  │   Agent      │         │   Agent      │      │
│  │  IT/Expert:  │         │  IT/Expert:  │      │
│  │   Agent      │         │   Agent      │      │
│  │              │         │              │      │
│  │  Database    │         │  Database    │      │
│  │  Precedent   │         │  Precedent   │      │
│  │  Skills      │         │  Skills      │      │
│  └──────────────┘         └──────────────┘      │
│                                                  │
│  ┌────────────────┐   ┌──────────────────┐      │
│  │ CLIENT AGENTS  │   │    OBSERVER      │      │
│  │                │   │                  │      │
│  │ Seller Client  │   │  Monitors both   │      │
│  │ Buyer Client   │   │  Implements      │      │
│  │                │   │  improvements    │      │
│  └────────────────┘   └──────────────────┘      │
│                                                  │
│  ┌──────────────────────────────────────┐       │
│  │         THIRD-PARTY AGENTS           │       │
│  │  Escrow Agent  │  R&W Broker  │  ... │       │
│  └──────────────────────────────────────┘       │
│                                                  │
│  ┌──────────────────────────────────────┐       │
│  │         SIMULATION CLOCK             │       │
│  │  Controls time progression           │       │
│  └──────────────────────────────────────┘       │
└─────────────────────────────────────────────────┘
```

### 11.2 Simulation Components

**Two Platform Instances:** Separate deployments of the full system with independent databases, precedent stores, and agent configurations. They share nothing except the email channel.

**Email System:** Real email addresses (e.g., two Gmail accounts or a custom domain with mailboxes). Emails actually send and receive with attachments. This ensures the email pipeline is tested under realistic conditions.

**Client Agents:** Autonomous agents simulating business principals. Configured with:
- Deal objectives and priorities
- Financial constraints
- Personality traits (responsive vs. slow, detailed vs. terse, anxious vs. confident)
- Knowledge about the target company (for seller client) or acquisition thesis (for buyer client)
- Intentional imperfections: delayed responses, incomplete information, occasional contradictions

**Third-Party Agents:** Lightweight agents simulating escrow agents, R&W brokers, lender's counsel, etc. They receive instructions via email, produce standard deliverables, and respond to comments with realistic delays.

**Simulation Clock:** Controls time progression. Options:
- **Real-time:** Events unfold at actual speed (for stress-testing timing logic)
- **Compressed:** Each simulated day takes N minutes of real time
- **Skip-ahead:** Jump past waiting periods to the next significant event

**Observer:** Has visibility into both sides. Evaluates the simulation against criteria. Implements improvements in real-time.

### 11.3 Seeded Scenario Design

**The Target Company (for initial simulation):**

A mid-market technology company. Approximate profile:
- Revenue: $120M
- EBITDA: $25M
- Employees: 400
- Industry: Enterprise SaaS
- Jurisdiction: Delaware

**Seeded issues (known to Observer for evaluation, discovered through DD):**
1. Material contract with key customer ($18M revenue, 15% of total) contains a change-of-control provision triggered by any change in 50%+ voting power — 30-day cure period
2. Pending employment misclassification claim: 25 independent contractors who likely should be employees. Estimated exposure: $2-4M
3. Key patent application rejected on first office action. Patent counsel believes claims can be narrowed and re-filed, but uncertainty exists
4. Environmental remediation from 2019 acquisition. Phase II assessment recommended but not yet conducted. Estimated cost if required: $500K-$2M
5. Founder CEO has undisclosed side consulting arrangement that creates potential conflict of interest
6. Target's financial statements use an aggressive revenue recognition policy for multi-year contracts. Auditor noted this as a "key audit matter" but did not qualify the opinion
7. Two employees have non-compete agreements from prior employers that may be triggered by the acquisition
8. Target is party to a joint development agreement that requires consent for assignment, and the counterparty has been unresponsive

**VDR Documents (50-100 seeded):**
- Corporate: charter, bylaws, board minutes (last 3 years), shareholder agreement
- Material contracts: 15 customer contracts (including the problematic CoC one), 8 vendor contracts, 3 partnership agreements (including the JDA)
- Financial: 3 years of audited financials, interim financials, management projections
- Employment: employee census, offer letter templates, the 25 contractor agreements, 2 employment agreements with non-competes, executive employment agreements
- IP: patent portfolio (12 patents, 3 pending applications including the rejected one), trademark registrations, software license agreements
- Real estate: 2 office leases
- Environmental: Phase I assessment from 2019 acquisition, remediation status memo
- Litigation: pending misclassification claim file, demand letter, counsel assessment
- Insurance: D&O policy, commercial general liability, cyber insurance

**Term Sheet:**
- Stock purchase: $150M enterprise value
- Consideration: $130M cash + $20M earnout (based on revenue targets over 2 years)
- Escrow: $7.5M (5% of cash consideration) for 18 months
- R&W insurance: buyer to obtain, with $1.5M retention
- Key employee retention: founder CEO to sign 2-year employment agreement with non-compete
- Working capital adjustment: peg methodology, to be agreed
- HSR filing: required
- Expected timeline: 60 days to signing, 30 days to closing (after HSR)

**Client Instructions (Seller):**
```
From: [Founder CEO]
To: [Seller's Counsel]

We've agreed to terms with [Buyer]. Attached is the term sheet.

Key things for our team:
- We want a clean exit. No long-tail indemnification beyond the escrow.
- The earnout is important to us — it could be $20M. We need reasonable
  protections on how they run the business during the earnout period.
- My non-compete can't be more than 2 years or extend beyond the
  company's current markets.
- We promised our employees nobody gets laid off for at least a year.
  Please make sure this gets into the deal.
- The consultants are fine — they've always been independent.
  [Note: this is incorrect and creates a DD issue]
- We want to move fast. The buyer is motivated and we don't want to
  give them time to find reasons to reprice.
```

**Client Instructions (Buyer):**
```
From: [PE Fund Partner]
To: [Buyer's Counsel]

We're acquiring [Target]. Term sheet attached.

Priorities:
- Strong indemnification. We got burned on the last deal when a rep
  turned out to be wrong and we had no recourse. I want a true deductible
  basket, 15% cap on general reps, and uncapped fundamental reps.
- The R&W policy is important but it's not a replacement for contractual
  protection. We want meaningful retention.
- The earnout scares me. Revenue targets over 2 years = lots of ways
  they can game it. We need tight covenants on business operation during
  the earnout period and clear accounting methodology.
- Full DD. Don't cut corners. I want every contract reviewed.
- The financial statements look aggressive to me. Dig into revenue
  recognition methodology in the QofE.
- We need this closed in 90 days. Our fund commitment expires.
```

### 11.4 Simulation Execution Protocol

**Phase 0: Setup (Human)**
1. Deploy two platform instances
2. Configure email addresses
3. Seed VDR documents, term sheet, precedent databases
4. Seed client instruction emails into each side's inbox
5. Configure simulation clock
6. Start Observer

**Phase 1: Intake (Agents)**
Both sides process their client instruction emails, extract deal parameters from the term sheet, create deals in their respective systems, and generate checklists.

**Phase 2: First Draft (Seller agents)**
Seller side produces the initial draft of the SPA and ancillary agreements. Seller Partner Agent reviews and approves. Sends to buyer via email.

**Phase 3: DD and Markup (Buyer side, parallel)**
Buyer side receives draft, runs DD on VDR documents, prepares markup of SPA, generates disclosure schedule questionnaire for buyer client.

**Phase 4: Negotiation Rounds (Both sides, 3-4 rounds)**
Markup exchanges via email. Each side analyzes counterparty markup, updates negotiation positions, prepares counter-markup. Human tester participates on buyer side.

**Phase 5: Disclosure Schedules (Both sides)**
Seller client agent populates disclosure schedules. Cross-referencing against DD findings. Gap detection. Follow-up requests.

**Phase 6: Third-Party Coordination (Both sides)**
Escrow agreement negotiation with escrow agent. R&W insurance application and binder. Employment agreements for key employees.

**Phase 7: Closing Preparation (Both sides)**
Closing checklist generation. Condition satisfaction tracking. Funds flow preparation. Signature page collection.

**Phase 8: Closing (Both sides)**
Final condition confirmation. Closing call simulation. Signature page release. Funds flow execution.

**Phase 9: Post-Closing (Both sides)**
Working capital true-up. Earnout period commencement. Obligation tracking.

### 11.5 Simulation Evaluation

After each simulation run, the Observer produces a comprehensive evaluation report:

```typescript
interface SimulationReport {
  run_id: string;
  scenario: string;
  duration_simulated_days: number;
  duration_real_hours: number;

  // Quantitative metrics
  accuracy_scores: AccuracyCriteria;
  efficiency_scores: EfficiencyCriteria;
  quality_scores: QualityCriteria;
  coverage_scores: CoverageCriteria;
  coordination_scores: CoordinationCriteria;

  // Qualitative assessment
  phases_completed: string[];
  phases_stalled: string[];
  manual_interventions_required: number;
  human_modification_rate: number;

  // Cost
  total_token_cost: number;
  cost_by_agent: Record<string, number>;
  cost_by_phase: Record<string, number>;

  // Improvements made during run
  observer_changes: ObserverChange[];

  // Gaps identified
  remaining_gaps: string[];

  // Recommendations for next run
  recommendations: string[];
}
```

---

## 12. KNOWLEDGE & LEARNING PIPELINE

### 12.1 Feedback Event Capture

Every human action generates a feedback event:

```typescript
interface FeedbackEvent {
  id: string;
  deal_id: string;
  user_id: string;

  // What happened
  event_type: 'approved' | 'modified' | 'rejected' | 'escalated' | 'annotation';
  target_type: string;                    // 'action_chain', 'proposed_action', 'document_version'
  target_id: string;

  // The original system output
  original_output: Record<string, any>;

  // The human's modification (if any)
  modified_output?: Record<string, any>;
  modification_delta?: Record<string, any>;

  // Optional human annotation
  annotation?: string;                    // Brief note on why they changed it

  // Context at the time of the decision
  agent_context_summary: string;          // What the agent had when it produced the output
  agent_confidence: number;

  created_at: string;
}
```

**Frictionless annotation:** After any modification, a small prompt appears: "Brief note on why? (optional)" with a text field. Not required. Even one-word annotations are valuable.

### 12.2 Learning Pipeline

Feedback events are processed by a background pipeline that:

**Updates precedent quality scores:**
- Formulation used and approved → increase quality score
- Formulation used and rewritten → decrease quality score, store the partner's version as a new formulation with high quality score

**Updates adaptive skills:**
- Pattern detection: if the same type of modification appears 3+ times across different actions, generate an adaptive skill
- Example: "Partner consistently changes 'shall use commercially reasonable efforts' to 'shall use reasonable best efforts' in employment-related provisions" → adaptive skill for this partner's efforts standard preference in employment context

**Updates scenario test suite:**
- Every rejected or heavily modified action becomes a new test case
- The test case includes: the input context, the system's output, the human's modification, and (if available) the annotation explaining why

**Feeds the Observer:**
- Systematic patterns in feedback events trigger Observer evaluation
- If modification rate for a specific action type exceeds 50%, the Observer investigates the underlying skill or prompt

### 12.3 Conversational Knowledge Encoding

For expert knowledge that doesn't arise from feedback events, the system provides a conversational encoding interface:

```
System: "For a stock purchase agreement in a PE acquisition of a mid-market
         tech company, what are the first 5 provisions you'd focus on in
         your markup review?"

Partner: "Always start with the indemnification structure — basket, cap,
          survival. Then the rep qualifications — knowledge, materiality.
          Then the closing conditions — especially MAC definition. Then
          the earnout mechanics if there is one. And the non-compete scope."

System: [Generates structured skill from this response]

System: "Here are three versions of a survival period provision from our
         precedent database. Which is best and why?"

[Shows three formulations]

Partner: "The second one. It clearly separates general rep survival from
          fundamental rep survival, and the language about 'the later of
          (x) the date that is 18 months following the Closing Date and
          (y) 60 days following written notice' is better because it gives
          the buyer a tail period after discovery."

System: [Updates quality scores, creates skill annotation]
```

This interface is available at any time through the chat interface and is specifically prompted during deal onboarding and post-deal debrief.

---

## 13. DATABASE SCHEMA ADDITIONS

All new tables are listed in their respective sections above. Summary of additions to SPEC.md v0.1 Section 5:

**New tables:**
- `propagation_events` (Section 3.3)
- `action_chains` (Section 3.6)
- `proposed_actions` (Section 3.6)
- `approval_policies` (Section 4.2)
- `agent_activations` (Section 5.7)
- `disclosure_schedules` (Section 9.1)
- `disclosure_entries` (Section 9.1)
- `negotiation_positions` (Section 9.2)
- `deal_third_parties` (Section 9.3)
- `client_contacts` (Section 9.4)
- `client_action_items` (Section 9.4)
- `client_communications` (Section 9.4)
- `closing_checklists` (Section 9.5)
- `closing_conditions` (Section 9.5)
- `closing_deliverables` (Section 9.5)
- `post_closing_obligations` (Section 9.5)
- `negotiation_roadmaps` (Section 9.6)
- `deal_knowledge` (Section 9.7)
- `feedback_events` (Section 12.1)
- `skills_registry` (tracks all skills with metadata)
- `observer_changelog` (tracks all Observer modifications)

**Modified tables (from SPEC.md v0.1):**
- `deals`: Add `constitution JSONB` field for Partner Constitution
- `deals`: Add `monitoring_level TEXT DEFAULT 'standard'`
- `checklist_items`: Add `closing_checklist_id UUID` reference
- `deal_emails`: Add `extracted_positions JSONB` for negotiation positions
- `deal_emails`: Add `extracted_action_items JSONB`
- `deal_agent_memory`: Extend `memory_type` enum with additional types

---

## 14. API ADDITIONS

New API routes added to SPEC.md v0.1 Section 6:

### 14.1 Event Backbone

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/deals/[dealId]/events` | List propagation events (with filters) |
| `GET` | `/api/deals/[dealId]/events/[eventId]` | Get event with consequence chain |

### 14.2 Approval Queue

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/approval-queue` | List pending approvals across all deals |
| `GET` | `/api/approval-queue/[chainId]` | Get action chain detail with previews |
| `POST` | `/api/approval-queue/[chainId]/approve` | Approve all actions in chain |
| `POST` | `/api/approval-queue/[chainId]/actions/[actionId]/approve` | Approve single action |
| `POST` | `/api/approval-queue/[chainId]/actions/[actionId]/reject` | Reject single action |
| `POST` | `/api/approval-queue/[chainId]/actions/[actionId]/modify` | Modify and approve action |
| `GET` | `/api/approval-queue/stats` | Queue depth, avg resolution time |

### 14.3 Approval Policy

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/deals/[dealId]/approval-policy` | Get current policy |
| `PUT` | `/api/deals/[dealId]/approval-policy` | Update policy |
| `GET` | `/api/approval-policy/defaults` | Get role-based defaults |

### 14.4 Agent Management

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/deals/[dealId]/agent/activate` | On-demand agent activation |
| `GET` | `/api/deals/[dealId]/agent/activations` | List agent activations (with cost) |
| `GET` | `/api/deals/[dealId]/agent/cost-summary` | Token cost summary |
| `PUT` | `/api/deals/[dealId]/agent/monitoring-level` | Set monitoring level |

### 14.5 Constitution

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/deals/[dealId]/constitution` | Get current constitution |
| `PUT` | `/api/deals/[dealId]/constitution` | Update constitution |
| `POST` | `/api/deals/[dealId]/constitution/encode` | Conversational encoding endpoint |

### 14.6 Disclosure Schedules

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/deals/[dealId]/disclosure-schedules` | List all schedules |
| `GET` | `/api/deals/[dealId]/disclosure-schedules/[scheduleId]` | Get schedule with entries |
| `POST` | `/api/deals/[dealId]/disclosure-schedules/generate` | Generate from SPA reps |
| `POST` | `/api/deals/[dealId]/disclosure-schedules/[scheduleId]/entries` | Add entry |
| `POST` | `/api/deals/[dealId]/disclosure-schedules/cross-reference` | Run cross-reference check |

### 14.7 Negotiation

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/deals/[dealId]/negotiation/positions` | All provision positions |
| `GET` | `/api/deals/[dealId]/negotiation/roadmap` | Get negotiation roadmap |
| `POST` | `/api/deals/[dealId]/negotiation/roadmap/generate` | Generate initial roadmap |

### 14.8 Closing

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/deals/[dealId]/closing` | Get closing checklist |
| `POST` | `/api/deals/[dealId]/closing/generate` | Generate closing checklist from SPA |
| `PATCH` | `/api/deals/[dealId]/closing/conditions/[conditionId]` | Update condition status |
| `PATCH` | `/api/deals/[dealId]/closing/deliverables/[deliverableId]` | Update deliverable status |
| `GET` | `/api/deals/[dealId]/closing/funds-flow` | Get/generate funds flow memo |
| `GET` | `/api/deals/[dealId]/post-closing` | Get post-closing obligations |

### 14.9 Client Management

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/deals/[dealId]/client/action-items` | List client action items |
| `POST` | `/api/deals/[dealId]/client/action-items` | Create action item |
| `GET` | `/api/deals/[dealId]/client/communications` | List communications |
| `POST` | `/api/deals/[dealId]/client/communications/generate` | Generate status update |

### 14.10 Third Parties

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/deals/[dealId]/third-parties` | List third parties |
| `POST` | `/api/deals/[dealId]/third-parties` | Add third party |
| `PATCH` | `/api/deals/[dealId]/third-parties/[tpId]` | Update third party status |

### 14.11 Knowledge & Feedback

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/feedback` | Submit feedback event |
| `GET` | `/api/deals/[dealId]/knowledge` | Get deal knowledge entries |
| `POST` | `/api/knowledge/encode` | Conversational knowledge encoding |
| `GET` | `/api/precedent/quality-report` | Precedent quality distribution |

### 14.12 Simulation (Observer)

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/simulation/status` | Current simulation state |
| `GET` | `/api/simulation/observer/changelog` | Observer modification log |
| `POST` | `/api/simulation/observer/revert/[commitHash]` | Revert Observer change |
| `GET` | `/api/simulation/report` | Simulation evaluation report |

---

## 15. UPDATED IMPLEMENTATION PHASES

These replace SPEC.md v0.1 Section 13.

### Phase 0: Scaffold & Infrastructure
*As defined in SPEC.md v0.1. No changes.*

### Phase 1: Core Deal Flow + Event Backbone
**Extends V0.1 Phase 1 with:**
1. Everything from V0.1 Phase 1 (Deal CRUD, term sheet parser, checklist, Drive)
2. Propagation event system (tables, event bus, background worker)
3. Basic consequence maps (deterministic only, no Layer 2/3 yet)
4. Action chain generation (simplified: events → actions → direct execution, no approval queue yet)
5. Verify: event propagation works end-to-end for a deal parameter change

### Phase 2: Approval Framework
1. Approval policy schema and defaults
2. Action chain + proposed action tables
3. Approval queue API endpoints
4. Approval queue web UI (desktop first)
5. Tier assignment logic
6. Auto-execute for Tier 1 actions
7. Verify: can create deal, generate checklist, see action chains in approval queue, approve them

### Phase 3: Document Pipeline + Disclosure Schedules
**Extends V0.1 Phase 2 with:**
1. Everything from V0.1 Phase 2 (provision taxonomy, templates, v1-v3 generation)
2. Disclosure schedule tables and generation from SPA reps
3. Disclosure schedule questionnaire generation
4. Cross-reference checking between schedules and reps
5. DD finding → schedule entry pre-population
6. Schedule versioning alongside document versions
7. Verify: SPA generation produces matching disclosure schedules, DD findings appear in schedules

### Phase 4: Negotiation State + Email Integration
**Extends V0.1 Phase 3 with:**
1. Everything from V0.1 Phase 3 (Outlook OAuth, email sync, classification)
2. Negotiation position tracker tables
3. Negotiation position extraction from emails (Layer 2 pipeline)
4. Position extraction from markup analysis
5. Negotiation roadmap generation
6. Email → propagation events → consequence resolution → action chains
7. Verify: incoming email with counterparty position updates negotiation tracker and generates appropriate action chain

### Phase 5: Agent Layer (Manager + Specialists)
1. Manager Agent implementation (system prompt, tool access, context loading)
2. Specialist configuration framework
3. Drafter Specialist configuration
4. Analyst Specialist configuration
5. Email Specialist configuration
6. System Expert Agent
7. Agent activation triggers (event-driven, scheduled, on-demand)
8. Agent cost tracking
9. Morning briefing generation
10. Agent chat interface in web portal
11. Verify: Manager produces useful briefings, routes to specialists correctly, synthesizes results

### Phase 6: Partner Constitution + Governance
1. Constitution data model
2. Conversational encoding interface
3. Constitution enforcement in Manager Agent
4. Constitution enforcement in consequence resolver
5. Hard constraint blocking with Tier 3 escalation
6. Verify: hard constraints actually block violating actions, preferences shape agent behavior

### Phase 7: Skills System
1. Skills directory structure
2. Static skills library (initial set of domain, process, meta skills)
3. Skill loading logic in specialist configuration
4. Adaptive skill creation from feedback patterns
5. Gap recognition meta skill
6. Dynamic skill creation workflow (knowledge skills only, no coding agent yet)
7. Verify: specialists load appropriate skills, adaptive skills emerge from feedback

### Phase 8: Third-Party Management + Client Communication
1. Third-party tables and workflows
2. Client management tables
3. Client action item tracking
4. Client communication generation
5. Status update auto-generation
6. Third-party deliverable tracking
7. Verify: system tracks third-party deliverables, generates client status updates

### Phase 9: Closing Mechanics
1. Closing checklist tables
2. Closing checklist generation from SPA conditions
3. Condition satisfaction tracking
4. Closing deliverable tracking
5. Funds flow memo generation
6. Post-closing obligation tracking
7. Signature page tracking
8. Verify: closing checklist generated from executed SPA, conditions trackable, funds flow generated

### Phase 10: Precedent Intelligence Pipeline
1. EDGAR ingestion pipeline
2. Automated quality scoring (all signals)
3. Quality-weighted retrieval
4. Dynamic quality learning from feedback
5. What's-market analysis with quality weighting
6. Verify: precedent database populated from EDGAR, quality scores differentiate formulations, what's-market returns useful data

### Phase 11: Observer + Self-Improvement System
1. Observer agent implementation
2. Evaluation criteria framework
3. Improvement loop (detect → diagnose → prescribe → implement → test → deploy)
4. Coding Agent and Testing Agent configurations
5. Observer notification channel
6. Git-based change tracking and rollback
7. Verify: Observer detects a seeded weakness, implements a fix, and validates improvement

### Phase 12: Simulation Framework
1. Dual-instance deployment infrastructure
2. Email system setup
3. Simulation clock
4. Client agent implementation
5. Third-party agent implementation
6. Seller Partner Agent implementation
7. Scenario seeding tools (VDR documents, term sheet, client instructions)
8. Simulation evaluation report generation
9. Run first full simulation
10. Iterate based on simulation findings

### Phase 13: Mobile Approval Interface
1. Mobile-optimized approval queue UI
2. Push notifications
3. Swipe-to-approve gestures
4. Voice annotation support
5. Deal status dashboard for mobile
6. Verify: partner can effectively manage approvals from phone

### Phase 14: Knowledge Capture + Learning Pipeline
1. Feedback event capture in all approval workflows
2. Learning pipeline (quality updates, adaptive skills, test cases)
3. Conversational knowledge encoding interface
4. Deal post-mortem workflow
5. Cross-deal knowledge aggregation
6. Verify: feedback events produce adaptive skills, precedent quality scores update from usage

---

## 16. COST MODEL & TOKEN ECONOMICS

### 16.1 Estimated Token Costs per Deal Phase

| Phase | Layer 1 | Layer 2 (API) | Layer 3 (Agent) | Est. Daily Cost |
|-------|---------|---------------|-----------------|-----------------|
| Intake & Setup | — | $2-5 | $5-10 | $7-15 (one-time) |
| Document Drafting (per doc) | — | $5-15 | $10-20 review | $15-35 per doc |
| Markup Analysis (per round) | — | $3-8 | $15-30 strategy | $18-38 per round |
| DD Processing (per 10 docs) | — | $10-20 | $5-10 synthesis | $15-30 per batch |
| Email Processing (per day) | — | $1-3 | $2-5 if significant | $3-8 |
| Morning Briefing | — | $1-2 | $3-8 | $4-10 |
| Negotiation Strategy | — | $2-5 | $10-20 | $12-25 (per round) |
| Closing Preparation | — | $5-10 | $10-15 | $15-25 (one-time) |

**Estimated total cost per deal (60-day transaction):** $500-2,000 in tokens

**Comparison:** 4 associates × $500-1200/hour × ~300 hours = $600,000-1,440,000 in billing

### 16.2 Cost Optimization Strategies

- Cache frequently-used context (deal parameters, provision taxonomy) to reduce input tokens
- Use Claude Sonnet for all Layer 2 calls, Opus only for Layer 3 strategic synthesis
- Batch Layer 2 calls where possible (e.g., classify 10 emails in one call vs. 10 calls)
- Implement token budgets per deal with alerting at 80% consumption
- Degrade gracefully: if budget exhausted, fall back to Layers 1-2 only (no agent activations)

---

## NOTES FOR IMPLEMENTATION

1. **This spec is a design document, not an implementation order.** The phasing in Section 15 defines the build sequence. Many concepts described here (simulation framework, Observer) are later-phase capabilities that build on the foundation.

2. **The three-layer principle is the most important architectural decision.** Every new feature should be evaluated: what belongs in Layer 1 (deterministic), what in Layer 2 (single-turn AI), and what in Layer 3 (agent)? Default to the lowest layer that can handle the task.

3. **The event backbone is the nervous system.** Every database write that represents a meaningful deal state change should emit a propagation event. If you're unsure whether to emit an event, emit it — unused events are cheap, missed events break the reactive chain.

4. **Pre-render everything in the approval queue.** The human should see the actual artifact (redline, email text, schedule entry), not a description of what will happen. This is what makes one-tap approval trustworthy and fast.

5. **Skills are the primary knowledge representation.** When you learn something about how the system should behave, encode it as a skill — not as a comment in the code, not as a note in a document, but as a structured skill file that agents actually load and follow.

6. **The simulation is the development methodology.** Building the simulation framework is not separate from building the product. The simulation IS the test suite. Every simulation run reveals gaps that become development tasks.

7. **Git history is sacred.** Every change by every actor (human, agent, Observer) is a commit. Never squash, never force-push, never rewrite history. The commit log is the system's complete development and operational record.
