# Test Scope — REQ-040

**Risk Level:** LOW (pure-parser helper; script-boundary guard; strictly safer than today's behaviour)
**Requirement:** Script hardening — refuse mongodb:// URIs without database path
**GitHub Issue:** [#89](https://github.com/metasession-dev/wawagardenbar-app/issues/89)
**Date:** 2026-05-17

## Test Approach

Single pure helper + two script edits + a unit-test file. No new collections, no new server actions, no UI, no migration, no env-var changes. The change is a defensive parse-and-throw at the script boundary; the only operator-visible behaviour change is `exit(1)` instead of "0 candidates found" for URIs lacking a database path.

**Universal gates:**

- TypeScript compilation: 0 errors
- SAST (Semgrep): 0 new high/critical findings
- Vitest unit suite: baseline + 8 new tests in `mongo-uri.test.ts`
- No E2E delta (script-only change; no UI surface)
- Human review per project policy (one reviewer, LOW risk)

## In Scope

1. `lib/mongo-uri.ts` — pure helper `assertMongoUriHasDatabase(uri: string): { uri, database: string }`.
2. `scripts/backfill-inventory-kind.ts` — call helper before `mongoose.connect`; exit-1 on throw; log resolved DB name on success.
3. `scripts/audit-expense-link-units.ts` — same.
4. `__tests__/lib/mongo-uri.test.ts` — happy + error matrix.

## Out of Scope

- Wiring the helper into the app-side `lib/mongodb.ts` `connectDB()` path. The app's URIs are env-loaded and known-correct; this REQ only hardens the ad-hoc ops scripts.
- Other URI safety checks (TLS enforcement, authSource enforcement, replica-set validation). Each is its own safety check; this REQ is narrow to D12's root cause.
- Wrapping any future scripts. Future ops scripts adopt the helper pattern; not a behavioural constraint here.

## Test Types

- **Unit (Vitest):** pure helper happy + error matrix. No mocks needed; the helper takes a string and returns / throws.
- **Manual:** local invocation of each script with positive and negative URIs.

## Risks

1. **Helper false-positive on valid URI** — e.g. a legitimate URI with an unusual format is rejected. Mitigated by the explicit happy-path test matrix (path-db, mongodb+srv, querystring combo) and by the conservative regex/parser logic (use Node's stdlib `URL` parser rather than ad-hoc string splitting).
2. **Helper false-negative on invalid URI** — e.g. a URI with `/` followed by querystring but no real DB name passes. Mitigated by explicit test for empty path + authSource-only case.
3. **Scripts wired but helper not called before `mongoose.connect`** — would defeat the purpose. Mitigated by an explicit test in the script-edit commit message + code-review check.
