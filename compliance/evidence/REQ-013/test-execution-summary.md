# REQ-013 — Test execution summary (backfill)

**Requirement ID:** REQ-013
**Risk:** HIGH
**Release:** v2026.03.28 (RTM: APPROVED - DEPLOYED)
**Backfill date:** 2026-06-10

> **Backfill note.** REQ-013 was released on 2026-03-28. This summary backfills the artifact retroactively to reflect the test coverage at that release plus the no-double-count unit pin added at #353.

## Quality gates (at release 2026-03-28, re-verified 2026-06-10)

| Gate                                                 | Expected   | Actual                         |
| ---------------------------------------------------- | ---------- | ------------------------------ |
| `npx tsc --noEmit`                                   | exit 0     | exit 0                         |
| `npx vitest run` (full)                              | 0 failures | 1208 pass / 4 skipped / 0 fail |
| `npm run build`                                      | exit 0     | exit 0                         |
| Focused REQ-013 unit (financial-report-service)      | green      | 9 pass / 0 fail                |
| Focused REQ-013 E2E (`daily-report-payments`, smoke) | green      | passing at release             |

## Coverage

| Layer | Files                                                                                                                                                                                                                                          |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit  | `__tests__/services/financial-report-service.tip.test.ts` (4 cases); `__tests__/services/financial-report-service.partial-payment-no-double-count.test.ts` (2 cases, added 2026-06-10); `__tests__/reports/payment-method-aggregation.test.ts` |
| E2E   | `e2e/daily-report-payments.spec.ts` — baseline → create tab → partial cash → close card → daily-report assertions (no double-count)                                                                                                            |

## Known issues at backfill time

- E2E regression-pack failures on `daily-report-payments.spec.ts` against UAT have been observed on PR #336 run [27259600381](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/27259600381). The failure shape ("everything exactly 2×") was traced to Playwright `serial` describe retries amplifying writes against shared UAT state, NOT a real product double-count. The unit pin added at PR #353 (`financial-report-service.partial-payment-no-double-count.test.ts`) deterministically guards the aggregation contract. The underlying UAT-pollution work is tracked at #352.
- The product code surface for REQ-013 (`FinancialReportService.generateDailySummary` + `aggregatePartialPayments`) is unchanged since the 2026-03-28 release.

## Sign-off

Original release: 2026-03-28 by William.
Backfill author: Claude (PR #353), reviewed and approved by William.
