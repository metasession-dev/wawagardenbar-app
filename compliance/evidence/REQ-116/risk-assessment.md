---
req: REQ-116
generated_by: risk-register-keeper
generated_at: 2026-11-01T11:00:00Z
---

# Risk assessment — REQ-116

## Summary

This REQ opened the following entries in `compliance/risk-register.md` (the register uses `R-NNN` IDs). The operator signed off R-043 to R-046 on 2026-10-31.

| Risk  | Title                                                                              | Status this cycle                                                                                                                                                                                                                                                                |
| ----- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-043 | Webhook accepts unsigned events when the app secret is missing                     | Controls landed: the route now returns 503 without `WHATSAPP_APP_SECRET` and 403 for any bad signature. The operator confirmed the secret is set in Railway production and `.env.uat.local` on 2026-11-01. Moves to MITIGATED after the deploy check (unsigned POST returns 403) |
| R-044 | Per-phone rate limit is in memory, per instance, and resets on restart             | ACCEPTED (ADR-007)                                                                                                                                                                                                                                                               |
| R-045 | STOP now clears marketing consent only; transactional messages continue after STOP | ACCEPTED (operator approved the marketing-only STOP policy, 2026-10-31)                                                                                                                                                                                                          |
| R-046 | Customer sign-in PIN not delivered on WhatsApp (#131008)                           | Fix landed (code in body and button). OPEN until the live UAT sign-in (AC10) is recorded                                                                                                                                                                                         |

## Framework cross-references

- ISO 27001 A.8.5, A.8.15, A.8.24: R-043, R-044
- SOC 2 CC6.1, CC6.6, CC7.2: R-043, R-046
- GDPR Art. 6, Art. 7 (demonstrable consent), Art. 21: R-045

## Operator sign-off

I have reviewed the risk register entries above and confirm:

- [ ] Each entry's residual rating is defensible given the controls landing in this REQ.
- [ ] No risk was downgraded without evidence (control demonstrated effective via tests).
- [ ] OPEN entries have follow-up tracking (issue / deadline / next-review-due).

**Reviewer:** REPLACE — operator name
**Date:** REPLACE — YYYY-MM-DD
