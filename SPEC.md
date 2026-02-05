# M&A Deal Operating System — Implementation Specification

## For Claude Code Implementation in a Single GitHub Monorepo

**Version:** 0.1 (Prototype / Testing)
**Date:** February 5, 2026

---

## TABLE OF CONTENTS

1. [Pre-Implementation Setup Checklist](#1-pre-implementation-setup-checklist)
2. [Required Keys & Credentials](#2-required-keys--credentials)
3. [Technology Stack](#3-technology-stack)
4. [Repository Structure](#4-repository-structure)
5. [Database Schema (Supabase)](#5-database-schema-supabase)
6. [Backend API Specification](#6-backend-api-specification)
7. [Cowork Plugin Specification](#7-cowork-plugin-specification)
8. [Web Portal Specification](#8-web-portal-specification)
9. [Google Drive Integration](#9-google-drive-integration)
10. [Outlook Email Integration](#10-outlook-email-integration)
11. [AI/LLM Pipeline Specification](#11-aillm-pipeline-specification)
12. [Document Processing Pipeline](#12-document-processing-pipeline)
13. [Implementation Phases](#13-implementation-phases)
14. [Environment Variables Reference](#14-environment-variables-reference)

---

## 1. PRE-IMPLEMENTATION SETUP CHECKLIST

Complete these steps IN ORDER before Claude Code begins building. Each step produces one or more environment variables or credentials needed by the codebase. Do not skip any step.

### Step 1: GitHub Repository

- [ ] Create a new GitHub repo (e.g., `ma-deal-os`)
- [ ] Clone locally
- [ ] This spec (`SPEC.md`) goes in the repo root

### Step 2: Supabase Project

- [ ] Go to https://supabase.com → Sign up / Log in
- [ ] Click "New Project"
- [ ] Name: `ma-deal-os` (or similar)
- [ ] Set a strong database password — **save it, you'll need it**
- [ ] Region: choose closest to you
- [ ] Wait for project to provision (~2 minutes)
- [ ] Go to **Settings → API** and copy:
  - `SUPABASE_URL` (looks like `https://xxxxx.supabase.co`)
  - `SUPABASE_ANON_KEY` (public key for client-side)
  - `SUPABASE_SERVICE_ROLE_KEY` (secret key for backend — never expose to client)
- [ ] Go to **Settings → Database** and copy:
  - `DATABASE_URL` (direct Postgres connection string, for migrations)
- [ ] Enable the **pgvector** extension:
  - Go to **Database → Extensions** → search "vector" → Enable
- [ ] Enable the **pg_trgm** extension (for fuzzy text search):
  - Same place → search "pg_trgm" → Enable

### Step 3: Anthropic API Key

- [ ] Go to https://console.anthropic.com
- [ ] Create an API key
- [ ] Copy as `ANTHROPIC_API_KEY`
- [ ] Ensure your account has credits or a payment method
- [ ] Note: we will use `claude-sonnet-4-5-20250929` for most tasks and `claude-opus-4-6` for complex reasoning

### Step 4: Google Cloud Project (for Google Drive)

- [ ] Go to https://console.cloud.google.com
- [ ] Create a new project: `ma-deal-os`
- [ ] Enable these APIs (APIs & Services → Library):
  - Google Drive API
  - Google Docs API
  - Google Sheets API (optional, useful for checklists)
- [ ] Create OAuth 2.0 credentials:
  - Go to **APIs & Services → Credentials → Create Credentials → OAuth Client ID**
  - Application type: **Web application**
  - Authorized redirect URIs: add `http://localhost:3000/api/auth/callback/google` and your production URL later
  - Copy `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- [ ] Configure OAuth consent screen:
  - User Type: External (or Internal if using Google Workspace)
  - App name: `M&A Deal OS`
  - Scopes: add `https://www.googleapis.com/auth/drive`, `https://www.googleapis.com/auth/documents`
  - Add your email as a test user
- [ ] Create a dedicated Google Drive folder structure for testing:
  ```
  M&A Deal OS/
  ├── _Templates/
  │   ├── SPA_Template_PE_Buyer.docx
  │   ├── SPA_Template_Strategic_Buyer.docx
  │   └── APA_Template.docx
  ├── Project_Mercury/      ← (sample deal)
  └── Project_Atlas/        ← (sample deal)
  ```

### Step 5: Microsoft Azure App Registration (for Outlook)

- [ ] Go to https://portal.azure.com → Azure Active Directory → App registrations → New registration
- [ ] Name: `MA Deal OS`
- [ ] Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
- [ ] Redirect URI: Web → `http://localhost:3000/api/auth/callback/microsoft`
- [ ] After creation, copy:
  - `MICROSOFT_CLIENT_ID` (Application/client ID)
  - `MICROSOFT_TENANT_ID` (Directory/tenant ID)
- [ ] Go to **Certificates & secrets → New client secret**
  - Copy the secret **value** (not the ID) as `MICROSOFT_CLIENT_SECRET`
- [ ] Go to **API permissions → Add a permission → Microsoft Graph**:
  - Delegated permissions:
    - `Mail.Read`
    - `Mail.ReadWrite`
    - `Mail.Send`
    - `User.Read`
  - Click "Grant admin consent" if you have admin access, otherwise users will be prompted

### Step 6: Domain & Hosting

- [ ] **Domain:** Purchase a domain (e.g., `madeals.app` or similar) from Namecheap, Google Domains, Cloudflare, etc.
- [ ] **Frontend hosting:** Create a Vercel account at https://vercel.com
  - Connect your GitHub repo
  - It will auto-deploy from the `apps/web` directory on push
  - Add your custom domain in Vercel project settings → Domains
  - Vercel provides free SSL
- [ ] **Backend hosting:** Same Vercel project can host API routes via Next.js API routes, OR:
  - Use Railway (https://railway.app) for a standalone backend if needed
  - Railway free tier: $5 credit/month, enough for testing
- [ ] Update OAuth redirect URIs in Google Cloud and Azure with your production domain:
  - `https://yourdomain.com/api/auth/callback/google`
  - `https://yourdomain.com/api/auth/callback/microsoft`

### Step 7: Embedding Model

- [ ] **Option A (Recommended):** Use Anthropic's Voyage embeddings
  - API key is shared with Anthropic API: same `ANTHROPIC_API_KEY`
  - Model: `voyage-3` (1024 dimensions)
  - Note: Check current Voyage availability; if unavailable, use Option B
- [ ] **Option B:** Use OpenAI embeddings
  - Go to https://platform.openai.com → Create API key
  - Copy as `OPENAI_API_KEY`
  - Model: `text-embedding-3-small` (1536 dimensions)

### Step 8: Verify Everything

Before starting Claude Code, confirm you have ALL of these:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres:...@...supabase.co:5432/postgres

ANTHROPIC_API_KEY=sk-ant-...

GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...

MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=xxxxx

OPENAI_API_KEY=sk-...          # Only if using OpenAI embeddings

NEXTAUTH_SECRET=               # Generate: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
```

---

## 2. REQUIRED KEYS & CREDENTIALS SUMMARY

| Credential | Source | Purpose | Required For |
|-----------|--------|---------|-------------|
| `SUPABASE_URL` | Supabase dashboard → Settings → API | Database connection | Backend, Web |
| `SUPABASE_ANON_KEY` | Supabase dashboard → Settings → API | Client-side DB access (with RLS) | Web portal |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Settings → API | Server-side DB access (bypasses RLS) | Backend only |
| `DATABASE_URL` | Supabase dashboard → Settings → Database | Direct Postgres for migrations | Migrations only |
| `ANTHROPIC_API_KEY` | Anthropic Console | Claude API calls | Backend |
| `GOOGLE_CLIENT_ID` | Google Cloud Console | Google OAuth + Drive API | Backend, Web |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console | Google OAuth | Backend |
| `MICROSOFT_CLIENT_ID` | Azure Portal | Microsoft OAuth + Graph API | Backend, Web |
| `MICROSOFT_TENANT_ID` | Azure Portal | Microsoft OAuth routing | Backend |
| `MICROSOFT_CLIENT_SECRET` | Azure Portal | Microsoft OAuth | Backend |
| `OPENAI_API_KEY` | OpenAI Platform (optional) | Embeddings if not using Voyage | Backend |
| `NEXTAUTH_SECRET` | Self-generated | Session encryption | Web |
| `NEXTAUTH_URL` | Your domain | OAuth callback base | Web |

---

## 3. TECHNOLOGY STACK

### Core

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Language** | TypeScript | 5.x | Unified across all packages |
| **Runtime** | Node.js | 20 LTS | Stable, Vercel-compatible |
| **Package Manager** | pnpm | 9.x | Fast, efficient for monorepos |
| **Monorepo Tool** | Turborepo | Latest | Build orchestration, caching |

### Database & Storage

| Component | Technology | Notes |
|-----------|-----------|-------|
| **Database** | Supabase (PostgreSQL 15+) | Hosted, free tier |
| **Vector Search** | pgvector extension | Enabled in Supabase |
| **File Storage** | Supabase Storage | For document versions |
| **Migrations** | Drizzle ORM | Type-safe schema, migrations |

### Web Application

| Component | Technology | Notes |
|-----------|-----------|-------|
| **Framework** | Next.js 14+ (App Router) | Full-stack React framework |
| **Auth** | NextAuth.js (Auth.js) v5 | Google + Microsoft OAuth |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid, consistent UI |
| **State** | Zustand or React Query | Client state + server state |
| **Deployment** | Vercel | Auto-deploy from GitHub |

### Integrations

| Component | Technology | Notes |
|-----------|-----------|-------|
| **Google Drive** | `googleapis` npm package | Official Google SDK |
| **Outlook/Email** | Microsoft Graph SDK (`@microsoft/microsoft-graph-client`) | Official MS SDK |
| **LLM** | `@anthropic-ai/sdk` | Claude API |
| **Document Processing** | `mammoth` (read), `docx` (write), `pdf-parse` (PDF) | Node.js document libraries |

### Cowork Plugin

| Component | Technology | Notes |
|-----------|-----------|-------|
| **Format** | Markdown skills + commands + JSON config | Standard Cowork plugin structure |
| **MCP Server** | TypeScript MCP server using `@modelcontextprotocol/sdk` | Exposes backend to Cowork |

---

## 4. REPOSITORY STRUCTURE

```
ma-deal-os/
├── SPEC.md                           ← THIS FILE
├── README.md
├── package.json                      ← Root workspace config
├── pnpm-workspace.yaml
├── turbo.json                        ← Turborepo config
├── .env.example                      ← Template for all env vars
├── .gitignore
│
├── apps/
│   └── web/                          ← Next.js web application
│       ├── package.json
│       ├── next.config.js
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       ├── app/
│       │   ├── layout.tsx            ← Root layout with providers
│       │   ├── page.tsx              ← Landing / login
│       │   ├── (auth)/
│       │   │   ├── login/page.tsx
│       │   │   └── callback/page.tsx
│       │   ├── (dashboard)/
│       │   │   ├── layout.tsx        ← Authenticated layout with sidebar
│       │   │   ├── deals/
│       │   │   │   ├── page.tsx          ← Deal list
│       │   │   │   └── [dealId]/
│       │   │   │       ├── page.tsx      ← Deal command center (dashboard)
│       │   │   │       ├── checklist/page.tsx
│       │   │   │       ├── documents/page.tsx
│       │   │   │       ├── documents/[docId]/page.tsx
│       │   │   │       ├── diligence/page.tsx
│       │   │   │       ├── emails/page.tsx
│       │   │   │       └── settings/page.tsx
│       │   │   └── settings/page.tsx ← User/system settings
│       │   └── api/
│       │       ├── auth/[...nextauth]/route.ts  ← NextAuth
│       │       ├── deals/route.ts
│       │       ├── deals/[dealId]/
│       │       │   ├── route.ts
│       │       │   ├── checklist/route.ts
│       │       │   ├── documents/route.ts
│       │       │   ├── parse-term-sheet/route.ts
│       │       │   ├── generate-checklist/route.ts
│       │       │   ├── emails/route.ts
│       │       │   └── diligence/route.ts
│       │       ├── drive/route.ts           ← Google Drive proxy
│       │       ├── outlook/route.ts         ← Outlook proxy
│       │       └── mcp/route.ts             ← MCP server HTTP endpoint
│       ├── components/
│       │   ├── ui/                   ← shadcn/ui components
│       │   ├── deal/
│       │   │   ├── DealCard.tsx
│       │   │   ├── DealDashboard.tsx
│       │   │   ├── ChecklistTable.tsx
│       │   │   ├── DocumentTimeline.tsx
│       │   │   ├── EmailInbox.tsx
│       │   │   ├── DealHealthIndicators.tsx
│       │   │   └── ParameterSheet.tsx
│       │   ├── document/
│       │   │   ├── DocumentViewer.tsx
│       │   │   ├── ProvisionPanel.tsx
│       │   │   └── RedlineViewer.tsx
│       │   └── layout/
│       │       ├── Sidebar.tsx
│       │       ├── Header.tsx
│       │       └── DealNav.tsx
│       └── lib/
│           ├── supabase/
│           │   ├── client.ts         ← Browser Supabase client
│           │   └── server.ts         ← Server Supabase client
│           ├── auth.ts               ← NextAuth config
│           └── utils.ts
│
├── packages/
│   ├── core/                         ← Shared business logic
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── types/
│   │       │   ├── deal.ts           ← Deal Parameter Object type
│   │       │   ├── checklist.ts      ← Checklist item types
│   │       │   ├── document.ts       ← Document version types
│   │       │   ├── provision.ts      ← Provision taxonomy types
│   │       │   ├── diligence.ts      ← DD finding types
│   │       │   └── email.ts          ← Email classification types
│   │       ├── rules/
│   │       │   ├── checklist-rules.ts    ← Deterministic rules engine
│   │       │   └── document-triggers.ts  ← Document trigger conditions
│   │       ├── constants/
│   │       │   ├── deal-enums.ts     ← All enumerated deal variables
│   │       │   ├── provision-taxonomy.ts ← Provision type hierarchy
│   │       │   └── dd-taxonomy.ts    ← DD topic taxonomy
│   │       └── utils/
│   │           ├── deal-utils.ts
│   │           └── provision-utils.ts
│   │
│   ├── db/                           ← Database layer
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── drizzle.config.ts
│   │   └── src/
│   │       ├── index.ts
│   │       ├── schema/
│   │       │   ├── deals.ts
│   │       │   ├── checklist-items.ts
│   │       │   ├── document-versions.ts
│   │       │   ├── provision-formulations.ts
│   │       │   ├── dd-findings.ts
│   │       │   ├── emails.ts
│   │       │   ├── drive-sync.ts
│   │       │   └── users.ts
│   │       ├── migrations/           ← Auto-generated by Drizzle
│   │       └── seed/
│   │           ├── seed.ts           ← Main seed runner
│   │           ├── provision-taxonomy-seed.ts
│   │           └── sample-deal-seed.ts
│   │
│   ├── ai/                           ← AI/LLM pipeline
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── client.ts            ← Anthropic client wrapper
│   │       ├── embeddings.ts        ← Embedding generation
│   │       ├── prompts/
│   │       │   ├── term-sheet-parser.ts
│   │       │   ├── provision-classifier.ts
│   │       │   ├── document-adapter.ts
│   │       │   ├── markup-analyzer.ts
│   │       │   ├── email-classifier.ts
│   │       │   ├── dd-analyzer.ts
│   │       │   └── deal-agent.ts
│   │       └── pipelines/
│   │           ├── parse-term-sheet.ts
│   │           ├── generate-checklist.ts
│   │           ├── generate-document.ts
│   │           ├── analyze-markup.ts
│   │           ├── classify-email.ts
│   │           ├── process-vdr-document.ts
│   │           └── deal-briefing.ts
│   │
│   ├── integrations/                 ← External service connectors
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── google-drive/
│   │       │   ├── client.ts         ← Google Drive API wrapper
│   │       │   ├── sync.ts           ← Bidirectional sync logic
│   │       │   ├── watcher.ts        ← Change detection
│   │       │   └── folder-structure.ts ← Deal workspace management
│   │       ├── outlook/
│   │       │   ├── client.ts         ← Microsoft Graph client
│   │       │   ├── classifier.ts     ← Email classification
│   │       │   ├── attachment-processor.ts
│   │       │   └── watcher.ts        ← Inbox monitoring
│   │       └── documents/
│   │           ├── docx-reader.ts    ← Read/parse DOCX files
│   │           ├── docx-writer.ts    ← Generate DOCX files
│   │           ├── pdf-reader.ts     ← Read/parse PDF files
│   │           ├── redline-generator.ts ← Generate tracked changes
│   │           └── provision-segmenter.ts ← Split doc into provisions
│   │
│   └── mcp-server/                   ← MCP server for Cowork
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts              ← MCP server entry point
│           └── tools/
│               ├── deal-tools.ts     ← get_deal_state, list_deals
│               ├── checklist-tools.ts
│               ├── document-tools.ts
│               ├── precedent-tools.ts ← search_precedent, whats_market
│               ├── email-tools.ts
│               └── dd-tools.ts
│
├── cowork-plugin/                    ← Cowork plugin (file-based)
│   ├── .claude-plugin/
│   │   └── plugin.json
│   ├── .mcp.json                     ← Points to mcp-server
│   ├── README.md
│   ├── commands/
│   │   ├── parse-term-sheet.md
│   │   ├── generate-checklist.md
│   │   ├── review-document.md
│   │   ├── analyze-markup.md
│   │   ├── whats-market.md
│   │   ├── morning-briefing.md
│   │   ├── deal-status.md
│   │   └── dd-summary.md
│   └── skills/
│       ├── deal-parameters/SKILL.md
│       ├── checklist-engine/SKILL.md
│       ├── document-pipeline/SKILL.md
│       ├── precedent-intelligence/SKILL.md
│       ├── markup-analysis/SKILL.md
│       ├── email-processing/SKILL.md
│       └── due-diligence/SKILL.md
│
└── scripts/
    ├── setup.sh                      ← One-time setup script
    ├── seed-db.ts                    ← Seed database with test data
    ├── ingest-precedent.ts           ← Ingest a precedent document
    └── create-sample-deal.ts         ← Create a sample deal for testing
```

---

## 5. DATABASE SCHEMA (SUPABASE)

All tables use Drizzle ORM for type-safe schema definition. The following is the logical schema — Drizzle generates the SQL migrations.

### 5.1 Core Tables

```sql
-- Enable extensions (done manually in Supabase dashboard)
-- CREATE EXTENSION IF NOT EXISTS vector;
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- USERS & AUTH
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'attorney',  -- 'attorney', 'partner', 'paralegal', 'admin', 'external'
  firm TEXT,
  google_access_token TEXT,               -- Encrypted
  google_refresh_token TEXT,              -- Encrypted
  microsoft_access_token TEXT,            -- Encrypted
  microsoft_refresh_token TEXT,           -- Encrypted
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- DEALS
-- ============================================
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                      -- "Project Mercury"
  code_name TEXT,                          -- "Mercury"
  status TEXT NOT NULL DEFAULT 'active',   -- 'active', 'closing', 'closed', 'terminated'

  -- Deal Parameter Object (Section 2.1 of original spec)
  parameters JSONB NOT NULL DEFAULT '{}',
  -- Structure: {
  --   transaction_structure: 'STOCK_PURCHASE' | 'ASSET_PURCHASE' | 'FORWARD_MERGER' | ...
  --   entity_types: { seller: '...', target: '...', buyer: '...' },
  --   consideration: ['CASH', 'SELLER_NOTE', ...],
  --   price_adjustments: ['WORKING_CAPITAL_ADJ', 'EARNOUT', ...],
  --   indemnification: 'TRADITIONAL' | 'RW_INSURANCE_PRIMARY' | ...,
  --   escrow: boolean,
  --   holdback: boolean,
  --   regulatory: ['HSR_FILING', 'CFIUS', ...],
  --   financing: { type: '...', condition: boolean },
  --   key_employees: { treatment: '...', non_competes: boolean },
  --   tsa: { required: boolean, direction: '...' },
  --   is_carveout: boolean,
  --   jurisdiction: 'DELAWARE' | 'NEW_YORK' | ...
  -- }

  -- Metadata
  deal_value NUMERIC,                      -- Approximate deal value
  industry TEXT,                            -- Target company industry
  buyer_type TEXT,                          -- 'PE', 'STRATEGIC', 'CONSORTIUM'
  target_name TEXT,
  buyer_name TEXT,
  seller_name TEXT,

  -- Google Drive
  drive_folder_id TEXT,                    -- Root Google Drive folder for this deal
  drive_folder_url TEXT,

  -- Outlook
  deal_inbox_address TEXT,                 -- e.g., project.mercury@firm.com
  email_thread_ids JSONB DEFAULT '[]',     -- Tracked Outlook conversation IDs

  -- Timeline
  expected_signing_date DATE,
  expected_closing_date DATE,
  actual_signing_date DATE,
  actual_closing_date DATE,

  -- Team
  lead_attorney_id UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE deal_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  role TEXT NOT NULL,  -- 'lead', 'associate', 'paralegal', 'partner', 'specialist', 'client', 'counterparty'
  permissions TEXT[] DEFAULT '{}',  -- ['read', 'write', 'publish', 'admin']
  added_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CHECKLIST
-- ============================================
CREATE TABLE checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,            -- 'SPA', 'APA', 'ESCROW_AGREEMENT', etc.
  document_name TEXT NOT NULL,            -- Human-readable name
  category TEXT,                          -- 'primary_agreement', 'ancillary', 'regulatory', 'employment', etc.
  trigger_rule TEXT,                      -- The rule that generated this item
  trigger_source TEXT NOT NULL,           -- 'deterministic', 'cim_enrichment', 'dd_driven', 'third_party', 'manual'

  -- Lifecycle state machine
  status TEXT NOT NULL DEFAULT 'identified',
  -- 'identified' → 'template_set' → 'precedent_set' → 'scrubbed' → 'adapted'
  -- → 'attorney_reviewed' → 'sent_to_counter' → 'markup_received'
  -- → 'response_draft' → 'final' → 'executed' → 'filed'

  -- Assignments
  ball_with TEXT,                         -- 'us', 'counterparty', 'third_party', 'client'
  assigned_to UUID REFERENCES users(id),
  due_date DATE,
  priority TEXT DEFAULT 'normal',         -- 'critical', 'high', 'normal', 'low'

  -- Dependencies
  depends_on UUID[],                      -- Other checklist item IDs this depends on
  blocks UUID[],                          -- Items this blocks

  -- Document reference
  current_document_version_id UUID,       -- FK to document_versions
  drive_file_id TEXT,                     -- Google Drive file ID

  -- Metadata
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- DOCUMENT VERSIONS
-- ============================================
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_item_id UUID REFERENCES checklist_items(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,

  version_number INTEGER NOT NULL,         -- 1, 2, 3, ...
  version_label TEXT NOT NULL,             -- 'v1_template', 'v2_precedent', 'v3_scrubbed', 'v4_adapted', 'counterparty_markup_1', etc.
  version_type TEXT NOT NULL,              -- 'template', 'precedent_applied', 'scrubbed', 'adapted', 'attorney_reviewed', 'counterparty_markup', 'response', 'final', 'executed'

  -- Storage
  file_path TEXT,                          -- Supabase Storage path
  drive_file_id TEXT,                      -- Google Drive file ID
  file_hash TEXT,                          -- SHA-256 for change detection
  file_size_bytes INTEGER,

  -- Analysis
  change_summary JSONB,                    -- Structured summary of changes from prior version
  provision_changes JSONB,                 -- Provision-level change detail

  -- Provenance
  source TEXT,                             -- 'system_generated', 'attorney_edit', 'counterparty', 'third_party'
  source_email_id UUID,                    -- If received via email, link to email record
  created_by UUID REFERENCES users(id),

  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PROVISION TAXONOMY & FORMULATIONS
-- ============================================
CREATE TABLE provision_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,               -- 'indemnification.basket.type'
  name TEXT NOT NULL,                      -- 'Indemnification Basket Type'
  category TEXT NOT NULL,                  -- 'indemnification', 'purchase_price', 'closing_conditions', etc.
  parent_code TEXT,                        -- For hierarchy: 'indemnification.basket'
  description TEXT,
  applicable_doc_types TEXT[],             -- ['SPA', 'APA', 'MERGER_AGREEMENT']
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE provision_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provision_type_id UUID REFERENCES provision_types(id),
  code TEXT NOT NULL,                      -- 'tipping_basket', 'true_deductible', etc.
  name TEXT NOT NULL,
  description TEXT,
  buyer_favorability DECIMAL(3,2),         -- 0.00 (seller-favorable) to 1.00 (buyer-favorable)
  market_frequency DECIMAL(3,2),           -- 0.00 to 1.00, how common in market
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE provision_formulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provision_type_id UUID REFERENCES provision_types(id),
  variant_id UUID REFERENCES provision_variants(id),

  -- The actual contract language
  text TEXT NOT NULL,
  text_embedding vector(1024),             -- Voyage: 1024d, or OpenAI: change to 1536

  -- Source
  source_deal_id UUID,                     -- Which deal this came from
  source_document_type TEXT,
  source_firm TEXT,                         -- Originating firm (for style matching)

  -- Metadata
  favorability_score DECIMAL(3,2),
  negotiation_outcome TEXT,                -- 'accepted', 'modified', 'rejected'
  deal_size_range TEXT,                    -- 'under_50m', '50m_250m', '250m_1b', 'over_1b'
  industry TEXT,
  year INTEGER,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Vector similarity search index
CREATE INDEX ON provision_formulations USING ivfflat (text_embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================
-- DUE DILIGENCE
-- ============================================
CREATE TABLE dd_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,               -- 'corporate.organization.formation'
  name TEXT NOT NULL,
  workstream TEXT NOT NULL,                -- 'corporate', 'employment', 'ip', 'tax', 'environmental', etc.
  parent_code TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE dd_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES dd_topics(id),

  summary TEXT NOT NULL,
  detail TEXT,
  risk_level TEXT NOT NULL,                -- 'critical', 'high', 'medium', 'low', 'informational'
  risk_type TEXT,                          -- 'deal_breaker', 'price_adjustment', 'indemnification_item', 'post_closing_fix', 'disclosure_item', 'monitor', 'no_action'

  -- Exposure
  exposure_low NUMERIC,
  exposure_mid NUMERIC,
  exposure_high NUMERIC,
  exposure_basis TEXT,

  -- Impact on transaction documents
  affects_provisions JSONB DEFAULT '[]',   -- [{provision_type: '...', action: 'enhance_rep', detail: '...'}]
  affects_checklist_items UUID[],

  -- Source
  source_documents JSONB DEFAULT '[]',     -- [{vdr_path: '...', file_name: '...'}]
  source_qa_entries JSONB DEFAULT '[]',

  -- Status
  status TEXT DEFAULT 'draft',             -- 'draft', 'confirmed', 'resolved', 'not_applicable'
  confirmed_by UUID REFERENCES users(id),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- EMAIL TRACKING
-- ============================================
CREATE TABLE deal_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,

  -- Outlook data
  outlook_message_id TEXT UNIQUE,
  outlook_conversation_id TEXT,
  thread_id TEXT,                          -- Our internal thread grouping

  -- Email metadata
  subject TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  recipients JSONB,                        -- [{email, name, type: 'to'|'cc'|'bcc'}]
  received_at TIMESTAMPTZ NOT NULL,

  -- Classification
  classification TEXT,                     -- 'markup_delivery', 'comment_letter', 'dd_response', 'scheduling', 'general', 'unclassified'
  classification_confidence DECIMAL(3,2),
  related_checklist_items UUID[],
  related_document_versions UUID[],

  -- Content
  body_preview TEXT,                       -- First ~500 chars
  body_text TEXT,                          -- Full plain text
  body_embedding vector(1024),

  -- Attachments
  has_attachments BOOLEAN DEFAULT false,
  attachments JSONB DEFAULT '[]',          -- [{filename, size, content_type, drive_file_id, processed: boolean}]

  -- Processing status
  processing_status TEXT DEFAULT 'pending', -- 'pending', 'classified', 'processed', 'error'
  action_items JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- GOOGLE DRIVE SYNC
-- ============================================
CREATE TABLE drive_sync_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  checklist_item_id UUID REFERENCES checklist_items(id),
  document_version_id UUID REFERENCES document_versions(id),

  -- Our side
  internal_file_path TEXT,
  internal_file_hash TEXT,

  -- Drive side
  drive_file_id TEXT NOT NULL,
  drive_file_name TEXT,
  drive_modified_time TIMESTAMPTZ,
  drive_file_hash TEXT,

  -- Sync state
  sync_status TEXT DEFAULT 'in_sync',      -- 'in_sync', 'pending_push', 'pending_pull', 'conflict', 'error'
  sync_direction TEXT,                     -- 'push', 'pull'
  last_synced_at TIMESTAMPTZ,
  conflict_details JSONB,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- DEAL AGENT MEMORY
-- ============================================
CREATE TABLE deal_agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL,               -- 'state_summary', 'attorney_preference', 'decision_record', 'flag'
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ACTIVITY LOG
-- ============================================
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id),
  actor_type TEXT DEFAULT 'user',          -- 'user', 'system', 'agent'
  action TEXT NOT NULL,                    -- 'created_deal', 'parsed_term_sheet', 'generated_checklist', 'uploaded_document', etc.
  entity_type TEXT,                        -- 'deal', 'checklist_item', 'document_version', 'email', 'dd_finding'
  entity_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.2 Row-Level Security Policies

```sql
-- Enable RLS on all tables
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
-- ... etc for all tables

-- Example policy: users can only see deals they're on the team for
CREATE POLICY "Users see own deals" ON deals
  FOR SELECT USING (
    id IN (
      SELECT deal_id FROM deal_team_members
      WHERE user_id = auth.uid()
    )
  );

-- Service role key bypasses RLS (used by backend)
```

---

## 6. BACKEND API SPECIFICATION

All API routes are Next.js App Router API routes in `apps/web/app/api/`.

### 6.1 Authentication

**`POST /api/auth/[...nextauth]`** — NextAuth.js handles Google + Microsoft OAuth.

NextAuth config (`apps/web/lib/auth.ts`):
```typescript
// Providers: Google (for Drive), Microsoft (for Outlook)
// Callbacks: store access/refresh tokens in users table
// Session strategy: JWT
```

### 6.2 Deal CRUD

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/deals` | List all deals for current user |
| `POST` | `/api/deals` | Create new deal |
| `GET` | `/api/deals/[dealId]` | Get deal details + parameters |
| `PATCH` | `/api/deals/[dealId]` | Update deal parameters/metadata |
| `DELETE` | `/api/deals/[dealId]` | Archive deal |

### 6.3 Term Sheet & Checklist

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/deals/[dealId]/parse-term-sheet` | Upload term sheet → extract Deal Parameter Object |
| `POST` | `/api/deals/[dealId]/generate-checklist` | Generate checklist from parameters |
| `GET` | `/api/deals/[dealId]/checklist` | Get checklist items |
| `PATCH` | `/api/deals/[dealId]/checklist/[itemId]` | Update checklist item status/assignment |

### 6.4 Documents

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/deals/[dealId]/documents` | List all document versions |
| `POST` | `/api/deals/[dealId]/documents/generate` | Trigger document generation pipeline for a checklist item |
| `POST` | `/api/deals/[dealId]/documents/upload` | Upload a document (e.g., counterparty markup) |
| `POST` | `/api/deals/[dealId]/documents/analyze-markup` | Analyze counterparty markup against last version |
| `GET` | `/api/deals/[dealId]/documents/[docId]` | Get document version detail |
| `GET` | `/api/deals/[dealId]/documents/[docId]/download` | Download document file |

### 6.5 Precedent & Intelligence

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/precedent/search` | Semantic search across provision formulations |
| `GET` | `/api/precedent/whats-market?provision_type=...&deal_profile=...` | Market data for a provision type |
| `POST` | `/api/precedent/ingest` | Ingest a new precedent document |

### 6.6 Email

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/deals/[dealId]/emails` | List classified emails for deal |
| `POST` | `/api/deals/[dealId]/emails/sync` | Trigger Outlook sync for deal inbox |
| `POST` | `/api/deals/[dealId]/emails/classify` | Classify a specific email |

### 6.7 Due Diligence

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/deals/[dealId]/diligence` | Get DD schema and findings |
| `POST` | `/api/deals/[dealId]/diligence/generate-schema` | Generate DD schema from deal parameters |
| `POST` | `/api/deals/[dealId]/diligence/process-document` | Process a VDR document |
| `POST` | `/api/deals/[dealId]/diligence/findings` | Create/update a DD finding |

### 6.8 Google Drive

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/drive/create-deal-folder` | Create deal folder structure in Drive |
| `GET` | `/api/drive/list/[folderId]` | List files in a Drive folder |
| `POST` | `/api/drive/upload` | Upload a file to Drive |
| `GET` | `/api/drive/download/[fileId]` | Download a file from Drive |
| `POST` | `/api/drive/sync/[dealId]` | Trigger sync for a deal |

---

## 7. COWORK PLUGIN SPECIFICATION

### 7.1 Plugin Manifest

**`cowork-plugin/.claude-plugin/plugin.json`**:
```json
{
  "name": "ma-deal-os",
  "version": "0.1.0",
  "displayName": "M&A Deal Operating System",
  "description": "Automates M&A transaction management: checklist generation, document drafting, due diligence, negotiation support, and email processing.",
  "author": "Your Firm",
  "skills": [
    "skills/deal-parameters",
    "skills/checklist-engine",
    "skills/document-pipeline",
    "skills/precedent-intelligence",
    "skills/markup-analysis",
    "skills/email-processing",
    "skills/due-diligence"
  ],
  "commands": [
    "commands/parse-term-sheet",
    "commands/generate-checklist",
    "commands/review-document",
    "commands/analyze-markup",
    "commands/whats-market",
    "commands/morning-briefing",
    "commands/deal-status",
    "commands/dd-summary"
  ]
}
```

### 7.2 MCP Configuration

**`cowork-plugin/.mcp.json`**:
```json
{
  "mcpServers": {
    "ma-deal-os": {
      "command": "node",
      "args": ["../packages/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "${SUPABASE_URL}",
        "SUPABASE_SERVICE_ROLE_KEY": "${SUPABASE_SERVICE_ROLE_KEY}",
        "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}"
      }
    },
    "google-drive": {
      "command": "npx",
      "args": ["@piotr-agier/google-drive-mcp"],
      "env": {
        "GOOGLE_DRIVE_OAUTH_CREDENTIALS": "${HOME}/.config/ma-deal-os/gcp-oauth.keys.json"
      }
    }
  }
}
```

### 7.3 Example Command: `/parse-term-sheet`

**`cowork-plugin/commands/parse-term-sheet.md`**:
```markdown
# /parse-term-sheet

Parse a term sheet and extract the Deal Parameter Object.

## Usage
/parse-term-sheet [path-to-term-sheet]

## Behavior
1. Accept a file path (DOCX or PDF) or ask the user to provide one.
2. Read the file contents using available tools.
3. Call the `parse_term_sheet` MCP tool with the file content.
4. Display the extracted Deal Parameter Object in a readable format.
5. Ask the user to confirm or correct any low-confidence extractions.
6. Save the confirmed parameters via `update_deal_parameters` MCP tool.

## Output Format
Display a table of all extracted parameters with confidence scores.
Flag any parameter with confidence < 0.85 for human review.
```

### 7.4 MCP Server Tools

The MCP server (`packages/mcp-server`) exposes these tools:

| Tool Name | Input | Output | Description |
|-----------|-------|--------|-------------|
| `list_deals` | none | Deal[] | List all active deals |
| `get_deal_state` | dealId | Deal + checklist + recent activity | Full deal context |
| `parse_term_sheet` | fileContent, fileName | DealParameters + confidence scores | Extract parameters from term sheet |
| `update_deal_parameters` | dealId, parameters | updated Deal | Update deal parameters |
| `generate_checklist` | dealId | ChecklistItem[] | Generate document checklist |
| `get_checklist` | dealId | ChecklistItem[] | Get current checklist |
| `generate_document` | dealId, checklistItemId, stage | DocumentVersion | Generate next document version |
| `analyze_markup` | dealId, checklistItemId, fileContent | MarkupAnalysis | Analyze counterparty markup |
| `search_precedent` | provisionType, dealProfile, query? | Formulation[] | Semantic search provisions |
| `whats_market` | provisionType, dealProfile | MarketData | Variant distribution for similar deals |
| `classify_email` | emailContent, dealId | Classification | Classify an email |
| `morning_briefing` | dealId | Briefing | Generate morning briefing |
| `get_dd_schema` | dealId | DDSchema | Get DD schema |
| `process_vdr_document` | dealId, fileContent | DDFindings | Process a VDR document |

---

## 8. WEB PORTAL SPECIFICATION

### 8.1 Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing | Login buttons (Google + Microsoft) |
| `/deals` | Deal List | Cards for each active deal with health indicators |
| `/deals/new` | New Deal | Create deal form + term sheet upload |
| `/deals/[id]` | Deal Dashboard | Command center (Section 11.2 of original spec) |
| `/deals/[id]/checklist` | Checklist | Full checklist table with lifecycle stages |
| `/deals/[id]/documents` | Documents | All documents with version timelines |
| `/deals/[id]/documents/[docId]` | Document Detail | Version history, redlines, provision analysis |
| `/deals/[id]/emails` | Email Inbox | Classified deal emails with processing status |
| `/deals/[id]/diligence` | DD Dashboard | Schema progress, findings, exposure summary |
| `/deals/[id]/settings` | Deal Settings | Team, Drive folder, inbox config |

### 8.2 Deal Dashboard (Command Center)

This is the most important page. It contains:

1. **Deal Health Indicators** (top bar): 6 metrics with color-coded status
   - Critical items count (red if > 0)
   - Overdue items count (red if > 0)
   - Document progress (% of checklist items at 'adapted' or beyond)
   - DD progress (% of schema nodes with findings or clean determinations)
   - Regulatory status (green/yellow/red)
   - Days to expected close

2. **Recent Activity Feed** (left column): Chronological stream of events

3. **Email Panel** (top right): Last 5 unprocessed emails with flags

4. **Checklist Summary** (center): Table showing each document's current stage, ball-with, and next action

5. **DD Summary** (bottom left): Workstream bars showing completion %

6. **Agent Chat** (right sidebar): Persistent chat interface that calls the backend API / MCP tools to answer deal questions

### 8.3 UI Component Library

Use shadcn/ui components. Key components needed:

- `DataTable` (for checklist, emails, documents)
- `Card` (for deal cards, health indicators)
- `Badge` (for status indicators)
- `Tabs` (for deal sub-pages)
- `Sheet` (for side panels — provision detail, email detail)
- `Dialog` (for confirmations, file uploads)
- `Command` (for search / command palette)
- `Progress` (for document pipeline stages, DD completion)

---

## 9. GOOGLE DRIVE INTEGRATION

### 9.1 Folder Structure per Deal

When a deal is created, the system creates this folder structure in Google Drive:

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
│   ├── Inbound/
│   └── Outbound/
├── 11_Due_Diligence/
│   ├── Requests/
│   ├── Responses/
│   └── Reports/
└── 99_Closing/
```

### 9.2 Sync Behavior

- **System → Drive:** When the system generates a document version, it uploads to the appropriate Drive folder and records the `drive_file_id` in `document_versions` and `drive_sync_records`.
- **Drive → System:** Polling-based detection (every 60 seconds) checks for modified files in deal folders. When detected, downloads the new version, computes hash, and creates a new `document_version` record.
- **Conflict detection:** If both sides changed since last sync, set `sync_status = 'conflict'` and surface to user.

### 9.3 Implementation Notes

- Use `googleapis` npm package with OAuth2 tokens stored per-user in the `users` table.
- Use Drive API v3 `files.list`, `files.create`, `files.get`, `files.export` (for Google Docs → DOCX conversion).
- Set up a Google Drive webhook (`files.watch`) for real-time change notifications in production. For testing, use polling.

---

## 10. OUTLOOK EMAIL INTEGRATION

### 10.1 Microsoft Graph API Usage

| Operation | Graph API Endpoint | Purpose |
|-----------|-------------------|---------|
| List messages | `GET /me/mailFolders/inbox/messages` | Fetch emails |
| Get message | `GET /me/messages/{id}` | Full email with body |
| Get attachment | `GET /me/messages/{id}/attachments` | Download attachments |
| Send email | `POST /me/sendMail` | Send on behalf of user |
| Search messages | `GET /me/messages?$search=...` | Search deal-related emails |
| Create subscription | `POST /subscriptions` | Webhook for new emails |

### 10.2 Email Processing Flow

1. **Sync:** Periodically (or via webhook) fetch new emails from the user's inbox.
2. **Classify:** For each email, run multi-signal classification:
   - Match sender/recipients against deal contact registries
   - Parse subject line for deal code names, document type patterns
   - Analyze attachment filenames
   - Use LLM for body text classification if signals are ambiguous
3. **Store:** Save classified email to `deal_emails` table with embedding.
4. **Process attachments:** For document attachments:
   - Upload to Supabase Storage
   - Upload to deal's Google Drive folder
   - If it's a markup of a known document, trigger redline generation
5. **Surface:** Show in the deal dashboard email panel with flags.

### 10.3 Implementation Notes

- Use `@microsoft/microsoft-graph-client` with `@azure/msal-node` for auth.
- Token refresh must be handled automatically (MSAL handles this).
- For the prototype, implement manual sync (user clicks "Sync Emails" button). Add webhook-based real-time sync later.

---

## 11. AI/LLM PIPELINE SPECIFICATION

All LLM calls go through the `packages/ai` module. Every prompt is defined as a TypeScript function that constructs the message array.

### 11.1 Term Sheet Parser

**Model:** `claude-sonnet-4-5-20250929`
**Input:** Raw text extracted from term sheet (DOCX or PDF)
**Output:** JSON conforming to `DealParameters` type
**Prompt strategy:** System prompt defines all 12 enumerated variables with their possible values. User prompt contains the term sheet text. Response format is structured JSON with confidence scores per field.

```typescript
// packages/ai/src/prompts/term-sheet-parser.ts
export function buildTermSheetParserPrompt(termSheetText: string): MessageParam[] {
  return [
    {
      role: "user",
      content: `You are an expert M&A attorney. Extract the following deal parameters from this term sheet.

For each parameter, provide:
- value: the extracted value (must be one of the allowed enum values)
- confidence: 0.0 to 1.0
- source_text: the exact quote from the term sheet that supports this extraction

## Parameters to Extract

1. transaction_structure: STOCK_PURCHASE | ASSET_PURCHASE | FORWARD_MERGER | REVERSE_MERGER | REVERSE_TRIANGULAR_MERGER
2. entity_types.seller: CORPORATION | LLC | LP | C_CORP | S_CORP | PE_FUND | INDIVIDUAL | CONSORTIUM
3. entity_types.target: (same options)
4. entity_types.buyer: (same options)
5. buyer_formation: EXISTING | NEWCO
6. consideration: (multi-select) CASH | BUYER_STOCK | SELLER_NOTE | ASSUMED_DEBT | ROLLOVER_EQUITY
7. price_adjustments: (multi-select) WORKING_CAPITAL_ADJ | NET_DEBT_ADJ | NET_CASH_ADJ | EARNOUT | MILESTONE_PAYMENTS
8. indemnification: TRADITIONAL | RW_INSURANCE_PRIMARY | RW_INSURANCE_SUPPLEMENTAL | ESCROW_ONLY | COMBO_ESCROW_AND_RWI
9. escrow: true | false
10. holdback: true | false
11. regulatory: (multi-select) HSR_FILING | CFIUS | INDUSTRY_SPECIFIC | FOREIGN_COMPETITION | STATE_REGULATORY
12. financing.type: CASH_ON_HAND | DEBT_FINANCED | EQUITY_COMMITMENT | COMBO
13. financing.financing_condition: true | false
14. key_employees.treatment: EMPLOYMENT_AGREEMENTS | CONSULTING | RETENTION_BONUSES | NONE | COMBO
15. key_employees.non_competes: true | false
16. tsa.required: true | false
17. tsa.direction: SELLER_TO_BUYER | BUYER_TO_SELLER | BILATERAL
18. is_carveout: true | false
19. jurisdiction: DELAWARE | NEW_YORK | CALIFORNIA | OTHER_US_STATE | FOREIGN

Also extract:
- deal_value (numeric, in dollars)
- target_name, buyer_name, seller_name
- industry
- buyer_type: PE | STRATEGIC | CONSORTIUM

Respond ONLY with a JSON object. No other text.

## Term Sheet:

${termSheetText}`
    }
  ];
}
```

### 11.2 Checklist Generator

**Model:** `claude-sonnet-4-5-20250929` (only for CIM enrichment; deterministic rules are pure code)
**Flow:**
1. Run deterministic rules engine (pure TypeScript, no LLM) → generates ~60-70% of checklist
2. If CIM is available, send CIM text to LLM to identify additional document triggers
3. Merge and deduplicate
4. Return complete checklist

### 11.3 Document Generation

**Model:** `claude-opus-4-6` (for precedent application and substance adaptation — highest quality needed)
**Flow per document:**
1. **v1 (Template):** Select template from database based on deal parameters. No LLM needed.
2. **v2 (Precedent Applied):** LLM compares template provisions against best-match precedent, provision by provision, deciding what to keep vs. swap. Outputs a structured change plan, then generates the merged document.
3. **v3 (Scrubbed):** Mostly mechanical string replacement (party names, amounts, dates). LLM verifies cross-references.
4. **v4 (Adapted):** LLM analyzes CIM + DD findings and proposes specific modifications. Outputs modifications with reasoning.

### 11.4 Markup Analyzer

**Model:** `claude-sonnet-4-5-20250929`
**Input:** Original document text + counterparty markup text
**Output:** Structured analysis:
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

### 11.5 Email Classifier

**Model:** `claude-sonnet-4-5-20250929` (fast, cheap — called frequently)
**Input:** Email subject, sender, recipients, body preview, attachment filenames
**Output:** Classification + related entities

### 11.6 Deal Agent / Morning Briefing

**Model:** `claude-opus-4-6`
**Input:** Deal state summary (compiled from database) + specific query or "generate morning briefing"
**Context window strategy:**
- Always include: deal parameters (~500 tokens), checklist summary (~1K tokens), recent activity (~2K tokens)
- Retrieve on demand: specific document versions, email threads, DD findings as needed
- Total prompt target: <20K tokens per call

---

## 12. DOCUMENT PROCESSING PIPELINE

### 12.1 Reading Documents

```typescript
// packages/integrations/src/documents/docx-reader.ts
import mammoth from 'mammoth';

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function extractHtmlFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.convertToHtml({ buffer });
  return result.value;
}
```

```typescript
// packages/integrations/src/documents/pdf-reader.ts
import pdfParse from 'pdf-parse';

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}
```

### 12.2 Writing Documents

```typescript
// packages/integrations/src/documents/docx-writer.ts
import { Document, Packer, Paragraph, TextRun, ... } from 'docx';

export async function generateDocument(content: DocumentContent): Promise<Buffer> {
  const doc = new Document({
    sections: [{ children: content.paragraphs.map(p => /* ... */) }]
  });
  return await Packer.toBuffer(doc);
}
```

### 12.3 Redline Generation (Prototype Approach)

For the prototype, use text-level diffing with the LLM to generate a structured change summary rather than true OOXML tracked changes. True tracked-changes generation is a Phase 2+ feature.

```typescript
// packages/integrations/src/documents/redline-generator.ts
export async function generateRedlineSummary(
  originalText: string,
  modifiedText: string,
  anthropicClient: Anthropic
): Promise<RedlineSummary> {
  // Use Claude to identify and classify changes at provision level
  // Returns structured diff, not a DOCX tracked changes file
}
```

---

## 13. IMPLEMENTATION PHASES

### Phase 0: Scaffold & Infrastructure (Claude Code starts here)

**Deliverables:**
1. Initialize monorepo with pnpm + Turborepo
2. Create all packages with `package.json` and `tsconfig.json`
3. Set up Next.js app with Tailwind + shadcn/ui
4. Set up Drizzle ORM with Supabase connection
5. Create database schema and run initial migration
6. Set up NextAuth with Google + Microsoft providers
7. Create `.env.example` with all required variables
8. Verify: app starts, auth works, database connects

### Phase 1: Core Deal Flow

**Deliverables:**
1. Deal CRUD API routes and UI pages
2. Term sheet parser (upload DOCX/PDF → extract parameters)
3. Deal Parameter Object editor (form to review/edit extracted parameters)
4. Deterministic checklist rules engine
5. Checklist generation and display
6. Google Drive folder creation on deal create
7. Verify: can create a deal from a term sheet, see generated checklist

### Phase 2: Document Pipeline (v1–v3)

**Deliverables:**
1. Provision type taxonomy seed data (top 50 provisions for SPAs)
2. Template document storage and selection
3. v1 generation (select and copy template)
4. Provision segmentation (break document into tagged segments)
5. v2 generation (precedent application — simplified for prototype)
6. v3 generation (scrub with deal details)
7. Document version tracking and display
8. Upload to Google Drive on each version
9. Verify: can generate v1–v3 for an SPA, see versions in UI and Drive

### Phase 3: Email Integration

**Deliverables:**
1. Outlook OAuth flow
2. Email sync (fetch inbox messages)
3. Email classification pipeline
4. Attachment processing (download, store, upload to Drive)
5. Email display in deal dashboard
6. Verify: can sync Outlook emails, see them classified by deal

### Phase 4: Precedent Intelligence

**Deliverables:**
1. Precedent ingestion pipeline (upload document → decompose → classify → embed)
2. Provision formulation vector search
3. "What's market" analysis endpoint
4. Formulation retrieval and ranking
5. v4 document generation (substance adaptation)
6. Markup analysis pipeline
7. Verify: can search precedent, see market data, analyze a counterparty markup

### Phase 5: Due Diligence Engine

**Deliverables:**
1. DD topic taxonomy seed data
2. DD schema generation from deal parameters
3. VDR document processing pipeline
4. Finding creation and management
5. DD → document pipeline integration (findings propagate to document modifications)
6. DD dashboard with progress tracking
7. Verify: can generate DD schema, process documents, see findings

### Phase 6: Deal Agent & Cowork Plugin

**Deliverables:**
1. Deal agent context compiler (assembles prompt from database state)
2. Morning briefing generator
3. Agent chat interface in web portal
4. Cowork plugin with all commands and skills
5. MCP server with all tools
6. Verify: can use Cowork commands to interact with deal, agent provides useful briefings

---

## 14. ENVIRONMENT VARIABLES REFERENCE

**`apps/web/.env.local`** (and `.env.example` at root):

```bash
# ============================================
# SUPABASE
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres:...@...supabase.co:5432/postgres

# ============================================
# AUTHENTICATION
# ============================================
NEXTAUTH_SECRET=         # Generate: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (also used for Drive API)
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...

# Microsoft OAuth (also used for Graph API / Outlook)
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=xxxxx

# ============================================
# AI / LLM
# ============================================
ANTHROPIC_API_KEY=sk-ant-...

# Only needed if using OpenAI for embeddings instead of Voyage
OPENAI_API_KEY=sk-...

# Embedding config
EMBEDDING_PROVIDER=voyage   # 'voyage' or 'openai'
EMBEDDING_MODEL=voyage-3    # or 'text-embedding-3-small'
EMBEDDING_DIMENSIONS=1024   # 1024 for voyage-3, 1536 for openai

# ============================================
# GOOGLE DRIVE
# ============================================
# (Uses GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET above)
# Per-user tokens stored in database
GOOGLE_DRIVE_ROOT_FOLDER_ID=   # Optional: ID of parent folder for all deal folders

# ============================================
# APPLICATION
# ============================================
NODE_ENV=development
```

---

## NOTES FOR CLAUDE CODE

1. **Start with Phase 0.** Get the monorepo scaffolded, database migrated, and auth working before building any features.

2. **Use Drizzle ORM** for all database access. Define the schema in TypeScript, generate SQL migrations. Never write raw SQL in application code (except for the initial extension setup which must be done in Supabase dashboard).

3. **Every LLM call must be in `packages/ai`.** No direct Anthropic API calls from API routes or the web app. The `ai` package is the single interface.

4. **Type everything.** The `packages/core/src/types/` directory contains all shared types. Import them in every package. The Deal Parameter Object type is the most critical — it drives everything.

5. **Error handling:** Every API route wraps in try/catch. Every LLM call has retry logic (3 attempts with exponential backoff). Every database operation is in a transaction where appropriate.

6. **Environment variables:** Never hardcode credentials. Always read from `process.env`. The `.env.example` file must list every variable with a comment.

7. **Google Drive operations are asynchronous.** Upload to Drive in a background job, not in the request/response cycle. Use a simple job queue (start with a database-backed queue in the `activity_log` table, upgrade to BullMQ later if needed).

8. **Seed data is critical.** The system is useless without provision taxonomy, DD topics, and at least one sample deal. The `packages/db/src/seed/` directory must contain complete seed scripts that populate:
   - 50 provision types with 2–4 variants each for SPAs
   - 100 DD topic nodes
   - 1 sample deal with all parameters filled in
   - 5 sample checklist items in various lifecycle stages

9. **The Cowork plugin is a separate concern.** Build it last. The web portal and API should work completely independently of Cowork. The MCP server is just another API consumer.

10. **Testing approach:** For the prototype, manual testing is fine. Don't build an automated test suite yet. Focus on getting the happy path working: create deal → parse term sheet → generate checklist → generate document → analyze markup.
