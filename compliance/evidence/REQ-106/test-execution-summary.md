# Test Execution Summary — REQ-106

**Date:** 2026-09-14
**Implementation branch:** `feat/bundle-cash-tags-expense-edit` (bundled with REQ-104, REQ-105 — #767, #768, #769)

## Test design

**Layers planned:** unit, E2E. Integration, visual regression, manual smoke: not needed (see exemptions).

**Layers covered:** unit ✓ (33 new tests across 4 files), E2E ✓ (5 new tests, run locally against a real dev server + the tunneled UAT MongoDB, not mocked).

**Exemptions:**

- Integration — `NOT_NEEDED`: covered by the unit suite against mocked Mongoose/service dependencies plus the E2E spec against the real stack.
- Visual regression — `NOT_NEEDED`: no visual-regression tooling configured.
- Manual smoke — none required beyond the E2E spec's own verification.

**Skill invocation:** `e2e-test-engineer` invoked during Phase 2 of this session, bundled with REQ-104/REQ-105. Shared spec file: `e2e/finance/cash-tags-and-edit.spec.ts`.

## Notable finding

E2E execution surfaced a genuine business-date resolution defect in `CashPositionService` (business-day boundaries derived from a synthetic "noon" anchor via `businessDayRange()` could resolve to the wrong business day under a late 15:00 WAT cutoff). Fixed by deriving the label via `watCalendarDateKey` and resolving exact bounds via `businessDateQueryRange`, matching `FinancialReportService.generateDateRangeReport`'s own approach. A regression unit test was added. See `compliance/evidence/REQ-106/e2e-scope-decision.md` for the full writeup.

## Gate results

| Gate                                                                                                                                       | Result                       | Details                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript                                                                                                                                 | PASS                         | `npx tsc --noEmit` — 0 errors                                                                                                                                                                                                          |
| ESLint                                                                                                                                     | PASS                         | 0 errors (997 pre-existing warnings, unrelated to this REQ)                                                                                                                                                                            |
| Unit + integration                                                                                                                         | PASS                         | 1,479 passed, 4 skipped (full suite); 33 new tests for this REQ                                                                                                                                                                        |
| E2E — REQ-106 targeted                                                                                                                     | PASS                         | 5/5, local run against a dev server backed by the tunneled UAT database (`--project=regression`)                                                                                                                                       |
| E2E — adjacent regression (pending-expenses, expense-category-groups, create-pending-from-expenses, expenses-search, kitchen/expense-link) | PASS (33/35, 2 pre-existing) | 2 failures in `expense-link.spec.ts` traced to a pre-existing UI-read timing flake — direct DB inspection confirmed the underlying stock-increment logic is correct (`currentStock: 5000` as expected); not a regression from this REQ |
| npm audit                                                                                                                                  | PASS                         | Pre-existing accepted exceptions only; no new findings introduced by this REQ's diff                                                                                                                                                   |

## Test executions

| Source  | SDLC stage       | Execution | Kind                             | Outcome        | Workflow / run                                                                          | Related evidence                                                                                                                     | Date       |
| ------- | ---------------- | --------- | -------------------------------- | -------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| REQ-106 | 2 implement/test | #1        | unit                             | passed         | Local Vitest; CI Quality Gates on the integration PR (pending)                          | `cash-position-service.test.ts` (12), `cash-deposit-service.test.ts` (7), `pending-expense-group-service.test.ts` REQ-106 blocks (9) | 2026-09-14 |
| REQ-106 | 2 implement/test | #2        | e2e (local)                      | passed         | Local Playwright, `regression` project; CI in-scope E2E on the integration PR (pending) | `cash-tags-and-edit.spec.ts` — 4 REQ-106 describe blocks, AC1/AC2/AC5/AC6/AC7                                                        | 2026-09-14 |
| REQ-106 | 2 implement/test | #3        | e2e (local, adjacent regression) | passed (33/35) | Local Playwright, `regression` project, existing finance specs                          | 2 pre-existing failures traced to UI-read timing flake, unrelated to this REQ's diff (see Gate results)                              | 2026-09-14 |

## Test plan coverage

| Acceptance criterion                                                                                         | Status | Test                                                                                                              |
| ------------------------------------------------------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------- |
| AC1 — Current Cash Position section always renders, defined state                                            | PASS   | `e2e/finance/cash-tags-and-edit.spec.ts`; `__tests__/services/cash-position-service.test.ts`                      |
| AC2 — payment method required at expense creation                                                            | PASS   | `e2e/finance/cash-tags-and-edit.spec.ts`; `__tests__/pending-expense-group/pending-expense-group-service.test.ts` |
| AC3 — cash-method transferred expenses reduce the position                                                   | PASS   | `__tests__/services/cash-position-service.test.ts`                                                                |
| AC4 — transfer-method expenses do not affect the position                                                    | PASS   | `__tests__/services/cash-position-service.test.ts`                                                                |
| AC5 — cash deposit create → approve → transfer, optional reference                                           | PASS   | `e2e/finance/cash-tags-and-edit.spec.ts`; `__tests__/services/cash-deposit-service.test.ts`                       |
| AC6 — super-admin adjustment updates position immediately, appears in audit trail                            | PASS   | `e2e/finance/cash-tags-and-edit.spec.ts`; `__tests__/services/cash-position-service.test.ts`                      |
| AC7 — report date before opening balance shows "not tracked", not a misleading ₦0                            | PASS   | `__tests__/services/cash-position-service.test.ts`                                                                |
| AC8 — mixed-payment-method batch rejected with a clear error                                                 | PASS   | `__tests__/pending-expense-group/pending-expense-group-service.test.ts`                                           |
| AC9 — Current Cash Position always reflects "now", decoupled from report range (added iteration 2, post-UAT) | PASS   | `__tests__/services/cash-position-service.test.ts`; `e2e/finance/cash-tags-and-edit.spec.ts`                      |
| AC10 — dedicated Cash Position page: live balance + itemized ledger (added iteration 2, post-UAT)            | PASS   | `__tests__/services/cash-position-service.test.ts`; `e2e/finance/cash-tags-and-edit.spec.ts`                      |
| AC11 — ledger is paginated; controls render correctly and Next/Previous never crash (added iteration 3)      | PASS   | `__tests__/services/cash-position-service.test.ts`; `e2e/finance/cash-tags-and-edit.spec.ts`                      |

## Iteration 3 — requirements gap (post-UAT, 2026-09-16)

Operator flagged pagination as a missing AC for the iteration-2 Cash Position ledger page (unbounded entry list). Added AC11 — `CashPositionService.getLedger(page, pageSize=20)` now merges + sorts the three source collections and slices the requested page in-memory; `CashPositionLedger` gained `totalEntries`/`page`/`pageSize`. New unit tests pin the pagination math; new e2e test confirms the controls render and Next/Previous never crash the page. See `compliance/plans/REQ-106/implementation-plan.md` § "Requirements gap accepted (amended post-UAT, iteration 3)".

Ran against a local disposable `mongo:7` Docker container — matching CI's `e2e-regression.yml` setup exactly, not the UAT tunnel used in earlier iterations of this REQ; no k8s secrets or port-forwards involved. All 15 specs in the shared spec file pass with `--workers=1`. One pre-existing test (AC6) is flaky under the default multi-worker Playwright config due to a genuine, pre-existing test-isolation gap — several specs in this file mutate the same shared Current Cash Position concurrently. Confirmed unrelated to this iteration's diff by isolating and re-running AC6 alone (passes consistently). Documented here rather than silently dismissed; worth a follow-up to make these specs either serial or state-independent.

## Iteration 2 — requirements gap (post-UAT)

UAT flagged that "Current Cash Position" read like an accumulation of movement over the Daily Report's selected date/range, rather than the actual present-moment till balance — a real ambiguity in AC1, which never specified this. The operator also asked that the figure's composition (expenses, cash payments, bank deposits, manual edits) be independently verifiable rather than trusted as a bare arithmetic sum, and directed this be folded into REQ-106 as a requirements-gap fix rather than a new REQ.

Amended AC9 (decouple the Daily Report section from the date picker — it now always fetches `getCurrentCashPositionAction()`, never a date-scoped query) and AC10 (new `/dashboard/finance/cash-position` page: live balance, total cash sales in since opening, and a reverse-chronological itemized ledger of every transferred cash-method expense, transferred cash deposit, and manual adjustment). See `compliance/plans/REQ-106/implementation-plan.md` § "Requirements gap accepted (amended post-UAT, iteration 2)".

## Iteration 1 — defect (post-UAT)

UAT found that AC6 did not actually hold: a super-admin correction recorded with an effective date within the currently-viewed business day was silently excluded from that day's displayed closing position — it only appeared starting the _following_ day's report (once folded into "opening"). Root cause: `CashPositionService.getCashPositionForDate`/`getCashPositionForRange`'s closing formula (`opening + cashIn − cashOutExpenses − cashOutDeposits`) never summed same-day `CashPositionAdjustment` entries. The original AC6 e2e test only asserted the summary card became _visible_ after saving, never that the closing figure actually changed — which is why this passed CI.

**Fix:** added `CashPositionService.getAdjustmentsForRange`, summed into the closing calculation as a new `adjustments` field on `CashPositionSummary`, surfaced as a `± Adjustments` line in `CashPositionSection` (only rendered when non-zero, to keep the visible breakdown arithmetic-consistent). Strengthened the AC6 e2e assertion to check the closing figure's displayed value, not just visibility. Added a unit regression test pinning same-day-adjustment inclusion. Filed as [wawagardenbar-app#779](https://github.com/metasession-dev/wawagardenbar-app/issues/779) per the incident-filing convention.

## Accepted skips

None. (The 2 `expense-link.spec.ts` failures are not skips — they are failed assertions traced to a UI-read timing flake, confirmed unrelated to this REQ via direct database inspection; documented above, not silently excluded.)

## Evidence locations

- Markdown evidence: `compliance/evidence/REQ-106/`
- Screenshots: `compliance/evidence/REQ-106/screenshots/` (6 canonical PNGs across AC1/AC2/AC5/AC6)
- CI run: pending — will populate on integration PR push to `develop`

## Bundled Release Context

- **Core tracked release:** REQ-106 (declared bundle key; co-tracked with REQ-104, REQ-105)
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** housekeeping commits since `main` — see `compliance/pending-releases/BUNDLED-CHANGES-REQ-104.md` / `.json`
- **Why bundled here:** REQ-104, REQ-105, and REQ-106 were declared as an explicit bundle at Phase 1 planning time (`Bundles: #767, #768, #769`) — all three are LOW/MEDIUM risk, share one branch/PR/release cycle, and touch distinct file sets with no scope overlap between them.
- **Evidence impact:** Evidence ownership remains on each source REQ; the bundle manifest provides lineage and inherited visibility only.
- **Reviewer impact:** Approval scope covers all three co-tracked REQs plus the absorbed non-release housekeeping work listed in the bundle manifest.
- **Security / risk impact:** Bundle ceremony runs at MEDIUM (the max risk across the set, from REQ-106). No additional security/risk impact beyond what each REQ's own risk-register entries (R-029/R-030/R-031 for REQ-106) already document.
- **Reference:** `compliance/pending-releases/BUNDLED-CHANGES-REQ-104.md` / `.json`
