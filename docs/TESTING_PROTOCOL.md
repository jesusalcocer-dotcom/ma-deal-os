# M&A DEAL OS — TESTING PROTOCOL v2
## Real Integration Tests for Every Phase

---

## TEST EXECUTION RULES

1. **ALL database tests use Supabase REST API** (not local PostgreSQL, not Drizzle direct)
2. **ALL Google Drive tests use the real service account** (verify files actually appear in Drive)
3. **ALL AI tests use the real Anthropic API** (no mocks, no stubs)
4. Run tests via the dev server HTTP endpoints when possible (`pnpm dev` then `curl`)
5. For each test: run it, compare to expected result, mark PASS/FAIL, fix if FAIL, re-run

**Severity:**
- 🔴 CRITICAL — Must pass. Cannot proceed to next phase.
- 🟡 HIGH — Should pass. Can proceed but must fix before deployment.
- 🟢 MEDIUM — Nice to have. Document and fix later.

---

## HELPER: Supabase Test Script

Create `scripts/test-supabase.ts` and run it first to verify connectivity:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iuiasttwnukfudcestgc.supabase.co',
  'sb_secret_tl-88kqeyyMTKpsrWLbbPA_WlK8hWyn'
);

async function test() {
  // Test 1: List tables by querying deals
  const { data, error } = await supabase.from('deals').select('id, name').limit(5);
  if (error) { console.error('FAIL: Cannot query deals:', error.message); return; }
  console.log('PASS: Supabase connected. Deals found:', data?.length);

  // Test 2: Insert
  const { data: newDeal, error: insertErr } = await supabase.from('deals').insert({
    name: 'Test Connection Deal',
    code_name: 'TEST_CONN',
    status: 'active',
    parameters: {},
    email_thread_ids: []
  }).select().single();
  if (insertErr) { console.error('FAIL: Cannot insert:', insertErr.message); return; }
  console.log('PASS: Insert works. ID:', newDeal.id);

  // Test 3: Delete (cleanup)
  const { error: delErr } = await supabase.from('deals').delete().eq('id', newDeal.id);
  if (delErr) { console.error('FAIL: Cannot delete:', delErr.message); return; }
  console.log('PASS: Delete works. All Supabase tests passed.');
}
test();
```

Run with: `npx tsx scripts/test-supabase.ts`

---

## HELPER: Google Drive Test Script

Create `scripts/test-drive.ts`:

```typescript
import { google } from 'googleapis';
import * as fs from 'fs';

const keyFile = JSON.parse(fs.readFileSync('./config/google-service-account.json', 'utf8'));
const auth = new google.auth.GoogleAuth({
  credentials: keyFile,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

async function test() {
  const drive = google.drive({ version: 'v3', auth });

  // Test 1: List root folder contents
  const { data } = await drive.files.list({
    q: "'1NHOZfsZ-LokCUGD2Utfcfz_dZo6C31Ak' in parents",
    fields: 'files(id, name, mimeType)',
  });
  console.log('PASS: Drive connected. Files in root:', data.files?.length || 0);
  data.files?.forEach(f => console.log(`  - ${f.name} (${f.mimeType})`));

  // Test 2: Create a test folder
  const { data: folder } = await drive.files.create({
    requestBody: {
      name: '_TEST_FOLDER_DELETE_ME',
      mimeType: 'application/vnd.google-apps.folder',
      parents: ['1NHOZfsZ-LokCUGD2Utfcfz_dZo6C31Ak'],
    },
    fields: 'id, name',
  });
  console.log('PASS: Folder created:', folder.name, folder.id);

  // Test 3: Delete test folder
  await drive.files.delete({ fileId: folder.id! });
  console.log('PASS: Folder deleted. All Drive tests passed.');
}
test();
```

Run with: `npx tsx scripts/test-drive.ts`

---

## PHASE 0 TESTS

### P0-T01: Package Installation 🔴
```bash
pnpm install
```
**Expected:** Completes without errors.

### P0-T02: TypeScript Build 🔴
```bash
pnpm build
```
**Expected:** All packages compile. Zero TypeScript errors.

### P0-T03: Dev Server 🔴
```bash
pnpm dev
```
**Expected:** "✓ Ready" on localhost:3000.

### P0-T04: Supabase Connection 🔴
```bash
npx tsx scripts/test-supabase.ts
```
**Expected:** All 3 sub-tests print PASS. Deals query works, insert works, delete works.
**Fail if:** Any connection or permission error.

### P0-T05: Google Drive Connection 🔴
```bash
npx tsx scripts/test-drive.ts
```
**Expected:** All 3 sub-tests print PASS. Lists files, creates folder, deletes folder.
**Fail if:** Authentication error or permission denied.

### P0-T06: Anthropic API Connection 🔴
Create `scripts/test-anthropic.ts`:
```typescript
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
async function test() {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 100,
    messages: [{ role: 'user', content: 'Say "API connection successful" and nothing else.' }],
  });
  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  console.log(text.includes('successful') ? 'PASS: Anthropic API works' : 'FAIL: Unexpected response: ' + text);
}
test();
```
**Expected:** Prints "PASS: Anthropic API works".

### P0-T07: Page Routing 🟡
With dev server running:
```bash
for path in "/" "/login" "/deals" "/deals/new"; do
  echo "$path: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000$path)"
