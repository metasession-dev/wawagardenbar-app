# Test Plan — REQ-035

**Requirement:** REQ-035 — Tip recording at express checkout + tips breakdown in Daily Financial Report
**Risk Level:** HIGH
**GitHub Issue:** [#76](https://github.com/metasession-dev/wawagardenbar-app/issues/76)
**Date:** 2026-05-07

## Acceptance Criteria

- **AC1** — Express create-order: staff can enter a tip amount and select an independent tip payment method (cash / POS / transfer). Order persists `tipAmount` + `tipPaymentMethod`. Default tip method = `paymentMethod` until staff overrides.
- **AC2** — Close-tab: every partial-payment row has its own `tipAmount` input. Tip stored on the partial-payment subdoc; the row's `paymentType` doubles as the tip method. Tab-level `tipAmount` equals the sum of partial-payment tips (maintained by `pre('save')` hook on TabModel).
- **AC3** — Server rejects: `tipAmount > 0` without a valid `tipPaymentMethod` (Order) or `paymentType` (partial payment); negative `tipAmount`; non-numeric `tipAmount`; `tipPaymentMethod` outside enum.
- **AC4** — In the UI, default `tipPaymentMethod` mirrors the bill's `paymentMethod`. Staff can override before submit. The override is persisted as the value on the saved record.
- **AC5** — `tipAmount` is stored as a raw amount in the same precision as `total` (no implicit percentage conversion, no rounding).
- **AC6** — `Order.total` continues to include `tipAmount` (existing behaviour). Daily report's revenue figures continue to **exclude** tips: `paymentBreakdown.total` remains revenue-only and is **unaffected** by this change. Tips appear in a parallel `tipsBreakdown` block.
- **AC7** — Daily Financial Report renders a "Tips received" card grid beneath "Revenue by method", showing per-method amount and percentage of total tips. Cards mirror the existing `paymentBreakdown` styling (only show cards where amount > 0). Methods covered: cash, card (rendered as "Card / POS"), transfer, ussd, phone, unspecified.
- **AC8** — PDF, Excel, and CSV exports include the tips breakdown immediately after the payment-method block in the same export.
- **AC9** — Backfill script `scripts/backfill-tip-payment-method.ts`, run on UAT then production, sets `tipPaymentMethod = paymentMethod` on every `Order` with `tipAmount > 0` and no `tipPaymentMethod`. Idempotent — re-running is a no-op.
- **AC10** — Regression: orders with `tipAmount = 0` continue to work; `tipPaymentMethod` stays unset; the report shows no tip card for that method.
- **AC11** — Regression: legacy tab close-out callers that don't send a per-row `tipAmount` continue to function (defaults to 0 on each partial-payment subdoc; tab-level `tipAmount` = 0).
- **AC12** — Pure helpers in `lib/tip-aggregation.ts` are 100% covered by unit tests, including the legacy-fallback path (`tipPaymentMethod` missing → use `paymentMethod`).

## Schema additions

```typescript
// Order (new field next to existing tipAmount)
tipPaymentMethod?: 'cash' | 'card' | 'transfer' | 'ussd' | 'phone';

// Tab.partialPayments[] (new optional field on subdoc)
tipAmount?: number; // default 0, min 0

// Tab-level tipAmount becomes a derived sum, maintained by pre('save') hook
```

```typescript
// services/financial-report-service.ts: DailySummaryReport extension
tipsBreakdown: {
  cash: number;
  card: number;
  transfer: number;
  ussd: number;
  phone: number;
  unspecified: number;
  total: number;
}
```

## Tests to Add

- [ ] `__tests__/lib/tip-aggregation.test.ts` — pure helpers `aggregateOrderTipsByMethod(orders)`, `aggregatePartialPaymentTipsByMethod(tabs)`, `formatTipBreakdownForDisplay(breakdown)`. Covers:
  1. Empty input → all-zero breakdown.
  2. Single order with `tipAmount=500, tipPaymentMethod='cash'` → cash:500, total:500.
  3. Order with `tipAmount=500` and missing `tipPaymentMethod` → fallback to `paymentMethod` (legacy path).
  4. Order with `tipAmount > 0` and missing both `tipPaymentMethod` and `paymentMethod` → unspecified.
  5. Tab with two partial-payments (card=2000, tip=200; cash=1000, tip=100) → card:200, cash:100, total:300.
  6. Tab with partial-payments where `tipAmount` is missing on subdoc → treated as 0.
  7. Mixed input (orders + tabs) → sums correctly across both sources.
  8. Order with `tipAmount=0` → contributes nothing to any bucket.

- [ ] `__tests__/services/order-service.tip.test.ts` — `completeOrderPaymentManually` path. ~5 tests:
  1. Accepts and persists `tipAmount` + `tipPaymentMethod`.
  2. Rejects `tipAmount > 0` without `tipPaymentMethod`.
  3. Rejects negative `tipAmount`.
  4. Rejects `tipPaymentMethod` outside enum.
  5. With `tipAmount = 0`, leaves `tipPaymentMethod` unset.

- [ ] `__tests__/services/tab-service.tip.test.ts` — `completeTabPaymentManually` partial-payment path. ~5 tests:
  1. Accepts per-row `tipAmount` and persists on subdoc.
  2. Tab-level `tipAmount` = sum of partial-payment tips.
  3. Re-saving with edited partial-payments recomputes tab-level `tipAmount` correctly.
  4. Legacy callers omitting `tipAmount` get default 0 on each subdoc.
  5. Tab-level `tipAmount` is read-only externally — server always recomputes.

- [ ] `__tests__/services/financial-report-service.tip.test.ts` — daily summary aggregation. ~4 tests:
  1. Sums `tipAmount` across paid orders, keyed by `tipPaymentMethod`.
  2. Falls back to `paymentMethod` when `tipPaymentMethod` is missing (legacy data).
  3. Sums partial-payment tips, keyed by `paymentType`.
  4. `paymentBreakdown.total` is unaffected by tip writes (regression guard for AC6).

- [ ] `e2e/orders/express-tip-capture.spec.ts` — Playwright: staff creates an express order, enters ₦500 tip with method 'cash' while paying with 'card', verifies the order persists both fields and the daily report shows ₦500 in the cash tip card. Skips gracefully if admin login fails.

- [ ] `e2e/orders/close-tab-tip-capture.spec.ts` — Playwright: staff closes a tab with two partial payments (card + cash), each with its own tip; verifies the daily report rolls them up under the correct method buckets.

## Tests to Update

Audit performed via `grep -rln "tipAmount\|paymentMethod" __tests__/ e2e/`. Files that touch tip / payment fields:

- [ ] `__tests__/services/financial-report-service.test.ts` — extend the existing daily-summary fixture to include orders with `tipAmount > 0` and assert that the new `tipsBreakdown` is populated AND that `paymentBreakdown.total` matches its pre-tip value (regression for AC6).
- [ ] `e2e/express-order-report.spec.ts` (REQ-013-era) — add an assertion that the new Tips section is present on the report page when at least one order has a tip; otherwise skip the assertion gracefully.
- [ ] `e2e/orders/express-create-order.spec.ts` (if present) — assert tip input is rendered next to the payment-method dropdown.

**Verified safe — no update needed:**

- All other E2E specs that submit express orders or close tabs treat `tipAmount` as defaulted-to-0 fixtures; the new optional field stays at its default and behaviour is unchanged.

## Tests to Remove

None.

## Functional Test Mapping

| Acceptance Criterion                            | Test File                                                 | Test Name                                                                             |
| ----------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| AC1 — Express tip capture                       | `e2e/orders/express-tip-capture.spec.ts`                  | "AC1: staff records ₦500 cash tip on a card-paid express order; both fields persist"  |
| AC2 — Close-tab per-row tip                     | `e2e/orders/close-tab-tip-capture.spec.ts`                | "AC2: tab with two partial payments + per-row tips; tab-level tipAmount = sum"        |
| AC3 — Server rejects invalid combos             | `__tests__/services/order-service.tip.test.ts`            | "rejects tipAmount > 0 without tipPaymentMethod"                                      |
| AC4 — Default tip method = paymentMethod        | `e2e/orders/express-tip-capture.spec.ts`                  | "AC4: default tip method mirrors paymentMethod; override persists"                    |
| AC5 — Stored as raw amount                      | `__tests__/services/order-service.tip.test.ts`            | "tipAmount stored as raw number, no rounding"                                         |
| AC6 — paymentBreakdown.total unaffected         | `__tests__/services/financial-report-service.tip.test.ts` | "paymentBreakdown.total is unchanged when tips are present"                           |
| AC7 — Tips section in Daily Report              | `e2e/orders/express-tip-capture.spec.ts`                  | "AC7: Daily Financial Report shows Tips received card with per-method breakdown"      |
| AC8 — Exports include tips                      | manual UAT walkthrough                                    | Documented in `uat-checklist.md` — staff exports PDF/Excel/CSV, inspects tips section |
| AC9 — Backfill script                           | manual UAT walkthrough                                    | Documented in `uat-checklist.md` — staff runs script, inspects log, re-runs (no-op)   |
| AC10 — Regression on tipAmount=0                | full vitest suite                                         | All baseline tests still pass                                                         |
| AC11 — Legacy callers without per-row tipAmount | `__tests__/services/tab-service.tip.test.ts`              | "legacy callers omitting tipAmount get default 0 on each subdoc"                      |
| AC12 — Pure helpers covered                     | `__tests__/lib/tip-aggregation.test.ts`                   | All 8 helper tests                                                                    |

## Non-Functional Tests

- **Security:** AC3 rejection paths covered by service-layer tests. No new auth surface — express + close-tab pages already require admin (existing page guards). Reuses existing `processedBy` audit field on partial-payments.
- **Performance:** `tipsBreakdown` aggregation is O(N) in orders + tab partial-payments — same shape as existing `paymentBreakdown` aggregation. No additional DB queries (walks the already-fetched in-memory arrays).
- **Accessibility:** `<TipInputRow>` follows the existing `<Input>` + `<Select>` a11y pattern (labelled inputs, keyboard navigation, focus management) used in `expense-form.tsx`.

## Out of Scope (per design decision)

- Customer-side checkout tip flow (preset percentages) untouched.
- Per-staff tip allocation / split.
- Tip-only reporting outside the Daily Financial Report.
- Tip refund / void as a standalone surface — handled implicitly by parent record void.
