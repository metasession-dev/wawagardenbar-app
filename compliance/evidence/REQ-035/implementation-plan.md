# Implementation Plan — REQ-035

**Requirement:** REQ-035 — Tip recording at express checkout + tips breakdown in Daily Financial Report
**GitHub Issue:** [#76](https://github.com/metasession-dev/wawagardenbar-app/issues/76)
**Risk Level:** HIGH (financial-data write path; multi-collection schema additions; daily-report aggregator change)
**Date:** 2026-05-07

## Approach

Reuse existing patterns and surfaces wherever possible:

- **Schema:** `Order.tipAmount` already exists (REQ-013). Add a new optional `Order.tipPaymentMethod` field next to it. `Tab.partialPayments[]` subdocs gain an optional `tipAmount` field; tab-level `tipAmount` becomes a derived sum maintained via Mongoose `pre('save')` hook.
- **Reporting:** The existing `aggregatePartialPayments` helper in `services/financial-report-service.ts:123` is the exact shape `aggregatePartialPaymentTipsByMethod` will mirror — extract the tip walk into a parallel helper. The daily report's `paymentBreakdown` shape is mirrored 1:1 by the new `tipsBreakdown` shape.
- **UI:** A small reusable `<TipInputRow>` (numeric input + method Select) plugs into both the Express create-order modal and each close-tab partial-payment row. Tip method defaults to the bill's payment method, but is independently overrideable.
- **Backfill:** One idempotent script sets `Order.tipPaymentMethod = paymentMethod` on every existing Order with `tipAmount > 0`. Skips already-set rows. No DB destructive operation.

**Tip method is independently selectable, not coupled to payment method** — verified design decision. Realistic case: customer pays card and tips cash.

**Tips do NOT inflate revenue figures.** The existing `paymentBreakdown.total` continues to mean revenue (subtotal + service fee + tax − discount). Tips are tracked alongside in a separate `tipsBreakdown` block. AC6 protects this invariant via a regression test.

## Order of operations

1. Define `interfaces/payment-method.ts` — first-class export of the payment-method enum (extracted from inline string literals in `services/financial-report-service.ts:131,281,551`, `models/order-model.ts:157`, `models/tab-model.ts:103`). One source of truth.
2. Write pure helpers + tests (`lib/tip-aggregation.ts` + `__tests__/lib/tip-aggregation.test.ts`) — TDD discipline.
3. Add `Order.tipPaymentMethod` field + interface mirror.
4. Add `Tab.partialPayments[].tipAmount` field + interface mirror + `pre('save')` recompute hook.
5. Extend `OrderService.completeOrderPaymentManually` to accept + persist tip fields. Tests.
6. Extend `TabService.completeTabPaymentManually` to accept per-row `tipAmount`. Tests.
7. Extend `expressCreateOrderAction` and `expressCloseTabAction` server actions to forward the new fields.
8. Build `<TipInputRow>` component.
9. Wire `<TipInputRow>` into `app/dashboard/orders/express/create-order/page.tsx`.
10. Wire `<TipInputRow>` into the close-tab partial-payment row UI.
11. Extend `services/financial-report-service.ts` to aggregate `tipsBreakdown` in `generateDailySummary` + `generateDateRangeReport`. Tests.
12. Build `<TipsSection>` component.
13. Render `<TipsSection>` in `app/dashboard/reports/daily/daily-report-client.tsx` beneath the Revenue-by-method grid.
14. Extend PDF / Excel / CSV exports in `lib/report-export.ts` to include the tips block.
15. Write the backfill script (`scripts/backfill-tip-payment-method.ts`) — idempotent.
16. Run backfill on develop / UAT, manually inspect log.
17. Add Playwright E2E specs (express-tip-capture, close-tab-tip-capture).
18. Compile final SDLC artefacts (security-summary, test-execution-summary, uat-checklist, ai-prompts, ai-use-note, gates/) on the SHA META-COMPLY UAT cuts from.

## Files to Create

- `interfaces/payment-method.ts` — `PAYMENT_METHODS_FULL = ['cash','card','transfer','ussd','phone'] as const`, `PAYMENT_METHODS_EXPRESS = ['cash','card','transfer'] as const`, `type PaymentMethod = (typeof PAYMENT_METHODS_FULL)[number]`. Re-exported from existing models/services to eliminate duplicate inline literals.
- `lib/tip-aggregation.ts` — pure helpers, no DB calls:
  - `aggregateOrderTipsByMethod(orders): TipBreakdown` — walks paid orders, accumulates `tipAmount` keyed by `tipPaymentMethod ?? paymentMethod ?? 'unspecified'`.
  - `aggregatePartialPaymentTipsByMethod(tabs): TipBreakdown` — walks tabs' `partialPayments[]`, accumulates `pp.tipAmount ?? 0` keyed by `pp.paymentType`.
  - `formatTipBreakdownForDisplay(breakdown): { method, amount, percent }[]` — sort + filter zero-amount methods for the UI.
  - Pure, no DB, fully testable in isolation.
- `__tests__/lib/tip-aggregation.test.ts` — 8 table tests per the test-plan spec.
- `__tests__/services/order-service.tip.test.ts` — 5 service-layer tests for the order-side persist path.
- `__tests__/services/tab-service.tip.test.ts` — 5 service-layer tests for the tab-side persist path including `pre('save')` recompute.
- `__tests__/services/financial-report-service.tip.test.ts` — 4 aggregation tests, including the AC6 regression guard.
- `components/features/orders/tip-input-row.tsx` — controlled component: `<Input type="number">` for amount + `<Select>` for method. Defaults method to the parent's `paymentMethod` until the user overrides. Used in both express and close-tab UIs.
- `components/features/reports/tips-section.tsx` — render the Tips received card grid; mirrors the existing inline render in `daily-report-client.tsx:271-368` (cards only render when amount > 0; show per-method amount + percent of total tips).
- `scripts/backfill-tip-payment-method.ts` — idempotent: for every Order with `tipAmount > 0` and no `tipPaymentMethod`, set `tipPaymentMethod = paymentMethod`. Logs total count + per-method count. Safe to re-run.
- `e2e/orders/express-tip-capture.spec.ts` — Playwright: AC1, AC4, AC7.
- `e2e/orders/close-tab-tip-capture.spec.ts` — Playwright: AC2, AC7.
- `compliance/evidence/REQ-035/security-summary.md` (post-implementation, before merge)
- `compliance/evidence/REQ-035/test-execution-summary.md` (post-implementation, before merge)
- `compliance/evidence/REQ-035/uat-checklist.md` (mirrors REQ-033 pattern)
- `compliance/evidence/REQ-035/ai-prompts.md`, `ai-use-note.md` (HIGH risk — required)
- `compliance/evidence/REQ-035/gates/{tsc.txt,vitest-summary.txt,semgrep.json,dependency-audit.json}` (captured locally on the same SHA META-COMPLY UAT cuts from)

## Files to Modify

**Models / interfaces:**

- `models/order-model.ts:155-158` — add `tipPaymentMethod: { type: String, enum: PAYMENT_METHODS_FULL }` (optional). Add a Mongoose `pre('validate')` hook that asserts: if `tipAmount > 0` then `tipPaymentMethod` must be set and in-enum.
- `interfaces/order.interface.ts:85` — add `tipPaymentMethod?: PaymentMethod` next to existing `tipAmount`.
- `models/tab-model.ts:97-114` — add `tipAmount: { type: Number, default: 0, min: 0 }` to the `partialPayments` subdoc. Add a Mongoose `pre('save')` hook on TabModel that recomputes the tab-level `tipAmount` as `partialPayments.reduce((s,pp) => s + (pp.tipAmount ?? 0), 0)`.
- `interfaces/tab.interface.ts` — mirror the schema change on the partial-payments subdoc type.

**Services:**

- `services/order-service.ts:completeOrderPaymentManually` — accept `{ tipAmount?: number, tipPaymentMethod?: PaymentMethod }` in the params object. Server validates: `tipAmount >= 0`; if `tipAmount > 0` then `tipPaymentMethod` must be set and in-enum. Persist both fields.
- `services/tab-service.ts:completeTabPaymentManually` — accept per-row `tipAmount` on the partial-payment array. Persist on subdoc; trust the `pre('save')` hook to recompute tab-level tipAmount.
- `services/financial-report-service.ts`:
  - Extend `DailySummaryReport` interface (lines 98-106) to add `tipsBreakdown: { cash, card, transfer, ussd, phone, unspecified, total }`.
  - In `generateDailySummary` (line 177): walk `orders[]`, accumulate `tipAmount` keyed by `tipPaymentMethod ?? paymentMethod ?? 'unspecified'` into `report.tipsBreakdown`. **Critical: do NOT add tip amounts into `report.paymentBreakdown` — those remain revenue-only (AC6).**
  - In `aggregatePartialPayments` (line 123): also accumulate `pp.tipAmount ?? 0` keyed by `pp.paymentType` into `paymentBreakdown` argument's parallel `tipsBreakdown` (refactor signature to take both objects, or a single accumulator object). Tips do **not** add to `paymentBreakdown.total`.
  - Same change in `generateDateRangeReport` (line 451).

**Server actions:**

- `app/actions/admin/express-actions.ts:expressCreateOrderAction` (line 191) — extend params Zod schema to accept `tipAmount?: number`, `tipPaymentMethod?: PaymentMethod`. Forward to `OrderService.completeOrderPaymentManually` (currently invoked at line 305-310).
- `app/actions/admin/express-actions.ts:expressCloseTabAction` (line 366-403) — accept array of partial-payment objects each with optional `tipAmount`. The single existing call site sends a single-row array — backward-compatible.

**UI:**

- `app/dashboard/orders/express/create-order/page.tsx` — render `<TipInputRow>` next to the payment-method dropdown in the payment step. Default `tipPaymentMethod` mirrors the form's `paymentMethod` until staff edits.
- Close-tab UI (precise file path verified during step 10 of the order of operations — the close-tab flow lives under `app/dashboard/orders/tabs/[tabId]/...`) — render `<TipInputRow>` in each partial-payment row's UI. Tip method auto-equals the row's `paymentType` (no separate dropdown — the row's payment method dropdown is the source of truth).
- `app/dashboard/reports/daily/daily-report-client.tsx` — beneath the existing "Revenue by method" grid (lines 271-368), render `<TipsSection breakdown={report.tipsBreakdown} />`.

**Exports:**

- `lib/report-export.ts:exportReportAsPDF` (line 20): add a "Tips received by method" sub-section after the existing payment-method block.
- `lib/report-export.ts:exportReportAsExcel` (line 212): add a tips block at the bottom of the Summary sheet.
- `lib/report-export.ts:exportReportAsCSV`: extend with tip rows after payment-method rows.

**RTM:**

- `compliance/RTM.md` — REQ-035 row flips DRAFT → TESTED - PENDING SIGN-OFF when CI is green; → APPROVED - DEPLOYED after merge.

## Risk Mitigation

- **No double-counting:** AC6 is protected by an explicit regression test (`financial-report-service.tip.test.ts` "paymentBreakdown.total is unchanged when tips are present"). The existing `aggregatePartialPayments` double-count guard for partial payments vs order totals is unchanged — tips ride alongside, never inside.
- **Backward compatibility:** all schema additions are optional with defaults. Legacy data (orders with `tipAmount > 0` and no `tipPaymentMethod`) is handled by the helpers' fallback to `paymentMethod`, then `'unspecified'`.
- **Idempotent backfill:** the script only writes when `tipAmount > 0` AND `tipPaymentMethod` is unset. Re-running is a no-op. No destructive operation.
- **Validation at write time:** Mongoose `pre('validate')` enforces the `tipAmount > 0 ⇒ tipPaymentMethod set` invariant, so even API callers that bypass the server action can't write invalid records.
- **Audit trail:** partial-payment subdocs already carry `processedBy` (user id) and `paidAt` — every tip is attributable to a staff member out of the box. Order-level tips inherit the existing Order audit (statusHistory, paymentId).
- **Auth surface:** unchanged. Express + close-tab pages already require admin. Daily report already requires admin. No new endpoints.

## Dependencies

- Independent of REQ-034 (#74). REQ-035 can ship in parallel and does not block / is not blocked by the kitchen-recipes work.
- Builds on REQ-013 (existing `tipAmount` field on Order + Tab) and REQ-032 (the `aggregatePartialPayments` shape and double-count guard in financial-report-service).

## Definition of Done

- 22+ unit tests pass (8 helper + 5 order-service + 5 tab-service + 4 report-service)
- Existing baseline + new tests all pass; no regression
- 2 new E2E specs pass on UAT (AC1+AC4+AC7 for express; AC2+AC7 for close-tab)
- Backfill script run on UAT; log inspected; idempotent re-run is no-op
- TypeScript: 0 errors
- Build: succeeds
- Compliance validator passes for REQ-035
- Manual UAT round-trip per `uat-checklist.md`: staff records a tip on an express order paying card, sees it in the report under "cash" tip card; closes a tab with two partials each carrying a tip; exports PDF/Excel/CSV and verifies the tips block appears.
- 2-reviewer PR approval per HIGH-risk policy.
- META-COMPLY UAT release approval before merge to main.
