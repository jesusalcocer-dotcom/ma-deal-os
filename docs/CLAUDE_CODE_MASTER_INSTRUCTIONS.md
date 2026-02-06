# CLAUDE CODE MASTER INSTRUCTIONS v2
## M&A Deal OS — Build → Test → Fix → Advance Protocol

---

## CRITICAL ENVIRONMENT CONSTRAINTS AND WORKAROUNDS

### 1. Database: Supabase via REST API (NOT direct PostgreSQL)

You CANNOT connect to Supabase via direct TCP/PostgreSQL (`db.*.supabase.co` DNS does not resolve in your environment). **Do NOT attempt `drizzle-kit push` — it will fail.**

The database schema is ALREADY pushed. All 14 tables exist. A test deal "Project Mercury" already exists.

**For ALL database operations during testing, use the Supabase JS client:**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iuiasttwnukfudcestgc.supabase.co',
  'sb_secret_tl-88kqeyyMTKpsrWLbbPA_WlK8hWyn' // service role key for full access
);

// INSERT
const { data, error } = await supabase.from('deals').insert({...}).select().single();

// SELECT
const { data: deals } = await supabase.from('deals').select('*');

// UPDATE
const { data } = await supabase.from('deals').update({status: 'closing'}).eq('id', dealId).select().single();

// DELETE
const { error } = await supabase.from('deals').delete().eq('id', dealId);
```

**Any code that uses Drizzle ORM for queries MUST also work when the app runs locally with a real DATABASE_URL.** The Supabase client is for YOUR testing only. The production app uses Drizzle + PostgreSQL connection.

### 2. Google Drive: REAL Credentials — Test for Real

You have a real Google service account. Create `config/google-service-account.json` with the key provided below. Test folder creation, file upload, and listing for real.

### 3. Anthropic API: REAL Key — Test for Real

You have a real Anthropic API key. Call Claude for term sheet parsing, document generation, and all AI pipelines. Do NOT mock AI responses.

### 4. Microsoft/Outlook: Configuration Only

OAuth requires a browser. Build the flow correctly, verify configuration matches the credentials. You cannot complete the OAuth handshake, but verify the NextAuth config, redirect URIs, and Graph API client are correct.

### 5. Dev Server Testing

When testing API routes, start the dev server (`pnpm dev`) and make HTTP requests to `http://localhost:3000/api/...`. This is how the real app works.

---

## FIRST STEP: Create All Credential Files

Before doing ANYTHING else, create these files:

### File 1: `.env.local` (repo root)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://iuiasttwnukfudcestgc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_M3jSCZIMq0aCdNCmyAEfBQ_niTOzzEL
SUPABASE_SERVICE_ROLE_KEY=sb_secret_tl-88kqeyyMTKpsrWLbbPA_WlK8hWyn
DATABASE_URL=postgresql://postgres:Sejunepeck1996!@db.iuiasttwnukfudcestgc.supabase.co:5432/postgres

# AI
ANTHROPIC_API_KEY=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

# Embeddings
EMBEDDING_PROVIDER=voyage
EMBEDDING_MODEL=voyage-3
EMBEDDING_DIMENSIONS=1024

# Google Drive
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./config/google-service-account.json
GOOGLE_DRIVE_ROOT_FOLDER_ID=1NHOZfsZ-LokCUGD2Utfcfz_dZo6C31Ak

# Microsoft / Outlook
MICROSOFT_CLIENT_ID=b5c1994f-ceb6-4f9f-a292-b60f64592b2a
MICROSOFT_TENANT_ID=354b026f-8663-4e84-bc21-9cb3254b12e1
MICROSOFT_CLIENT_SECRET=H_c8Q~sHGvDT3aJDy5MCUKA4syXYqPuFP5EkwbA~