done
```
**Expected:** All return 200 or 302.

### P0-T08: Database Tables Exist 🔴
```typescript
// In test-supabase.ts or standalone
const tables = ['deals', 'checklist_items', 'document_versions', 'users', 'deal_emails',
  'provision_formulations', 'provision_types', 'dd_findings', 'dd_topics',
  'drive_sync_records', 'activity_log', 'deal_team_members', 'deal_agent_memory', 'provision_variants'];

for (const table of tables) {
  const { error } = await supabase.from(table).select('*').limit(1);
  console.log(`${table}: ${error ? 'FAIL - ' + error.message : 'PASS'}`);
}
```
**Expected:** All 14 tables return PASS.

---

## PHASE 1 TESTS

### ─── DEAL CRUD ───

### P1-T01: Create Deal via API 🔴
With dev server running:
```bash
curl -s -X POST http://localhost:3000/api/deals \
  -H "Content-Type: application/json" \
  -d '{"name":"Project Mercury Test","code_name":"MercuryTest","target_name":"SpectraTech Solutions, Inc.","buyer_name":"Meridian Capital Partners VII, L.P.","buyer_type":"PE","deal_value":185000000,"industry":"Technology"}' | python3 -m json.tool
```
**Expected:** JSON with `id` (UUID), `name`, `status: "active"`.
**Verify in Supabase:** Query `deals` table — the row should exist.
**Save returned `id` as `MERCURY_ID`.**

### P1-T02: Create Atlas Deal 🔴
```bash
curl -s -X POST http://localhost:3000/api/deals \
  -H "Content-Type: application/json" \
  -d '{"name":"Project Atlas Test","code_name":"AtlasTest","target_name":"Pinnacle Global Technologies - ESD","buyer_name":"NovaStar Systems Corporation","buyer_type":"STRATEGIC","deal_value":67500000,"industry":"Technology"}' | python3 -m json.tool
```
**Save `id` as `ATLAS_ID`.**

### P1-T03: Create Orion Deal 🔴
```bash
curl -s -X POST http://localhost:3000/api/deals \
  -H "Content-Type: application/json" \
  -d '{"name":"Project Orion Test","code_name":"OrionTest","target_name":"CloudBridge Analytics, Inc.","buyer_name":"DataStream Holdings, Inc.","buyer_type":"STRATEGIC","deal_value":310000000,"industry":"Technology"}' | python3 -m json.tool
```
**Save `id` as `ORION_ID`.**

### P1-T04: List Deals 🔴
```bash
curl -s http://localhost:3000/api/deals | python3 -m json.tool
```
**Expected:** Array containing at least the 3 deals just created.

### P1-T05: Get Single Deal 🔴
```bash
curl -s http://localhost:3000/api/deals/$MERCURY_ID | python3 -m json.tool
```
**Expected:** Full deal object with all fields.

### P1-T06: Update Deal 🟡
```bash
curl -s -X PATCH http://localhost:3000/api/deals/$MERCURY_ID \
  -H "Content-Type: application/json" \
  -d '{"status":"closing"}' | python3 -m json.tool
