---
req: REQ-084
generated_by: risk-register-keeper
generated_at: 2026-06-24T11:58:00Z
---

# Risk assessment — REQ-084

## Summary

This REQ opened the following entries in `compliance/risk-register.md`:

| RISK-NNN | Title                                                                                     | Status this cycle                       | Residual L × I |
| -------- | ----------------------------------------------------------------------------------------- | --------------------------------------- | -------------- |
| R-006    | Admin payment options leak into customer checkout after path separation                   | MITIGATED (controls landed in this REQ) | low × low      |
| R-007    | Price override logic remains accessible to non-admin users after removal from createOrder | MITIGATED (controls landed in this REQ) | low × high     |

## Detail

### R-006 — Admin payment options leak into customer checkout

- **Inherent:** low × medium
- **Residual:** low × low
- **Mitigations landed:**
  1. All `isAdmin` conditional branches removed from `customer-checkout-form.tsx`; `PaymentMethodStep` no longer accepts `isAdmin` prop.
  2. `AdminPaymentOption` import removed from `PaymentMethodStep`; component always renders Monnify gateway options only.
  3. AC3 + AC9 E2E tests verify no admin payment options are visible on `/checkout` and no `isAdmin` branching exists in the customer component.
- **Framework clauses:** ISO 27001 A.8.25, SOC 2 CC8.1

### R-007 — Price override logic accessible to non-admin users

- **Inherent:** low × high
- **Residual:** low × high (likelihood reduced by control removal; impact unchanged — price manipulation is always high)
- **Mitigations landed:**
  1. Price override validation block (including `hasOverrides` / `priceOverridden` logic) removed entirely from `createOrder` in `payment-actions.ts`.
  2. Price override capability moves to `expressCreateOrderAction` which is gated by `requireAdminSession`.
  3. AC8 unit test verifies no `isAdmin` / `priceOverridden` / `hasOverrides` branching exists in `createOrder`.
- **Framework clauses:** ISO 27001 A.8.25, SOC 2 CC8.1, SOC 2 CC6.1

## Framework cross-references

- ISO 27001 A.8.25 — Secure development life cycle — R-006, R-007
- SOC 2 CC8.1 — Change management — R-006, R-007
- SOC 2 CC6.1 — Logical access controls — R-007

## Operator sign-off

I have reviewed the risk register entries above and confirm:

- [ ] Each entry's residual rating is defensible given the controls landing in this REQ.
- [ ] No risk was downgraded without evidence (control demonstrated effective via tests).
- [ ] OPEN entries have follow-up tracking (issue / deadline / next-review-due).

**Reviewer:** TBD
**Date:** 2026-06-24
