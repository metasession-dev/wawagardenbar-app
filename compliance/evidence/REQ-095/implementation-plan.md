# Implementation Plan — REQ-095

**Requirement:** REQ-095
**GitHub Issue:** #603
**Risk Level:** HIGH
**Date:** 2026-07-26

## Approach

Define a single business-date selection contract for the Daily Summary report. A selected date is a WAT business-date label, while the configured cutoff is used only to derive the current operational label and to attribute newly written records. Convert labels to the persisted UTC `businessDate` value through shared helpers, and use the same inclusive label range for single-day, preset, custom-range, and export paths.

## Surface inventory

| Surface                                     | Classification                       | Verification                                                                 |
| ------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------- |
| Daily Summary Today shortcut                | In scope                             | Playwright plus service boundary tests                                       |
| Daily Summary Yesterday shortcut            | In scope                             | Playwright plus service boundary tests                                       |
| Daily Summary Last 7 Days shortcut          | In scope                             | Playwright plus range helper tests                                           |
| Daily Summary date-range picker             | In scope                             | Playwright plus service query tests                                          |
| Daily Summary on-screen totals/charts       | In scope                             | Existing render path and E2E assertions                                      |
| Daily Summary PDF/Excel/CSV export          | In scope                             | Export-period metadata and unit tests                                        |
| Profitability and per-main-category reports | Already works / compatibility review | Preserve their date-only contract; add no unrelated behavior change          |
| Inventory date-only reports                 | Out of scope                         | Continue using `watCalendarDayRange`; no financial business-date attribution |

## Files to Create

- `compliance/evidence/REQ-095/*` — traceability, plan, and AI-use records.
- `__tests__/services/financial-report-service.date-range.test.ts` — range query and legacy fallback coverage, if the existing business-day test file is not extended.

## Files to Modify

- `lib/business-date.ts` — add label normalization and inclusive business-date range helpers.
- `services/financial-report-service.ts` — resolve date-range queries through the shared business-date helper and preserve legacy fallback semantics.
- `app/dashboard/reports/daily/daily-report-client.tsx` — make shortcuts select business-date labels rather than wall-clock instants and use exactly seven labels for Last 7 Days.
- `lib/report-export.ts` — verify exported date labels use the resolved report period without changing totals.
- `__tests__/lib/business-date.test.ts` — boundary, adjacent-label, and N-day window tests.
- `__tests__/services/financial-report-service.business-day.test.ts` — single-day and range query-bound tests.
- `docs/SRS.md` — document the observable business-date selection contract.

## Architecture decisions

No ADR needed — this consolidates the existing WAT business-date contract into shared helpers and removes inconsistent calendar-day calculations; it introduces no database, dependency, or external-service change.

## Dependencies

- Existing `businessDate` fields and the configured `business-day-cutoff` setting.
- Existing `paidAt` fallback for legacy records without a persisted `businessDate`.
- Existing report export functions.

## Risks / considerations

- RISK-095-1 — Incorrect boundary math could include or omit financial transactions. Mitigation: exact-cutoff, one-millisecond-before, adjacent-day, month/year, and custom-range tests.
- RISK-095-2 — Changing the range query could alter legacy records without `businessDate`. Mitigation: retain the existing `$exists: false`/`null` `paidAt` fallback and test it explicitly.
- RISK-095-3 — UI label and query period could diverge. Mitigation: return and use one resolved business-date period for all report and export surfaces.

## Post-deploy actions

- No schema migration or data migration.
- Verify UAT with seeded orders on both sides of the configured cutoff and compare single-day totals with the equivalent custom range.
- Verify production only after UAT and the normal release approval path succeed.
