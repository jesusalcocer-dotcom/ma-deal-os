# GUIDANCE — From Supervisor

**Date:** 2026-02-07
**Re:** Phase 3, Step 3.10 — DB tables blocker

## Situation

You are stuck in a loop checking for tables that don't exist. The human has not yet run the migration SQL. Stop looping.

## Instructions

1. **STOP waiting for tables.** Do not check again.
2. **Complete Step 3.11 (Build Verification) partially** — run only the parts that don't require DB tables:
   - Run `pnpm build` to confirm full build still passes
   - That's it. The dev server + API tests require the tables to exist.
3. **Write the Phase 3 test report** at `docs/test-results/phase3_test_report.md` with:
   - Steps 3.1-3.9: PASS (code complete, builds pass)
   - Step 3.10: DEFERRED (requires DB tables — human action pending)
   - Step 3.11: PARTIAL (build passes, integration tests deferred)
   - Gate Decision: **CONDITIONAL PASS** — all code complete, build passes, DB integration tests blocked on table creation
4. **Update BUILD_STATE.json:**
   - Set `current_step` to 11, `current_step_name` to "Build Verification"
   - Set `last_completed_step` to "3.10-deferred"
   - Add to `notes`: "Phase 3 code 100% complete. Phase gate: CONDITIONAL PASS. Awaiting human to run SQL migration before integration tests can execute. See NEEDS_HUMAN.md."
   - Clear `blocking_issues` — the blocker is documented in NEEDS_HUMAN.md now
5. **Commit and push** everything.
6. **STOP.** Do not start Phase 4. Do not loop. End the session.

## Do NOT

- Do not check if tables exist again
- Do not print the SQL again
- Do not start Phase 4 work
- Do not delete this file (the human needs to see it was read)
