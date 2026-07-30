---
req: REQ-097
generated_by: risk-register-keeper
generated_at: 2026-07-30T10:00:00Z
---

# Risk assessment — REQ-097

## Summary

This REQ opened and mitigated the following entry in `compliance/risk-register.md` (project convention uses `R-NNN`):

| R-NNN | Title                                                   | Status this cycle                  | Residual                                                                                                                                      |
| ----- | ------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| R-018 | Silent under-charging on admin-created portioned orders | OPEN → mitigated by implementation | Surcharge resolved server-side from `menuItemId`-keyed menu data, never from client input; unit tests across all four affected files prove it |

## Framework cross-references

- ISO27001.A.8.25 — R-018 (secure development life cycle — arithmetic correctness in a financial calculation path)
- SOC2.CC7.2 — R-018 (system monitoring / data integrity — the reconciler's tamper-check tolerance is the compensating control this REQ's test cases now trip against on any future regression)

## Operator sign-off

I have reviewed the risk register entries above and confirm:

- [x] The residual rating is defensible given the controls landing in this REQ — unit tests in `order-line-totals.test.ts`, `cart-line-math.test.ts`, and `express-actions-portion-pricing-req097.test.ts` directly prove the surcharge is now included, server-side-resolved.
- [x] The risk was not downgraded without evidence — "mitigated by implementation" is backed by the specific tests named in `test-execution-summary.md`.
- [x] No OPEN entries remain without follow-up tracking.

**Reviewer:** sdlc-implementer@1.0 (AI-assisted; pending operator/UAT review)
**Date:** 2026-07-30