```
**Expected:** `status: "closing"` in response. Verify via GET.

### P1-T07: Verify in Supabase 🔴
```typescript
const { data } = await supabase.from('deals').select('id, name, code_name, status').order('created_at');
console.log(data);
```
**Expected:** All 3+ deals visible with correct data.

### ─── TERM SHEET PARSER ───

### P1-T10: Parse Mercury Term Sheet 🔴

Read `test-data/term-sheets/TermSheet_ProjectMercury_PE_StockPurchase.md` and POST to the parse endpoint.

**Expected extractions (verify EACH):**

| # | Field | Expected | Notes |
|---|-------|----------|-------|
| 1 | `transaction_structure` | `STOCK_PURCHASE` | Must NOT be merger or asset |
| 2 | `consideration` | includes `CASH` | Rollover equity also acceptable |
| 3 | `deal_value` | 185000000 | |
| 4 | `escrow` | true | $18.5M |
| 5 | `holdback` | true | $2.5M working capital |
| 6 | `indemnification` | Both traditional + RWI | COMBO or similar |
| 7 | `regulatory` | includes `HSR_FILING` | |
| 8 | `regulatory` | does NOT include CFIUS | |
| 9 | `financing.financing_condition` | false | |
| 10 | `tsa.required` | true | |
| 11 | `tsa.direction` | SELLER_TO_BUYER | |
| 12 | `is_carveout` | false | |
| 13 | `key_employees.non_competes` | true | |
| 14 | `jurisdiction` | DELAWARE | |

**Score: X/14. Must be ≥12 (85%).**
**Fail if:** `transaction_structure` is wrong (instant fail regardless of score).

### P1-T11: Parse Atlas Term Sheet 🔴

| # | Field | Expected | Notes |
|---|-------|----------|-------|
| 1 | `transaction_structure` | `ASSET_PURCHASE` | |
| 2 | `consideration` | `CASH` + `SELLER_NOTE` | |
| 3 | `deal_value` | 67500000 | |
| 4 | `escrow` | true | |
| 5 | `holdback` | false | |
| 6 | `indemnification` | `TRADITIONAL` | No RWI |
| 7 | `regulatory` | empty / [] | No HSR — below threshold |
| 8 | `tsa.required` | true | |
| 9 | `tsa.direction` | SELLER_TO_BUYER | |
| 10 | `is_carveout` | **true** | CRITICAL — must detect carveout |
| 11 | `key_employees.non_competes` | true | |
| 12 | `jurisdiction` | `NEW_YORK` | NOT Delaware |

**Score: X/12. Must be ≥10 (85%).**
**Fail if:** `is_carveout` is false OR `transaction_structure` is wrong.

### P1-T12: Parse Orion Term Sheet 🔴

| # | Field | Expected | Notes |
|---|-------|----------|-------|
| 1 | `transaction_structure` | `REVERSE_TRIANGULAR_MERGER` | |
| 2 | `consideration` | `CASH` + `BUYER_STOCK` | |
| 3 | `deal_value` | 310000000 | |
| 4 | `escrow` | false | Clean exit — no escrow |
| 5 | `holdback` | false | |
| 6 | `indemnification` | `RW_INSURANCE_PRIMARY` | RWI only, no seller indemnity |
| 7 | `regulatory` | `HSR_FILING` + `CFIUS` | Both required |
| 8 | `financing.financing_condition` | false | |
| 9 | `tsa.required` | false | Company operates independently |
| 10 | `is_carveout` | false | |
| 11 | `jurisdiction` | DELAWARE | |

**Score: X/11. Must be ≥9 (85%).**
**Fail if:** `transaction_structure` is wrong OR `escrow` is true.

### P1-T13: Overall Parser Accuracy 🔴
```
Mercury:  X/14
Atlas:    X/12
Orion:    X/11
Overall:  X/37
```
**GATE: Must be ≥32/37 (86%) to proceed. If below, fix the prompt in `packages/ai/src/prompts/term-sheet-parser.ts` and re-test.**

### ─── CHECKLIST GENERATION ───

### P1-T20: Mercury Checklist 🔴

Generate checklist for Mercury (stock purchase, escrow=true, HSR, RWI, TSA, earnout, rollover).

**Must include:**
| Document | Why |
|----------|-----|
| Stock Purchase Agreement | Structure = STOCK_PURCHASE |
| Escrow Agreement | escrow = true |
| Disclosure Schedules | Always for SPA |
| Employment Agreements | Key employees |
| Non-Competition Agreements | non_competes = true |
| Transition Services Agreement | tsa.required = true |
| Rollover/Equity Agreement | Management rollover |
| R&W Insurance | RWI in indemnification |
| Earnout Agreement | Earnout in price adjustments |
| HSR Filing | regulatory includes HSR |

**Must NOT include:**
| Document | Why |
|----------|-----|
| Asset Purchase Agreement | Wrong structure |
| Bill of Sale | Asset purchase only |
| Certificate of Merger | Merger only |
| CFIUS Filing | Not in Mercury regulatory |

### P1-T21: Atlas Checklist 🔴

Generate checklist for Atlas (asset purchase, carveout, escrow=true, no HSR, seller note, TSA).

**Must include:**
| Document | Why |
|----------|-----|
| Asset Purchase Agreement | Structure = ASSET_PURCHASE |
| Bill of Sale | Asset purchase specific |
| Assignment and Assumption | Asset purchase specific |
| Escrow Agreement | escrow = true |
| Seller Note / Promissory Note | consideration includes SELLER_NOTE |
| Transition Services Agreement | tsa.required = true |
| IP Assignment Agreement | IP transferred in carveout |
| IP License Agreement | Bidirectional licenses |
| Non-Competition Agreements | non_competes = true |

**Must NOT include:**
| Document | Why |
|----------|-----|
| Stock Purchase Agreement | Wrong structure |
| Certificate of Merger | Wrong structure |
| HSR Filing | regulatory is empty |
| R&W Insurance | Not in Atlas deal |

### P1-T22: Orion Checklist 🔴

Generate checklist for Orion (merger, RWI only, HSR+CFIUS, no escrow, no TSA).

**Must include:**
| Document | Why |
|----------|-----|
| Agreement and Plan of Merger | Structure = REVERSE_TRIANGULAR_MERGER |
| Certificate of Merger | Merger specific |
| Voting/Support Agreements | Merger specific |
| R&W Insurance Policy | RWI primary |
| HSR Filing | regulatory includes HSR |
| CFIUS Filing | regulatory includes CFIUS |
| Employment Agreements | Key employees |

**Must NOT include:**
| Document | Why |
|----------|-----|
| Stock Purchase Agreement | Wrong structure |
| Asset Purchase Agreement | Wrong structure |
| Bill of Sale | Not an asset deal |
| Escrow Agreement | escrow = false |
| TSA | tsa.required = false |

### P1-T23: Checklist Differentiation 🔴

Compare primary document across all 3:
- Mercury → Stock Purchase Agreement
- Atlas → Asset Purchase Agreement
- Orion → Agreement and Plan of Merger

**Fail if any two deals have the same primary document type.**

### P1-T24: Checklist Item Count 🟡
- Mercury: 15-30 items
- Atlas: 15-30 items
- Orion: 12-25 items

**Fail if:** Any deal has <8 or >50 items.

### P1-T25: Checklist Persisted in Supabase 🔴
```typescript
const { data } = await supabase.from('checklist_items').select('*').eq('deal_id', MERCURY_ID);
console.log(`Mercury checklist items in Supabase: ${data?.length}`);
```
**Expected:** Same count as generated.

### ─── GOOGLE DRIVE ───

### P1-T30: Folder Creation 🔴

After creating a deal, verify a Google Drive folder was created.

```typescript
const drive = google.drive({ version: 'v3', auth });
const { data } = await drive.files.list({
  q: "'1NHOZfsZ-LokCUGD2Utfcfz_dZo6C31Ak' in parents and mimeType='application/vnd.google-apps.folder'",
  fields: 'files(id, name)',
});
console.log('Folders in Drive root:', data.files?.map(f => f.name));
```
**Expected:** A folder named like "Project Mercury Test (MercuryTest)" appears.

### P1-T31: Subfolder Structure 🟡

List contents of the deal folder:
```typescript
const dealFolderId = '...'; // from P1-T30
const { data } = await drive.files.list({
  q: `'${dealFolderId}' in parents`,
  fields: 'files(id, name)',
});
data.files?.forEach(f => console.log(f.name));
```
**Expected:** Subfolders like 00_Deal_Overview, 01_Organizational, 02_Purchase_Agreement, etc.

### P1-T32: Deal Record Has Drive ID 🟡
```typescript
const { data } = await supabase.from('deals').select('drive_folder_id, drive_folder_url').eq('id', MERCURY_ID).single();
console.log('Drive folder ID:', data?.drive_folder_id);
console.log('Drive folder URL:', data?.drive_folder_url);
```
**Expected:** Both fields populated.

### ─── UI ───

### P1-T40: Deals List Page 🟡
Navigate to `http://localhost:3000/deals`
**Expected:** Cards for all deals with correct names and values.

