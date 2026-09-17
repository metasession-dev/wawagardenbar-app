# Release Ticket: REQ-107 — Expense summary totals follow list filters

**Status:** RELEASED
**Date:** 2026-09-16
**Requirement ID:** REQ-107
**Risk Level:** LOW
**Issue:** [#785](https://github.com/metasession-dev/wawagardenbar-app/issues/785)
**Implementation branch:** `fix/req-106-live-cash-position`

## Bundled Changes

Bundle addendum to the REQ-104/105/106 bundle declared up front (`Bundles: #767, #768, #769`) — added mid-cycle to the same shared branch/PR/release rather than a new REQ→plan→PR→UAT→release cycle, per the operator's explicit direction. Bundle manifest: `compliance/pending-releases/BUNDLED-CHANGES-REQ-104.md` / `.json` (`sha256:e84a35121bd6a67702a783a8fdfbbcc773fe716f0865a89d70498cc4b257df43`).

- **Core tracked release:** REQ-104 (declared bundle key; REQ-107 is a co-tracked addendum member)
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** housekeeping commits since `main` — see `compliance/pending-releases/BUNDLED-CHANGES-REQ-104.md` / `.json`
- **Why bundled here:** LOW-risk, unrelated-file defect discovered during the same UAT review cycle as REQ-104/105/106 — no scope overlap with the other three, so it joins the same shared PR rather than opening a new one.
- **Evidence impact:** Evidence ownership remains on this source REQ; the bundle manifest provides lineage and inherited visibility only.
- **Reviewer impact:** Approval scope covers this REQ alongside REQ-104/105/106 in the same shared PR review.
- **Security / risk impact:** No new security/risk impact — display-only fix, no new attack surface.
- **Reference:** `compliance/pending-releases/BUNDLED-CHANGES-REQ-104.md` / `.json`

## Summary

The Expenses page's three summary cards (Total Direct Costs, Total Operating Expenses, Total Expenses) were computed via a separate `getExpenseSummaryAction(dateRange.from, endOfDay)` call keyed only on the date range, blind to `ExpenseList`'s client-side search/type/category/tag filters. Applying a filter narrowed the table but never changed the totals shown above it. Fixed by lifting the filtered subset up via a new `onFilteredChange` callback prop and computing the cards from it directly, client-side — removing the now-redundant server round trip (`getExpenseSummaryAction`/`ExpenseService.getExpenseSummary`/`ExpenseSummary` deleted as dead code).

## AI contributors

| Tool        | Version  | Commits                                      | Date       |
| ----------- | -------- | -------------------------------------------- | ---------- |
| Claude Code | Sonnet 5 | (plan + implementation + tests, this branch) | 2026-09-16 |

## Implementation details

- `components/features/finance/expense-list.tsx` — exported the `Expense` type; wrapped `filteredExpenses` in `useMemo`; added `onFilteredChange` prop fired via `useEffect`.
- `app/dashboard/finance/expenses/expenses-client.tsx` — `displaySummary` computed via `useMemo` from the filtered list; added `data-testid`s to the three summary card values for e2e stability.
- Removed dead code: `getExpenseSummaryAction` (action), `ExpenseService.getExpenseSummary` (service), `ExpenseSummary` interface.
- `docs/SRS.md` — REQ-FIN-009 (new). No ADR needed (UI wiring fix, no new dependency).
- `scripts/seed-e2e-fixtures.ts` — extended to seed one direct-cost expense alongside the existing operating-expense one, so the e2e filter test has both types to prove against.
- Tests: 1 new E2E test (unit tests not added — the fix is UI wiring; the underlying arithmetic is trivial and the e2e test proves the actual wiring, which a unit test in isolation couldn't).

## Verification

- E2E: 1/1 (run locally against a local disposable `mongo:7` Docker container — the same setup CI's `e2e-regression.yml` uses, not the UAT tunnel).
- TypeScript/ESLint: 0 errors.
- Full detail: `compliance/evidence/REQ-107/test-execution-summary.md`.

## Sign-off (dual-actor)

Solo-operator team — the "reviewer ≠ submitter" check is interpreted as actor type, not human identity: AI tooling (this implementation) and the human operator (portal approver) are distinct actors. LOW risk auto-continued through Phase 1 per skill policy. The operator reviews the shared bundle PR + performs the portal UAT review before Production approval.
