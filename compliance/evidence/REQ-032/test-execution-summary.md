# Test Execution Summary — REQ-032

**Requirement:** REQ-032 — Create pending expense group from existing expenses (multi-select, standalone copy)
**GitHub Issue:** [#70](https://github.com/metasession-dev/wawagardenbar-app/issues/70)
**Date:** 2026-05-01
**Risk Level:** MEDIUM

## Top-line

| Gate                        | Result                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- |
| TypeScript (`tsc --noEmit`) | **0 errors** (`gates/tsc.txt`)                                                                                  |
| Vitest unit suite           | **462/462 passed** (452 baseline + 10 new)                                                                      |
| Semgrep SAST                | 0 findings on REQ-032 changed files (`gates/semgrep.json`)                                                      |
| Dependency audit            | 0 new findings (1 HIGH `xlsx` allowlisted, 6 moderate pre-existing — REQ-029/031 baseline)                      |
| Playwright E2E              | Smoke spec authored at `e2e/finance/create-pending-from-expenses.spec.ts`; CI-side verification on develop push |
| CI pipeline (develop)       | Confirmed green at commit `19c1d32` (CI run `25188881245`, evidence run `25188881236`)                          |

## TDD Discipline

Tests preceded the implementation in the same commit (`b247a06`). The pure mapping helper was written from the test file outwards:

| Helper                        | Test commit          | Implementation commit |
| ----------------------------- | -------------------- | --------------------- |
| `lib/expense-to-line-item.ts` | bundled in `b247a06` | same                  |

UI integration (form prefill, list checkboxes, bulk-action bar) is covered by:

- The pure mapping helper (10 unit tests on the logic the UI delegates to)
- The Playwright smoke spec (`e2e/finance/create-pending-from-expenses.spec.ts`)
- Manual UAT walkthrough captured in `uat-checklist.md`

## Unit Test Breakdown (10 new tests)

`__tests__/lib/expense-to-line-item.test.ts` — pure-helper coverage of `mapExpenseToLineItem` and `mapExpensesToLineItems`:

1. copies `expenseType`, `category`, `description` verbatim
2. preserves `quantity` and `unit` when present
3. defaults `quantity` to `1` when missing
4. defaults `unit` to `'each'` when missing
5. `totalCost` equals source `amount` exactly (preserves recorded amount even when quantity defaults)
6. `unitCost` = `amount / quantity`, rounded to 2 decimal places
7. `unitCost` = `amount / 1` when quantity is missing
8. shape matches `IExpenseLineItem` exactly (no extra keys)
9. `mapExpensesToLineItems` maps multiple expenses to a parallel array, preserving order
10. `mapExpensesToLineItems` returns `[]` for an empty input

## Regression Suite

Existing suites that touch the same surfaces ran clean:

- `__tests__/pending-expense-group/pending-expense-group-service.test.ts` — 21 tests (REQ-026 service layer; unchanged)
- `__tests__/pending-expense-group/pending-expense-actions.test.ts` — 4 tests (REQ-026 RBAC; unchanged)
- `__tests__/lib/expense-search.test.ts` — REQ-029 search predicate (unchanged)
- `__tests__/services/expense-service.search.test.ts` — REQ-029 query builder (unchanged)
- All 462 tests pass (full suite output in `gates/vitest-summary.txt`)

## E2E

`e2e/finance/create-pending-from-expenses.spec.ts` — 2 Playwright cases:

1. **AC1+AC2+AC3+AC8** — select 2 rows → bulk-action bar appears with count → click button → dialog opens with 2 pre-filled line items → Esc → selection cleared
2. **AC4** — group date defaults to today (month-name match)

Both skip gracefully if UAT lacks ≥2 seeded expenses (matches the REQ-030/031 pattern). Real-browser AC5 (submission persists a new pending group with the right total) is captured by the manual UAT walkthrough in `uat-checklist.md` rather than the spec, because the spec runs read-only by convention to avoid mutating UAT state.

## UAT

UAT walkthrough document: `uat-checklist.md` — 10 walkthrough steps covering AC1–AC9 plus 6 edge cases. Verifier signs off with screenshots + git SHA + META-COMPLY release version.

UAT outcome (capture here once verified):

- Verified by:
- Verified on:
- UAT git SHA on develop:
- META-COMPLY UAT release version:
- Result: PASS / FAIL / PASS-WITH-NOTES

## Acceptance Criteria Coverage

All 9 ACs are mapped to either the unit suite or the E2E spec / UAT checklist in `test-plan.md` (Functional Test Mapping table). No AC is uncovered.

## Defects Found During Test Execution

None.

## Outstanding Items

None blocking the release. Optional follow-up captured separately if scope grows:

- Could add an in-page indicator on the source expenses list when the same expense has been used as a source for an active pending group (out of scope per the standalone-copy decision; would require a back-link).
