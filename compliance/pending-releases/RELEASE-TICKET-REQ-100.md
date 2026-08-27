# Release Ticket: REQ-100 — Kitchen Revenue report under-counts items sold at more than one price

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-08-27 (amended Iteration 1)
**Requirement ID:** REQ-100
**Risk Level:** MEDIUM
**Issue:** [#676](https://github.com/metasession-dev/wawagardenbar-app/issues/676)
**Implementation branches:** `fix/REQ-100-kitchen-revenue-multi-price` (original), `fix/REQ-100-daily-and-range-report-multi-price` (Iteration 1)

## Summary

`FinancialReportService` aggregated order line items into a `Map` keyed by `menuItemId`. On a repeat item it correctly accumulated `quantity` but froze `price`/`costPerUnit` at whichever order line was seen first, computing revenue/cost as `(first-seen price) × (total summed quantity)` instead of summing each line's actual figures. Any menu item sold at more than one price within a reporting window (half- vs full-portion pricing, or a mid-window menu price change) was silently under/over-counted.

**Original fix:** `generateMainCategoryReport()` (the "By Main Category" report).

**Iteration 1 (requirements gap):** after the original fix deployed to UAT, the operator found the **Daily Financial Report** page (`/dashboard/reports/daily`) still showing the exact original symptom — Kitchen Revenue ₦25,000, Beef 17 units × ₦500 = ₦8,500. This page is powered by `generateDailySummary()`, a **separate function carrying an independent copy of the identical bug** — and turned out to be the actual page the original bug report's screenshot came from (never explicitly verified against the live app when the original fix was scoped). A third copy of the same pattern was found in `generateDateRangeReport()`. All three are now fixed.

**Confirmed correct** against live UAT data for the exact business date from the original report (2026-08-24, Kitchen category): Total Kitchen Revenue ₦32,000 (was ₦25,000), Beef line ₦15,500 for 17 units (was ₦8,500).

## AI contributors

| Tool        | Version  | Commits                                                                                                                              | Date       |
| ----------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| Claude Code | Sonnet 5 | single commit on `fix/REQ-100-kitchen-revenue-multi-price` (original: plan + implementation + tests)                                 | 2026-08-27 |
| Claude Code | Sonnet 5 | single commit on `fix/REQ-100-daily-and-range-report-multi-price` (Iteration 1: shared-helper refactor + tests + evidence amendment) | 2026-08-27 |

## Implementation details

**Original:**

- `services/financial-report-service.ts` — `generateMainCategoryReport()`'s per-`menuItemId` map entry accumulates `revenue`/`cost` per line (preferring each order line's own `subtotal`) instead of a single stored `price`/`costPerUnit` recomputed against total quantity at the end.
- `docs/SRS.md` — `REQ-MENUMGT-006` updated (drift resolved).
- Tests: 1 new unit test in `financial-report-service.main-category.test.ts`; all 8 pre-existing tests in the same file pass unmodified.

**Iteration 1:**

- `services/financial-report-service.ts` — extracted a new shared private helper, `aggregateItemsIntoCategories()`, applying the identical per-line accumulation fix; `generateDailySummary()` and `generateDateRangeReport()` both refactored to call it instead of each carrying their own independent (and independently buggy) copy of the same loop. `generateMainCategoryReport()` keeps its own implementation — its return shape differs enough (single-category filtered) that unifying it added risk without proportionate benefit.
- `docs/SRS.md` — `REQ-REPORT-001` updated (same drift-resolution pattern as REQ-MENUMGT-006).
- Risk register `R-023` updated from OPEN to **MITIGATED** — it was opened specifically to flag this exact possibility as unverified; now confirmed and fixed.
- Tests: 2 new unit tests in `financial-report-service.dynamic-main-categories.test.ts` (one per newly-fixed function); all 3 pre-existing tests in that file pass unmodified.
- No ADR needed for either iteration (single-file fix, then a single-file de-duplication refactor — no new cross-file pattern, no new dependency).

## Verification

- Unit: 1,384 passed, 4 skipped (full suite); 3 new tests total for this REQ across both iterations.
- No browser-driven testing needed — no UI-facing files touched by either iteration.
- TypeScript/ESLint: 0 errors.
- npm audit: pre-existing accepted exceptions only, no new findings.
- **Live UAT verification:** operator independently confirmed the corrected figures directly against the UAT database for the original report's exact date/category (see Summary above) before Iteration 1's evidence was compiled.
- Full detail: `compliance/evidence/REQ-100/test-execution-summary.md`.

## Sign-off (dual-actor)

Solo-operator team — the "reviewer ≠ submitter" check is interpreted as actor type, not human identity: AI tooling (this implementation) and the human operator (portal approver) are distinct actors. MEDIUM risk auto-continued through Phase 1 per skill policy (no HIGH/CRITICAL plan-approval pause); the operator reviews the PR + performs the portal UAT review before Production approval. The Iteration 1 gap was itself caught by the operator's own live-environment verification — exactly the check this sign-off model relies on.
