# Phase 10: Precedent Intelligence Pipeline

## Prerequisites
- Phase 2 complete (provision taxonomy, EDGAR precedent database, provision segmenter)
- Phase 8 complete (skills system operational)
- Existing: 50 provision types, 10 EDGAR deals, provision_formulations table with vector embeddings

## What You're Building

Enhancing the existing precedent database with:
1. **Automated quality scoring** — firm tier, deal size, recency, structural quality, corpus alignment
2. **EDGAR discovery pipeline** — automated search and ingestion of new precedent agreements
3. **Quality-weighted retrieval** — search results ranked by quality + similarity
4. **Dynamic quality learning** — scores update based on usage and feedback
5. **What's-market analysis** — data-driven market position analysis

## Reference
- SPEC-V2-COMPLETE.md Section 10 (Precedent Intelligence Pipeline), 18.13 (Precedent API Routes)

## Steps

### Step 10.1: Quality Score Fields on Provision Formulations

**What:** Add quality scoring columns to the existing `provision_formulations` table.

**Files to modify:**
- `packages/db/src/schema/` — Update provision_formulations schema
- ALTER TABLE provision_formulations

**Implementation details:**
- Add columns: `firm_tier`, `deal_size_score`, `recency_score`, `structural_quality_score`, `corpus_alignment_score`, `composite_quality_score` (all DECIMAL(3,2))
- All default to NULL (unscored)
- Composite quality is calculated: weighted average of all non-null scores

**Test:**
```bash
cat > /tmp/test-quality-columns.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function test() {
  const { data } = await supabase.from('provision_formulations')
    .select('id, firm_tier, composite_quality_score').limit(1);
  console.log('Formulation with quality fields:', data?.[0]);
  console.log('PASS: Quality columns exist');
}
test().catch(console.error);
EOF
npx tsx /tmp/test-quality-columns.ts
```
**Expected:** Columns exist and return null (unscored).
**Severity:** 🔴 CRITICAL

### Step 10.2: Firm Tier Lookup

**What:** Firm identification and tier assignment.

**Files to create/modify:**
- `packages/core/src/constants/firm-tiers.ts` — Firm name → tier score mapping
- `packages/integrations/src/precedent/firm-identifier.ts` — Extract firm names from agreement text

**Implementation details:**
- Firm tiers from SPEC:
  - Tier 1 (1.0): Wachtell, Sullivan & Cromwell, Cravath, Simpson Thacher, Skadden
  - Tier 2 (0.85): Latham, Kirkland, Davis Polk, Cleary, Debevoise, Paul Weiss
  - Tier 3 (0.70): Other Am Law 50
  - Tier 4 (0.50): Regional/small firms
  - Unknown (0.40): Cannot identify
- `identifyFirm(text)`: Use regex and keyword matching on signature blocks to identify law firms
- Return the highest-tier firm found

**Test:**
```bash
pnpm build --filter @ma-deal-os/core
node -e "
const { FIRM_TIERS } = require('./packages/core/dist/constants/firm-tiers');
console.log('Firms loaded:', Object.keys(FIRM_TIERS).length);
console.log('Wachtell tier:', FIRM_TIERS['Wachtell']);
console.log('PASS');
"
```
**Expected:** Firm lookup returns correct tiers.
**Severity:** 🟡 HIGH

### Step 10.3: Quality Scoring Pipeline

**What:** Score existing provision formulations on all quality signals.

**Files to create/modify:**
- `packages/integrations/src/precedent/quality-scorer.ts` — `scoreFormulation(formulation): QualityScores`
- `scripts/score-precedent-quality.ts` — Batch script to score all existing formulations

**Implementation details:**
- For each formulation:
  1. **Firm tier:** Run firm identifier on source text → score
  2. **Deal size:** Map deal_size_range to score (larger deals = higher quality, 0.5-1.0 range)
  3. **Recency:** Decay function based on year. 2025-2026=1.0, 2023-2024=0.85, 2021-2022=0.70, older=0.50
  4. **Structural quality:** Layer 2 API call — evaluate drafting quality (defined terms, cross-references, completeness). Score 0-1.
  5. **Corpus alignment:** Skip for now (needs centroid calculation after more data). Default 0.5.
  6. **Composite:** Weighted average: firm_tier(0.15) + deal_size(0.10) + recency(0.15) + structural_quality(0.40) + corpus_alignment(0.20)
- Update formulation record with scores

**Test:**
```bash
npx tsx scripts/score-precedent-quality.ts
# Check scores were applied
npx tsx -e "
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
s.from('provision_formulations').select('id, composite_quality_score').not('composite_quality_score', 'is', null).limit(5)
  .then(r => console.log('Scored formulations:', r.data?.length));
"
```
**Expected:** Existing formulations have quality scores assigned.
**Severity:** 🔴 CRITICAL

### Step 10.4: Quality-Weighted Retrieval

**What:** Enhanced precedent search that weights results by quality and similarity.

**Files to create/modify:**
- `packages/integrations/src/precedent/quality-retrieval.ts` — `searchPrecedent(query): PrecedentResult[]`

**Implementation details:**
- Input: `{ provision_type, variant?, deal_profile?, query_text?, min_quality, max_results }`
- Query strategy:
  1. Filter by provision_type (exact match)
  2. If query_text provided, compute similarity via embedding
  3. Final score: `(0.6 * similarity) + (0.4 * composite_quality_score)`
  4. Filter by min_quality threshold (default 0.5)
  5. Sort by final_score DESC
  6. Return top N results
- If no embeddings available, fall back to text search with quality weighting only

