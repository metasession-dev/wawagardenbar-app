---
req: REQ-106
generated_by: e2e-test-engineer
generated_at: 2026-09-14T19:30:00Z
e2e_required: true
spec_path: e2e/finance/cash-tags-and-edit.spec.ts
---

# E2E scope decision — REQ-106

## Outcome

**E2E required — covered.** A regression-tier spec was written and the gate passed, run locally against a dev server backed by the tunneled UAT database. This pass caught and led to the fix of a genuine business-date resolution defect in `CashPositionService` that unit tests alone (which mock `SystemSettingsService.getBusinessDayCutoff` to a fixed value and don't naturally exercise the real cutoff-vs-current-time interaction) did not surface.

## Detail

- **`e2e_required`:** `true` — this REQ adds a new, always-visible Daily Report section and a new full page (Cash Deposits) with multi-step admin/super-admin workflows; unit tests alone can't prove the UI actually renders correctly or that the end-to-end flow (create → approve → transfer → position update) works against the real app.
- **Rationale:** N/A — covered below.
- **Spec path(s):** `e2e/finance/cash-tags-and-edit.spec.ts` (shared spec file, bundled REQ-104/105/106).
- **ACs covered:** AC1 (Current Cash Position section always renders, defined state), AC2 (payment method required + defaults to Cash), AC5 (cash deposit create, and separately approve+transfer with an optional reference), AC6 (super-admin adjustment updates the position immediately, including same-day), AC7 (defined non-seeded state — same assertion as AC1's "either/or" check), AC9 (position unchanged when switching the Daily Report's date/range tab), AC10 (dedicated Cash Position page shows live balance + itemized ledger or its empty state), AC11 (pagination controls render when entries exist; Next/Previous never crash the page — added iteration 3, post-UAT). AC3/AC4 (cash-method vs transfer-method expenses affecting/not-affecting the position) are covered by unit tests (`__tests__/services/cash-position-service.test.ts`) rather than re-asserted at the UI level, since they're pure aggregation-logic assertions once the payment-method field itself is proven to persist (AC2). AC8 (mixed-payment-method batch rejection) is a validation-error path covered by unit tests (`__tests__/pending-expense-group/pending-expense-group-service.test.ts`, `assertBatchPaymentMethodHomogeneous` block) rather than e2e, per the coordinator's own judgment call at spec-design time.

## Iteration 3 — pagination (post-UAT, 2026-09-16)

Added AC11 (Cash Position ledger pagination). Local run seeded a real opening balance via `scripts/seed-e2e-fixtures.ts` (previously the local disposable database had no cash-position data at all, so this branch was untested locally). Ran against a local disposable `mongo:7` Docker container — the same setup CI's `e2e-regression.yml` uses — not the UAT tunnel; no k8s secrets or port-forwards involved. All 15 specs in this file pass with `--workers=1`; one pre-existing test (AC6) is flaky under the default multi-worker config due to a real, pre-existing test-isolation gap (concurrent tests mutate the shared Current Cash Position), confirmed unrelated to this iteration's diff by isolating and re-running it alone (passes every time). Documented, not silently dismissed — see `compliance/evidence/REQ-106/test-execution-summary.md`.

## Notable finding during this pass

A real defect was found and fixed during e2e execution, not merely a test-authoring issue: `CashPositionService.getCashPositionForDate`/`getCashPositionForRange` originally derived the business-day boundary from a synthetic "noon" anchor `Date` via `businessDayRange(date, cutoff)`, re-applying cutoff rollover logic directly to that anchor. With a late cutoff (15:00 WAT) and a noon-ish anchor, this could resolve to the _previous_ business day rather than the day the anchor's resolved label was supposed to represent, causing a same-day, already-recorded opening balance to read back as "not yet tracked." Fixed by deriving the label via `watCalendarDateKey` (matching `FinancialReportService.generateDateRangeReport`'s own approach) and resolving exact bounds via `businessDateQueryRange` instead. A regression unit test was added (`cash-position-service.test.ts`, "regression: a seed recorded later THE SAME business day still counts as seeded for that date").

## Operator sign-off

I have reviewed the e2e-scope verdict above and confirm it matches the actual scope of this REQ's diff.

**Reviewer:** REPLACE — operator to confirm before merge
**Date:** REPLACE — YYYY-MM-DD
