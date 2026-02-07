# M&A Deal OS — User Guide

## What This System Does

M&A Deal OS is an agent-driven platform that handles the operational work of executing an M&A transaction. You — the partner — make strategic decisions. The system does everything else: drafting, tracking, monitoring, coordinating, and improving itself over time.

The system replaces the work of 3-4 associates through three layers of automation:

- **Deterministic code** handles mechanical execution (checklists, status updates, cross-references)
- **AI API calls** handle analytical tasks (parsing term sheets, generating documents, extracting positions)
- **Agents** handle strategic reasoning, initiative, and coordination

---

## Getting Started

### Prerequisites

You need the following accounts and credentials configured:

| Service | What It Does | Required |
|---------|-------------|----------|
| Supabase | Database (PostgreSQL) | Yes |
| Anthropic API | Claude for AI features | Yes |
| Google Cloud | Drive integration for documents | Yes |
| Microsoft/Outlook | Email integration | Optional (Phase 2) |

### First-Time Setup

1. Clone the repository and install dependencies:
   ```bash
   pnpm install
   ```

2. Copy `.env.example` to `.env.local` and fill in your credentials. Also copy it to `apps/web/.env.local` and `packages/db/.env.local`.

3. Run all database migrations by executing each SQL file in `scripts/migrations/` (003 through 018) in the Supabase Dashboard SQL Editor, in order.

4. Build all packages:
   ```bash
   pnpm build
   ```

5. Start the development server:
   ```bash
   pnpm dev
   ```

6. Open `http://localhost:3000` in your browser.

---

## Navigating the Application

### Main Sidebar

The sidebar gives you access to the top-level sections:

| Section | What It Contains |
|---------|-----------------|
| **Deals** | Your deal list, create new deals, access individual deal workspaces |
| **Approvals** | The approval queue — your primary daily touchpoint for reviewing system-proposed actions |
| **Learning** | Dashboard showing system performance, learned patterns, consistency logs, audit trail |
| **Settings** | Model routing configuration, learning toggles, spend controls |
| **How It Works** | Plain-language explanation of the system for non-technical users |

### Deal Workspace

When you open a specific deal, you get a tabbed workspace with 13 sections:

| Tab | Purpose |
|-----|---------|
| **Dashboard** | Deal overview — key parameters, status, timeline, recent activity |
| **Checklist** | Auto-generated closing checklist tailored to your deal type |
| **Documents** | Document pipeline — template → precedent-enriched → deal-scrubbed drafts |
| **Diligence** | Due diligence findings, coverage tracking, request management |
| **Emails** | Email integration, automatic position extraction, action item identification |
| **Disclosures** | Disclosure schedule drafts, gap identification, cross-reference tracking |
| **Negotiation** | Position tracking, concession history, negotiation roadmap |
| **Closing** | Closing conditions, deliverables, readiness assessment, funds flow |
| **Client** | Client contacts, action items, communication drafts |
| **Third Parties** | Third-party coordination, deliverable tracking |
| **Constitution** | Your governance preferences for this deal — risk tolerances, non-negotiables |
| **Agent** | Chat interface to the manager agent with full deal context |
| **Settings** | Deal-specific configuration, approval policy overrides |

---

## Core Workflows

### Creating a New Deal

1. Navigate to **Deals → New Deal**
2. Enter the deal name, code name, and basic information
3. Upload or paste the term sheet
4. Click **Parse Term Sheet** — the system uses Claude to extract all deal parameters:
   - Transaction structure (stock purchase, asset purchase, merger type)
   - Consideration types (cash, stock, earnout, seller note)
   - Entity types for buyer, seller, target
   - Jurisdiction, regulatory requirements
   - Indemnification approach, escrow/holdback
   - Financing structure, key employee treatment
   - Whether it's a carveout, TSA requirements
5. Review the extracted parameters and correct anything the system got wrong
6. Save the deal

### Generating the Closing Checklist

From the deal's **Checklist** tab:

1. Click **Generate Checklist**
2. The rules engine creates items tailored to your deal parameters:
   - A Delaware stock purchase with HSR gets different items than a California asset purchase
   - Carveouts automatically include TSA-related items
   - PE buyers get equity commitment letter items
   - Debt financing adds commitment letter conditions
3. Each item has a status, priority, dependencies, and "ball with" assignment
4. The system tracks dependencies — when a prerequisite completes, dependent items get flagged as ready

### Document Generation Pipeline

From the deal's **Documents** tab:

1. Click **Generate Document** and select the document type
2. The system runs a three-stage pipeline:
   - **v1 (Template):** Skeleton document with correct structure for your deal type
   - **v2 (Precedent-Enriched):** Claude pulls comparable language from EDGAR precedent deals and enhances the draft
   - **v3 (Deal Scrub):** Claude customizes every provision for your specific deal — your purchase price, your specific reps, your indemnification structure
3. Each version is stored with full history — you can view and compare any version
4. Download as Word (.docx) or sync to Google Drive

### Working with the Approval Queue

The **Approvals** page is your primary daily touchpoint:

**How it works:** When events happen on a deal (document markup received, DD finding confirmed, deadline approaching), the system generates action chains — bundles of proposed actions to handle the situation. Each action is assigned to an approval tier:

- **Tier 1 (Auto-Execute):** Low-risk actions execute automatically — internal status updates, notifications, logging. You never see these.
- **Tier 2 (One-Tap Approval):** Medium-risk actions like document edits, checklist updates, internal analysis. You see a preview of exactly what the system wants to do and approve/reject with one tap.
- **Tier 3 (Strategic Review):** High-stakes actions touching clients, counterparties, or money — client communications, negotiation position changes, financial document modifications. You get full context, the system's reasoning, and you make the call.

