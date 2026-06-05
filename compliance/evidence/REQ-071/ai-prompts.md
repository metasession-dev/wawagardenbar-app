# REQ-071 — AI prompts (Phase 3 evidence)

## Cycle-opening prompt

> "proceed"

Following the REQ-070 cycle ship (PR #300), the operator's terse confirmation signaled to continue with the umbrella's recommended next pickup. The agent picked sub-issue [#297](https://github.com/metasession-dev/wawagardenbar-app/issues/297) (API contracts + reports + audit-log) over [#295](https://github.com/metasession-dev/wawagardenbar-app/issues/295) (Socket.IO) and [#296](https://github.com/metasession-dev/wawagardenbar-app/issues/296) (admin destructive ops) because it has the lowest risk (pure HTTP contract testing, no UI orchestration) and reuses existing API surfaces.

## Scope decision

The umbrella's sub-issue #297 body proposes 6 specs. V1 ships ONE spec covering 8 tests across the read endpoints. The decisions:

1. **Reads only, writes deferred.** Write methods (POST/PATCH/DELETE) carry larger side effects + cleanup complexity. Read contracts deliver the highest value per effort.
2. **Audit-log deferred.** Requires admin UI navigation + DB readback; better fit for a dedicated UI-driven spec.
3. **Reports deferred.** Profitability + CSV/JSON export are UI-driven E2E with deterministic-state seeding needs.

## Mid-cycle adjustments

Two endpoints' assumed shapes deviated from the actual JSDoc contract — caught + corrected in the run-iterate cycle:

1. `GET /api/public/menu/categories` — assumed `data: array<string>`. Actual: `data: { drinks: string[], food: string[] }`. Updated assertion to match the documented shape.
2. `GET /api/public/inventory/summary` — assumed top-level `totalItems: number`. Actual: nested `data.totals.totalItems: number` (plus byStatus, byCategory[], needsRestock[], highValueItems[]). Updated assertion to match the documented nested-totals contract.

Both contracts now pin the JSDoc shape exactly. A future regression where a route handler drifts from its docs will fail the spec.

## AI-generated artefacts in this cycle

- `e2e/api/public-contracts-authenticated.spec.ts` — 8 tests covering 6 read endpoints + health + invalid-key envelope.
- `compliance/plans/REQ-071/implementation-plan.md` — plan with ACs, risk, security.
- `compliance/evidence/REQ-071/{test-plan,test-scope,test-execution-summary,security-summary,ai-prompts,ai-use-note}.md` — 6-doc evidence pack.
- `compliance/pending-releases/RELEASE-TICKET-REQ-071.md` — release ticket.
- `compliance/RTM.md` REQ-071 row (IN PROGRESS).

PR title uses `[REQ-071]` brackets per `feedback_pr_title_req_brackets`.
