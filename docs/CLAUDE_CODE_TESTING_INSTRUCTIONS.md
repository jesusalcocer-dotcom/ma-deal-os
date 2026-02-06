# CLAUDE CODE INSTRUCTIONS: Phase 1 Testing & Validation

## CONTEXT

Phase 0 and Phase 1 scaffolding have been completed. 87 files were created covering the monorepo structure, database schema, API routes, UI pages, AI pipelines, and integrations. Before proceeding to Phase 2, we need to rigorously test everything that has been built.

Test documents are available in `~/Downloads/`:
- `TermSheet_ProjectMercury_PE_StockPurchase.md` — PE buyer, stock purchase, $185M
- `TermSheet_ProjectAtlas_Strategic_AssetPurchase.md` — Strategic buyer, asset purchase (carveout), $67.5M  
- `TermSheet_ProjectOrion_ReverseTriangularMerger.md` — Reverse triangular merger, $310M, mixed consideration
- `harvest_edgar.py` — Python script to download real M&A agreements from SEC EDGAR
- `EDGAR_HARVESTING_STRATEGY.md` — Strategy document for building precedent database

## STEP 1: Integrate Test Documents into the Repo

1. Create a `test-data/` directory in the repo root
2. Copy the three term sheet files from `~/Downloads/` into `test-data/term-sheets/`
3. Copy `harvest_edgar.py` into `scripts/`
4. Copy `EDGAR_HARVESTING_STRATEGY.md` into `docs/`
5. Add `test-data/` and `scripts/` to the repo
6. Commit: "Add test term sheets and EDGAR harvesting scripts"

## STEP 2: Run the EDGAR Harvester

