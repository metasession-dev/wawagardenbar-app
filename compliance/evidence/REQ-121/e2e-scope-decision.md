---
req: REQ-121
generated_by: e2e-test-engineer
generated_at: 2026-11-16T22:34:07Z
e2e_required: true
spec_path: e2e/critical/checkout-single-page.spec.ts
---

# E2E scope decision — REQ-121

## Outcome

**E2E required — covered.** The one-page customer checkout is a UI change, so every acceptance criterion has a browser test in the merge-gating `critical` tier, and the existing specs that drove the old four-step wizard were updated to the single page.

## Detail

- **`e2e_required`:** true
- **Rationale:** N/A — covered below.
- **Spec path(s):** `e2e/critical/checkout-single-page.spec.ts` (new, 10 tests) and `e2e/critical/checkout-closed-hours.spec.ts` (new, 2 tests; rewrites business hours, so it joins the serial `AGGREGATE_SPECS` chain in `playwright.config.ts`). Updated to the single page: `e2e/smoke/req-084-checkout-separation.spec.ts` (AC2 and AC3), `e2e/critical/customer-order-journey.spec.ts` and its `completeCheckout` helper, `e2e/critical/customer-ordering-options-ui.spec.ts`, `e2e/critical/customer-cannot-use-tabs.spec.ts`, `e2e/requirements-verification.spec.ts` (three checkout checks). New helpers: `e2e/helpers/checkout-page.ts`; `seedVerifiedCustomer` gained `noName` and `addresses`.
- **ACs covered:** AC1 one page, no stepper or info/tab/payment-method step, single Pay (US-A2.1) · AC2 first name asked once and saved, no email (US-A2.1, US-A2.2) · AC3 fields per order type, saved address, fee shown (US-A2.3, US-A2.4, US-A2.5) · AC4 inline tip 5/10/15% and custom, in the charge, no tip method (US-A2.11 and the order-total test) · AC5 `?type=` and `?table=` preselect, last-used type (US-A2.3 and the preselect test) · AC6 field errors inline, a typed service error inline, closed hours block Pay for pickup and delivery (US-A2.12).
- **Not testable in a browser here:** payment on the provider's hosted page (out of scope; test payments are on and foreign navigation is aborted). The Paystack hosted checkout and the paid-only kitchen gate belong to WA-07.
- **Defects found by the e2e run and fixed in this REQ:** a customer order with a tip could not be created (the order model requires a tip method; recorded as card); the first-name field disappeared once the profile loaded (the user API's `name` falls back to the email prefix; it now returns `hasName`).
- **Findings outside this REQ** (not fixed here, for follow-up issues): `/api/auth/*` is rate-limited to 5 requests a minute per IP and keyed on a client-settable `x-real-ip`, so customers behind one address can appear signed out; `sonner` toasts used by existing admin components have no toaster mounted.

## Operator sign-off

I have reviewed the e2e-scope verdict above and confirm it matches the actual scope of this REQ's diff.

- [ ] The verdict (e2e required) matches the actual scope of this REQ.
- [ ] The spec paths and ACs covered above are accurate.

**Reviewer:** <operator-name>
**Date:** <YYYY-MM-DD>
