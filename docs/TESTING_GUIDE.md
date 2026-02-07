# M&A Deal OS — Testing Guide (User)

This guide walks you through testing the system end-to-end as a user. It's organized by workflow so you can verify each feature works with your environment.

---

## Prerequisites Before Testing

### 1. Environment Setup

Confirm these files exist and have valid credentials:

```bash
# Check all three .env.local files exist
cat .env.local
cat apps/web/.env.local
cat packages/db/.env.local
```

Each must have:
- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key
- `DATABASE_URL` — Postgres connection string
- `ANTHROPIC_API_KEY` — your Anthropic API key
- `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` — path to Google service account JSON
- `GOOGLE_DRIVE_ROOT_FOLDER_ID` — Google Drive folder ID

### 2. Database Migrations

All SQL migrations must be run in the Supabase Dashboard SQL Editor. Navigate to **SQL Editor** in your Supabase dashboard and execute each file in order:

```
scripts/migrations/003-event-propagation-tables.sql
scripts/migrations/004-approval-policies-table.sql
scripts/migrations/005-agent-activations-table.sql
scripts/migrations/006-deals-monitoring-level.sql
scripts/migrations/007-disclosure-schedules.sql
scripts/migrations/008-negotiation-tables.sql
scripts/migrations/009-email-extraction-columns.sql
scripts/migrations/010-third-parties.sql
scripts/migrations/011-client-management.sql
scripts/migrations/012-closing-tables.sql
scripts/migrations/013-skills-registry.sql
scripts/migrations/014-constitution-column.sql
scripts/migrations/015-quality-score-columns.sql
scripts/migrations/016-observer-changelog.sql
scripts/migrations/017-feedback-knowledge-tables.sql
scripts/migrations/018-learning-tables.sql
```

**Tip:** Open each file, copy the contents, paste into the SQL Editor, and click Run. They use `CREATE TABLE IF NOT EXISTS` so running them multiple times is safe.

### 3. Build and Start

```bash
# Build all packages
pnpm build

# Verify build succeeds (should show 6/6 packages)
# Start the dev server
pnpm dev
```

Open `http://localhost:3000` — you should see the M&A Deal OS interface.

---

## Test 1: Database Connectivity

**What you're testing:** Supabase connection works and tables exist.

```bash
# Run the table checker
npx tsx scripts/check-tables.ts
```

**Expected:** All tables listed as existing. If any are missing, re-run the corresponding migration SQL.

You can also verify manually in the Supabase Dashboard → Table Editor. You should see 40+ tables.

---

## Test 2: Create a Deal

**What you're testing:** Deal CRUD and the web UI.

1. Navigate to `http://localhost:3000/deals`
2. Click **New Deal**
3. Fill in:
   - Name: "Test Acquisition of TargetCo"
   - Code Name: "Project Atlas"
   - Deal Value: 150000000
   - Industry: "Technology"
   - Buyer Type: "PE"
   - Target Name: "TargetCo Inc."
   - Buyer Name: "Atlas Capital Partners"
4. Save the deal

**Expected:** Deal appears in the deal list. Clicking it opens the deal workspace with all 13 tabs.

**API verification:**
```bash
curl -s http://localhost:3000/api/deals | jq '.[0].name'
```

---

## Test 3: Term Sheet Parsing

**What you're testing:** Claude API integration for extracting deal parameters.

1. Open your test deal
2. Navigate to the deal Dashboard or use the parse endpoint
3. Upload or paste a term sheet (use the sample in `test-data/term-sheets/` if available)

**API verification:**
```bash
# Replace DEAL_ID with your actual deal ID
curl -X POST http://localhost:3000/api/deals/DEAL_ID/parse-term-sheet \
  -H "Content-Type: application/json" \
  -d '{"text": "Term Sheet for Stock Purchase Agreement. Buyer: Atlas Capital (Delaware LLC). Seller: TargetCo Inc (Delaware C-Corp). Purchase Price: $150M cash. Structure: Stock Purchase. Indemnification: Traditional with 18-month survival. Escrow: 10% for 18 months. Regulatory: HSR filing required. Jurisdiction: Delaware. Financing: Cash on hand."}'
```

