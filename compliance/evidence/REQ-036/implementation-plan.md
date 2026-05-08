# Implementation Plan — REQ-036

**Requirement:** REQ-036 — Quick-action tip-method parity + tip display on order surfaces (add-on to REQ-035)
**GitHub Issue:** [#77](https://github.com/metasession-dev/wawagardenbar-app/issues/77)
**Parent Issue:** [#76](https://github.com/metasession-dev/wawagardenbar-app/issues/76) (REQ-035)
**Risk Level:** MEDIUM (additive schema field + thin service passthrough + UI display)
**Date:** 2026-05-07

## Approach

Reuse the existing `<TipInputRow>` component and the existing `Order.tipPaymentMethod` field shipped in REQ-035. The only schema change is one optional field on `Tab.partialPayments[].tipPaymentMethod`. The aggregator change is a one-line `??` fallback that prefers the new field. The capture surfaces (AdminPayTabDialog full + partial branches and TipInputStep) gain the dropdown by passing existing `<TipInputRow>` props (or, for `TipInputStep`, a parallel `<Select>` inside the Form).

No backfill needed: legacy partial-payment rows have no `tipPaymentMethod` field; aggregator falls back to `pp.paymentType`, producing identical net attribution to today.

## Order of operations

1. Schema: add `Tab.partialPayments[].tipPaymentMethod` (optional enum); mirror in interface.
2. Tests-first: 3 tab-service tests + 1 aggregator test asserting the override and fallback paths.
3. Service updates: `recordPartialPayment` and `completeTabPaymentManually` accept + persist `tipPaymentMethod`.
4. Aggregator: one-line `??` change in `aggregatePartialPayments`.
5. Server actions: forward `tipPaymentMethod` through `expressCloseTabAction`, `recordPartialPaymentAction`, `completeTabPaymentManuallyAction`. Customer-checkout `payment-actions` already accepts `tipAmount` — extend to accept `tipPaymentMethod` and persist on `Order.tipPaymentMethod`.
6. UI — `AdminPayTabDialog`: add `tipPaymentMethod` state + override flag for both branches; pass to `<TipInputRow>` via the dropdown props. Forward in action calls.
7. UI — `TipInputStep`: add a `<Select>` (Cash / POS / Transfer) below the custom tip-amount input. Bind to a new `tipPaymentMethod` form field. Required when `tipAmount > 0`. Update `CheckoutForm` Zod schema + default + submit forwarding.
8. Display — `OrderPaymentInfo`: render tip + method row when `Order.tipAmount > 0`.
9. Display — `OrderSummary`: render Tip line between tax and total when `tipAmount > 0`.
10. Display — Tab detail page: serialize `tipAmount` + `tipPaymentMethod` for partial-payments at line ~88; render inline tip + method on each row when > 0.
11. E2E: `admin-pay-tab-tip-method.spec.ts` — full flow from tab pay dialog through Daily Report verification.
12. SDLC artefacts gates (validator).

## Files to Create

- `interfaces/payment-method.interface.ts` — already exists (REQ-035); reused.
- `__tests__/services/tab-service.tip-method.test.ts` — 3 tests.
- `__tests__/services/financial-report-service.tip-method.test.ts` — 1 test.
- `e2e/orders/admin-pay-tab-tip-method.spec.ts` — Playwright spec.
- `compliance/evidence/REQ-036/security-summary.md` (post-implementation, before merge).
- `compliance/evidence/REQ-036/test-execution-summary.md` (post-implementation, before merge).
- `compliance/evidence/REQ-036/uat-checklist.md`.
- `compliance/evidence/REQ-036/ai-prompts.md`, `ai-use-note.md`.
- `compliance/evidence/REQ-036/gates/{tsc.txt, vitest-summary.txt, semgrep.json, dependency-audit.json}` (captured locally on the SHA META-COMPLY UAT cuts from).

## Files to Modify

**Schema + interface:**

- `models/tab-model.ts` — partialPayments subdoc gets `tipPaymentMethod: { type: String, enum: ['cash','transfer','card'] }` (optional).
- `interfaces/tab.interface.ts` — `IPartialPayment` mirrors the new field.

**Services:**

- `services/tab-service.ts:recordPartialPayment` (line ~568) — params gain `tipPaymentMethod?`. Persist on the pushed subdoc.
- `services/tab-service.ts:completeTabPaymentManually` (line ~652) — params gain `tipPaymentMethod?`. Persist on the closing partial-payment row.
- `services/financial-report-service.ts:aggregatePartialPayments` (line ~166) — for the tip path, key by `pp.tipPaymentMethod ?? pp.paymentType`.

**Server actions:**

- `app/actions/admin/express-actions.ts:expressCloseTabAction` (line ~366) — accept + forward `tipPaymentMethod`.
- `app/actions/tabs/tab-actions.ts:recordPartialPaymentAction` (line ~366) and `completeTabPaymentManuallyAction` (line ~438) — accept + forward.
- `app/actions/payment/payment-actions.ts` (lines 42, 185–186, 600, 612) — extend the customer-side payment input with `tipPaymentMethod?`; persist on `Order.tipPaymentMethod`.

**UI — capture surfaces:**

- `components/features/admin/tabs/admin-pay-tab-dialog.tsx`:
  - Add state for both branches: `tipPaymentMethod`, `tipMethodOverridden`. Effective method = `tipMethodOverridden ? tipPaymentMethod : currentBillPaymentType`.
  - Pass `tipPaymentMethod={effectiveTipMethod}` and `onTipPaymentMethodChange` to both `<TipInputRow>` instances.
  - Reset state in `resetForm()`.
  - Forward `tipPaymentMethod` in `completeTabPaymentManuallyAction` and `recordPartialPaymentAction` calls.
- `components/features/checkout/tip-input-step.tsx`:
  - Add a `<Select>` (Cash / POS / Transfer) below the custom-amount input, bound to `form.watch('tipPaymentMethod')` via a new `FormField`.
  - Tip Summary block gains a "via X" line.
  - Hide / disable Select when `tipAmount = 0`.
- `components/features/checkout/checkout-form.tsx`:
  - Schema (line 54): `tipPaymentMethod: z.enum(['cash','transfer','card']).optional()`.
  - Refine to require it when `tipAmount > 0`.
  - Default in `defaultValues` (line 188): `tipPaymentMethod: undefined`.
  - Forward in submit (line 436 area).

**UI — display surfaces:**

- `components/features/admin/order-payment-info.tsx`:
  - After Amount block (lines 92–96), conditionally render `tipAmount > 0` ? a Tip row showing `₦tipAmount` + a small parenthetical `(via cash | transfer | POS)` derived from `order.tipPaymentMethod` (with fallback to `order.paymentMethod`).
- `components/features/checkout/order-summary.tsx`:
  - Around lines 211–246, add a Tip line between tax and total when `tipAmount > 0`.
- `app/dashboard/orders/tabs/[tabId]/page.tsx`:
  - Line ~88 partial-payments serialization: include `tipAmount: pp.tipAmount ?? 0` and `tipPaymentMethod: pp.tipPaymentMethod`.
  - Lines 277–328 partial-payments history rendering: when `pp.tipAmount > 0`, render `+ ₦{tipAmount} tip (via X)` inline under the row's note.

**RTM:**

- `compliance/RTM.md` — REQ-036 row TESTED - PENDING SIGN-OFF after CI is green.

## Risk Mitigation

- **Aggregator fallback ?? preserves legacy behaviour.** Pre-REQ-036 partial-payment rows have no `tipPaymentMethod`; the `??` falls through to `paymentType`, producing identical attribution to today.
- **Schema field is optional.** Reverting code does not break existing rows (the field simply isn't read).
- **No backfill required.** Future-only behaviour change; legacy data continues to work without intervention.
- **TipInputStep validation.** Form-level Zod superRefine asserts that `tipPaymentMethod` is set when `tipAmount > 0`, so the customer-checkout flow can't submit a tip without a method.

## Dependencies

- Builds on REQ-035 (#76) — uses `Order.tipPaymentMethod`, `Tab.partialPayments[].tipAmount`, the `<TipInputRow>` component, and the financial-report-service `tipsBreakdown` aggregator.
- Independent of any other queued REQ.

## Definition of Done

- 4 new unit tests pass (3 tab-service + 1 aggregator).
- 512 + 4 = 516 vitest tests pass total (no regression).
- 1 new E2E spec parses; CI runs end-to-end pass.
- TypeScript: 0 errors.
- Build: succeeds.
- Compliance validator passes for REQ-036.
- 1-reviewer PR approval per MEDIUM-risk policy.
- Manual UAT round-trip per `uat-checklist.md`.
