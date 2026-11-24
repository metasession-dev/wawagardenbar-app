---
req: REQ-124
generated_by: risk-register-keeper
generated_at: 2026-11-22T00:00:00Z
---

# Risk assessment — REQ-124

## Summary

This REQ opened the following entries in `compliance/risk-register.md`:

| Risk | Title                                                                         | Status this cycle         | Residual L × I |
| ---- | ----------------------------------------------------------------------------- | ------------------------- | -------------- |
| R-73 | Order tracking page and socket open to anyone with an order id                | OPEN (opened in this REQ) | low × medium   |
| R-74 | Tracking token forged, leaked or secret misconfigured                         | OPEN (opened in this REQ) | low × medium   |
| R-75 | Customer status messages duplicated, mistargeted or held                      | OPEN (opened in this REQ) | medium × low   |
| R-76 | Kitchen display exposes customer personal data / serving check wrong person   | OPEN (opened in this REQ) | low × low      |

The controls for R-73 to R-76 are in this PR and exercised by unit and e2e tests. They stay OPEN until the UAT live round-trip confirms them on real WhatsApp traffic. R-74 also needs `ORDER_TRACKING_SECRET` on UAT and production (the operator reported it set on 2026-11-22). R-75 stays OPEN until the production copy of `order_status_update_v2` exists and is APPROVED: UAT is PENDING and the production account refuses API creation (`SMB_ACCOUNT_NOT_ON_COEX`), so the operator is creating it in WhatsApp Manager (`template-submissions.md`).

## Framework cross-references

- ISO27001.A.5.15, A.8.3, A.8.24, A.5.17 — R-73, R-74
- SOC2.CC6.1 — R-73, R-74
- GDPR.Art-32 — R-73, R-74
- ISO27001.A.5.34; GDPR.Art-5(1)(c), Art-25 — R-76

## Operator sign-off

I have reviewed the risk register entries above and confirm:

- [x] Each entry's residual rating is defensible given the controls landing in this REQ.
- [x] No risk was downgraded without evidence (control demonstrated effective via tests).
- [x] OPEN entries have follow-up tracking (issue / deadline / next-review-due).

**Reviewer:** metasession-dev (Metassession Dev)
**Date:** 2026-11-22

_Approved by metasession-dev (Metassession Dev) in the Claude Code session on 2026-11-22; recorded by the agent from the operator's explicit reply._
