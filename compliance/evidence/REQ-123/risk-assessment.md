---
req: REQ-123
generated_by: risk-register-keeper
generated_at: 2026-11-19T00:00:00Z
---

# Risk assessment — REQ-123

## Summary

This REQ opened the following entries in `compliance/risk-register.md`:

| Risk | Title                                                                    | Status this cycle         | Residual L × I |
| ---- | ------------------------------------------------------------------------ | ------------------------- | -------------- |
| R-67 | Money path: order confirmed for the wrong amount or by a forged webhook  | OPEN (opened in this REQ) | low × high     |
| R-68 | Webhook idempotency and lost-webhook recovery                            | OPEN (opened in this REQ) | low × high     |
| R-69 | Paid-only kitchen gate hides a real order, or lets an unpaid one through | OPEN (opened in this REQ) | low × high     |
| R-70 | Expiry job cancels an order the customer has paid for                    | OPEN (opened in this REQ) | low × high     |
| R-71 | Payment messages held or wrong when templates are not approved           | OPEN (opened in this REQ) | medium × low   |
| R-72 | Placeholder email derived from the phone number sent to Paystack         | OPEN (opened in this REQ) | low × low      |

R-67 to R-70 have their controls in this PR and unit/e2e tests that exercise them; they stay OPEN until the UAT live round-trip and production smoke confirm the controls on real Paystack traffic. R-71 stays OPEN until each environment's template copy is APPROVED.

## Framework cross-references

- ISO27001.A.8.25, A.8.26 — R-67, R-68, R-69, R-70
- SOC2.CC6.1, CC7.2 — R-67 to R-70
- GDPR.Art-25, Art-5(1)(c) — R-72

## Operator sign-off

I have reviewed the risk register entries above and confirm:

- [ ] Each entry's residual rating is defensible given the controls landing in this REQ.
- [ ] No risk was downgraded without evidence (control demonstrated effective via tests).
- [ ] OPEN entries have follow-up tracking (issue / deadline / next-review-due).

**Reviewer:** <operator-name>
**Date:** <YYYY-MM-DD>
