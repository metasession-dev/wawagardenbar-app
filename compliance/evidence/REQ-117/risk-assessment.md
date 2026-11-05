---
req: REQ-117
generated_by: risk-register-keeper
generated_at: 2026-11-05T12:00:00Z
---

# Risk assessment — REQ-117

## Summary

This REQ opened the following entries in `compliance/risk-register.md` (the register uses `R-NNN` IDs). The operator signed off R-047 to R-051 at plan approval on 2026-11-05.

| Risk  | Title                                                           | Status this cycle                                                                                                                                           |
| ----- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-047 | Customer PIN brute force and PIN stored in plaintext            | Controls landed (keyed hash, five attempts, five requests per hour, ten-minute expiry; closes the R-040 gap). OPEN until the live UAT check, then MITIGATED |
| R-048 | Customer sign-in and checkout unavailable when WhatsApp is down | ACCEPTED (programme decision, #953); compensating: notice, Incident, counter or phone ordering                                                              |
| R-049 | 90-day customer session lifetime                                | ACCEPTED with compensating controls (httpOnly, secure, sameSite, logout, refresh on activity)                                                               |
| R-050 | Legacy account phone attachment on first WhatsApp sign-in       | OPEN, mitigated by WhatsApp proof of control and the no-merge rule; email-only accounts with a wrong phone go through REQ-111 recovery                      |

## Framework cross-references

- ISO 27001 A.8.5 (secure authentication), A.8.24 (cryptography): R-047, R-049
- SOC 2 CC6.1, CC6.6: R-047, R-049, R-050
- GDPR Art. 25, Art. 32: R-047

## Operator sign-off

I have reviewed the risk register entries above and confirm:

- [ ] Each entry's residual rating is defensible given the controls landing in this REQ.
- [ ] No risk was downgraded without evidence (control demonstrated effective via tests).
- [ ] OPEN entries have follow-up tracking (issue / deadline / next-review-due).

**Reviewer:** REPLACE — operator name
**Date:** REPLACE — YYYY-MM-DD