### P1-T41: Deal Dashboard 🟡
Navigate to `http://localhost:3000/deals/$MERCURY_ID`
**Expected:** Dashboard with deal info, health indicators.

### P1-T42: Checklist Page 🟡
Navigate to `http://localhost:3000/deals/$MERCURY_ID/checklist`
**Expected:** Checklist items displayed by category.

### P1-T43: Browser Console 🟢
**Expected:** No red errors in DevTools console.

---

## PHASE 2 TESTS

### P2-T01: Provision Taxonomy Seeded 🔴
```typescript
const { data, count } = await supabase.from('provision_types').select('*', { count: 'exact' });
console.log(`Provision types: ${count}`);
const categories = [...new Set(data?.map(d => d.category))];
console.log('Categories:', categories);
```
**Expected:** 50+ rows. Categories include: Definitions, Representations, Covenants, Indemnification, Closing Conditions, Termination, Miscellaneous.

### P2-T02: EDGAR Precedent Database 🟡
```bash
ls test-data/precedent-database/ | head -10
```
**Expected:** 5+ matter folders with agreements.
If EDGAR is inaccessible, verify synthetic templates exist.

### P2-T10: v1 — Correct Template 🔴

| Deal | Expected Template Type |
|------|----------------------|
| Mercury | Stock Purchase Agreement template |
| Atlas | Asset Purchase Agreement template |
| Orion | Agreement and Plan of Merger template |

