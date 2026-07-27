# Implementation Plan — REQ-095

**Requirement:** REQ-095
**GitHub Issue:** #603
**Risk Level:** HIGH
**Date:** 2026-07-26

## Approach

Define a single business-date selection contract for the Daily Summary report. A selected date is a WAT business-date label, while the configured cutoff is used only to derive the current operational label and to attribute newly written records. Convert labels to the persisted UTC `businessDate` value through shared helpers, and use the same inclusive label range for single-day, preset, custom-range, and export paths.

## Scope addition — post-merge regression pass

The original PR #604/#605 shipped Stage 1–3 without the Playwright coverage this plan's Surface inventory called for (see `docs/issues/e2e-gate-verifies-recency-not-relevance.md` for the enforcement gap that let this slip through). Writing that coverage now, and running it against the full regression suite, surfaced defects beyond the original scope:

1. **Today/Yesterday could show data that doesn't match what "Today" means operationally.** The button-adjacency fix in the original PR made Today and Yesterday always exactly one calendar day apart, but didn't resolve them through the configured cutoff — so before the cutoff, an order paid moments ago was attributed to the _previous_ business date while "Today" asked for the raw, un-shifted calendar date. Same root defect class as the original bug report, caught from a different angle.
2. **Last 7 Days' displayed range could disagree with the range actually queried**, for the same before-cutoff reason.
3. **The initial page load** used the same un-shifted default as (1), before any button click.
4. **An unrelated, pre-existing race in `OrderService.generateOrderNumber()`** blocked verifying (1)–(3) at all: two concurrent order-creation calls could compute the same sequence number and collide on the unique index, and — because a failed insert never advances the source count — every later call for the rest of the day recomputed the same taken number, permanently blocking order creation. Folded into this REQ rather than tracked separately because it was found, fixed, and verified in the same regression pass and directly blocked re-verifying REQ-095's own report-delta assertions.

All four are covered by the acceptance criteria and test plan below.

## Surface inventory

| Surface                                     | Classification                       | Verification                                                                                               |
| ------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Daily Summary Today shortcut                | In scope                             | Playwright plus service boundary tests                                                                     |
| Daily Summary Yesterday shortcut            | In scope                             | Playwright plus service boundary tests                                                                     |
| Daily Summary Last 7 Days shortcut          | In scope                             | Playwright plus range helper tests                                                                         |
| Daily Summary date-range picker             | In scope                             | Playwright plus service query tests                                                                        |
| Daily Summary on-screen totals/charts       | In scope                             | Existing render path and E2E assertions                                                                    |
| Daily Summary PDF/Excel/CSV export          | In scope                             | Export-period metadata and unit tests                                                                      |
| Profitability and per-main-category reports | Already works / compatibility review | Preserve their date-only contract; add no unrelated behavior change                                        |
| Inventory date-only reports                 | Out of scope                         | Continue using `watCalendarDayRange`; no financial business-date attribution                               |
| Order-number generation (scope addition)    | In scope                             | Unit tests for the atomic counter + collision retry; indirectly exercised by every order-creating E2E spec |

## Files to Create

- `compliance/evidence/REQ-095/*` — traceability, plan, and AI-use records.
- `e2e/critical/daily-report-business-date-selection.spec.ts` — the Playwright coverage the original plan called for but the original PR shipped without.
- `models/order-number-counter-model.ts` — atomic per-day counter backing the order-number fix (scope addition).
- `__tests__/services/order-service.generateOrderNumber.test.ts` — unit coverage for the atomic-counter and collision-retry logic (scope addition).

## Files to Modify

