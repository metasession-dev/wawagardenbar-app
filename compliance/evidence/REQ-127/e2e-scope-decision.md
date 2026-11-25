---
req: REQ-127
generated_by: e2e-test-engineer
generated_at: 2026-11-25T06:07:21Z
e2e_required: true
spec_path: e2e/critical/checkout-payment-init-failure.spec.ts
---

# E2E scope decision — REQ-127

## Outcome

**E2E required — covered.** Merge-gating specs were written in `e2e/critical/` and pass on an isolated stack.

## Detail

- **`e2e_required`:** true
- **Rationale:** N/A — covered below.
- **Spec path(s):** e2e/critical/checkout-payment-init-failure.spec.ts
- **ACs covered:** AC1, AC2, AC3, AC4
- **Notes:** UI spec with evidenceShot for AC1, AC2, AC4. The payment-start failure is forced by aborting the initializePayment server-action request in the browser, because the e2e app always starts payments (test payments).

## Operator sign-off

I have reviewed the e2e-scope verdict above and confirm it matches the actual scope of this REQ's diff.

- [ ] The verdict matches the actual scope of this REQ.

**Reviewer:** <operator-name>
**Date:** <YYYY-MM-DD>
