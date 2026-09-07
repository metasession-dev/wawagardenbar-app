# Release Ticket: REQ-101 — Reports Revenue tab blends portion-size sales into one misleading row

**Status:** RELEASED
**Date:** 2026-09-04
**Requirement ID:** REQ-101
**Risk Level:** MEDIUM
**Issue:** [#689](https://github.com/metasession-dev/wawagardenbar-app/issues/689)
**Implementation branch:** `feat/REQ-101-portion-size-report-split`

## Summary

`FinancialReportService`'s per-item aggregation maps (`aggregateItemsIntoCategories`, shared by `generateDailySummary`/`generateDateRangeReport`, and `generateMainCategoryReport`) key their `Map` by `menuItemId` alone. REQ-100 fixed multi-price-within-window revenue _summation_ for this code path, but a full-portion order line and a half/quarter-portion line for the same `menuItemId` are still correctly summed yet blended into a single displayed row — producing a quantity-weighted average price that matches no actual sale price (e.g. "Peppered Meat" shown at ₦940 in the Revenue tab vs. the live menu's ₦1000 full-portion price).

Verified against production-synced UAT data (issue #689's investigation): "Peppered Meat" order lines split into 54 lines at ₦1000 (`portionSize: 'full'`) and 16 lines at ₦500 (`portionSize: 'half'`), none price-overridden; `menuitempricehistories` confirms no price change in the window — ruling out REQ-100's original defect class and confirming this is a distinct row-identity gap, not a summation gap.

## AI contributors

| Tool        | Version  | Commits                                                                                   | Date       |
| ----------- | -------- | ----------------------------------------------------------------------------------------- | ---------- |
| Claude Code | Sonnet 5 | single commit on `feat/REQ-101-portion-size-report-split` (plan + implementation + tests) | 2026-09-04 |

## Implementation details

- `services/financial-report-service.ts` — new private helper `portionAggregationIdentity()` derives a `${menuItemId}:${portionSize}` map key (portion size defaults to `'full'` when absent, so legacy orders without the field key identically to an explicit `'full'` line) and a display name suffixed `(Half)`/`(Quarter)` for non-full portions. Applied to both `aggregateItemsIntoCategories()` and `generateMainCategoryReport()`.
- `docs/SRS.md` — `REQ-REPORT-001` and `REQ-MENUMGT-006` updated with new per-`portionSize` row-splitting Given/When/Then bullets (the prior wording only required correct summation, silent on row granularity — the actual gap).
- Risk register `R-023` updated to Iteration 2 — the Iteration-1 "Low × low" residual rating covered summation only; this iteration closes the row-identity dimension of the same aggregation-map risk.
- No ADR needed (single-file fix, MEDIUM risk, no new dependency/data tier/pattern spanning >3 files).
- Tests: 3 new unit tests across `financial-report-service.dynamic-main-categories.test.ts` (2) and `financial-report-service.main-category.test.ts` (1); all 14 pre-existing tests in both files pass unmodified.

## Verification

- Unit: 1,387 passed, 4 skipped (full suite); 3 new tests total for this REQ.
- No browser-driven testing needed — no UI-facing files touched.
- TypeScript/ESLint: 0 errors.
- npm audit: clean — inherited from `develop` (PR #690 fixed newly-disclosed advisories + a CI-side npm-version issue hitting a retired npm audit endpoint).
- Full detail: `compliance/evidence/REQ-101/test-execution-summary.md`.

## Sign-off (dual-actor)

Solo-operator team — the "reviewer ≠ submitter" check is interpreted as actor type, not human identity: AI tooling (this implementation) and the human operator (portal approver) are distinct actors. MEDIUM risk auto-continued through Phase 1 per skill policy (no HIGH/CRITICAL plan-approval pause); the operator reviews the PR + performs the portal UAT review before Production approval.
