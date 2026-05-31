# REQ-051 — DFR aggregation: query by business-day range, not calendar-day range

**Requirement ID:** REQ-051
**Risk Level:** HIGH
**GitHub Issue:** [#196](https://github.com/metasession-dev/wawagardenbar-app/issues/196)
**Date:** 2026-05-30

## Context

`FinancialReportService.generateDailySummary(date)` is called by `app/dashboard/reports/daily/daily-report-client.tsx` and by every downstream consumer of "today's daily financial report" (DFR). It is the load-bearing aggregation behind:

- Total Revenue card
- Revenue by Payment Method section
- Tips Received cards
- Food / Drink Category Performance
- Order-type breakdown

The order-create flow correctly attributes every order to a **business day** via `lib/business-date.ts:deriveBusinessDate(now, cutoff)` (REQ-025). The default cutoff is `'15:00'` WAT — orders placed before 15:00 WAT are attributed to the previous business day (which started yesterday at 15:00 and runs until today 14:59).

`generateDailySummary(date)`, however, queries by `startOfDayWAT(date)` / `endOfDayWAT(date)` — i.e. the **WAT calendar day** containing `date`, not the business day containing `date`. The result: an operator who opens the DFR before 15:00 WAT sees ₦0.00 for everything, even after a busy night, because the orders' `businessDate` belongs to yesterday's business day and the query is asking for today's calendar day.

Discovered as the root cause of [#196](https://github.com/metasession-dev/wawagardenbar-app/issues/196) — seven regression tests fail deterministically on every CI run (CI runners are UTC; CI runs land at 06:00–07:00 UTC = 07:00–08:00 WAT, always before the 15:00 cutoff).

## Acceptance criteria

1. **AC1** — `FinancialReportService.generateDailySummary(date)` returns orders whose `businessDate` falls in the business day containing `date`, regardless of whether `date`'s WAT clock-time is before or after the configured cutoff.
2. **AC2** — `FinancialReportService.generateDailySummary(now)` invoked at any WAT clock-time on day **D** returns the _current_ business day's data (the business day that the present moment is inside).
3. **AC3** — The 7 currently-failing regression tests in #196 pass deterministically on the same CI runner shape (UTC, ~06:00 UTC start):
   - `daily-report-payments.spec.ts:daily report reflects both payment methods with no double-counting`
   - `dashboard-revenue.spec.ts:daily report revenue increased by the order amount`
   - `dashboard-revenue.spec.ts:payment method section renders with correct labels`
   - `express-order-report.spec.ts:daily report reflects cash payment`
   - `kitchen/daily-report-regression.spec.ts:AC14 — running a production batch does NOT move Total Revenue`
   - `kitchen/daily-report-regression.spec.ts:DFR renders with a Total Revenue card and a currency-formatted value`
   - `orders/express-tip-capture.spec.ts:AC7 — Daily Report Tips Received cash card increased by ₦500`
4. **AC4** — No regression in `__tests__/lib/business-date.test.ts`, `__tests__/reports/business-date-attribution.test.ts`, `__tests__/services/financial-report-service.{tip-method,order-type,tip}.test.ts`, or the wider vitest suite.
5. **AC5** — Query shape preserved (hits the existing `businessDate` index; no new index needed; no N+1).
6. **AC6** — `generateDateRangeReport(startDate, endDate)` (the multi-day API) is **explicitly out of scope** — its boundary semantics are subtler and merit a separate REQ if needed.

## Technical approach

### 1. New helper in `lib/business-date.ts`

```ts
/**
 * Returns the inclusive range [start, end] of the business day containing
 * `date`. Start is midnight WAT (as UTC) of that business day; end is one
 * millisecond before the next business day starts (24h − 1ms after start).
 */
export function businessDayRange(
  date: Date,
  cutoffTime: string
): { start: Date; end: Date };
```

Pure function, no side effects. Implemented in terms of `deriveBusinessDate`.

### 2. Change in `services/financial-report-service.ts`

```diff
- const startDate = startOfDayWAT(date);
- const endDate = endOfDayWAT(date);
+ const cutoff = await SystemSettingsService.getBusinessDayCutoff();
+ const { start: startDate, end: endDate } = businessDayRange(date, cutoff);
```

Two-line replacement at lines 228-229 in `generateDailySummary`. The method is already `async` (it `await`s `connectDB()`); `SystemSettingsService` is already imported in the project — add an import locally.

The private `startOfDayWAT`/`endOfDayWAT` helpers at lines 22-34 stay in place for now (still used at lines 556-557 in `generateDateRangeReport`, which is out of scope for this REQ).

### 3. Tests

Per project memory (`feedback_tests_before_push`): write tests **first**, then implementation.

- **Unit**: extend `__tests__/lib/business-date.test.ts` with `businessDayRange` cases.
  - cutoff 15:00 WAT; `date` = 07:00 WAT on day D → range starts at (D−1) 00:00 WAT, ends at D 00:00 WAT − 1ms.
  - cutoff 15:00 WAT; `date` = 16:00 WAT on day D → range starts at D 00:00 WAT, ends at (D+1) 00:00 WAT − 1ms.
  - cutoff 15:00 WAT; `date` = 14:59:59 WAT on day D → range starts at (D−1) 00:00 WAT.
  - cutoff 15:00 WAT; `date` = 15:00:00 WAT on day D → range starts at D 00:00 WAT.
  - Default cutoff fallback (invalid format → `'15:00'`).
- **Integration**: new `__tests__/services/financial-report-service.business-day.test.ts`.
  - Seed an order with `businessDate = (D−1) 00:00 WAT` (representing the business day that ran from D−1 15:00 to D 14:59 WAT).
  - Invoke `generateDailySummary(D 07:00 WAT)` — order MUST be in the result.
  - Seed an order with `businessDate = D 00:00 WAT`.
  - Invoke `generateDailySummary(D 16:00 WAT)` — order MUST be in the result.
  - Invoke `generateDailySummary(D 07:00 WAT)` — order MUST NOT be in the result (it belongs to a later business day).
- **End-to-end**: 7 affected specs in the regression project. Verify via focused workflow_dispatch (`gh workflow run e2e-regression.yml --field specs='…'`).

### 4. Dependencies

- `SystemSettingsService.getBusinessDayCutoff()` already exists; no change needed.
- `lib/business-date.ts:deriveBusinessDate` already exists; no change needed.
- No new packages.

## Security considerations

### STRIDE

| Category                | Risk                                                                                                                                                                                                                                              | Mitigation                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **S** (Spoofing)        | N/A — no auth surface change.                                                                                                                                                                                                                     | Existing admin/super-admin auth on the report endpoint unchanged. |
| **T** (Tampering)       | N/A — query-only change, no data mutation.                                                                                                                                                                                                        | —                                                                 |
| **R** (Repudiation)     | N/A — no audit log change.                                                                                                                                                                                                                        | —                                                                 |
| **I** (Info disclosure) | Could the new date range expose data that wasn't visible before? **No** — users authorised to see _today's report_ are already authorised to see every report date. The change re-buckets _which orders count for today_, not _who can see them_. | Code-review + unit tests cover the boundary.                      |
| **D** (DoS)             | Could the new range slow queries? **No** — same index (`businessDate`), same query shape, same row volume.                                                                                                                                        | —                                                                 |
| **E** (Elevation)       | N/A.                                                                                                                                                                                                                                              | —                                                                 |

### Four-eyes attestation

- **Submitter**: AI tooling (Claude Code via the project orchestrator).
- **Reviewer**: ostendo-io (human operator) — independent of submitter per the project's solo-operator dual-actor interpretation (DevAudit-Installer#89 gap 10).
- **Attestation**: ostendo-io will review the diff on the release PR and approve Production in the DevAudit portal before Marking-as-Released.

## Rollback plan

1. Single PR. `git revert <merge-sha>` restores the prior behaviour atomically.
2. No DB migration; no schema change. Nothing to undo at the data layer.
3. No external system change. Railway redeploys the prior code on the next push.
4. Detection: monitor #196 — if the 7 affected tests regress after revert, the original behaviour is back. If a _different_ regression appears, follow the standard incident playbook.

## Test scope

| Gate                                                     | Expected                                       |
| -------------------------------------------------------- | ---------------------------------------------- |
| `npx tsc --noEmit`                                       | exit 0                                         |
| `npx vitest run` (full suite)                            | new tests pass; existing tests pass; no flakes |
| `npx eslint <changed files>`                             | 0 errors                                       |
| `npm audit --audit-level=high`                           | 0 high/critical                                |
| `semgrep scan --severity ERROR`                          | 0 new findings on REQ-051 code                 |
| E2E (regression project, scoped to the 7 affected specs) | all pass                                       |
| E2E (full regression)                                    | net failures: 7 fewer than baseline (~13 → ~6) |