- `lib/business-date.ts` — add label normalization and inclusive business-date range helpers.
- `services/financial-report-service.ts` — resolve date-range queries through the shared business-date helper, preserve legacy fallback semantics, and populate `startDate`/`endDate` on range reports (previously only `date`=start was set, which is what caused the export-period bug below).
- `app/actions/reports/report-actions.ts` — add `labelOffsetDays` to `generateDailyReportAction` so Today/Yesterday resolve from one server-side "now" read via label arithmetic instead of two independently cutoff-resolved instants; return `resolvedLabel`/`resolvedStartLabel`/`resolvedEndLabel` so the client can sync its display to what was actually queried.
- `app/dashboard/reports/daily/daily-report-client.tsx` — make shortcuts select business-date labels rather than wall-clock instants, resolve the initial page load through the same cutoff-aware path as Today, and sync the picker display after Last 7 Days. Removed the dependency-driven auto-load `useEffect` in favor of explicit per-interaction fetches — an interim version relying on ref-guards to skip redundant fetches was broken by React Strict Mode's dev-only double-invocation of effects (also active under `npm run dev`, which CI uses), producing a stale-fetch race; explicit calls have no such race.
- `lib/report-export.ts` — CSV/PDF/Excel period labels and filenames now use `report.endDate` for range reports instead of only the start date.
- `services/order-service.ts` — replace `generateOrderNumber()`'s count-based sequence with an atomic `findOneAndUpdate($inc)` counter plus a collision-retry loop (scope addition).
- `scripts/seed-inventory.ts` — seed one `trackByLocation` multi-location inventory item; `admin-order-inventory-delta.{over-sell,sale-point}.spec.ts` need one to exist and previously only found it on UAT, not in a fresh local seed (found while running the full regression suite for this REQ; unrelated to the fix itself but needed for the suite to pass locally).
- `e2e/critical/{dashboard-revenue,express-order-report,reconciliation}.spec.ts` — hardened a shared "read immediately after a loading indicator hides" pattern that raced under load (poll-until-stable / auto-retrying assertions instead of a single point-in-time read after a fixed wait).
- `__tests__/lib/business-date.test.ts` — boundary, adjacent-label, and N-day window tests.
- `__tests__/services/financial-report-service.business-day.test.ts` — single-day and range query-bound tests.
- `docs/SRS.md` — document the observable business-date selection contract.

## Architecture decisions

No ADR needed — this consolidates the existing WAT business-date contract into shared helpers and removes inconsistent calendar-day calculations; it introduces no database, dependency, or external-service change.

## Dependencies

- Existing `businessDate` fields and the configured `business-day-cutoff` setting.
- Existing `paidAt` fallback for legacy records without a persisted `businessDate`.
- Existing report export functions.
- New `OrderNumberCounter` collection (scope addition) — one document per calendar day (`_id` = `YYMMDD`), holding the atomic sequence.

## Risks / considerations

- RISK-095-1 — Incorrect boundary math could include or omit financial transactions. Mitigation: exact-cutoff, one-millisecond-before, adjacent-day, month/year, and custom-range tests.
- RISK-095-2 — Changing the range query could alter legacy records without `businessDate`. Mitigation: retain the existing `$exists: false`/`null` `paidAt` fallback and test it explicitly.
- RISK-095-3 — UI label and query period could diverge. Mitigation: return and use one resolved business-date period for all report and export surfaces.
- RISK-095-4 (scope addition) — Order creation could collide/lock up under concurrent load, independent of anything else in this REQ, and would silently make every downstream financial figure wrong (missing orders, not just misattributed ones). Mitigation: atomic `$inc` counter (the operation MongoDB itself guarantees is race-free, rather than an application-level count-then-insert) plus a bounded collision-retry loop for legacy data the counter doesn't know about yet; verified against the actual stuck-database state this defect produced during regression testing, not just synthetically.

## Post-deploy actions

- No schema migration or data migration. The order-number counter collection bootstraps itself on first use per calendar day; no backfill needed — the collision-retry loop self-heals past any pre-existing legacy numbers for the current day.
- Verify UAT with seeded orders on both sides of the configured cutoff and compare single-day totals with the equivalent custom range.
- Verify production only after UAT and the normal release approval path succeed.
