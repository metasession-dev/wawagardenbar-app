# Release Ticket: REQ-071 — Public API authenticated contracts E2E coverage (sub-issue #297)

**Status:** DRAFT
**Date:** 2026-06-05
**Requirement ID:** REQ-071
**Risk Level:** LOW
**GitHub Issue:** [#297](https://github.com/metasession-dev/wawagardenbar-app/issues/297) (sub-issue of umbrella [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291))
**Integration PR:** (this PR — to be opened against develop)
**Release PR:** (bundled with REQ-069/REQ-070 or follow-up; pure test addition, low urgency)
**Sign-off (dual-actor):** Pending portal UAT + Production approval.

---

## Summary

Third cycle of umbrella tracker [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291) (SRS → E2E regression-pack coverage closure). **Pins the authenticated response envelope shape for 6 public API read endpoints + the public health endpoint + the invalid-key rejection envelope** — previously only the unauthenticated rejection path was covered (`e2e/requirements-verification.spec.ts` § Section 20).

- **AC1 — Authenticated contract per endpoint.** For each of `/api/public/{health, menu, menu/categories, inventory, inventory/summary, inventory/alerts, orders}`, a GET with valid `x-api-key` returns 200 + envelope `{ success: true, data: <documented shape> }`.
- **AC2 — Invalid-key rejection envelope.** GET with invalid `x-api-key` returns 401 + `{ success: false, error: <string> }`.

Shape contracts derived from each route's JSDoc `@returns` documentation. A future regression where a route handler's response shape drifts from its docs will fail the spec immediately.

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI).
- **AI-Generated Changes:** One E2E spec (8 tests) + 6-doc evidence pack + release ticket + RTM row + implementation plan.
- **Operator action this cycle:** approved umbrella + sub-issue grouping in advance; said "proceed" after PR #300 push.

## Implementation Details

**Files Added:**

- `e2e/api/public-contracts-authenticated.spec.ts` — 8 tests covering 6 read endpoints + health + invalid-key.
- `compliance/plans/REQ-071/implementation-plan.md`.
- `compliance/evidence/REQ-071/{test-plan,test-scope,test-execution-summary,security-summary,ai-prompts,ai-use-note}.md` — 6-doc evidence pack.

**Files Modified:**

- `compliance/RTM.md` — REQ-071 IN PROGRESS row added.

**Schema changes:** None. No new packages. No env vars. Pure test addition.

## Test Plan & Evidence

See `compliance/evidence/REQ-071/test-plan.md` and `test-execution-summary.md`.

- Vitest: 1129 pass / 4 skip / 0 fail (unchanged from REQ-070 baseline).
- TypeScript: 0 errors.
- E2E focused REQ-071 (UAT): **11 passed** (3 auth-setup + 8 contract tests), 19s wall-clock.

## Security & Compliance

See `security-summary.md`. Headline: no production code change; test-only; ephemeral read-only API key created + revoked + deleted within the spec run.

## Rollback Plan

Revert the integration PR. The new spec file is a pure addition; reverting leaves no orphan production behavior.

## Deferred to follow-up cycles within #297

| Item                                         | Why                                              |
| -------------------------------------------- | ------------------------------------------------ |
| Dedicated audit-log spec (REQ-AUDIT-001)     | Needs admin UI navigation + `auditlogs` readback |
| Profitability report E2E (REQ-REPORT-003)    | UI-driven; needs deterministic seed              |
| CSV/JSON export E2E (REQ-REPORT-004)         | UI-driven; export file shape parsing             |
| Write endpoint contracts (POST/PATCH/DELETE) | Write side effects + cleanup                     |

Tracked on sub-issue [#297](https://github.com/metasession-dev/wawagardenbar-app/issues/297)'s checklist.

## Quality Gates

| Gate                           | Expected   | Actual (2026-06-05)                              |
| ------------------------------ | ---------- | ------------------------------------------------ |
| `npx tsc --noEmit`             | exit 0     | exit 0                                           |
| `npx vitest run` (full)        | 0 failures | 1129 pass / 4 skip / 0 fail                      |
| E2E focused REQ-071 (UAT)      | 0 failures | 11 passed (3 auth-setup + 8 contract tests), 19s |
| E2E full regression pack (UAT) | green      | _to be run at evidence-pack push time_           |

## Stage Approvals

- [x] Stage 1 — Plan (`compliance/plans/REQ-071/implementation-plan.md`)
- [x] Stage 2 — Implement & test (1 spec; 8 tests live-passing against UAT)
- [x] Stage 3 — Compile evidence (this evidence pack)
- [ ] Stage 4 — Submit for UAT review (release PR)
- [ ] Stage 5 — UAT review + production deployment + close-out

## Notes

- Third cycle of umbrella [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291).
- 8 tests pinning the authenticated half of REQ-API-006's contract — the unauthenticated rejection path was already covered; this fills the missing half.
- Mid-cycle shape corrections caught two endpoints' assumed shapes drifting from the actual JSDoc contracts; both corrected in the run-iterate cycle. Documented in `test-execution-summary.md` § Mid-cycle drift catches.
- Zero production code change. Risk class LOW (pure test addition + read-only API key).