**Your workflow:**
1. Open the Approval Queue
2. Review pending chains — each shows a summary, significance level, and the proposed actions
3. Expand any chain to see action details and previews
4. Approve, reject, or modify individual actions within a chain
5. Approved actions execute; rejected ones are logged

### Negotiation Tracking

From the deal's **Negotiation** tab:

- The system extracts positions from documents and emails automatically
- View the position table showing every negotiated provision's current state
- Track the history of each position — who proposed what, when, what concessions were made
- Generate a negotiation roadmap with AI-recommended strategy
- Items are categorized as: agreed, open, or at impasse

### Disclosure Schedules

From the deal's **Disclosures** tab:

1. Click **Generate Disclosure Schedules** to create initial drafts based on the SPA's reps and warranties
2. The system identifies gaps where client information is needed
3. Cross-references between schedule numbers and SPA sections are tracked automatically
4. When a provision gets renumbered during negotiation, broken cross-references are flagged
5. Add entries manually or from client responses

### Constitution (Governance Preferences)

From the deal's **Constitution** tab:

This is where you encode your preferences and non-negotiables for a specific deal. The system uses a conversational interface to capture things like:

- "Never agree to a basket below $500K"
- "Always flag changes to the indemnification cap"
- "Escalate any regulatory condition changes to Tier 3"
- Risk tolerances for various provision types

The constitution is encoded into a structured format the agents reference on every decision. If an agent's proposed action would violate the constitution, it gets flagged before reaching you.

### Agent Chat

From the deal's **Agent** tab:

You can chat directly with the manager agent, which has full context on your deal:

- Ask questions: "What's the status of the HSR filing?" or "What are our biggest open items?"
- Request actions: "Draft a response to counterparty's markup on the indemnification cap"
- Get briefings: "Give me a morning briefing on Project Mercury"
- The agent can propose actions (subject to the approval framework)
- Conversation history is maintained within the session

### Closing Workflow

From the deal's **Closing** tab:

- Track closing conditions: regulatory approvals, third-party consents, bring-down conditions
- Monitor deliverables with status and responsible party
- View a readiness assessment showing what's complete and what's blocking
- Generate funds flow memos
- Generate closing binder indexes
- Each condition can be marked as satisfied, waived, or blocking

### Client Management

From the deal's **Client** tab:

- Maintain client contact information
- Track action items the client needs to complete (officer certificates, board resolutions, disclosure information)
- Generate client communications and status updates using AI
- Monitor what information is still outstanding

---

## System Intelligence

### Learning Dashboard

Navigate to **Learning** in the sidebar to see how the system is improving:

- **Overview:** Stats on evaluations, patterns learned, consistency checks, model routing
- **Patterns:** Browse learned patterns — rules the system has discovered from its own performance
- **Agents:** Performance metrics by agent type
- **Consistency:** Cross-agent consistency check results
- **Audit:** Complete audit trail of every learning system action

### Model Routing

Navigate to **Settings → Models:**

The system routes tasks to different Claude models based on complexity:

- **Sonnet** handles routine, well-understood tasks at lower cost
- **Opus** handles novel situations and strategic reasoning

As the system learns which tasks it handles well, it progressively shifts more work to cheaper models. You can configure routing overrides and view current routing decisions.

### Spend Controls

Navigate to **Settings → Spend:**

Monitor and control API costs:

- Set spend limits by time period
- View cost breakdowns by agent type and model
- Configure alerts when approaching limits

---

## Daily Usage Pattern

For a typical active deal, your daily interaction looks like:

1. **Morning:** Open the Approval Queue. Review overnight activity. Approve/reject staged actions. (~5-10 minutes)
2. **As needed:** Check in on specific deal tabs when you get client calls or counterparty markups. The system processes incoming information automatically.
3. **Strategic moments:** Use the Agent Chat when you need analysis, want to explore options, or need to draft something specific.
4. **End of day:** Quick check of the Approval Queue for anything flagged during the day.

The system works continuously in the background. You engage on your schedule.

---

## Key Concepts

**Event Propagation:** Every meaningful action fires an event. Events trigger consequence maps that determine what should happen next. This creates automatic workflows without manual intervention.

**Action Chains:** Bundles of related proposed actions generated in response to events. A single event (like "markup received") might generate 5-6 actions (analyze markup, update position table, draft response, update checklist, notify client).

**Three-Layer Architecture:** The system always uses the cheapest layer that can handle the task. Deterministic code for mechanical work, single-turn AI calls for analytical work, full agents only for strategic reasoning. This keeps costs controlled while maintaining quality.

**The Constitution:** Your encoded preferences and non-negotiables. The agents consult this on every decision. It's how you maintain control without micromanaging.

---

## Troubleshooting

**The dev server won't start:** Make sure all packages are built (`pnpm build`) and your `.env.local` files are in place at the repo root, `apps/web/`, and `packages/db/`.

**Database queries fail:** Verify your Supabase URL and service role key. Confirm all migrations have been run in order.

**AI features return errors:** Check your Anthropic API key. Verify you have sufficient API credits.

**Google Drive sync fails:** Confirm your service account JSON is at `config/google-service-account.json` and the root folder ID is set.

**Pages show empty data:** The database tables may not have been created yet. Run all SQL migrations (003-018) in the Supabase Dashboard SQL Editor.
