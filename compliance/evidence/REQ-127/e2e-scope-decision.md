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

- [x] The verdict matches the actual scope of this REQ.

**Reviewer:** metasession-dev (Metassession Dev)
**Date:** 2026-11-25

_Approved by metasession-dev (Metassession Dev) in the Claude Code session on 2026-11-25; recorded by the agent from the operator's explicit reply._