**Expected:** Returns extracted parameters with confidence scores. Check that transaction_structure, consideration, indemnification, jurisdiction, etc. are correctly identified.

---

## Test 4: Checklist Generation

**What you're testing:** The rules engine generates deal-specific checklist items.

1. Open your test deal
2. Navigate to the **Checklist** tab
3. Click **Generate Checklist**

**API verification:**
```bash
curl -X POST http://localhost:3000/api/deals/DEAL_ID/generate-checklist
```

**Expected:** Checklist items appear, tailored to your deal type. A stock purchase should include items like:
- Stock certificates / transfer documentation
- Secretary's certificates
- Good standing certificates
- HSR filing (if regulatory includes HSR)
- Escrow agreement (if escrow is true)

---

## Test 5: Document Generation Pipeline

**What you're testing:** Three-stage document creation with Claude.

1. Open your test deal
2. Navigate to the **Documents** tab
3. Click **Generate Document**

**API verification:**
```bash
curl -X POST http://localhost:3000/api/deals/DEAL_ID/documents/generate \
  -H "Content-Type: application/json" \
  -d '{"document_type": "spa"}'
```

**Expected:** Three document versions created:
- v1: Template skeleton
- v2: Precedent-enriched (pulls from EDGAR database)
- v3: Deal-scrubbed (customized for your deal parameters)

Each version should be viewable in the Documents tab. Check that the DOCX download works.

**Note:** This test makes multiple Claude API calls and may take 30-60 seconds.

---

## Test 6: Event Pipeline

**What you're testing:** Events fire and create action chains.

```bash
# Build core package first
pnpm build --filter @ma-deal-os/core

# Run event pipeline test
npx tsx scripts/test-event-pipeline.ts
```

**Expected:** Consequence maps resolve correctly for event types like `dd.finding_confirmed`, `document.markup_received`, `email.position_extracted`, etc. Action chains are created in the database.

---

## Test 7: Approval Flow

**What you're testing:** End-to-end flow from event → chain → approval → execution.

```bash
npx tsx scripts/test-approval-flow.ts
```

**Expected:** 
- Events create action chains
- Chains appear in the approval queue
- Approving a chain executes its actions
- Rejecting a chain logs the rejection

**UI verification:**
1. Navigate to `http://localhost:3000/approval-queue`
2. You should see any pending chains with their significance level
3. Expand a chain to see individual actions
4. Approve or reject actions

---

## Test 8: Agent Chat

**What you're testing:** Manager agent activation with full deal context.

1. Open your test deal
2. Navigate to the **Agent** tab
3. Type a query: "What's the current status of this deal?"

**API verification:**
```bash
curl -X POST http://localhost:3000/api/deals/DEAL_ID/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Give me a summary of this deal and what needs attention."}'
```

**Expected:** The agent responds with deal-aware context — referencing the deal parameters, checklist status, and any open items. This makes a real Claude API call.

---

## Test 9: Disclosure Schedule Generation

**What you're testing:** AI-generated disclosure schedules with gap identification.

1. Open your test deal (must have documents generated first)
2. Navigate to the **Disclosures** tab
3. Click **Generate Disclosure Schedules**

**API verification:**
```bash
curl -X POST http://localhost:3000/api/deals/DEAL_ID/disclosure-schedules/generate
```

**Expected:** Disclosure schedule drafts appear, organized by representation type. The system identifies gaps where client information is needed.

---

## Test 10: Google Drive Integration

**What you're testing:** Service account can create folders and upload files.

```bash
curl -X POST http://localhost:3000/api/drive \
  -H "Content-Type: application/json" \
  -d '{"dealId": "DEAL_ID", "action": "create_folder"}'
```

**Expected:** A folder is created in Google Drive under your root folder. The deal record is updated with the `drive_folder_id` and `drive_folder_url`.

---

## Test 11: Learning System

**What you're testing:** Learning tables exist and the full learning loop works.

### Verify Tables Exist
```bash
npx tsx scripts/create-learning-tables.ts
```

### Seed Configuration
```bash
npx tsx scripts/seed-learning-config.ts
npx tsx scripts/seed-model-routing.ts
```

