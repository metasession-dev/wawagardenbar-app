# REQ-071 — AI use note

## Tool

Claude Opus 4.7 via Claude Code (CLI).

## What the AI did

- **Public API surface exploration** — read each route's JSDoc `@returns` contract; identified scope requirements via `withApiAuth(...)` calls; spot-checked existing partial coverage in `e2e/requirements-verification.spec.ts` § Section 20.
- **Authenticated contract spec** — authored one spec creating an ephemeral API key via `ApiKeyService.createKey` in `beforeAll`, exercising 6 read endpoints + health + invalid-key with shape assertions, revoking + deleting the key in `afterAll`.
- **Mid-cycle contract corrections** — first run surfaced two shape mismatches (categories endpoint returns `{ drinks, food }` not array; inventory/summary returns nested `totals` not top-level fields). Agent read the JSDoc contracts + corrected the assertions to match.

## Implementation discipline

- TDD red-then-green: first run failed on shape assumptions; agent investigated the actual route contracts + corrected.
- All gates checked locally before commit: `tsc --noEmit` (0 errors), `vitest run` (1129 pass / 0 fail), focused E2E 11/11 pass against UAT (19s).
- Spec configured `mode: 'serial'` to respect the production rate-limit middleware.

## Honest scope deferrals

Sub-issue [#297](https://github.com/metasession-dev/wawagardenbar-app/issues/297) proposes 6 specs; this PR ships 1 (covering 8 tests across read endpoints). Remaining deferred:

1. **Dedicated audit-log spec (REQ-AUDIT-001)** — needs admin UI navigation + `auditlogs` collection readback.
2. **Profitability report E2E (REQ-REPORT-003)** — UI-driven; needs deterministic seed.
3. **CSV/JSON export E2E (REQ-REPORT-004)** — UI-driven; export file shape parsing.
4. **Write endpoint contracts (POST/PATCH/DELETE)** — write side effects + cleanup needed.

All four tracked on sub-issue #297's checklist; ship in follow-up cycles within the same sub-issue.

## Quality posture

- 0 production code changes (pure test-pack-coverage cycle).
- 0 new packages, 0 env vars, 0 schema changes.
- Ephemeral API key: read-only scopes, revoked + deleted in `afterAll`. If the spec crashes, manual cleanup via `apikeys` filter on `name: /^e2e-req071-/`.
- Shape contracts derived from each route's JSDoc; future drift fails the spec immediately.

## Human review boundary

- Operator approved umbrella + sub-issue grouping in advance (#291 filed 2026-06-04).
- Operator's "proceed" message (after PR #300 push) signaled to continue with the umbrella; agent picked the recommended lowest-risk next pickup.
- Operator will perform Stage 4 portal UAT approval + Stage 5 Production approval when this sub-issue's cycle reaches release time.

## What the AI did NOT do

- Did not modify any production code. Pure test addition.
- Did not write or commit any plaintext API key. Plaintext lives only in spec-local scope during the run; revoked + deleted in `afterAll`.
- Did not silently skip any tests. Each shape mismatch was investigated + corrected.
- Did not run any prod-Mongo touch per `feedback_no_prod_db_touches`. UAT only.
- Did not generate fake-positive specs. Each assertion is on observable HTTP response shape.
