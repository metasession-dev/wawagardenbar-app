# Test Plan — REQ-040 (Script hardening — refuse mongodb:// URIs without database path)

**Status:** DRAFT
**Date:** 2026-05-17
**Issue:** [#89](https://github.com/metasession-dev/wawagardenbar-app/issues/89)
**Risk Level:** LOW (pure parser + script-boundary check; strictly safer than today)

## Scope

D12 (in REQ-034's release ticket) was a near-miss: the prod backfill ran against the wrong Mongo database because the URI passed in was `mongodb://host:port` (no database path), and the driver silently connected to the default DB. This REQ adds a script-boundary safety check that refuses such URIs.

## Acceptance criteria

| AC  | Description                                                                                                                                                                                                         | Verification                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC1 | New pure helper `lib/mongo-uri.ts` exports `assertMongoUriHasDatabase(uri): { uri, database }`. Returns the resolved DB name when the URI has a path-segment database; throws naming `MONGODB_DB_NAME` when missing | Vitest: 8+ unit tests covering happy paths (path-db, mongodb+srv, with querystring), error paths (no path, empty path, authSource-only), non-mongodb URI rejection |
| AC2 | `scripts/backfill-inventory-kind.ts` + `scripts/audit-expense-link-units.ts` both call the helper BEFORE any `mongoose.connect(...)`. On throw → stderr + `process.exit(1)`                                         | Manual run with a path-less URI exits non-zero before connecting; manual run with a valid URI proceeds normally                                                    |
| AC3 | Both scripts log `Connecting to database: <name>` after the assert succeeds, so the operator can sanity-check intent before any read or write                                                                       | Manual UAT — log line present on every script invocation                                                                                                           |
| AC4 | Tests in `__tests__/lib/mongo-uri.test.ts` cover the matrix in AC1                                                                                                                                                  | Vitest delta ≥ +8 new tests; all pass                                                                                                                              |
| AC5 | UAT-checklist documents the local-only verification (positive + negative cases against the operator's machine)                                                                                                      | `compliance/evidence/REQ-040/uat-checklist.md` walked                                                                                                              |

## AC ↔ test mapping

| AC  | Test                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------ |
| AC1 | `__tests__/lib/mongo-uri.test.ts` — happy paths (3 tests covering path-db, mongodb+srv, querystring)         |
| AC1 | `__tests__/lib/mongo-uri.test.ts` — error paths: no path, empty path, authSource-only, non-mongodb (4 tests) |
| AC1 | `__tests__/lib/mongo-uri.test.ts` — message naming `MONGODB_DB_NAME` (1 assertion across error tests)        |
| AC2 | Manual: invoke each script with a path-less URI → exit 1 before connect                                      |
| AC2 | Manual: invoke each script with a valid URI → proceeds normally                                              |
| AC3 | Manual: every script invocation logs `Connecting to database: <name>`                                        |

## Gates

- TypeScript: `tsc --noEmit` 0 errors
- Vitest: all green + 8+ new tests in mongo-uri.test.ts
- Semgrep: 0 findings on changed paths
- Build: `npm run build` green

## Regression

- No app-side connection path touched. `lib/mongodb.ts` `connectDB()` is unchanged.
- No env-var contract changes.
- The only behavioural delta is that scripts now refuse URIs without a database. Strictly safer; no operator who was passing a correct URI sees any change.
