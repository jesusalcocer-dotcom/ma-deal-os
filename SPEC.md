# M&A Deal Operating System — Complete Specification

## Merged V1 + V2 — Single Source of Truth

**Version:** 2.0
**Date:** February 7, 2026
**Status:** Phases 0–2 COMPLETE | Phases 3–14 TO BUILD

---

## TABLE OF CONTENTS

1. [Vision & Architecture Philosophy](#1-vision--architecture-philosophy)
2. [Technology Stack & Repository Structure](#2-technology-stack--repository-structure)
3. [Three-Layer Architecture](#3-three-layer-architecture)
4. [Database Schema](#4-database-schema)
5. [Event Propagation Backbone](#5-event-propagation-backbone)
6. [Approval Framework](#6-approval-framework)
7. [Agent Architecture](#7-agent-architecture)
8. [Skills System](#8-skills-system)
9. [Partner Constitution & Governance](#9-partner-constitution--governance)
10. [Precedent Intelligence Pipeline](#10-precedent-intelligence-pipeline)
11. [Document Processing Pipeline](#11-document-processing-pipeline)
12. [Email & Communication Integration](#12-email--communication-integration)
13. [Google Drive Integration](#13-google-drive-integration)
14. [Gap Coverage: New Workflows](#14-gap-coverage-new-workflows)
15. [Observer & Self-Improvement System](#15-observer--self-improvement-system)
16. [Simulation Framework](#16-simulation-framework)
17. [Knowledge & Learning Pipeline](#17-knowledge--learning-pipeline)
18. [API Routes](#18-api-routes)
19. [Web Portal Pages & Components](#19-web-portal-pages--components)
20. [Implementation Phases](#20-implementation-phases)
21. [Cost Model & Token Economics](#21-cost-model--token-economics)
22. [Environment & Credentials](#22-environment--credentials)

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

### 1.3 Relationship to Existing Codebase

Phases 0–2 are **COMPLETE** and running in production. The existing codebase includes:

- Monorepo structure (apps/web, packages/core, packages/db, packages/ai, packages/integrations)
- 14 database tables in Supabase
- Deal CRUD, term sheet parsing, checklist generation
- Document pipeline (v1 template → v2 precedent → v3 scrub)
- 50 SPA provision types seeded
- 10 EDGAR precedent deals harvested
- Provision segmenter (47 tagged sections)
- Google Drive integration (service account, folder creation, file upload)
- Web UI (deal list, deal detail, checklist, documents with version history)
- DOCX generation
- Test deal "Project Mercury" with checklist items and 3 document versions

**DO NOT rebuild, overwrite, or refactor Phases 0–2 code** unless a skill file explicitly tells you to modify specific files for integration purposes.

---

## 2. TECHNOLOGY STACK & REPOSITORY STRUCTURE

### 2.1 Core Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Language** | TypeScript | 5.x | Unified across all packages |
| **Runtime** | Node.js | 20 LTS | Stable, Vercel-compatible |
| **Package Manager** | pnpm | 9.x | Fast, efficient for monorepos |
| **Monorepo Tool** | Turborepo | Latest | Build orchestration, caching |

### 2.2 Database & Storage

| Component | Technology | Notes |
|-----------|-----------|-------|
| **Database** | Supabase (PostgreSQL 15+) | Hosted |
| **Vector Search** | pgvector extension | Enabled in Supabase |
| **File Storage** | Supabase Storage | For document versions |
| **Migrations** | Drizzle ORM | Type-safe schema |

### 2.3 Web Application

| Component | Technology | Notes |
|-----------|-----------|-------|
| **Framework** | Next.js 14+ (App Router) | Full-stack React framework |
| **Auth** | NextAuth.js (Auth.js) v5 | Microsoft OAuth for Outlook |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid, consistent UI |
| **State** | React Query | Server state management |
| **Deployment** | Vercel | Auto-deploy from GitHub |

### 2.4 Integrations

| Component | Technology | Notes |
|-----------|-----------|-------|
| **Google Drive** | `googleapis` npm package | Service Account auth |
| **Outlook/Email** | Microsoft Graph SDK | Official MS SDK |
| **LLM** | `@anthropic-ai/sdk` | Claude API |
| **Document Processing** | `mammoth` (read), `docx` (write), `pdf-parse` (PDF) | Node.js document libraries |
| **MCP** | `@modelcontextprotocol/sdk` | Agent tooling protocol |

### 2.5 Repository Structure

```
ma-deal-os/
├── CLAUDE.md                    ← Build protocol
├── BUILD_STATE.json             ← Session continuity
├── SPEC-V2-COMPLETE.md          ← THIS FILE
├── GUIDANCE.md                  ← Human operator instructions (check + delete)
├── skills/                      ← Phase-specific build instructions + agent skills
│   ├── phase-03.md ... phase-14.md  ← Build instructions
│   ├── static/                  ← Pre-built agent skills (Phase 8)
│   ├── adaptive/                ← Learned skills (Phase 14)
│   └── dynamic/                 ← On-the-fly skills
├── apps/
│   └── web/                     ← Next.js app
│       ├── src/
│       │   ├── app/             ← Pages and API routes
│       │   └── components/      ← React components
│       └── .env.local
├── packages/
│   ├── core/                    ← Business logic, types, rules
│   │   └── src/
│   │       ├── types/           ← Shared type definitions
│   │       ├── rules/           ← Deterministic rules engine
│   │       ├── events/          ← Event bus (Phase 3)
│   │       ├── constants/       ← Enums, taxonomies
│   │       └── utils/
│   ├── db/                      ← Drizzle schema and migrations
│   │   └── src/
│   │       ├── schema/          ← Table definitions
│   │       └── seed/            ← Seed data scripts
│   ├── ai/                      ← Claude API pipelines + agents
│   │   └── src/
│   │       ├── prompts/         ← Prompt construction
│   │       ├── pipelines/       ← Layer 2 API call pipelines
│   │       ├── agents/          ← Layer 3 agent implementations (Phase 7)
│   │       │   ├── manager/
│   │       │   ├── specialists/
│   │       │   ├── system-expert/
│   │       │   └── observer/
│   │       └── skills/          ← Skill loader (Phase 8)
│   ├── integrations/            ← Drive, email, external services
│   │   └── src/
│   │       ├── google-drive/
│   │       ├── outlook/
│   │       ├── documents/
│   │       └── precedent/       ← EDGAR pipeline (Phase 10)
│   └── mcp-server/              ← MCP server (Phase 3)
│       └── src/
│           ├── index.ts
│           └── tools/
├── config/                      ← Credentials (gitignored)
├── scripts/                     ← Build and test scripts
├── test-data/                   ← Test fixtures
└── docs/
    └── test-results/            ← Phase test reports
```

---

## 3. THREE-LAYER ARCHITECTURE

### 3.1 Layer 1: Deterministic Code

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

### 3.2 Layer 2: Traditional AI API Calls

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

**Implementation:** All Layer 2 calls go through `packages/ai`. Every call has retry logic (3 attempts, exponential backoff), structured output validation, and cost tracking.

**Prompt patterns (from existing implementation):**
- System prompt defines the task, output schema, and constraints
- User prompt contains the data to process
- Response format is structured JSON with confidence scores
- Models: `claude-sonnet-4-5-20250929` for most tasks, `claude-opus-4-6` for complex reasoning

### 3.3 Layer 3: Agents

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

**Cost control:** Agents activate selectively (see Section 7.6 on activation triggers). Dormant mode uses Layers 1-2 only. Active mode invokes agents for specific purposes with defined scope.

---

## 4. DATABASE SCHEMA

### 4.1 Existing Tables (Phases 0-2 — DO NOT RECREATE)

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'attorney',
  firm TEXT,
  google_access_token TEXT,
  google_refresh_token TEXT,
  microsoft_access_token TEXT,
  microsoft_refresh_token TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### deals
```sql
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  parameters JSONB NOT NULL DEFAULT '{}',
  deal_value NUMERIC,
  industry TEXT,
  buyer_type TEXT,
  target_name TEXT,
  buyer_name TEXT,
  seller_name TEXT,
  drive_folder_id TEXT,
  drive_folder_url TEXT,
  deal_inbox_address TEXT,
  email_thread_ids JSONB DEFAULT '[]',
  expected_signing_date DATE,
  expected_closing_date DATE,
  actual_signing_date DATE,
  actual_closing_date DATE,
  lead_attorney_id UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**ALTER TABLE for V2 (Phase 9):**
```sql
ALTER TABLE deals ADD COLUMN constitution JSONB;
ALTER TABLE deals ADD COLUMN monitoring_level TEXT DEFAULT 'standard';
```

#### deal_team_members
```sql
CREATE TABLE deal_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  role TEXT NOT NULL,
  permissions TEXT[] DEFAULT '{}',
  added_at TIMESTAMPTZ DEFAULT now()
);
```

#### checklist_items
```sql
CREATE TABLE checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  category TEXT,
  trigger_rule TEXT,
  trigger_source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'identified',
  ball_with TEXT,
  assigned_to UUID REFERENCES users(id),
  due_date DATE,
  priority TEXT DEFAULT 'normal',
  depends_on UUID[],
  blocks UUID[],
  current_document_version_id UUID,
  drive_file_id TEXT,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**ALTER TABLE for V2 (Phase 6):**
```sql
ALTER TABLE checklist_items ADD COLUMN closing_checklist_id UUID;
```

#### document_versions
```sql
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_item_id UUID REFERENCES checklist_items(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  version_label TEXT NOT NULL,
  version_type TEXT NOT NULL,
  file_path TEXT,
  drive_file_id TEXT,
  file_hash TEXT,
  file_size_bytes INTEGER,
  change_summary JSONB,
  provision_changes JSONB,
  source TEXT,
  source_email_id UUID,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### provision_types
```sql
CREATE TABLE provision_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  parent_code TEXT,
  description TEXT,
  applicable_doc_types TEXT[],
  sort_order INTEGER DEFAULT 0
);
```

#### provision_variants
```sql
CREATE TABLE provision_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provision_type_id UUID REFERENCES provision_types(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  buyer_favorability DECIMAL(3,2),
  market_frequency DECIMAL(3,2),
  metadata JSONB DEFAULT '{}'
);
```

#### provision_formulations
```sql
CREATE TABLE provision_formulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provision_type_id UUID REFERENCES provision_types(id),
  variant_id UUID REFERENCES provision_variants(id),
  text TEXT NOT NULL,
  text_embedding vector(1024),
  source_deal_id UUID,
  source_document_type TEXT,
  source_firm TEXT,
  favorability_score DECIMAL(3,2),
  negotiation_outcome TEXT,
  deal_size_range TEXT,
  industry TEXT,
  year INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON provision_formulations USING ivfflat (text_embedding vector_cosine_ops) WITH (lists = 100);
```

**ALTER TABLE for V2 (Phase 10) — quality scoring fields:**
```sql
ALTER TABLE provision_formulations ADD COLUMN firm_tier DECIMAL(3,2);
ALTER TABLE provision_formulations ADD COLUMN deal_size_score DECIMAL(3,2);
ALTER TABLE provision_formulations ADD COLUMN recency_score DECIMAL(3,2);
ALTER TABLE provision_formulations ADD COLUMN structural_quality_score DECIMAL(3,2);
ALTER TABLE provision_formulations ADD COLUMN corpus_alignment_score DECIMAL(3,2);
ALTER TABLE provision_formulations ADD COLUMN composite_quality_score DECIMAL(3,2);
```

#### dd_topics
```sql
CREATE TABLE dd_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  workstream TEXT NOT NULL,
  parent_code TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0
);
```

#### dd_findings
```sql
CREATE TABLE dd_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES dd_topics(id),
  summary TEXT NOT NULL,
  detail TEXT,
  risk_level TEXT NOT NULL,
  risk_type TEXT,
  exposure_low NUMERIC,
  exposure_mid NUMERIC,
  exposure_high NUMERIC,
  exposure_basis TEXT,
  affects_provisions JSONB DEFAULT '[]',
  affects_checklist_items UUID[],
  source_documents JSONB DEFAULT '[]',
  source_qa_entries JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft',
  confirmed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### deal_emails
```sql
CREATE TABLE deal_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  outlook_message_id TEXT UNIQUE,
  outlook_conversation_id TEXT,
  thread_id TEXT,
  subject TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  recipients JSONB,
  received_at TIMESTAMPTZ NOT NULL,
  classification TEXT,
  classification_confidence DECIMAL(3,2),
  related_checklist_items UUID[],
  related_document_versions UUID[],
  body_preview TEXT,
  body_text TEXT,
  body_embedding vector(1024),
  has_attachments BOOLEAN DEFAULT false,
  attachments JSONB DEFAULT '[]',
  processing_status TEXT DEFAULT 'pending',
  action_items JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**ALTER TABLE for V2 (Phase 5):**
```sql
ALTER TABLE deal_emails ADD COLUMN extracted_positions JSONB;
ALTER TABLE deal_emails ADD COLUMN extracted_action_items JSONB;
```

#### drive_sync_records
```sql
CREATE TABLE drive_sync_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  checklist_item_id UUID REFERENCES checklist_items(id),
  document_version_id UUID REFERENCES document_versions(id),
  internal_file_path TEXT,
  internal_file_hash TEXT,
  drive_file_id TEXT NOT NULL,
  drive_file_name TEXT,
  drive_modified_time TIMESTAMPTZ,
  drive_file_hash TEXT,
  sync_status TEXT DEFAULT 'in_sync',
  sync_direction TEXT,
  last_synced_at TIMESTAMPTZ,
  conflict_details JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### deal_agent_memory
```sql
CREATE TABLE deal_agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Note:** `memory_type` values extended in V2 to include: `'state_summary'`, `'attorney_preference'`, `'decision_record'`, `'flag'`, `'negotiation_context'`, `'agent_observation'`, `'skill_gap'`.

#### activity_log
```sql
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id),
  actor_type TEXT DEFAULT 'user',
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.2 New Tables (Phases 3-14 — TO BE CREATED)

#### propagation_events (Phase 3)
```sql
CREATE TABLE propagation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  source_entity_type TEXT NOT NULL,
  source_entity_id UUID NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  significance INTEGER NOT NULL DEFAULT 3 CHECK (significance BETWEEN 1 AND 5),
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_propagation_events_unprocessed ON propagation_events (deal_id, processed) WHERE processed = false;
CREATE INDEX idx_propagation_events_type ON propagation_events (event_type);
```

#### action_chains (Phase 3)
```sql
CREATE TABLE action_chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  trigger_event_id UUID REFERENCES propagation_events(id),
  summary TEXT NOT NULL,
  significance INTEGER NOT NULL DEFAULT 3 CHECK (significance BETWEEN 1 AND 5),
  approval_tier INTEGER NOT NULL CHECK (approval_tier BETWEEN 1 AND 3),
  status TEXT NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_action_chains_pending ON action_chains (status) WHERE status = 'pending';
```

#### proposed_actions (Phase 3)
```sql
CREATE TABLE proposed_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id UUID REFERENCES action_chains(id) ON DELETE CASCADE,
  sequence_order INTEGER NOT NULL,
  depends_on UUID[] DEFAULT '{}',
  action_type TEXT NOT NULL,
  target_entity_type TEXT,
  target_entity_id UUID,
  payload JSONB NOT NULL DEFAULT '{}',
  preview JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  execution_result JSONB,
  constitutional_violation BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  executed_at TIMESTAMPTZ
);
```

#### approval_policies (Phase 4)
```sql
CREATE TABLE approval_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  role TEXT,
  rules JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### agent_activations (Phase 4)
```sql
CREATE TABLE agent_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_source TEXT,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_cost_usd NUMERIC(10,4) DEFAULT 0,
  model_used TEXT,
  steps INTEGER DEFAULT 0,
  tool_calls INTEGER DEFAULT 0,
  specialist_invocations INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  result_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### disclosure_schedules (Phase 5)
```sql
CREATE TABLE disclosure_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  checklist_item_id UUID REFERENCES checklist_items(id),
  schedule_number TEXT NOT NULL,
  schedule_title TEXT NOT NULL,
  related_rep_section TEXT NOT NULL,
  related_rep_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  questionnaire_sent_at TIMESTAMPTZ,
  client_response_received_at TIMESTAMPTZ,
  last_cross_reference_check TIMESTAMPTZ,
  cross_reference_issues JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### disclosure_entries (Phase 5)
```sql
CREATE TABLE disclosure_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES disclosure_schedules(id) ON DELETE CASCADE,
  entry_text TEXT NOT NULL,
  entry_type TEXT,
  source_dd_finding_id UUID REFERENCES dd_findings(id),
  source_client_response TEXT,
  source_email_id UUID REFERENCES deal_emails(id),
  status TEXT DEFAULT 'draft',
  confirmed_by UUID REFERENCES users(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### negotiation_positions (Phase 5)
```sql
CREATE TABLE negotiation_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  provision_type TEXT NOT NULL,
  provision_label TEXT NOT NULL,
  our_current_position TEXT,
  our_current_position_detail JSONB,
  their_current_position TEXT,
  their_current_position_detail JSONB,
  position_history JSONB DEFAULT '[]',
  status TEXT DEFAULT 'open',
  agreed_position TEXT,
  agreed_position_detail JSONB,
  significance INTEGER DEFAULT 3,
  financial_impact BOOLEAN DEFAULT false,
  constitutional_constraint BOOLEAN DEFAULT false,
  last_updated_from TEXT,
  last_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### deal_third_parties (Phase 6)
```sql
CREATE TABLE deal_third_parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  firm_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  deliverables JSONB DEFAULT '[]',
  last_communication_at TIMESTAMPTZ,
  outstanding_items TEXT[],
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### client_contacts (Phase 6)
```sql
CREATE TABLE client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT,
  is_primary BOOLEAN DEFAULT false,
  communication_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### client_action_items (Phase 6)
```sql
CREATE TABLE client_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  client_contact_id UUID REFERENCES client_contacts(id),
  description TEXT NOT NULL,
  detail TEXT,
  category TEXT,
  due_date DATE,
  priority TEXT DEFAULT 'normal',
  blocks_checklist_items UUID[],
  related_disclosure_schedule_id UUID,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  follow_up_count INTEGER DEFAULT 0,
  last_follow_up_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### client_communications (Phase 6)
```sql
CREATE TABLE client_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  client_contact_id UUID REFERENCES client_contacts(id),
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  approved_by UUID REFERENCES users(id),
  sent_at TIMESTAMPTZ,
  generated_by TEXT DEFAULT 'system',
  trigger_event_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### closing_checklists (Phase 6)
```sql
CREATE TABLE closing_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'draft',
  target_closing_date DATE,
  conditions_satisfied INTEGER DEFAULT 0,
  conditions_total INTEGER DEFAULT 0,
  conditions_waived INTEGER DEFAULT 0,
  funds_flow JSONB,
  wire_instructions_confirmed BOOLEAN DEFAULT false,
  signature_pages_collected JSONB DEFAULT '{}',
  signature_pages_released BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### closing_conditions (Phase 6)
```sql
CREATE TABLE closing_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_checklist_id UUID REFERENCES closing_checklists(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  condition_type TEXT NOT NULL,
  category TEXT,
  responsible_party TEXT,
  status TEXT DEFAULT 'pending',
  satisfied_at TIMESTAMPTZ,
  evidence TEXT,
  evidence_document_id UUID,
  blocks_closing BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### closing_deliverables (Phase 6)
```sql
CREATE TABLE closing_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_checklist_id UUID REFERENCES closing_checklists(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  deliverable_type TEXT,
  responsible_party TEXT NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  received_at TIMESTAMPTZ,
  document_version_id UUID,
  drive_file_id TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### post_closing_obligations (Phase 6)
```sql
CREATE TABLE post_closing_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  obligation_type TEXT,
  responsible_party TEXT NOT NULL,
  deadline DATE,
  recurring BOOLEAN DEFAULT false,
  recurrence_interval TEXT,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  estimated_value NUMERIC,
  actual_value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### negotiation_roadmaps (Phase 5)
```sql
CREATE TABLE negotiation_roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  overall_strategy TEXT,
  strategy_rationale TEXT,
  provision_plans JSONB DEFAULT '[]',
  round_summaries JSONB DEFAULT '[]',
  strategy_adjustments JSONB DEFAULT '[]',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### deal_knowledge (Phase 14)
```sql
CREATE TABLE deal_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id),
  knowledge_type TEXT NOT NULL,
  content JSONB NOT NULL,
  confidence DECIMAL(3,2),
  sample_size INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### feedback_events (Phase 14)
```sql
CREATE TABLE feedback_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  event_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  original_output JSONB,
  modified_output JSONB,
  modification_delta JSONB,
  annotation TEXT,
  agent_context_summary TEXT,
  agent_confidence DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### skills_registry (Phase 8)
```sql
CREATE TABLE skills_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  path TEXT NOT NULL,
  version TEXT DEFAULT '1.0',
  quality_score DECIMAL(3,2) DEFAULT 0.50,
  applicable_agents TEXT[] DEFAULT '{}',
  applicable_tasks TEXT[] DEFAULT '{}',
  depends_on TEXT[] DEFAULT '{}',
  source TEXT DEFAULT 'static',
  last_updated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### observer_changelog (Phase 11)
```sql
CREATE TABLE observer_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  description TEXT NOT NULL,
  diagnosis TEXT,
  git_commit_hash TEXT,
  test_results JSONB,
  reverted BOOLEAN DEFAULT false,
  reverted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4.3 Row-Level Security

```sql
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
-- (RLS policies for all tables — service role key bypasses RLS)
```

---

## 5. EVENT PROPAGATION BACKBONE

### 5.1 Core Concepts

**Propagation Event:** A record that something meaningful changed in the deal state. Every significant database write emits a propagation event.

**Consequence Resolver:** The module that evaluates a propagation event and determines what downstream actions are needed. Uses Layer 1 (deterministic rules) for known consequence patterns and Layer 2 (API calls) for non-obvious connections.

**Action Chain:** An ordered list of proposed actions generated by the consequence resolver. Represents a complete response to an event — all the things that should happen as a result.

**Proposed Action:** A single concrete action within an action chain. Fully specified: what to do, to what artifact, with what content. Ready to execute on approval.

### 5.2 Event Types

```typescript
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

### 5.3 Propagation Event Interface

```typescript
interface PropagationEvent {
  id: string;
  deal_id: string;
  event_type: PropagationEventType;
  source_entity_type: string;
  source_entity_id: string;
  payload: Record<string, any>;
  significance: 1 | 2 | 3 | 4 | 5;
  created_at: string;
  processed: boolean;
  processed_at?: string;
}
```

### 5.4 Consequence Resolution Flow

```
Event Emitted
     │
     ▼
┌─────────────────────┐
│  Layer 1: Rules      │  Deterministic consequence mapping
│  (always runs)       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Layer 2: API Call   │  Non-obvious connection detection
│  (runs if needed)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Significance Check  │  Agent activation threshold
└──────────┬──────────┘
           │
      ┌────┴────┐
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

### 5.5 Deterministic Consequence Maps

Implemented in `packages/core/src/rules/consequence-maps.ts`.

```typescript
const consequenceMaps: ConsequenceMap[] = [
  {
    trigger: 'dd.finding_confirmed',
    conditions: [
      { field: 'payload.risk_level', in: ['critical', 'high'] }
    ],
    consequences: [
      { type: 'document_modification', target: 'affected_provisions', action: 'propose_enhancement', priority: 'high' },
      { type: 'disclosure_schedule_update', target: 'matching_schedule', action: 'add_entry', priority: 'high' },
      { type: 'notification', target: 'deal_lead', action: 'alert', priority: 'immediate' },
      { type: 'client_communication', target: 'client_contact', action: 'draft_notification', priority: 'normal' }
    ]
  },
  {
    trigger: 'document.markup_received',
    consequences: [
      { type: 'analysis', action: 'analyze_markup', priority: 'high' },
      { type: 'negotiation_update', action: 'extract_positions', priority: 'high' },
      { type: 'checklist_update', target: 'related_checklist_item', action: 'update_status_to_markup_received', priority: 'normal' },
      { type: 'checklist_update', target: 'related_checklist_item', action: 'update_ball_with_to_us', priority: 'normal' }
    ]
  },
  {
    trigger: 'email.position_extracted',
    consequences: [
      { type: 'negotiation_update', action: 'update_provision_positions', priority: 'normal' },
      { type: 'agent_evaluation', action: 'assess_negotiation_impact', priority: 'normal' }
    ]
  },
  {
    trigger: 'checklist.item_overdue',
    consequences: [
      { type: 'notification', target: 'assigned_attorney', action: 'overdue_alert', priority: 'high' },
      { type: 'critical_path_update', action: 'recalculate', priority: 'normal' }
    ]
  },
  {
    trigger: 'deal.parameters_updated',
    consequences: [
      { type: 'checklist_regeneration', action: 'diff_and_update', priority: 'high' },
      { type: 'document_review', action: 'flag_affected_provisions', priority: 'normal' }
    ]
  },
  {
    trigger: 'closing.condition_satisfied',
    consequences: [
      { type: 'closing_checklist_update', action: 'mark_condition_met', priority: 'normal' },
      { type: 'closing_readiness_check', action: 'evaluate_all_conditions', priority: 'normal' }
    ]
  }
];
```

### 5.6 Action Chain Structure

```typescript
interface ActionChain {
  id: string;
  deal_id: string;
  trigger_event_id: string;
  summary: string;
  significance: 1 | 2 | 3 | 4 | 5;
  approval_tier: 1 | 2 | 3;
  status: 'pending' | 'approved' | 'partially_approved' | 'rejected' | 'expired';
  actions: ProposedAction[];
  created_at: string;
  approved_at?: string;
  approved_by?: string;
}

interface ProposedAction {
  id: string;
  chain_id: string;
  sequence_order: number;
  depends_on: string[];
  action_type: ProposedActionType;
  target_entity_type: string;
  target_entity_id?: string;
  payload: Record<string, any>;
  preview: {
    title: string;
    description: string;
    diff?: string;
    draft?: string;
  };
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
  execution_result?: Record<string, any>;
  constitutional_violation?: boolean;
  created_at: string;
  executed_at?: string;
}

type ProposedActionType =
  | 'document_edit'
  | 'document_generate'
  | 'checklist_status_update'
  | 'checklist_ball_with_update'
  | 'checklist_add_item'
  | 'disclosure_schedule_entry'
  | 'disclosure_schedule_remove'
  | 'email_draft'
  | 'email_send'
  | 'dd_finding_create'
  | 'dd_request_create'
  | 'negotiation_position_update'
  | 'client_action_item_create'
  | 'client_communication_draft'
  | 'third_party_communication'
  | 'closing_checklist_update'
  | 'notification'
  | 'agent_activation'
  | 'status_update'
  | 'timeline_update';
```

### 5.7 Event Bus Implementation

```typescript
// packages/core/src/events/event-bus.ts

export class EventBus {
  async emit(event: Omit<PropagationEvent, 'id' | 'created_at' | 'processed'>): Promise<string> {
    // 1. Write event to propagation_events table
    // 2. Trigger consequence resolution (async)
    // 3. Return event ID
  }

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

Background processing: events processed via polling `setInterval` loop (production: BullMQ). Events for the same deal processed sequentially; events across deals processed in parallel.

---

## 6. APPROVAL FRAMEWORK

### 6.1 Approval Tiers

**Tier 1 — Auto-execute.** Low-risk, high-frequency actions.
- Checklist status field updates
- `ball_with` updates
- Activity log entries
- Internal notifications
- Drive sync operations
- Timeline recalculations

**Tier 2 — Approve-to-execute.** Pre-rendered output, one-tap approval.
- Document modifications (provision edits, schedule entries)
- Email drafts to counterparty counsel
- DD finding confirmations
- Negotiation position updates
- Closing checklist updates
- Third-party communication drafts
- Client action item creation

**Tier 3 — Review required.** Human must think and decide.
- Novel legal issues
- Conflicting DD findings
- Fundamental shifts in negotiation posture
- Anything touching deal economics
- Constitutional constraint violations
- Inter-workstream conflicts

### 6.2 Approval Policy

```typescript
interface ApprovalPolicy {
  id: string;
  deal_id?: string;
  user_id?: string;
  role?: string;
  rules: ApprovalRule[];
}

interface ApprovalRule {
  action_type: ProposedActionType | ProposedActionType[];
  conditions?: {
    significance_gte?: number;
    provision_type?: string[];
    counterparty_facing?: boolean;
    client_facing?: boolean;
    financial_impact?: boolean;
  };
  tier: 1 | 2 | 3;
}
```

**Default partner policy:**
```typescript
const defaultPartnerPolicy: ApprovalRule[] = [
  { action_type: ['status_update', 'notification', 'timeline_update'], tier: 1 },
  { action_type: 'checklist_ball_with_update', tier: 1 },
  { action_type: 'checklist_status_update', tier: 1 },
  { action_type: 'document_edit', tier: 2 },
  { action_type: 'document_generate', tier: 2 },
  { action_type: 'email_draft', tier: 2 },
  { action_type: 'dd_finding_create', tier: 2 },
  { action_type: 'disclosure_schedule_entry', tier: 2 },
  { action_type: 'closing_checklist_update', tier: 2 },
  { action_type: 'third_party_communication', tier: 2 },
  { action_type: 'client_action_item_create', tier: 2 },
  { action_type: 'email_draft', conditions: { client_facing: true }, tier: 3 },
  { action_type: 'document_edit', conditions: { financial_impact: true }, tier: 3 },
  { action_type: 'negotiation_position_update', conditions: { significance_gte: 4 }, tier: 3 },
  { action_type: 'client_communication_draft', tier: 3 },
];
```

### 6.3 Approval Queue Interface

Card-based layout showing pending items. Each card: severity, summary, deal name, action count, Approve/Review buttons. Expandable detail shows pre-rendered previews.

### 6.4 Mobile-First Design

- Push notifications for Tier 2 and 3 items
- Swipe-to-approve for Tier 2
- Card layout optimized for phone screens
- Offline support with sync on reconnect

---

## 7. AGENT ARCHITECTURE

### 7.1 Agent Hierarchy

```
                    ┌─────────────────────┐
                    │   Human Partner     │
                    │   (Approval Queue    │
                    │    + Chat Interface) │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Manager Agent     │
                    │   (Senior Associate) │
                    └──┬───────────────┬──┘
                       │               │
          ┌────────────▼──┐    ┌───────▼────────────┐
          │ System Expert │    │ Specialist Agents   │
          │ (Always on)   │    │ (Spun up per task)  │
          └───────────────┘    └────────────────────┘
```

### 7.2 Manager Agent

**Role:** Senior associate who runs the deal. Holistic deal model, work routing, synthesis, partner communication.

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

**Tool access:** All MCP tools + action chain creation + specialist invocation + notification dispatch + negotiation state update + approval queue management.

### 7.3 Specialist Agents (Dynamically Configured)

```typescript
interface SpecialistConfig {
  task_type: 'markup_analysis' | 'document_drafting' | 'dd_investigation'
    | 'email_analysis' | 'disclosure_review' | 'closing_preparation'
    | 'negotiation_analysis' | 'precedent_research';
  skills: string[];
  context: {
    documents: string[];
    provisions?: string[];
    deal_state_subset: string[];
    precedent_query?: string;
  };
  tools: string[];
  output_schema: object;
  instructions: string;
}
```

**Specialist types:**
- **Drafter:** Document drafting, cross-reference management, defined term consistency
- **Analyst:** DD investigation, risk classification, exposure quantification
- **Negotiation:** Strategy, concession analysis, market data interpretation
- **Email:** Communication patterns, position extraction, action item identification
- **Closing:** Closing mechanics, condition tracking, funds flow preparation

### 7.4 System Expert Agent

Platform knowledge expert. Knows all data locations, workflows, tools, configuration. Used for onboarding, troubleshooting, setup.

### 7.5 Agent Communication Protocol

```typescript
interface AgentMessage {
  from: 'manager' | 'specialist' | 'system_expert' | 'observer';
  to: 'manager' | 'specialist' | 'system_expert' | 'observer' | 'human';
  type: 'task_assignment' | 'task_result' | 'escalation' | 'notification'
    | 'query' | 'recommendation' | 'alert';
  content: {
    summary: string;
    detail: Record<string, any>;
    confidence: number;
    reasoning?: string;
    alternatives?: any[];
  };
  priority: 'routine' | 'normal' | 'high' | 'urgent';
  requires_response: boolean;
  deal_id: string;
  timestamp: string;
}
```

Hub-and-spoke model: Manager is the hub. All specialist results flow to Manager. Specialists never communicate directly with each other or with the human.

### 7.6 Agent Activation Triggers

**Event-driven:** Significance 1-2: Layer 1-2 only. Significance 3: Manager lightweight check. Significance 4-5: Manager full activation.

**Scheduled:** Morning briefing (daily), end-of-day review (daily), weekly strategic assessment, deadline proximity check (daily).

**On-demand:** Chat interface, approval queue (requesting analysis on Tier 3 item).

### 7.7 Agent Cost Control

```typescript
interface AgentActivation {
  id: string;
  deal_id: string;
  agent_type: 'manager' | 'specialist' | 'system_expert';
  trigger_type: 'event' | 'scheduled' | 'on_demand';
  trigger_source: string;
  input_tokens: number;
  output_tokens: number;
  total_cost_usd: number;
  model_used: string;
  steps: number;
  tool_calls: number;
  specialist_invocations: number;
  started_at: string;
  completed_at: string;
  duration_ms: number;
}
```

**Cost controls:**
- Per-deal daily token budget (default $50/day)
- Per-activation token limit (default 200K input, 20K output)
- Multi-step limit (default 10 steps per investigation)
- Specialist invocation limit (default 3 per Manager activation)

**Monitoring levels:**
- **Conservative:** On-demand + scheduled only. ~$10-20/day.
- **Standard:** + event-driven for significance 4-5. ~$30-50/day.
- **Aggressive:** + event-driven for significance 3+. ~$50-100/day.

---

## 8. SKILLS SYSTEM

### 8.1 Skills Architecture

```
/skills/
├── static/                        ← Pre-built, ships with system
│   ├── domain/                    ← M&A legal knowledge
│   ├── process/                   ← System operation procedures
│   └── meta/                      ← Higher-order reasoning
├── adaptive/                      ← Learned from experience
│   ├── partner-preferences/
│   ├── counterparty-patterns/
│   ├── deal-type-refinements/
│   └── firm-conventions/
└── dynamic/                       ← Created on-the-fly by agents
    ├── generated/
    └── pending-review/
```

### 8.2 Skill Format

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
[Purpose description]

## Methodology
### Step 1: [...]
### Step 2: [...]

## Common Patterns
[...]

## Common Mistakes to Avoid
[...]

## Examples
[...]
```

### 8.3 Static Skills (Pre-Built Library)

**Domain skills:** markup-analysis, provision-drafting, negotiation-strategy, dd-methodology, closing-mechanics, disclosure-schedules, regulatory-filings, cross-reference-management, defined-term-consistency, indemnification-structures, purchase-price-mechanics, employment-matters, ip-assessment, financial-statement-review, third-party-coordination

**Process skills:** action-chain-creation, approval-queue-formatting, email-communication, document-versioning, closing-coordination, client-communication

**Meta skills:** problem-decomposition, confidence-calibration, escalation-judgment, gap-recognition, skill-scoping, objective-conflict-resolution

### 8.4 Adaptive Skills

Created from feedback patterns (3+ similar modifications). Stored per-partner, per-firm, per-deal-type. Automatically loaded by Manager when configuring specialists.

### 8.5 Dynamic Skills

Gap recognition → Scope definition → Research → Build (knowledge or code skill via Coding Agent) → Test (Testing Agent) → Deploy → Archive.

### 8.6 Coding Agent and Testing Agent

**Coding Agent:** File system access, bash, git. Follows codebase patterns, writes tests, commits changes.

**Testing Agent:** Test runner, file system access. Never modifies source code. Runs tests, evaluates, flags regressions.

---

## 9. PARTNER CONSTITUTION & GOVERNANCE

### 9.1 Constitution Structure

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
  description: string;
  rule: string;
  consequence: 'block_and_escalate';
}

interface Preference {
  id: string;
  category: 'drafting' | 'negotiation' | 'communication' | 'process' | 'risk_tolerance';
  description: string;
  default_behavior: string;
  override_condition: string;
}

interface StrategicDirective {
  id: string;
  description: string;
  applies_to: string[];
  priority: 'primary' | 'secondary';
}
```

### 9.2 Constitution Creation: Conversational Encoding

Partner speaks naturally about deal approach → Manager + System Expert structure into constitutional provisions → Partner confirms. Living document updated throughout the deal.

### 9.3 Constitution Enforcement

- **Hard constraints:** Inviolable. Violations blocked and escalated to Tier 3.
- **Preferences:** Defaults. Deviation requires justification.
- **Strategic directives:** Interpretive guidance for tie-breaking decisions.

Consequence resolver checks all action chains against constitution before routing to approval queue.

---

## 10. PRECEDENT INTELLIGENCE PIPELINE

### 10.1 Overview

The precedent database provides data-driven intelligence about deal terms, provision formulations, and negotiation patterns.

Core schema: `provision_types`, `provision_variants`, `provision_formulations` (existing tables from Phase 2).

### 10.2 EDGAR Ingestion Pipeline

```
EDGAR Search → Download Exhibits → Extract Text → Segment Provisions
     → Classify Provisions → Score Quality → Embed → Store
```

### 10.3 Quality Scoring

```typescript
interface ProvisionQualityScore {
  composite: number;        // weighted average
  firm_tier: number;        // from firm identification lookup
  deal_size: number;        // from transaction value
  recency: number;          // filing date decay function
  structural_quality: number; // drafting quality checks (Layer 2)
  corpus_alignment: number;  // similarity to type/variant centroid
  negotiation_survival: number; // if detectable
}
```

Firm tier lookup table (Wachtell=1.0, Sullivan=1.0, ... regional=0.50, unknown=0.40).

### 10.4 Quality-Weighted Retrieval

```typescript
// Retrieval scoring:
// final_score = (0.6 * semantic_similarity) + (0.4 * quality_score)
// Filtered by: deal_profile match, min_quality threshold
// Boosted by: recency, deal_size proximity, industry match
```

### 10.5 Dynamic Quality Learning

- Formulation used + approved → quality score increases
- Formulation used + rewritten → quality score decreases, partner's version stored as new high-quality formulation
- Used across multiple deals → significant quality increase
- 6 months non-use → flagged for review

### 10.6 Existing Implementation (Phases 0-2)

Already built and working:
- Voyage embeddings with pgvector (1024 dimensions)
- 10 EDGAR precedent deals harvested
- 50 SPA provision types with variants seeded
- Provision segmenter (47 sections)
- Basic semantic search via `provision_formulations.text_embedding`

Phase 10 extends this with automated quality scoring, EDGAR discovery pipeline, and quality-weighted retrieval.

---

## 11. DOCUMENT PROCESSING PIPELINE

### 11.1 Document Reading (EXISTING)

```typescript
// packages/integrations/src/documents/docx-reader.ts
import mammoth from 'mammoth';
export async function extractTextFromDocx(buffer: Buffer): Promise<string> { ... }
export async function extractHtmlFromDocx(buffer: Buffer): Promise<string> { ... }

// packages/integrations/src/documents/pdf-reader.ts
import pdfParse from 'pdf-parse';
export async function extractTextFromPdf(buffer: Buffer): Promise<string> { ... }
```

### 11.2 Document Writing (EXISTING)

```typescript
// packages/integrations/src/documents/docx-writer.ts
import { Document, Packer, Paragraph, TextRun } from 'docx';
export async function generateDocument(content: DocumentContent): Promise<Buffer> { ... }
```

### 11.3 Document Generation Pipeline (EXISTING)

- **v1 (Template):** Select template from database. No LLM.
- **v2 (Precedent Applied):** LLM compares template vs precedent, provision by provision. Model: `claude-sonnet-4-5-20250929`.
- **v3 (Scrubbed):** String replacement (party names, amounts, dates) + LLM cross-reference verification. Model: `claude-sonnet-4-5-20250929`.
- **v4 (Adapted):** LLM analyzes CIM + DD findings and proposes modifications. Model: `claude-opus-4-6`.

### 11.4 Provision Segmentation (EXISTING)

Breaks documents into 30-60 tagged sections with provision type codes.

### 11.5 Markup Analysis

```typescript
interface MarkupAnalysis {
  changes: Array<{
    provision_type: string;
    change_type: 'variant_change' | 'threshold_change' | 'language_refinement' | 'addition' | 'deletion';
    original_text: string;
    new_text: string;
    directional_impact: 'buyer_favorable' | 'seller_favorable' | 'neutral';
    severity: 'critical' | 'significant' | 'minor';
    recommendation: string;
    precedent_support: string;
  }>;
  summary: string;
  recommended_response_strategy: string;
}
```

### 11.6 Redline Generation

Prototype: text-level diffing via LLM → structured change summary (not OOXML tracked changes).

---

## 12. EMAIL & COMMUNICATION INTEGRATION

### 12.1 Microsoft Graph API Usage (EXISTING)

| Operation | Graph API Endpoint | Purpose |
|-----------|-------------------|---------|
| List messages | `GET /me/mailFolders/inbox/messages` | Fetch emails |
| Get message | `GET /me/messages/{id}` | Full email with body |
| Get attachment | `GET /me/messages/{id}/attachments` | Download attachments |
| Send email | `POST /me/sendMail` | Send on behalf of user |
| Search messages | `GET /me/messages?$search=...` | Search deal-related emails |
| Create subscription | `POST /subscriptions` | Webhook for new emails |

### 12.2 Email Processing Flow (EXISTING)

1. **Sync:** Fetch new emails from inbox
2. **Classify:** Multi-signal classification (sender, subject, attachments, LLM body analysis)
3. **Store:** Save to `deal_emails` with embedding
4. **Process attachments:** Upload to Storage + Drive, trigger redline if markup
5. **Surface:** Show in deal dashboard

### 12.3 V2 Email Enhancements (Phase 5)

**Position extraction:** When email contains counterparty position language, extract and create/update `negotiation_positions` records. Layer 2 API call.

**Action item identification:** Extract action items from email body, create `client_action_items` or internal task records.

**Event emission:** Every classified email emits propagation events:
- `email.received` → `email.classified` → `email.position_extracted` / `email.action_item_identified` / `email.attachment_processed`

---

## 13. GOOGLE DRIVE INTEGRATION

### 13.1 Folder Structure per Deal (EXISTING)

```
[Deal Name] ([Code Name])/
├── 00_Deal_Overview/
│   ├── Term_Sheet/
│   └── Deal_Parameters/
├── 01_Organizational/
├── 02_Purchase_Agreement/
│   ├── Versions/
│   └── Redlines/
├── 03_Ancillary_Agreements/
├── 04_Employment/
├── 05_Regulatory/
├── 06_Financing/
├── 07_Third_Party/
├── 10_Correspondence/
├── 11_Due_Diligence/
└── 99_Closing/
```

### 13.2 Implementation (EXISTING)

- Uses `googleapis` with Service Account authentication
- Service account: `ma-deal-os@ma-deal-os.iam.gserviceaccount.com`
- Root folder: `GOOGLE_DRIVE_ROOT_FOLDER_ID`
- Polling-based sync (60 second intervals)
- Conflict detection via hash comparison

---

## 14. GAP COVERAGE: NEW WORKFLOWS

### 14.1 Disclosure Schedule Management (Phase 5)

**Tables:** `disclosure_schedules`, `disclosure_entries`

**Workflow:**
1. SPA reps drafted → auto-generate disclosure schedule for each "except as set forth in Schedule X" reference
2. Generate plain-language questionnaire from rep text (Layer 2)
3. Send questionnaire to client
4. Parse client responses → map to schedule entries
5. Cross-reference DD findings → pre-populate entries
6. When reps change in negotiation → re-evaluate schedules
7. Gap detection: DD finding exists but no corresponding disclosure

**Events:** `disclosure.schedule_updated`, `disclosure.gap_identified`, `disclosure.client_response_received`, `disclosure.cross_reference_broken`

### 14.2 Negotiation State Tracker (Phase 5)

**Table:** `negotiation_positions`

Unified view of where each provision stands. Updated from:
- Email position extraction
- Markup analysis
- Manual updates

**Events:** `negotiation.position_updated`, `negotiation.concession_detected`, `negotiation.impasse_detected`

### 14.3 Third-Party Management (Phase 6)

**Table:** `deal_third_parties`

Tracks escrow agents, R&W brokers, lender's counsel, accountants, etc. with deliverables and communication history.

**Events:** `third_party.deliverable_received`, `third_party.deliverable_overdue`, `third_party.communication_received`

### 14.4 Client Management (Phase 6)

**Tables:** `client_contacts`, `client_action_items`, `client_communications`

Automated communication types:
- Weekly status updates (Tier 3 approval)
- Action item requests
- Decision memos
- DD notifications
- Closing preparation instructions

**Events:** `client.action_item_created`, `client.action_item_completed`, `client.communication_needed`, `client.approval_requested`

### 14.5 Closing Mechanics (Phase 6)

**Tables:** `closing_checklists`, `closing_conditions`, `closing_deliverables`, `post_closing_obligations`

**Workflow:**
1. Deal status → 'closing' → generate closing checklist from SPA conditions (Layer 2)
2. Generate closing deliverables from SPA + ancillaries
3. Track condition satisfaction with evidence
4. Auto-generate funds flow memo
5. Signature page tracking
6. Closing readiness dashboard (traffic light)
7. Post-closing obligations generated from executed agreements

**Events:** `closing.condition_satisfied`, `closing.condition_waived`, `closing.deliverable_received`, `closing.blocking_issue_identified`

### 14.6 Negotiation Strategy Module (Phase 5)

**Table:** `negotiation_roadmaps`

Manager Agent creates initial roadmap at deal kickoff. Updated after each negotiation round. Used for all strategic recommendations.

### 14.7 Knowledge Capture (Phase 14)

**Table:** `deal_knowledge`

Auto-generated after deal close: negotiation outcomes, usage/acceptance data, process timeline data. Optional partner debrief.

---

## 15. OBSERVER & SELF-IMPROVEMENT SYSTEM

### 15.1 Overview

The Observer watches deal operations, identifies weaknesses, implements fixes, and validates improvements during operation.

### 15.2 Observer Agent Architecture

Independent from deal agent hierarchy. Has access to all events, action chains, approval outcomes, email traffic, token consumption, timing data, feedback events, git history.

**Authority:** Can modify any file (skills, prompts, code, schema, config). Every modification is a git commit. Cannot force-push or rebase.

**Requires human approval to modify:** Constitution enforcement mechanism, approval tier framework, Observer's own evaluation criteria, this list.

### 15.3 Evaluation Criteria

**Accuracy:** term sheet extraction, checklist completeness, markup analysis, DD finding detection, cross-reference validity, defined term consistency, disclosure schedule completeness.

**Efficiency:** tokens per action chain, redundant API calls, agent activation efficiency, processing times, unnecessary agent activations.

**Quality:** human modification rate, rejection rate, provision drafting quality, email appropriateness, approval queue clarity, strategic recommendation quality.

**Coverage:** deal phases handled, workflow gaps, missing event types, missing consequence maps, unhandled email types.

**Coordination:** propagation accuracy, cross-workstream detection, disclosure schedule sync, negotiation state accuracy, timeline accuracy.

### 15.4 Improvement Loop

Detect → Diagnose → Prescribe → Implement (via Coding Agent) → Test (via Testing Agent) → Deploy (git commit) → Verify (watch for recurrence).

Max 3 iterations per fix attempt, then escalate to human.

### 15.5 Observer Notification Channel

Separate from deal approval queue. Shows changes with diffs, allows human to review and revert asynchronously.

---

## 16. SIMULATION FRAMEWORK

### 16.1 Architecture

Two platform instances with independent databases. Communicate via real email. Client agents simulate business principals. Third-party agents simulate escrow agents, R&W brokers, etc. Simulation clock controls time progression.

### 16.2 Seeded Scenario (Initial)

**Target:** Mid-market tech company ($120M revenue, $25M EBITDA, 400 employees, Enterprise SaaS, Delaware).

**Seeded issues (8):**
1. Material contract CoC provision ($18M customer, 30-day cure)
2. Employment misclassification (25 contractors, $2-4M exposure)
3. Patent rejection on first office action
4. Environmental remediation ($500K-$2M)
5. Founder undisclosed consulting conflict
6. Aggressive revenue recognition (key audit matter)
7. Employee non-competes from prior employers
8. JDA assignment consent (unresponsive counterparty)

**Term sheet:** Stock purchase $150M, $130M cash + $20M earnout, $7.5M escrow, R&W insurance, HSR required.

**50-100 seeded VDR documents** across corporate, contracts, financial, employment, IP, real estate, environmental, litigation, insurance.

### 16.3 Simulation Execution Protocol

Phase 0 (Setup) → Phase 1 (Intake) → Phase 2 (First Draft) → Phase 3 (DD + Markup) → Phase 4 (Negotiation Rounds) → Phase 5 (Disclosure Schedules) → Phase 6 (Third-Party Coordination) → Phase 7 (Closing Preparation) → Phase 8 (Closing) → Phase 9 (Post-Closing)

### 16.4 Simulation Evaluation Report

```typescript
interface SimulationReport {
  run_id: string;
  scenario: string;
  accuracy_scores: AccuracyCriteria;
  efficiency_scores: EfficiencyCriteria;
  quality_scores: QualityCriteria;
  coverage_scores: CoverageCriteria;
  coordination_scores: CoordinationCriteria;
  total_token_cost: number;
  observer_changes: ObserverChange[];
  remaining_gaps: string[];
  recommendations: string[];
}
```

---

## 17. KNOWLEDGE & LEARNING PIPELINE

### 17.1 Feedback Event Capture

Every human action generates a feedback event:

```typescript
interface FeedbackEvent {
  id: string;
  deal_id: string;
  user_id: string;
  event_type: 'approved' | 'modified' | 'rejected' | 'escalated' | 'annotation';
  target_type: string;
  target_id: string;
  original_output: Record<string, any>;
  modified_output?: Record<string, any>;
  modification_delta?: Record<string, any>;
  annotation?: string;
  agent_context_summary: string;
  agent_confidence: number;
  created_at: string;
}
```

Frictionless annotation: "Brief note on why? (optional)" after any modification.

### 17.2 Learning Pipeline

- **Update precedent quality scores** from approval/rejection patterns
- **Generate adaptive skills** when 3+ similar modifications detected
- **Add test cases** from every rejected/modified action
- **Feed Observer** for systematic pattern detection

### 17.3 Conversational Knowledge Encoding

Chat interface for expert knowledge capture. Agent interviews partner, structures responses into skills and scenario definitions. Available during onboarding and post-deal debrief.

---

## 18. API ROUTES

### 18.1 Existing Routes (Phases 0-2 — BUILT)

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/deals` | List all deals |
| `POST` | `/api/deals` | Create new deal |
| `GET` | `/api/deals/[dealId]` | Get deal details |
| `PATCH` | `/api/deals/[dealId]` | Update deal |
| `GET` | `/api/deals/[dealId]/checklist` | Get checklist items |
| `POST` | `/api/deals/[dealId]/parse-term-sheet` | Parse term sheet |
| `GET` | `/api/deals/[dealId]/documents` | List document versions |
| `POST` | `/api/deals/[dealId]/documents/generate` | Generate v1/v2/v3 |
| `GET` | `/api/deals/[dealId]/documents/[docId]` | Get document detail |
| `POST` | `/api/provisions/seed` | Seed provision types |

### 18.2 New Routes — Event Backbone (Phase 3)

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/deals/[dealId]/events` | List propagation events |
| `GET` | `/api/deals/[dealId]/events/[eventId]` | Get event with chain |

### 18.3 New Routes — Approval Queue (Phase 4)

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/approval-queue` | List pending approvals |
| `GET` | `/api/approval-queue/[chainId]` | Get action chain detail |
| `POST` | `/api/approval-queue/[chainId]/approve` | Approve all actions |
| `POST` | `/api/approval-queue/[chainId]/actions/[actionId]/approve` | Approve single |
| `POST` | `/api/approval-queue/[chainId]/actions/[actionId]/reject` | Reject single |
| `POST` | `/api/approval-queue/[chainId]/actions/[actionId]/modify` | Modify and approve |
| `GET` | `/api/approval-queue/stats` | Queue statistics |

### 18.4 New Routes — Approval Policy (Phase 4)

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/deals/[dealId]/approval-policy` | Get policy |
| `PUT` | `/api/deals/[dealId]/approval-policy` | Update policy |
| `GET` | `/api/approval-policy/defaults` | Role-based defaults |

### 18.5 New Routes — Agent Management (Phase 4, 7)

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/deals/[dealId]/agent/activate` | On-demand activation |
| `GET` | `/api/deals/[dealId]/agent/activations` | List activations |
| `GET` | `/api/deals/[dealId]/agent/cost-summary` | Token cost summary |
| `PUT` | `/api/deals/[dealId]/agent/monitoring-level` | Set monitoring level |
| `POST` | `/api/deals/[dealId]/agent/briefing` | Generate morning briefing |
| `POST` | `/api/deals/[dealId]/agent/chat` | Agent chat endpoint |

### 18.6 New Routes — Constitution (Phase 9)

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/deals/[dealId]/constitution` | Get constitution |
| `PUT` | `/api/deals/[dealId]/constitution` | Update constitution |
| `POST` | `/api/deals/[dealId]/constitution/encode` | Conversational encoding |

### 18.7 New Routes — Disclosure Schedules (Phase 5)

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/deals/[dealId]/disclosure-schedules` | List schedules |
| `GET` | `/api/deals/[dealId]/disclosure-schedules/[scheduleId]` | Get with entries |
| `POST` | `/api/deals/[dealId]/disclosure-schedules/generate` | Generate from SPA |
| `POST` | `/api/deals/[dealId]/disclosure-schedules/[scheduleId]/entries` | Add entry |
| `POST` | `/api/deals/[dealId]/disclosure-schedules/cross-reference` | Cross-reference check |

### 18.8 New Routes — Negotiation (Phase 5)

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/deals/[dealId]/negotiation/positions` | All positions |
| `GET` | `/api/deals/[dealId]/negotiation/roadmap` | Get roadmap |
| `POST` | `/api/deals/[dealId]/negotiation/roadmap/generate` | Generate roadmap |

### 18.9 New Routes — Closing (Phase 6)

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/deals/[dealId]/closing` | Get closing checklist |
| `POST` | `/api/deals/[dealId]/closing/generate` | Generate from SPA |
| `PATCH` | `/api/deals/[dealId]/closing/conditions/[conditionId]` | Update condition |
| `PATCH` | `/api/deals/[dealId]/closing/deliverables/[deliverableId]` | Update deliverable |
| `GET` | `/api/deals/[dealId]/closing/funds-flow` | Funds flow memo |
| `GET` | `/api/deals/[dealId]/post-closing` | Post-closing obligations |

### 18.10 New Routes — Client Management (Phase 6)

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/deals/[dealId]/client/contacts` | List contacts |
| `POST` | `/api/deals/[dealId]/client/contacts` | Add contact |
| `GET` | `/api/deals/[dealId]/client/action-items` | List action items |
| `POST` | `/api/deals/[dealId]/client/action-items` | Create action item |
| `GET` | `/api/deals/[dealId]/client/communications` | List communications |
| `POST` | `/api/deals/[dealId]/client/communications/generate` | Generate update |

### 18.11 New Routes — Third Parties (Phase 6)

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/deals/[dealId]/third-parties` | List third parties |
| `POST` | `/api/deals/[dealId]/third-parties` | Add third party |
| `PATCH` | `/api/deals/[dealId]/third-parties/[tpId]` | Update status |

### 18.12 New Routes — Knowledge & Feedback (Phase 14)

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/feedback` | Submit feedback event |
| `GET` | `/api/deals/[dealId]/knowledge` | Get knowledge entries |
| `POST` | `/api/knowledge/encode` | Conversational encoding |
| `GET` | `/api/precedent/quality-report` | Quality distribution |

### 18.13 New Routes — Precedent (Phase 10)

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/precedent/whats-market` | Market data for provision |
| `POST` | `/api/precedent/ingest` | Ingest new precedent |
| `POST` | `/api/precedent/search` | Semantic search (existing, enhanced) |

### 18.14 New Routes — Simulation/Observer (Phase 11, 12)

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/simulation/status` | Simulation state |
| `GET` | `/api/simulation/observer/changelog` | Observer changes |
| `POST` | `/api/simulation/observer/revert/[commitHash]` | Revert change |
| `GET` | `/api/simulation/report` | Evaluation report |

---

## 19. WEB PORTAL PAGES & COMPONENTS

### 19.1 Existing Pages (Phases 0-2 — BUILT)

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing | Login |
| `/deals` | Deal List | Cards with health indicators |
| `/deals/new` | New Deal | Create form + term sheet upload |
| `/deals/[id]` | Deal Dashboard | Command center |
| `/deals/[id]/checklist` | Checklist | Lifecycle stages table |
| `/deals/[id]/documents` | Documents | Version timelines |
| `/deals/[id]/documents/[docId]` | Document Detail | Version history, analysis |

### 19.2 New Pages (Phases 3-14)

| Route | Page | Phase | Description |
|-------|------|-------|-------------|
| `/approval-queue` | Approval Queue | 4 | Card-based pending approvals |
| `/deals/[id]/negotiation` | Negotiation State | 5 | Provision positions, history |
| `/deals/[id]/disclosure-schedules` | Disclosure Schedules | 5 | Schedules, entries, gaps |
| `/deals/[id]/closing` | Closing Dashboard | 6 | Traffic light conditions view |
| `/deals/[id]/client` | Client Management | 6 | Contacts, action items, comms |
| `/deals/[id]/third-parties` | Third Parties | 6 | Third-party tracking |
| `/deals/[id]/agent` | Agent Chat | 7 | Chat with Manager Agent |
| `/deals/[id]/constitution` | Constitution | 9 | View/edit constitutional provisions |
| `/deals/[id]/agent/cost` | Agent Cost | 4 | Token spend dashboard |
| `/observer` | Observer Dashboard | 11 | System improvement log |
| `/simulation` | Simulation | 12 | Simulation control and reports |

### 19.3 UI Component Library

Uses shadcn/ui: DataTable, Card, Badge, Tabs, Sheet, Dialog, Command, Progress.

---

## 20. IMPLEMENTATION PHASES

### Phase 0: Scaffold & Infrastructure — COMPLETED
- Monorepo with pnpm + Turborepo
- All packages created
- Next.js with Tailwind + shadcn/ui
- Drizzle ORM with Supabase
- 14 database tables
- NextAuth with Microsoft provider
- Test report: `docs/test-results/phase0_test_report.md`

### Phase 1: Core Deal Flow — COMPLETED
- Deal CRUD API + UI
- Term sheet parser (Claude API)
- Checklist rules engine + generation
- Google Drive folder creation
- Test deal "Project Mercury" created
- Test report: `docs/test-results/phase1_test_report.md`

### Phase 2: Document Generation Pipeline — COMPLETED
- 50 SPA provision types seeded
- Template storage + selection
- v1/v2/v3 generation pipeline
- Provision segmentation (47 sections)
- EDGAR precedent database (10 deals)
- DOCX generation
- Google Drive upload (code correct, env blocked)
- Test report: `docs/test-results/phase2_test_report.md`

### Phase 3: MCP Infrastructure + Event Backbone — TO BUILD
Spec Sections: 3 (Three-Layer Architecture), 5 (Event Propagation Backbone), 7.2-7.5 (MCP tools)
Skill file: `skills/phase-03.md`

### Phase 4: Approval Framework + Agent Invocation — TO BUILD
Spec Sections: 6 (Approval Framework), 7.6-7.7 (Agent Activation/Cost)
Skill file: `skills/phase-04.md`

### Phase 5: Disclosure Schedules, Negotiation, Email Enhancement — TO BUILD
Spec Sections: 14.1-14.2 (Disclosure, Negotiation), 14.6 (Negotiation Strategy), 12 (Email Enhancement)
Skill file: `skills/phase-05.md`

### Phase 6: Closing, Client Management, Third-Party Tracking — TO BUILD
Spec Sections: 14.3-14.5 (Third Parties, Client, Closing)
Skill file: `skills/phase-06.md`

### Phase 7: Agent Layer (Manager, Specialists, System Expert) — TO BUILD
Spec Sections: 7 (Agent Architecture), 9 (Constitution — referenced by Manager)
Skill file: `skills/phase-07.md`

### Phase 8: Skills System — TO BUILD
Spec Sections: 8 (Skills System)
Skill file: `skills/phase-08.md`

### Phase 9: Partner Constitution — TO BUILD
Spec Sections: 9 (Partner Constitution & Governance)
Skill file: `skills/phase-09.md`

### Phase 10: Precedent Intelligence Pipeline — TO BUILD
Spec Sections: 10 (Precedent Intelligence)
Skill file: `skills/phase-10.md`

### Phase 11: Observer, Coding Agent, Testing Agent — TO BUILD
Spec Sections: 15 (Observer & Self-Improvement), 8.6 (Coding/Testing Agents)
Skill file: `skills/phase-11.md`

### Phase 12: Simulation Framework — TO BUILD
Spec Sections: 16 (Simulation Framework)
Skill file: `skills/phase-12.md`

### Phase 13: Mobile Approval Interface — TO BUILD
Spec Sections: 6.4 (Mobile-First Design)
Skill file: `skills/phase-13.md`

### Phase 14: Knowledge Capture + Learning Pipeline — TO BUILD
Spec Sections: 17 (Knowledge & Learning), 14.7 (Knowledge Capture)
Skill file: `skills/phase-14.md`

---

## 21. COST MODEL & TOKEN ECONOMICS

### 21.1 Estimated Token Costs per Deal Phase

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

### 21.2 Cost Optimization

- Cache frequently-used context
- Use Sonnet for Layer 2, Opus only for Layer 3 strategic synthesis
- Batch Layer 2 calls where possible
- Implement token budgets per deal with alerting at 80%
- Graceful degradation: fall back to Layer 1-2 if budget exhausted

---

## 22. ENVIRONMENT & CREDENTIALS

### 22.1 Required Environment Variables

```bash
# SUPABASE
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
DATABASE_URL=postgresql://postgres:...@...supabase.co:5432/postgres

# AUTHENTICATION
NEXTAUTH_SECRET=         # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=xxxxx

# AI / LLM
ANTHROPIC_API_KEY=sk-ant-...
EMBEDDING_PROVIDER=voyage
EMBEDDING_MODEL=voyage-3
EMBEDDING_DIMENSIONS=1024

# GOOGLE DRIVE (Service Account)
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./config/google-service-account.json
GOOGLE_DRIVE_ROOT_FOLDER_ID=

# APPLICATION
NODE_ENV=development
```

### 22.2 Environment Constraints

**Database: Supabase via REST API for testing**
- Direct PostgreSQL connection (`db.*.supabase.co`) does NOT resolve in Claude Code's environment
- Do NOT attempt `drizzle-kit push` — schema managed externally
- For ALL testing queries, use the Supabase JS client with the service role key
- Production code uses Drizzle ORM with `DATABASE_URL`

**API Keys:**
- Anthropic API: Real key, make real calls. Do not mock.
- Google Drive: Real service account. Test real file operations.
- Microsoft/Outlook: OAuth requires browser. Build correctly, verify config, cannot complete handshake in Claude Code environment.

**Credentials Location:**
All credentials in `.env.local` at repo root (copied to `apps/web/.env.local` and `packages/db/.env.local`).

### 22.3 Package Management

- Use `pnpm` (not npm, not yarn)
- Install in correct package: `pnpm add <pkg> --filter @ma-deal-os/core`
- Turborepo monorepo structure

---

*END OF SPECIFICATION*

# SPEC.md ADDENDUM — Learning System Phases (15-20)

## Add these phase descriptions to SPEC.md Section 20 (Implementation Phases)

---

### Phase 15: Learning Infrastructure — Database + Configuration + Model Routing
Creates all 16 learning database tables (signal collection, patterns, communication, distillation, governance), seeds default configuration, and implements the model routing service that dynamically selects Claude Sonnet vs. Opus per task type based on performance data. Integrates model router into the existing agent invocation framework.
**Tables:** self_evaluations, consistency_checks, variant_comparisons, outcome_signals, exemplar_library, exemplar_comparisons, learned_patterns, reflection_runs, skill_file_versions, generated_tools, deal_intelligence, agent_requests, meta_interventions, distillation_trials, model_routing_config, learning_audit_log, learning_configuration
**Skill file:** skills/phase-15.md

### Phase 16: Signal Collection — Self-Evaluation, Consistency Checks, Outcome Tracking
Implements three of five signal sources. Every agent output is automatically scored by a separate evaluator instance against agent-specific rubrics. A nightly Consistency Agent compares all work products across a deal to detect contradictions. Downstream outcome tracking monitors what happens after agent outputs are delivered (ignored items, reopened positions, rewritten schedules).
**Key files:** packages/ai/src/evaluation/
**Skill file:** skills/phase-16.md

### Phase 17: Variant Comparison, Exemplar Library, Distillation Pipeline
Implements the remaining signal sources and the full distillation pipeline. Variant comparison generates 3 strategy variants per task (conservative/standard/aggressive), evaluates all three, and selects the best. The exemplar library stores gold-standard outputs (external firm exemplars + high-scoring Opus outputs). The distillation pipeline runs shadow tests of Sonnet + exemplars against Opus baselines and manages progressive model handoff as Sonnet quality improves.
**Key files:** packages/ai/src/distillation/, packages/ai/src/evaluation/
**Skill file:** skills/phase-17.md

### Phase 18: Reflection Engine + Pattern Lifecycle Management
Implements the Reflection Engine — an Opus-powered process that runs nightly or per-milestone, reading all collected signals and discovering actionable patterns. Patterns progress through a defined lifecycle (proposed → confirmed → established → hard_rule or decayed → retired) with confidence scores driven by supporting vs. contradicting signals. Human approval required for hard rule promotion.
**Key files:** packages/ai/src/learning/
**Skill file:** skills/phase-18.md

### Phase 19: Knowledge Injection + Deal Intelligence + Agent Communication
Closes the learning loop. Creates the 5-layer prompt assembler that injects constitutional rules, firm knowledge, learned patterns, deal intelligence, and task exemplars into every agent invocation. Implements the deal intelligence shared context store (agents read/write per-deal insights with conflict resolution) and agent-to-agent request delegation (with deadlock prevention).
**Key files:** packages/ai/src/prompts/, packages/ai/src/communication/
**Skill file:** skills/phase-19.md

### Phase 20: Meta Agent + Control Plane + Learning Dashboard
Implements the Meta Agent (Opus-only unsticker with four response modes: reroute, decompose, synthesize, escalate). Creates the control plane UI (model routing settings, learning toggles, spend controls) and the learning dashboard (overview metrics, pattern explorer, agent performance, consistency log, audit trail, "How It Works" explanation page).
**Key files:** packages/ai/src/agents/meta/, apps/web/src/app/learning/, apps/web/src/app/settings/
**Skill file:** skills/phase-20.md