# App
NODE_ENV=development
NEXTAUTH_URL=https://madeals.app
NEXTAUTH_SECRET=pd+woOJUFD/YXExXAiZugaxaxFNPv/BonwJw2Dv06iE=
```

### File 2: Copy to `apps/web/.env.local` and `packages/db/.env.local`

```bash
cp .env.local apps/web/.env.local
cp .env.local packages/db/.env.local
```

### File 3: `config/google-service-account.json`

```json
{
  "type": "service_account",
  "project_id": "ma-deal-os",
  "private_key_id": "88ca5483d4ec91ed676189a84386ee441aeb8f22",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDu/M0IxKfcADMd\nwgtexxBQIDUN/sIuHorWeAHwuo6uGrrWbgbpnZaZPV6lFVM3PBqTAKqL4HlxBdya\nx9A2/gbXCqcTuOIWx+MC4Inwe4SFVZl1zfsnveyw2zYxWNfjHGZ4QQEOhfKDDODn\nOe07A2pXkNl7laDwFEExTyIh3n8IuXBbUv3s/1xp+xDSbgcv5PGLIyXTd4WGT0lv\ndC/wYh7IKGNVKDV4L3EcXRHGj3eKvBpYbkY23jaVmiqsXxeePuXCvZENcNdx6kRj\n/sCFuZ/iDkfIit10Q7/mrSvtCfwiRlT5XqjVzYwICIu/3PVWqg+xuH2D9knBdlU5\nJS3K/BHxAgMBAAECggEAbs1Ufnk23kBVcrmRrfqbLJsSHg/8lYdhlXgEZkkId946\nu8o9eDixJxEV/XH6qAQ8yeUoLTwA8g7mrfhwJ9706uSse+9fG3LHZIEYUx/hXDRI\ntx6uEEn1IDYyVQS86zYyqBRzWflua6Yf6/SmcZLuzfSBcNP5zvWFGEh5KbzPpwn1\nmRmLbLSfqOj1NtCCcjFNajGKUZ6fJXVhBxbxW7mO2HNJW0B238FHo2OIvILD+YFK\n/i4FvQIh+Aqt+c/RrH0Oj46CWTd1TrLTYJmXp3hBHxsl6JUxEzq4ksyedBC/RDC4\n0KZPlWk7mlGr9I48XI+f6jO3wOTBv5vxD0PUnEvcpQKBgQD5N/OwfOX4QUCaSLbK\nI9whI00N0R1ckFlZeyL682/ZTrcm/bNUI9GlrwLCUO2giG21kuczTaFwdKl4PDB6\nKShX1iwWSorq1bk61Tb5wpGWvpvSi/Nt2eekRHk6fFXt4HgZeWyVQJpmRMKqo3L0\nhXVFGMOnkkoMFzJBUawzCpWlvwKBgQD1fZRtbSITFlS4GtejvpEWNEy3Z4XJp3Vl\n8grrjF6SmUNjKRPJedcl5lzUFrn1CL/PQyOSpTrt06ii1KERRIkv+CtQ9S5xrTNw\nGO3Fn9jb6K3SZYDmwdVoSCLDEg+ve348KYkc/wFP8XMAoLaqNTA0Ph5ubT/e0+5j\nQm6b7uUUTwKBgA8PCnKHmX2+s6Ce9CySriJyd512HUgSkNOPVTXEr+V5lCeO/N8A\nqxJP2OLU8QbaN4bZMY8wCak542OYf3ViN0XXcyKFro8yCtc7Ou8sio+JRPEb88GX\ngR+z439dM/QDtD4V0DHUjX/Qd9LHvZJ43fUm4eumM0M3w5mezcDnytMRAoGAEuEF\neSTbafxdp4ro6n7NSZfcDn63mzp1nNFwZYz1+PAwbn/KNcRY92Ev4l+dDWsO1TGk\nmrJ6Ra/xWBRiDqHmqvm62w7/814OhqBkKL6SPtc2BugncZeWgd6KTdYlvqkQnC/V\ni5VQ1IUNAw9Y/N36Rwo/7N4Z+1jxDFEfkH5ev6ECgYEAyBVfV3urBBL+lhwsoRHB\nsP/+ckA8tTmlR1Q0aO7kEYC6UoajSUqzDiXB7S9tLLXl8BXT3Bs0E2atyJ0JScRO\nh3JMZ8ent0XCas1syXg8tIvI1d9pE240FadFqoaDNdZ1nak1sX0Zw9jQuXVB1oG/\n5WdGWH/tm7/dBK+EyBdmOQw=\n-----END PRIVATE KEY-----\n",
  "client_email": "ma-deal-os@ma-deal-os.iam.gserviceaccount.com",
  "client_id": "102927067674281393732",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/ma-deal-os%40ma-deal-os.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
```

---

## PHASE EXECUTION SEQUENCE

### ═══════════════════════════════════════
### PHASE 0+1: REVALIDATE WITH REAL SERVICES
### ═══════════════════════════════════════

Phase 0 and 1 code was already built and tested against local PostgreSQL. **You must now revalidate against real services.** This means:

1. Verify Supabase connection via REST API
2. Create deals in REAL Supabase
3. Run term sheet parser against REAL Anthropic API
4. Generate checklists and verify they're in REAL Supabase
5. Test Google Drive folder creation with REAL credentials

**READ:** SPEC.md for full context
**TEST DATA:** `test-data/term-sheets/` has 3 synthetic term sheets
**RUN:** Every Phase 0 and Phase 1 test from `docs/TESTING_PROTOCOL.md`
**REPORT:** `docs/test-results/phase1_test_report.md`

**GATES — must ALL pass to proceed:**
- [ ] Supabase CRUD via REST API works (insert, select, update deals)
- [ ] Term sheet parser >85% accuracy on all 3 test sheets (real Claude API)
- [ ] Checklist correctly differentiates SPA vs APA vs Merger
- [ ] Google Drive: folder created in real Drive, subfolders present
- [ ] `pnpm build` succeeds
- [ ] Dev server starts and pages render

---

### ═══════════════════════════════════════
### PHASE 2: Document Pipeline (v1–v3)
### ═══════════════════════════════════════

**READ:** SPEC.md → Sections 7.2-7.5, 6.4

**PREREQUISITE:** Run EDGAR harvester for precedent database:
```bash
pip3 install requests
python3 scripts/harvest_edgar.py
```
If EDGAR API is inaccessible from your environment, create 3 synthetic template agreements (one SPA, one APA, one merger agreement) with realistic provision language.

**BUILD:**
1. Provision type taxonomy — seed 50+ types into Supabase `provision_types` table via REST API
2. Template agreement storage
3. v1 generation: select correct template by deal type
4. Provision segmentation: break document into 30-60 tagged sections
5. v2 generation: apply precedent formulations from EDGAR database
6. v3 generation: scrub with deal-specific details (real party names, amounts, jurisdiction)
7. Document version tracking in Supabase `document_versions` table
8. Upload each version to Google Drive (real — verify files appear in Drive)
9. Document versions UI page

**TEST:** ALL Phase 2 tests from `docs/TESTING_PROTOCOL.md`
**REPORT:** `docs/test-results/phase2_test_report.md`

**GATES:**
- [ ] Correct template selected per deal type
- [ ] v3 contains real deal details (no [BUYER] or [AMOUNT] placeholders)
- [ ] All 3 versions tracked in Supabase `document_versions`
- [ ] Files uploaded to Google Drive (verify by listing folder contents)
- [ ] Provision segmentation produces 30-60 segments

---

### ═══════════════════════════════════════
### PHASE 3: Email Integration
### ═══════════════════════════════════════

**READ:** SPEC.md → Section 10, 6.1

**BUILD:**
1. Microsoft OAuth flow via NextAuth (Azure app credentials provided)
2. Email sync via Microsoft Graph API
3. Email classification (tag emails to deals)
4. Attachment processing (download, store, upload to Drive)
5. Email display in deal dashboard

**OAuth Testing Limitation:** You cannot complete the browser OAuth flow. Instead:
- Verify NextAuth provider config matches Azure credentials
- Verify redirect URIs: `http://localhost:3000/api/auth/callback/microsoft` and `https://madeals.app/api/auth/callback/microsoft`
- Verify Graph API client is configured correctly
- If you can obtain a token manually, test Graph API calls

**TEST:** ALL Phase 3 tests from `docs/TESTING_PROTOCOL.md`
**REPORT:** `docs/test-results/phase3_test_report.md`

---

### ═══════════════════════════════════════
### PHASE 4: Precedent Intelligence
### ═══════════════════════════════════════

**READ:** SPEC.md → Sections 7.6-7.8

**BUILD:**
1. Precedent ingestion pipeline (decompose → classify provisions → generate embeddings via Voyage/Anthropic API)
2. Store embeddings in Supabase `provision_formulations` table (pgvector)
3. Vector similarity search endpoint
4. "What's market" analysis
5. v4 generation (substance adaptation)
6. Markup analysis (compare two document versions, classify changes)

**Embedding Notes:**
- Use the Anthropic API key with model `voyage-3` for embeddings
- Store as 1024-dimension vectors in the `embedding` column
- Supabase supports pgvector — use the `vector` type and cosine similarity for search

**TEST:** ALL Phase 4 tests from `docs/TESTING_PROTOCOL.md`
**REPORT:** `docs/test-results/phase4_test_report.md`

**GATES:**
- [ ] Embeddings generated (non-null) for ingested agreements
- [ ] Vector search returns semantically relevant provisions
- [ ] At least 5 agreements fully ingested

---

### ═══════════════════════════════════════
### PHASE 5: Due Diligence Engine
### ═══════════════════════════════════════

**READ:** SPEC.md → Sections 7.9, 6.5

**BUILD:**
1. DD topic taxonomy seed (50+ topics across 10+ categories)
2. DD schema generation from deal parameters
3. VDR document processing
4. Finding creation and management (severity levels, linked to documents)
5. DD → document pipeline integration (findings inform deal agreement provisions)
6. DD dashboard with progress tracking

**TEST:** ALL Phase 5 tests from `docs/TESTING_PROTOCOL.md`
**REPORT:** `docs/test-results/phase5_test_report.md`

---

### ═══════════════════════════════════════
### PHASE 6: Deal Agent & Cowork Plugin
### ═══════════════════════════════════════

**READ:** SPEC.md → Sections 11, 12

**BUILD:**
1. Deal agent context compiler (assembles deal state, checklist, docs, findings into prompt context)
2. Morning briefing generator (real Claude API call with deal context)
3. Agent chat interface (conversational Q&A about a deal, backed by real Claude API)
4. Cowork plugin structure
5. MCP server with deal tools

**TEST:** ALL Phase 6 tests from `docs/TESTING_PROTOCOL.md`
**REPORT:** `docs/test-results/phase6_test_report.md`

---

## ERROR RECOVERY

1. **Supabase REST API error:** Check that you're using the service role key (not anon key) for writes. Check table names match schema exactly.
2. **Google Drive error:** Verify `config/google-service-account.json` has the real key (not `{}`). Verify the service account email has Editor access on folder `1NHOZfsZ-LokCUGD2Utfcfz_dZo6C31Ak`.
3. **Anthropic API error:** Check the API key starts with `sk-ant-api03-`. Check model is `claude-sonnet-4-20250514` or similar.
4. **Build error after 3 attempts:** Document it, skip to next sub-feature, come back later.
5. **Test failure after 3 fix attempts:** Mark as DEFERRED with explanation (never defer parser accuracy or checklist correctness).

---

## TEST REPORT FORMAT

```markdown
# Phase {N} Test Report
Date: {date}

## Environment
- Database: Supabase (REAL, via REST API) — NOT local PostgreSQL
- Google Drive: REAL service account — files verified in Drive
- Anthropic API: REAL API key
- Microsoft: Configuration verified (OAuth requires browser)

## Summary
| Metric | Value |
|--------|-------|
| Tests Run | X |
| Passed | X |
| Failed | X |
| Fixed During Testing | X |
| Deferred | X |

## Detailed Results
| Test ID | Name | Severity | Result | Notes |
|---------|------|----------|--------|-------|
| P{N}-T01 | ... | 🔴 | PASS/FAIL | ... |

## Issues Found and Fixed
| # | Issue | Severity | Fix | Verified |
|---|-------|----------|-----|----------|

## Gate Decision
Ready for Phase {N+1}: YES / NO
Blocking issues: {list if NO}
```

---

## FINAL DELIVERABLE

After all 6 phases, create `docs/FINAL_BUILD_REPORT.md`:
1. What was built per phase
2. Test results summary per phase
3. Known issues and limitations
4. Integration status (Supabase ✅, Drive ✅, Claude API ✅, Outlook ⚠️)
5. Deployment readiness for Vercel
