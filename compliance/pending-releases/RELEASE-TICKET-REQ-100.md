# Release Ticket: REQ-100 — Kitchen Revenue report under-counts items sold at more than one price

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-08-27
**Requirement ID:** REQ-100
**Risk Level:** MEDIUM
**Issue:** [#676](https://github.com/metasession-dev/wawagardenbar-app/issues/676)
**Implementation branch:** `fix/REQ-100-kitchen-revenue-multi-price`

## Summary

`FinancialReportService.generateMainCategoryReport()` aggregated order line items into a `Map` keyed by `menuItemId`. On a repeat item it correctly accumulated `quantity` but froze `price`/`costPerUnit` at whichever order line was seen first, computing revenue/cost as `(first-seen price) × (total summed quantity)` instead of summing each line's actual figures. Any menu item sold at more than one price within a reporting window (half- vs full-portion pricing, or a mid-window menu price change) was silently under/over-counted. Confirmed against live UAT data: "Beef" sold as both a half-portion (₦500) and full-portion (₦1,000) line, 17 units total, reported as 17 × ₦500 = ₦8,500 instead of the correct ₦15,500. This REQ fixes the accumulation to sum per-line revenue/cost directly.

## AI contributors

| Tool        | Version  | Commits                                                                                    | Date       |
| ----------- | -------- | ------------------------------------------------------------------------------------------ | ---------- |
| Claude Code | Sonnet 5 | single commit on `fix/REQ-100-kitchen-revenue-multi-price` (plan + implementation + tests) | 2026-08-27 |

## Implementation details

- `services/financial-report-service.ts` — `FinancialReportService.generateMainCategoryReport()`'s per-`menuItemId` map entry now accumulates `revenue`/`cost` fields (summed per line, preferring each order line's own `subtotal`) instead of a single stored `price`/`costPerUnit` recomputed against total quantity at the end. Output `price`/`costPerUnit` become quantity-weighted averages for display only — `total` is always the authoritative summed figure.
- `docs/SRS.md` — `REQ-MENUMGT-006` updated (drift resolved) with a new Given/When/Then line pinning the multi-price summation semantics that were previously undocumented.
- No ADR needed (single-file arithmetic fix, no new dependency/db/service, no cross-file pattern change).
- Risk register `R-023` opened (OPEN) — the same accumulation pattern was not audited in `generateDailyReport`/`generateReportForDateRange`; unverified whether they share it.
- Tests: 1 new unit test in `__tests__/services/financial-report-service.main-category.test.ts`; all 8 pre-existing tests in the same file pass unmodified.

## Verification

- Unit: 1,382 passed, 4 skipped (full suite), 1 new for this REQ.
- No browser-driven testing needed — no UI-facing files touched.
- TypeScript/ESLint: 0 errors.
- npm audit: pre-existing accepted exceptions only, no new findings.
- Full detail: `compliance/evidence/REQ-100/test-execution-summary.md`.

## Sign-off (dual-actor)

Solo-operator team — the "reviewer ≠ submitter" check is interpreted as actor type, not human identity: AI tooling (this implementation) and the human operator (portal approver) are distinct actors. MEDIUM risk auto-continued through Phase 1 per skill policy (no HIGH/CRITICAL plan-approval pause); the operator reviews the PR + performs the portal UAT review before Production approval.
