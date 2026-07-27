# Test Plan — REQ-095

**Requirement:** REQ-095
**Risk Level:** HIGH
**GitHub Issue:** #603
**Date:** 2026-07-26

## Tests to add

- `__tests__/lib/business-date.test.ts` — selected business-date labels, adjacent labels, inclusive N-day windows, and cutoff boundaries.
- `__tests__/services/financial-report-service.business-day.test.ts` — range-service query bounds and legacy fallback.
- `e2e/critical/daily-report-business-date-selection.spec.ts` — admin-visible Today, Yesterday, Last 7 Days, and custom-range behavior against seeded cutoff-spanning data, plus a dedicated regression case proving Today matches the operational business date (not just button adjacency).
- `__tests__/services/order-service.generateOrderNumber.test.ts` — atomic-counter and collision-retry unit coverage for the order-number generator fix (scope addition, see below).

## Tests to update

- `lib/report-export.ts` callers — `formatReportPeriod`/`reportFileDateSegment` now use `report.endDate` for range reports instead of dropping it; covered by the E2E export-period test rather than a new unit test (the period-formatting logic is presentation glue, not business logic).

## Tests to remove

- None.

## Functional mapping

| Acceptance criterion                                                   | Test                                                                                                  |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Today/Yesterday are adjacent before and after cutoff                   | `business-date.test.ts`; `daily-report-business-date-selection.spec.ts` (AC1, AC2)                    |
| Today matches the operational business date, not the raw calendar date | `daily-report-business-date-selection.spec.ts` (AC6) — regression found during this pass              |
| Last 7 Days is exactly seven business dates, display matches query     | `business-date.test.ts`; `daily-report-business-date-selection.spec.ts` (AC3, AC7)                    |
| Custom ranges are inclusive                                            | `financial-report-service.business-day.test.ts`; `daily-report-business-date-selection.spec.ts` (AC4) |
| Cutoff-spanning records are attributed correctly                       | `financial-report-service.business-day.test.ts`; seeded E2E fixture (AC4)                             |
| Legacy records remain included                                         | `financial-report-service.business-day.test.ts` (Vitest-only)                                         |
| Export period matches on-screen report                                 | `daily-report-business-date-selection.spec.ts` (AC5) — caught the export dropping the end date        |
| Order numbers stay unique under concurrent creation                    | `order-service.generateOrderNumber.test.ts`                                                           |

## Non-functional testing

- Security and access control: retain existing admin-only report authorization tests.
- Performance: verify the range query remains indexed on `businessDate` and does not add per-day database calls.
- Accessibility: retain existing report controls and labels; no new inaccessible control is introduced.

## Test data

Use the existing report admin fixture and deterministic paid records on both sides of the configured cutoff. Do not commit binary, JSON, or environment-specific evidence to git.
