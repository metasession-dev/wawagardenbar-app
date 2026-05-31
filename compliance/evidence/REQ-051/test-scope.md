# Test Scope — REQ-051

**Requirement:** REQ-051 — DFR aggregation queries by business-day range, not calendar-day range
**Risk Level:** HIGH
**GitHub Issue:** [#196](https://github.com/metasession-dev/wawagardenbar-app/issues/196)
**Date:** 2026-05-30

## What changed

Two files modified in `services/financial-report-service.ts` and `lib/business-date.ts`:

- **`lib/business-date.ts`** — new exported `businessDayRange(date, cutoff): { start: Date; end: Date }`. Pure function; returns the [start, end] of the business day containing `date`, keyed by the same `businessDate` value the order-create flow writes via `deriveBusinessDate`.
- **`services/financial-report-service.ts`** — `generateDailySummary(date)` now `await`s `SystemSettingsService.getBusinessDayCutoff()` and uses `businessDayRange(date, cutoff)` to build its query range. The two-line `startOfDayWAT(date)`/`endOfDayWAT(date)` block is replaced.

Two existing imports added (`businessDayRange`, `SystemSettingsService`). The private `startOfDayWAT`/`endOfDayWAT` helpers stay in place — still used by the out-of-scope `generateDateRangeReport`.

## In scope (new + regression)

- **`businessDayRange`** (new helper) — boundary at the cutoff, fallback on invalid cutoff string, 24h-minus-1ms invariant, businessDate-key semantics (the order created at `now` has its `businessDate` inside the range).
- **`generateDailySummary`** (changed) — query filter's `$or` businessDate branch covers the right business day for `now` before / after / at the cutoff; the moment when `now` is supplied determines the keyed range correctly.
- **Regression** — `tip`, `tip-method`, `order-type`, and `business-date-attribution` existing test files keep passing. Their `SystemSettingsService` mock now stubs the awaited cutoff fetch to `'15:00'`.

## Out of scope

- **`generateDateRangeReport(startDate, endDate)`** — multi-day API; boundary semantics are subtler (user-selected ranges + business-day shifts at the boundaries). Separate REQ if needed.
- **CSS selector for the Total Revenue card** — `kitchen/daily-report-regression.spec.ts:AC14` + the sibling DFR Total Revenue card test fail on a CSS:has locator that no longer matches the rendered DOM. Filed as [#200](https://github.com/metasession-dev/wawagardenbar-app/issues/200).
- **Tip-side DFR aggregation** — `orders/express-tip-capture.spec.ts:AC7` still shows 0 for the tip cash card. Likely a different code path (REQ-035's `tipsBreakdown`) that needs the same business-day-range fix. Filed as [#201](https://github.com/metasession-dev/wawagardenbar-app/issues/201).
- **Open-tab partial-payment test** — previously skipped in the serial describe; now exercised after REQ-051 unblocked the preceding test. Filed as [#202](https://github.com/metasession-dev/wawagardenbar-app/issues/202).

## E2E impact

REQ-051 was scoped to unblock 7 regression tests from #196. **4 of 7 pass** after this PR: daily-report-payments both-methods, dashboard-revenue × 2, express-order-report cash. The remaining 3 (#200 × 2, #201) are different bugs filed independently. One previously-skipped test (#202) is now exercised — also filed independently.