1. Ensure `requests` is installed: `pip3 install requests`
2. Run `python3 scripts/harvest_edgar.py` from the repo root
3. This will create a `precedent-database/` directory with real M&A agreements organized in matter folders
4. Verify the output: check that at least 5-10 deals were downloaded with main agreements (Exhibit 2.1) in each matter folder
5. Add `precedent-database/` to `.gitignore` (these are large HTML files, don't commit them)
6. If the EDGAR API returns errors or no results, adjust the search date range or query terms and retry
7. Commit the gitignore update

## STEP 3: Verify Database Connection & Schema

Before testing any features, verify the foundation works:

1. Verify Supabase connection works by running a simple query from the backend
2. Run database migrations if not already run: `cd packages/db && pnpm drizzle-kit push`
3. Verify all tables exist: deals, checklist_items, document_versions, provision_formulations, dd_findings, deal_emails, drive_sync_records, users, activity_log, deal_team_members, deal_agent_memory, provision_types, provision_variants, dd_topics
4. Run the seed script if it exists: `cd packages/db && pnpm seed`
5. If any tables are missing, create them. If the seed script doesn't work, fix it.
6. **Log every issue found and fix it before proceeding.**

## STEP 4: Verify the Web App Starts

1. From the repo root, run `pnpm install` (if not already done)
2. Run `pnpm dev` (or `cd apps/web && pnpm dev`)
3. Verify the app starts on localhost:3000 without errors
4. Check that the following pages load without errors:
   - `/` (landing/login page)
   - `/deals` (deal list — should be empty)
   - `/deals/new` (new deal form)
5. **Fix any build errors, missing dependencies, or runtime errors before proceeding.**

## STEP 5: Test Deal CRUD

Test the full deal creation and retrieval flow:

1. **Create a deal via API:**
   ```bash
   curl -X POST http://localhost:3000/api/deals \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Project Mercury",
       "code_name": "Mercury",
       "target_name": "SpectraTech Solutions, Inc.",
       "buyer_name": "Meridian Capital Partners VII, L.P.",
       "industry": "Technology",
       "buyer_type": "PE",
       "deal_value": 185000000
     }'
   ```
   Verify: returns 200/201 with a deal ID.

2. **List deals via API:**
   ```bash
   curl http://localhost:3000/api/deals
   ```
   Verify: returns array with the deal just created.

3. **Get deal by ID:**
   ```bash
   curl http://localhost:3000/api/deals/{dealId}
   ```
   Verify: returns full deal object.

4. **Update deal:**
   ```bash
   curl -X PATCH http://localhost:3000/api/deals/{dealId} \
     -H "Content-Type: application/json" \
     -d '{"status": "active"}'
   ```
   Verify: returns updated deal.

5. **Verify in Supabase:** Check the deals table in the Supabase dashboard to confirm the data is persisted correctly.

6. **Verify in UI:** Navigate to `/deals` in the browser — the deal should appear. Click it — the deal dashboard should load.

**Fix any issues before proceeding.**

## STEP 6: Test Term Sheet Parser (CRITICAL)

This is the most important Phase 1 feature. Test with all three synthetic term sheets.

### Test 6a: Project Mercury (PE Stock Purchase)

1. Read the file `test-data/term-sheets/TermSheet_ProjectMercury_PE_StockPurchase.md`
2. Call the parse-term-sheet API endpoint with the file content
3. Verify the extracted Deal Parameter Object contains ALL of these values:
   - `transaction_structure`: `STOCK_PURCHASE`
   - `entity_types.buyer`: should indicate PE fund / LP
   - `entity_types.target`: `CORPORATION` (Delaware)
   - `buyer_formation`: `NEWCO` (Acquisition Sub is newly formed)
   - `consideration`: `['CASH']` (all cash)
   - `price_adjustments`: `['WORKING_CAPITAL_ADJ']` and ideally `EARNOUT`
   - `indemnification`: `RW_INSURANCE_SUPPLEMENTAL` or `COMBO_ESCROW_AND_RWI` (traditional + RWI supplement)
   - `escrow`: `true` ($18.5M escrow)
   - `holdback`: `true` ($2.5M working capital holdback)
   - `regulatory`: `['HSR_FILING']`
   - `financing.type`: combination of equity + debt
   - `financing.financing_condition`: `false` (no financing condition)
   - `key_employees.treatment`: `COMBO` (employment agreements + rollover)
   - `key_employees.non_competes`: `true`
   - `tsa.required`: `true`
   - `tsa.direction`: `SELLER_TO_BUYER`
   - `is_carveout`: `false`
   - `jurisdiction`: `DELAWARE`
   - `deal_value`: 185000000
   - `target_name`: "SpectraTech Solutions, Inc."
   - `buyer_name`: "Meridian Capital Partners VII, L.P."
   - `buyer_type`: "PE"

4. **Score the extraction:** Count how many of the above parameters were correctly extracted. Target: >85% accuracy.

### Test 6b: Project Atlas (Strategic Asset Purchase / Carveout)

1. Parse `test-data/term-sheets/TermSheet_ProjectAtlas_Strategic_AssetPurchase.md`
2. Verify extraction includes:
   - `transaction_structure`: `ASSET_PURCHASE`
   - `consideration`: should include `CASH` and `SELLER_NOTE`
   - `indemnification`: `TRADITIONAL` (no RWI)
   - `escrow`: `true`
   - `holdback`: `false`
   - `regulatory`: empty or no HSR (deal below threshold)
   - `financing.financing_condition`: `false`
   - `key_employees.treatment`: `RETENTION_BONUSES` or similar
   - `key_employees.non_competes`: `true`
   - `tsa.required`: `true` (heavy TSA for carveout)
   - `tsa.direction`: `SELLER_TO_BUYER`
   - `is_carveout`: `true` (THIS IS CRITICAL — the term sheet says "This is a carveout transaction")
   - `jurisdiction`: `NEW_YORK`
   - `deal_value`: 67500000

### Test 6c: Project Orion (Reverse Triangular Merger)

1. Parse `test-data/term-sheets/TermSheet_ProjectOrion_ReverseTriangularMerger.md`
2. Verify extraction includes:
   - `transaction_structure`: `REVERSE_TRIANGULAR_MERGER`
   - `consideration`: `['CASH', 'BUYER_STOCK']` (mixed consideration)
   - `indemnification`: `RW_INSURANCE_PRIMARY` (RWI as sole remedy, no seller indemnification)
   - `escrow`: `false` (no escrow — clean exit)
   - `holdback`: `false`
   - `regulatory`: `['HSR_FILING', 'CFIUS']`
   - `financing.type`: combination
   - `financing.financing_condition`: `false` (but there's a reverse termination fee for financing failure)
   - `key_employees.non_competes`: `true`
   - `tsa.required`: `false`
   - `is_carveout`: `false`
   - `jurisdiction`: `DELAWARE`
   - `deal_value`: 310000000

### If the parser fails or has low accuracy:

1. Examine the prompt in `packages/ai/src/prompts/term-sheet-parser.ts`
2. Check if the prompt covers all the parameter types in the term sheets
3. Check if the response parsing handles the JSON correctly
4. Fix the prompt, response parsing, or API call as needed
5. Re-run all three tests after fixes
6. **Do not proceed to Phase 2 until accuracy is >85% on all three term sheets**

## STEP 7: Test Checklist Generation (CRITICAL)

For each deal created from a parsed term sheet, test the checklist generator:

### Test 7a: Generate Checklist for Project Mercury

1. After parsing the Mercury term sheet and saving the deal parameters, call the generate-checklist endpoint
2. Verify the generated checklist includes AT MINIMUM these documents:
   - Stock Purchase Agreement (primary)
   - Escrow Agreement (because escrow = true)
   - Disclosure Schedules
   - Employment Agreements (because key employees have employment agreements)
   - Non-Competition Agreements (because non_competes = true)
   - Transition Services Agreement (because tsa.required = true)
   - Management Rollover / Equity Subscription Agreement (because of rollover)
   - R&W Insurance Binder (because of RWI)
   - Seller Note / Promissory Note (if earnout triggers it)

3. Verify checklist items have correct metadata:
   - Each has a `document_type` and `document_name`
   - Each has a `trigger_source` (should be 'deterministic')
   - Each has a `category`
   - Status should default to 'identified'

### Test 7b: Generate Checklist for Project Atlas

1. Generate checklist from Atlas deal parameters
2. Verify it includes:
   - Asset Purchase Agreement (NOT Stock Purchase Agreement — deal structure matters!)
   - Bill of Sale (specific to asset purchases)
   - Assignment and Assumption Agreement (specific to asset purchases)
   - Transition Services Agreement (heavy TSA for carveout)
   - IP Assignment Agreement (because IP is being assigned)
   - IP License Agreements (perpetual license + reverse license mentioned)
   - Seller Note / Promissory Note (because consideration includes seller note)
   - Non-Competition Agreement
   - Employee Offer Letters / Retention Agreements
   - Sublease Agreement (mentioned in TSA for office space)

### Test 7c: Generate Checklist for Project Orion

1. Generate checklist from Orion deal parameters
2. Verify it includes:
   - Agreement and Plan of Merger (NOT SPA — it's a merger!)
   - Certificate of Merger
   - Voting and Support Agreements (mentioned in term sheet)
   - Employment Agreements
   - R&W Insurance Policy (RWI primary)
   - HSR Filing documents
   - CFIUS Voluntary Notice (because CFIUS = true)
   - Stock consideration related docs (registration rights? stockholder agreement?)
   - No escrow agreement (escrow = false)
   - No TSA (tsa.required = false)

### Verify the rules engine:

1. Check `packages/core/src/rules/checklist-rules.ts`
2. Ensure the rules differentiate between deal structures (SPA vs APA vs Merger)
3. Ensure the rules trigger on the correct parameter combinations
4. **If the checklist is missing obvious documents or includes wrong ones, fix the rules engine**
5. **Do not proceed until all three checklists are reasonable**

## STEP 8: Test Google Drive Folder Creation

1. Create a new deal via the API
2. Verify a Google Drive folder was created in the `MA Deal OS` folder
3. Check that the folder structure matches the SPEC (subfolders for Deal Overview, Purchase Agreement, Ancillary, etc.)
4. If Google Drive integration isn't working, check:
   - Is the service account JSON at `./config/google-service-account.json`?
   - Is the service account email shared on the root Drive folder?
   - Are the environment variables `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` and `GOOGLE_DRIVE_ROOT_FOLDER_ID` set?
5. **Log any Drive integration issues but don't block on them — Drive can be fixed later**

## STEP 9: Test the UI Flow End-to-End

Walk through the entire user journey in the browser:

1. Go to `http://localhost:3000`
2. Navigate to `/deals/new`
3. Fill in basic deal info and create a deal
4. Navigate to the deal dashboard — verify it loads
5. If there's a term sheet upload feature, upload one of the test term sheets
6. Verify the parsed parameters display correctly
7. Generate a checklist — verify it appears on the checklist page
8. Check each sub-page: documents, emails, diligence, settings

**Document any UI bugs or broken pages.**

## STEP 10: Write a Test Report

Create a file `docs/PHASE1_TEST_REPORT.md` with:

1. **Database:** Connection status, tables created, seed data status
2. **Web App:** Build status, pages that load/don't load
3. **Deal CRUD:** API test results for create/read/update
4. **Term Sheet Parser:** Accuracy scores for all 3 term sheets (list each parameter and whether it was correctly extracted)
5. **Checklist Generator:** Documents generated for each deal type, any missing/incorrect items
6. **Google Drive:** Folder creation status
7. **UI:** End-to-end flow status, any broken pages
8. **Issues Found:** Numbered list of all bugs/issues with severity (critical/medium/low)
9. **Fixes Applied:** What was fixed during testing
10. **Recommendation:** Ready for Phase 2? If not, what still needs fixing?

Commit the test report.

## STEP 11: Fix All Critical Issues

Before proceeding to Phase 2:

- ALL critical issues must be fixed
- Term sheet parser must achieve >85% accuracy on all 3 test term sheets
- Checklist generator must produce correct document types for each deal structure
- Deal CRUD must work end-to-end
- Web app must build and start without errors

## STEP 12: Prepare for Phase 2

Only after all tests pass:

1. Move the EDGAR precedent documents into a location the system can access (either `test-data/precedent-database/` or upload to Supabase Storage)
2. Identify 2-3 of the best-quality downloaded agreements to serve as gold-standard templates
3. Confirm the provision taxonomy seed data is in the database
4. Then proceed to Phase 2: Document Pipeline

---

## IMPORTANT NOTES

- **Do not skip testing.** Every feature must be verified before building the next phase.
- **Fix issues in place.** When you find a bug, fix it immediately, don't just document it.
- **The term sheet parser accuracy is the #1 priority.** If it can't correctly extract deal parameters, nothing else downstream will work.
- **The checklist rules engine is #2 priority.** It must correctly differentiate between deal types.
- **Read the SPEC.md for full context on what each feature should do.**
- **The .env.local file has all credentials.** The config/google-service-account.json has the Drive key.
