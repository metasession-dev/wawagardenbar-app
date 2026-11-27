---
req: REQ-129
generated_by: risk-register-keeper
generated_at: 2026-11-27T13:07:30Z
---

# Risk assessment — REQ-129

## Summary

This REQ opened the following entries in `compliance/risk-register.md` (the register uses `R-NNN` ids):

| Risk | Title                                                                        | Status this cycle         | Residual L × I |
| ---- | ---------------------------------------------------------------------------- | ------------------------- | -------------- |
| R-85 | Spam or abuse of the public booking form floods staff and WhatsApp           | OPEN (opened in this REQ) | low × medium   |
| R-86 | One customer reads another customer's booking or personal data               | OPEN (opened in this REQ) | low × medium   |
| R-87 | A booking is saved but staff never see it, or the customer is never answered | OPEN (opened in this REQ) | medium × low   |

Controls that landed in this REQ and the tests that show them working:

- R-85: verified customer session on submit, five bookings per phone per business day counted in the database, length caps, de-duplicated alerts (`booking-service.test.ts`, `booking-customer.spec.ts` sixth-booking refusal).
- R-86: owner-scoped reads (another customer's id is a 404), phone taken from the account, role-gated pages and actions, audit log (`booking-service.test.ts`, `booking-actions.test.ts`, `booking-customer.spec.ts`, `booking-dashboard.spec.ts`).
- R-87: the Bookings list is the source of truth, the staff alert is best effort and never fails the submission, `held_template_pending` is visible, the customer sees status under My bookings (`booking-dashboard.spec.ts`, `booking-notifier.test.ts`).

## Framework cross-references

- ISO27001.A.8.25, A.8.6 — R-85
- ISO27001.A.5.15, A.8.3, A.8.15 — R-86
- ISO27001.A.5.30, A.8.16 — R-87
- SOC2.CC6.1 — R-85, R-86
- SOC2.CC6.3 — R-86
- SOC2.A1.1 — R-85
- SOC2.A1.2, SOC2.CC7.2 — R-87
- GDPR.Art-25, GDPR.Art-32 — R-86

## Operator sign-off

I have reviewed the risk register entries above and confirm:

- [x] Each entry's residual rating is defensible given the controls landing in this REQ.
- [x] No risk was downgraded without evidence (control demonstrated effective via tests).
- [x] OPEN entries have follow-up tracking (issue / deadline / next-review-due).

**Reviewer:** metasession-dev (Metassession Dev)
**Date:** 2026-11-27

_Approved by metasession-dev (Metassession Dev) in the Claude Code session on 2026-11-27; recorded by the agent from the operator's explicit reply._