**Fail if:** Wrong template selected for any deal.

### P2-T11: v1 — Persisted in Supabase 🔴
```typescript
const { data } = await supabase.from('document_versions')
  .select('*')
  .eq('deal_id', MERCURY_ID)
  .eq('version_number', 1);
console.log('v1 exists:', data?.length === 1);
```

### P2-T12: Provision Segmentation 🟡
After v1, count segments:
```typescript
const { count } = await supabase.from('provision_segments')
  .select('*', { count: 'exact' })
  .eq('document_version_id', V1_ID);
console.log('Segments:', count);
```
**Expected:** 30-60 segments.
**Fail if:** <10 or >200.

### P2-T14: v3 — No Placeholders 🔴

Read v3 document content. Search for these strings:

```typescript
const placeholders = ['[BUYER]', '[SELLER]', '[TARGET]', '[AMOUNT]', '[PURCHASE PRICE]',
  '[JURISDICTION]', '[DATE]', '[COMPANY]', '________', 'TBD'];
const found = placeholders.filter(p => v3Content.includes(p));
console.log(found.length === 0 ? 'PASS: No placeholders' : 'FAIL: Found placeholders: ' + found);
```

Also verify deal-specific content:
```typescript
const mustContain = ['SpectraTech Solutions', 'Meridian Capital Partners', 'Delaware', '185'];
const missing = mustContain.filter(s => !v3Content.includes(s));
console.log(missing.length === 0 ? 'PASS: Deal details present' : 'FAIL: Missing: ' + missing);
```

### P2-T15: 3 Versions in Supabase 🟡
```typescript
const { data } = await supabase.from('document_versions')
  .select('version_number, document_type')
  .eq('deal_id', MERCURY_ID)
  .order('version_number');
console.log('Versions:', data?.map(d => `v${d.version_number}`));
```
**Expected:** v1, v2, v3 all present.

### P2-T16: Files in Google Drive 🟡
List files in the deal's `02_Purchase_Agreement` subfolder:
```typescript
const { data } = await drive.files.list({
  q: `'${purchaseAgreementFolderId}' in parents`,
  fields: 'files(id, name)',
});
data.files?.forEach(f => console.log(f.name));
```
**Expected:** v1, v2, v3 files present.

---

## PHASE 3 TESTS

### P3-T01: NextAuth Config 🔴
Verify NextAuth configuration matches Azure credentials:
- Provider: `azure-ad` or `microsoft`
- Client ID: `b5c1994f-ceb6-4f9f-a292-b60f64592b2a`
- Tenant ID: `354b026f-8663-4e84-bc21-9cb3254b12e1`
- Redirect URIs include: `http://localhost:3000/api/auth/callback/microsoft`

### P3-T02: Graph API Client Setup 🟡
Verify Graph API client is configured to request correct scopes:
`Mail.Read`, `Mail.ReadWrite`, `Mail.Send`, `User.Read`, `offline_access`

### P3-T03: Email Display Page 🟡
Navigate to `/deals/$MERCURY_ID/emails`
**Expected:** Page renders (empty state with "Sync Emails" button or similar).

### P3-T04: OAuth Redirect 🟡
Navigate to `/login` → click Microsoft sign-in.
**Expected:** Redirects to Microsoft login page with correct client_id in URL.
(Cannot complete sign-in from Claude Code environment, but verify the redirect URL is correct.)

---

## PHASE 4 TESTS

