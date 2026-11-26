---
req: REQ-128
generated_by: risk-register-keeper
generated_at: 2026-11-26T07:20:33Z
---

# Risk assessment — REQ-128

## Summary

This REQ opened the following entries in `compliance/risk-register.md`. Each is still OPEN: the controls below landed and are tested, and the residual rating is the operator's to confirm.

| Risk | Title                                                                           | Status this cycle         | Residual L × I  |
| ---- | ------------------------------------------------------------------------------- | ------------------------- | --------------- |
| R-81 | A refund is issued twice or for more than was paid                              | OPEN (opened in this REQ) | low × medium    |
| R-82 | Someone cancels another customer's paid order by WhatsApp                       | OPEN (opened in this REQ) | low × medium    |
| R-83 | Paystack refunds are unavailable or fail, so a cancelled customer is not repaid | OPEN (opened in this REQ) | medium × medium |
| R-84 | Unapproved or staff-misused refunds, or refund actions with no trail            | OPEN (opened in this REQ) | low × medium    |

Controls demonstrated by tests: unit tests in `__tests__/services/refund-service.test.ts` (double request, over-cap, replay, owner check), `__tests__/services/whatsapp-inbound-cancel.test.ts` (sender-only lookup, neutral reply), `__tests__/actions/refund-actions.test.ts` (role gate), and e2e `e2e/critical/refund-flow.spec.ts`.

R-83 stays OPEN with a follow-up: the operator confirms refunds are enabled on the UAT and production Paystack accounts before UAT (decision D3). A reconciliation job for refunds stuck `pending` is not in this REQ.

## Framework cross-references

- ISO27001.A.8.25, A.8.28 — R-81
- ISO27001.A.5.15, A.8.25; SOC2.CC6.1, CC6.3; GDPR.Art-32 — R-82
- ISO27001.A.5.30, A.8.25; SOC2.A1.2, PI1.2 — R-83
- ISO27001.A.5.3, A.8.15; SOC2.CC6.1, CC8.1 — R-84

## Operator sign-off

I have reviewed the risk register entries above and confirm:

- [x] Each entry's residual rating is defensible given the controls landing in this REQ.
- [x] No risk was downgraded without evidence (control demonstrated effective via tests).
- [x] OPEN entries have follow-up tracking (issue / deadline / next-review-due).

**Reviewer:** metasession-dev (Metassession Dev)
**Date:** 2026-11-26

_Approved by metasession-dev (Metassession Dev) in the Claude Code session on 2026-11-26; recorded by the agent from the operator's explicit reply._
