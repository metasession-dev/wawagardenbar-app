# UAT Checklist — REQ-040 (Script hardening — refuse mongodb:// URIs without database path)

**Requirement:** Script-boundary safety check for ops scripts
**Issue:** [#89](https://github.com/metasession-dev/wawagardenbar-app/issues/89)
**Date:** 2026-05-17

## What's automated vs manual

Pure-helper unit tests cover the parser matrix exhaustively. UAT residual is the local-only manual run of each script against a real (UAT) Mongo URI to confirm:

- Valid URI proceeds, logs the database name on stdout, completes its work.
- Path-less URI exits non-zero with the helper's error message, BEFORE any Mongo connection is opened (verify by running with `MONGOOSE_DEBUG=true` or similar — there should be no connection-attempt log).

## Pre-flight

- [ ] No schema migration. No env-var addition. No app-side change.

## Manual — local run

For BOTH scripts (`scripts/backfill-inventory-kind.ts` and `scripts/audit-expense-link-units.ts`):

- [ ] **Valid URI:** Set `MONGODB_UAT_EXTERNAL_URI=mongodb://...:.../wawagardenbar?authSource=admin` and invoke the script in dry-run mode. Stdout includes `Connecting to database: wawagardenbar`. Script completes its work without error.
- [ ] **Path-less URI:** Override env to `mongodb://...:...` (no path). Invoke the script. Exit code is 1. Stderr contains a message naming `MONGODB_DB_NAME`. No connection log appears.

## Sign-off

- [ ] Vitest 8+ new tests in `__tests__/lib/mongo-uri.test.ts` green on develop CI
- [ ] Both manual runs above completed
- [ ] DevAudit / META-COMPLY UAT approval recorded
- [ ] PR merged to main
