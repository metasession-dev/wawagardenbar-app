# Test Plan — REQ-036

**Requirement:** REQ-036 — Quick-action tip-method parity + tip display on order surfaces (add-on to REQ-035)
**Risk Level:** MEDIUM
**GitHub Issue:** [#77](https://github.com/metasession-dev/wawagardenbar-app/issues/77)
**Parent Issue:** [#76](https://github.com/metasession-dev/wawagardenbar-app/issues/76) (REQ-035)
**Date:** 2026-05-07

## Acceptance Criteria

- **AC1** — Process Tab Payment > Full Payment: tip section has both an amount input AND a Cash / POS / Transfer dropdown for the tip's payment method, defaulting to the bill's payment type but independently overrideable.
- **AC2** — Process Tab Payment > Partial Payment: same as AC1 for the partial-payment row.
- **AC2b** — Express Close Tab page (`/dashboard/orders/express/close-tab`): same as AC1 — tip section with amount + method dropdown. Discovered as missed surface during UAT 2026-05-08 (D2 in `test-execution-summary.md`); patched in the same REQ before merge.
- **AC3** — Customer-checkout Tip step (`TipInputStep`): gains a Cash / POS / Transfer dropdown below the custom-amount input. Required when `tipAmount > 0`.
- **AC4** — Server persists explicit `tipPaymentMethod` on `Tab.partialPayments[]` (new field) and on `Order.tipPaymentMethod` (existing field). Falls back to bill payment type when caller omits it.
- **AC5** — Admin order detail (`OrderPaymentInfo`) renders the tip amount + method as a row beneath the Amount when `Order.tipAmount > 0`.
- **AC6** — Customer checkout `OrderSummary` renders a "Tip" line between tax and total when `tipAmount > 0`.
- **AC7** — Tab detail Partial Payments History renders each row's tip + method inline when `tipAmount > 0`.
- **AC8** — Daily Financial Report's `tipsBreakdown` attributes the tip to the **explicit** `tipPaymentMethod` when set (e.g. card bill + cash tip → cash bucket), falling back to `paymentType` for legacy rows. Regression: AC6 from REQ-035 still holds (`paymentBreakdown.total` unchanged by tips).
- **AC9** — Regression: tabs / orders / partial payments with `tipAmount = 0` (or missing) display exactly as before. No new layout shifts.

## Schema additions

```typescript
// Tab.partialPayments[] (new optional field on subdoc)
tipPaymentMethod?: 'cash' | 'transfer' | 'card';
```

When unset, the aggregator falls back to the row's existing `paymentType`. No DB migration; legacy rows continue to work.

## Tests to Add

- [ ] `__tests__/services/tab-service.tip-method.test.ts` — 3 tests:
  1. `recordPartialPayment` persists explicit `tipPaymentMethod` distinct from `paymentType`.
  2. `completeTabPaymentManually` persists explicit `tipPaymentMethod` on the closing partial-payment row.
  3. Default behaviour: caller omits `tipPaymentMethod`; subdoc has no explicit field; aggregator fallback covered separately.
- [ ] `__tests__/services/financial-report-service.tip-method.test.ts` — 1 test: aggregator prefers `pp.tipPaymentMethod` over `pp.paymentType` when both are set (card-bill + cash-tip → cash bucket).
- [ ] `e2e/orders/admin-pay-tab-tip-method.spec.ts` — Playwright: open a tab, click Customer Wants to Pay, choose Full Payment + Card bill + Cash tip + amount; submit; verify the Daily Report's Tips Received section shows the tip in the cash bucket.

## Tests to Update

- All REQ-035 tip tests continue to pass without modification (the new field is purely additive). No updates required.

**Verified safe — no update needed:**

- `__tests__/services/tab-service.tip.test.ts` (REQ-035) — fixtures don't set `tipPaymentMethod` on partials; behaviour unchanged.
- `__tests__/services/financial-report-service.tip.test.ts` (REQ-035) — fixtures don't set `pp.tipPaymentMethod`; aggregator falls back to `paymentType`, identical net result.
- `__tests__/lib/tip-aggregation.test.ts` (REQ-035) — pure helpers operate on the loose fixture type, which already permits the optional field.
- All other vitest specs — don't touch tip fields.

## Tests to Remove

None.

## Functional Test Mapping

| Acceptance Criterion                                | Test File                                                        | Test Name                                                                                          |
| --------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| AC1 — Full Payment tip method dropdown              | `e2e/orders/admin-pay-tab-tip-method.spec.ts`                    | "AC1: card bill + cash tip on closing payment row"                                                 |
| AC2 — Partial Payment tip method dropdown           | manual UAT walkthrough (component test optional)                 | Documented in `uat-checklist.md`                                                                   |
| AC2b — Express Close Tab page tip section           | manual UAT walkthrough                                           | Documented in `uat-checklist.md` Step 1b — added 2026-05-08 after D2 discovery                     |
| AC3 — Customer-checkout tip method dropdown         | manual UAT walkthrough                                           | Documented in `uat-checklist.md` — staff records tip via customer-checkout while creating-as-admin |
| AC4 — Server persists tipPaymentMethod (tab)        | `__tests__/services/tab-service.tip-method.test.ts`              | All 3 tab-service tests                                                                            |
| AC5 — OrderPaymentInfo renders tip                  | manual UAT walkthrough                                           | Documented in `uat-checklist.md`                                                                   |
| AC6 — OrderSummary renders tip line                 | manual UAT walkthrough                                           | Documented in `uat-checklist.md`                                                                   |
| AC7 — Tab detail partial-payments shows per-row tip | `e2e/orders/admin-pay-tab-tip-method.spec.ts`                    | "AC7: tab detail shows the tip on the closing partial-payment row"                                 |
| AC8 — Aggregator prefers tipPaymentMethod           | `__tests__/services/financial-report-service.tip-method.test.ts` | "AC8: explicit tipPaymentMethod overrides paymentType"                                             |
| AC9 — Regression                                    | full vitest + playwright suites                                  | 512 baseline + new tests; no existing-flow churn                                                   |

## Non-Functional Tests

- **Security**: AC4 server-side validation (rejects `tipPaymentMethod` outside enum). Reuses existing admin-gating on the tab + order endpoints.
- **Performance**: One additional `??` lookup per partial-payment row in the aggregator — O(1) per row, negligible.
- **Accessibility**: New `<Select>` in `TipInputStep` follows the existing `FormField` + `FormControl` a11y pattern.

## Out of Scope (per design decision)

- AdminPayOrderDialog tip capture — track as separate follow-up.
- Customer "Download Receipt" PDF — receipt not implemented; defer.
- Tab-list / customer order history list — UX call deferred.