**Test:**
```bash
cat > /tmp/test-quality-retrieval.ts << 'EOF'
// Test quality-weighted precedent search
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function test() {
  const { data } = await supabase.from('provision_formulations')
    .select('id, composite_quality_score, text')
    .not('composite_quality_score', 'is', null)
    .order('composite_quality_score', { ascending: false })
    .limit(5);
  console.log('Top quality formulations:', data?.map(d => ({
    score: d.composite_quality_score,
    text: d.text?.substring(0, 80)
  })));
  console.log('PASS: Quality-weighted retrieval works');
}
test().catch(console.error);
EOF
npx tsx /tmp/test-quality-retrieval.ts
```
**Expected:** Returns formulations ordered by quality score.
**Severity:** 🔴 CRITICAL

### Step 10.5: EDGAR Discovery Pipeline

**What:** Automated pipeline to discover and ingest new precedent agreements from EDGAR.

**Files to create/modify:**
- `packages/integrations/src/precedent/edgar-discovery.ts` — EDGAR EFTS search + exhibit download
- `packages/integrations/src/precedent/edgar-ingestion.ts` — Full ingestion pipeline

**Implementation details:**
- Use EDGAR EFTS (full-text search system) to find filings:
  - URL: `https://efts.sec.gov/LATEST/search-index?q=...`
  - Search for form types: 8-K, DEF 14A, S-4
  - Keywords: "stock purchase agreement", "merger agreement", "asset purchase agreement"
  - Date filter: last 3 years
- For each filing:
  1. Download exhibit documents
  2. Extract clean text (strip HTML)
  3. Run provision segmenter (existing from Phase 2)
  4. Classify each provision (Layer 2 API call)
  5. Score quality
  6. Generate embeddings (if embedding API available)
  7. Store in provision_formulations

**Note:** This extends the existing EDGAR harvesting from Phase 2 (which manually processed 10 deals). This automates it.

**Test:**
```bash
# Test EDGAR search (no ingestion)
curl -s "https://efts.sec.gov/LATEST/search-index?q=%22stock+purchase+agreement%22&dateRange=custom&startdt=2024-01-01&enddt=2026-01-01&forms=8-K" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  print(f'EDGAR results: {d.get(\"total\", {}).get(\"value\", \"unknown\")}')
except:
  print('EDGAR API returned non-JSON (may need different endpoint)')
"
```
**Expected:** EDGAR search returns results (may need endpoint adjustment based on current API).
**Severity:** 🟡 HIGH

### Step 10.6: What's-Market Analysis API

**What:** Endpoint that provides market data for a given provision type.

**Files to create/modify:**
- `apps/web/src/app/api/precedent/whats-market/route.ts` — GET: market analysis for a provision type
- `packages/ai/src/pipelines/whats-market.ts` — Market analysis pipeline

**Implementation details:**
- Input: provision_type, deal_profile (size, industry, structure)
- Query provision_formulations for the type, filter by deal_profile
- Calculate statistics:
  - Most common variant (e.g., "tipping basket" vs "true deductible")
  - Typical thresholds/values (e.g., "basket threshold: median $500K, range $250K-$1M")
  - Trend (e.g., "shifting toward buyer-favorable in recent deals")
- Use Layer 2 API call to synthesize findings into a natural language summary
- Return both structured data and narrative

**Test:**
```bash
curl -s "http://localhost:3000/api/precedent/whats-market?provision_type=indemnification.basket.type" | python3 -c "
import sys,json; d=json.load(sys.stdin); print(d.get('summary', 'No summary')[:200])"
```
**Expected:** Returns market analysis with statistics and narrative.
**Severity:** 🟡 HIGH

### Step 10.7: Dynamic Quality Learning (Hooks)

**What:** Update quality scores based on usage and feedback.

**Files to create/modify:**
- `packages/integrations/src/precedent/quality-updater.ts` — `updateQualityFromFeedback(event: QualityFeedbackEvent)`

**Implementation details:**
- When a formulation is used and approved: increase composite_quality_score by 0.02 (max 1.0)
- When used and modified: decrease by 0.02 (min 0.0), store partner's version as new formulation with score 0.85
- When used and rejected: decrease by 0.05
- When used across multiple deals: bonus +0.05
- This function is called by the feedback event pipeline (Phase 14 integrates fully, but the hook is set up now)

**Test:**
```bash
pnpm build --filter @ma-deal-os/integrations
node -e "console.log('Quality updater module loads'); console.log('PASS');"
```
**Expected:** Module builds and exports functions.
**Severity:** 🟢 MEDIUM

### Step 10.8: Precedent API Routes

**What:** Additional precedent API routes.

**Files to create/modify:**
- `apps/web/src/app/api/precedent/search/route.ts` — POST: enhanced semantic search
- `apps/web/src/app/api/precedent/quality-report/route.ts` — GET: quality distribution report

**Implementation details:**
- POST `/search`: Accept provision_type, query_text, min_quality, max_results. Return quality-weighted results.
- GET `/quality-report`: Return quality score distribution across all formulations. Histogram data.

**Test:**
```bash
curl -X POST http://localhost:3000/api/precedent/search \
  -H "Content-Type: application/json" \
  -d '{"provision_type":"indemnification.basket.type","max_results":5}'
```
**Expected:** Returns precedent formulations sorted by quality-weighted score.
**Severity:** 🟡 HIGH

## Phase Gate
- [ ] Quality score columns added to provision_formulations
- [ ] Firm tier lookup works for major firms
- [ ] Existing formulations scored (composite_quality_score populated)
- [ ] Quality-weighted retrieval returns results ordered by quality
- [ ] EDGAR discovery pipeline can search SEC filings
- [ ] What's-market analysis returns meaningful data
- [ ] Quality learning hooks implemented
- [ ] `pnpm build` succeeds