### Run Full Learning Loop Test
```bash
npx tsx scripts/test-full-learning-loop.ts
```

**Expected:** 15 tests covering signal collection, pattern lifecycle, prompt assembly, deal intelligence, agent requests, dashboard data, and audit trail. All should pass or show clear reasons for skips.

### Verify Learning Dashboard
Navigate to `http://localhost:3000/learning` — you should see:
- Overview with stat cards
- Pattern explorer at `/learning/patterns`
- Agent performance at `/learning/agents`
- Consistency log at `/learning/consistency`
- Audit trail at `/learning/audit`

---

## Test 12: Negotiation & Closing

**What you're testing:** Negotiation tracking and closing workflow.

```bash
npx tsx scripts/test-disclosure-negotiation-flow.ts
```

**UI verification:**
1. Open deal → **Negotiation** tab — check for position table and history
2. Open deal → **Closing** tab — check for closing conditions and readiness bar

---

## Test 13: Settings Pages

Navigate to each settings page and verify it loads:

| URL | What It Shows |
|-----|--------------|
| `/settings` | General settings |
| `/settings/models` | Model routing configuration (Sonnet vs Opus per task type) |
| `/settings/learning` | Learning system toggles (enable/disable self-evaluation, etc.) |
| `/settings/spend` | Spend controls and cost monitoring |

---

## Test 14: Full Page Smoke Test

Open each URL and confirm it loads without errors:

```
http://localhost:3000/deals
http://localhost:3000/deals/new
http://localhost:3000/deals/DEAL_ID
http://localhost:3000/deals/DEAL_ID/checklist
http://localhost:3000/deals/DEAL_ID/documents
http://localhost:3000/deals/DEAL_ID/diligence
http://localhost:3000/deals/DEAL_ID/emails
http://localhost:3000/deals/DEAL_ID/disclosure-schedules
http://localhost:3000/deals/DEAL_ID/negotiation
http://localhost:3000/deals/DEAL_ID/closing
http://localhost:3000/deals/DEAL_ID/client
http://localhost:3000/deals/DEAL_ID/third-parties
http://localhost:3000/deals/DEAL_ID/constitution
http://localhost:3000/deals/DEAL_ID/agent
http://localhost:3000/deals/DEAL_ID/settings
http://localhost:3000/approval-queue
http://localhost:3000/learning
http://localhost:3000/learning/patterns
http://localhost:3000/learning/agents
http://localhost:3000/learning/consistency
http://localhost:3000/learning/audit
http://localhost:3000/settings
http://localhost:3000/settings/models
http://localhost:3000/settings/learning
http://localhost:3000/settings/spend
http://localhost:3000/how-it-works
http://localhost:3000/observer
http://localhost:3000/simulation
```

**Expected:** Every page loads. Some will show empty states if there's no data yet — that's fine. No 500 errors.

---

## Quick Reference: Test Scripts

| Script | What It Tests |
|--------|--------------|
| `scripts/check-tables.ts` | Database table existence |
| `scripts/test-event-pipeline.ts` | Event backbone + consequence maps |
| `scripts/test-approval-flow.ts` | Full approval lifecycle |
| `scripts/test-disclosure-negotiation-flow.ts` | Disclosure + negotiation flows |
| `scripts/test-agent-action-chain.ts` | Agent → action chain creation |
| `scripts/test-full-learning-loop.ts` | Full learning system (15 tests) |
| `scripts/verify-learning-schema.ts` | Learning table verification |
| `scripts/create-learning-tables.ts` | Learning table creation check |
| `scripts/verify-deferred-items.ts` | Build deferred items audit |

All scripts run with:
```bash
npx tsx scripts/SCRIPT_NAME.ts
```

---

## What to Do If Tests Fail

1. **Missing tables:** Run the corresponding migration SQL in Supabase Dashboard
2. **API errors (401/403):** Check your Supabase service role key
3. **AI errors:** Verify `ANTHROPIC_API_KEY` in `.env.local`
4. **Build fails:** Run `pnpm build` and check for TypeScript errors
5. **Empty pages:** Seed data may be needed — create a test deal and generate checklist/documents first
6. **Connection refused:** Make sure `pnpm dev` is running