### P4-T01: Ingest Agreement 🔴
Feed one EDGAR agreement through the ingestion pipeline.
```typescript
const { count } = await supabase.from('provision_formulations')
  .select('*', { count: 'exact' })
  .eq('source_document_id', DOC_ID);
console.log('Formulations created:', count);
```
**Expected:** 30-100 formulations per agreement.

### P4-T02: Embeddings Generated 🔴
```typescript
const { data } = await supabase.from('provision_formulations')
  .select('id, embedding')
  .eq('source_document_id', DOC_ID)
  .limit(5);
const hasEmbeddings = data?.every(d => d.embedding !== null);
console.log(hasEmbeddings ? 'PASS: All have embeddings' : 'FAIL: Missing embeddings');
```
**Expected:** All formulations have non-null embeddings.

### P4-T03: Vector Search 🔴
Search: "indemnification cap as percentage of purchase price"
**Expected:** Top results are indemnification-related provisions.

### P4-T04: Search Relevance 🟡
Search: "non-solicitation of employees"
**Expected:** Non-solicitation provisions (NOT non-compete provisions).

### P4-T05: 5+ Agreements Ingested 🟡
```typescript
const { data } = await supabase.from('provision_formulations')
  .select('source_document_id')
  .limit(1000);
const unique = new Set(data?.map(d => d.source_document_id));
console.log('Unique source documents:', unique.size);
```
**Expected:** ≥5.

---

## PHASE 5 TESTS

### P5-T01: DD Taxonomy 🔴
```typescript
const { count } = await supabase.from('dd_topics').select('*', { count: 'exact' });
console.log('DD topics:', count);
```
**Expected:** 50+ topics.

### P5-T02: DD Schema Generation 🔴
Generate DD schema for Mercury (tech, PE stock purchase).
**Expected:** 50-100 DD items across categories.
**Fail if:** <20 items.

### P5-T03: Finding CRUD 🟡
```typescript
const { data } = await supabase.from('dd_findings').insert({
  deal_id: MERCURY_ID,
  title: 'Undisclosed litigation',
  severity: 'critical',
  description: 'Patent infringement suit not in reps'
}).select().single();
console.log('Finding created:', data?.id);
```
**Expected:** Finding created and retrievable.

### P5-T04: Critical Finding Surfaces 🟡
Check deal dashboard shows critical finding indicator.

---

## PHASE 6 TESTS

### P6-T01: Context Compilation 🔴
Trigger context compiler for Mercury. It should assemble: deal params, open checklist items, document versions, findings.
**Expected:** Prompt context contains real Mercury deal data.
**Fail if:** Context is empty or generic.

### P6-T02: Morning Briefing 🟡
Generate briefing using real Claude API.
**Expected:** Mentions Mercury by name, references actual deal data (value, status, open items).

### P6-T03: Agent Chat — Status 🟡
Ask: "What's the status of Project Mercury?"
**Expected:** Response includes real deal data from Supabase.
**Fail if:** "I don't know" or fabricated data.

### P6-T04: Agent Chat — Checklist 🟡
Ask: "What checklist items are open for Mercury?"
**Expected:** Lists actual checklist items from Supabase.

### P6-T05: MCP Server Starts 🟢
```bash
cd packages/mcp-server && npx tsx src/index.ts
```
**Expected:** Starts without crash, lists tools.

---

## CROSS-PHASE REGRESSION TESTS

Run after Phase 2 and every subsequent phase:

### REG-01: Deal CRUD 🔴
```bash
curl -s http://localhost:3000/api/deals | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d)} deals')"
```
**Expected:** 3+ deals.

### REG-02: Checklist 🔴
```typescript
const { count } = await supabase.from('checklist_items').select('*', { count: 'exact' }).eq('deal_id', MERCURY_ID);
console.log('Mercury checklist items:', count);
```
**Expected:** 15+ items.

### REG-03: UI 🟡
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/deals
```
**Expected:** 200.

### REG-04: Build 🟡
```bash
pnpm build 2>&1 | tail -5
```
**Expected:** No errors.

---

## CLEANUP

After all testing, clean up test data:
```typescript
// Delete test deals (optional — or keep for demo)
const testDeals = await supabase.from('deals').select('id').like('code_name', '%Test');
for (const deal of testDeals.data || []) {
  await supabase.from('checklist_items').delete().eq('deal_id', deal.id);
  await supabase.from('document_versions').delete().eq('deal_id', deal.id);
  await supabase.from('dd_findings').delete().eq('deal_id', deal.id);
  await supabase.from('deals').delete().eq('id', deal.id);
}
```
