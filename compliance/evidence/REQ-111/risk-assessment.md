---
req: REQ-111
generated_by: risk-register-keeper
generated_at: 2026-10-20T07:50:00Z
---

# Risk assessment — REQ-111

## Summary

This REQ opened the following entry in `compliance/risk-register.md`:

| RISK  | Title                                         | Status this cycle                                              | Residual L × I |
| ----- | --------------------------------------------- | -------------------------------------------------------------- | -------------- |
| R-037 | Account-recovery hint disclosure via WhatsApp | ACCEPTED (opened + accepted in this REQ, v1 design limitation) | medium × low   |

## Framework cross-references

- ISO 27001 A.8.25 — secure development life cycle (information disclosure via a new messaging surface) — R-037
- SOC 2 CC3.2 — risk identification (documented acceptance rather than silent exposure) — R-037

## Operator sign-off

I have reviewed the risk register entries above and confirm:

- [x] Each entry's residual rating is defensible given the controls landing in this REQ — the detector only sends a last-4-digit hint; no code handles the template's implied `YES`/`NEW` reply, so the disclosure cannot be escalated into account access via this REQ's code (bounded blast radius, documented in R-037).
- [x] No risk was downgraded without evidence — R-037 is opened as ACCEPTED directly (not downgraded from a higher rating); its residual rating (medium × low) reflects the inherent disclosure risk, unmitigated by design, with the escalation path explicitly closed off.
- [x] OPEN entries have follow-up tracking — N/A, R-037 is ACCEPTED, not OPEN. Its required precondition for any future escalation (a second-factor reply-handler) is documented as a hard requirement, not a tracked follow-up issue, since no such handler is planned in this REQ or #933.

**Reviewer:** sdlc-implementer (agent) — william@ostendo.io, pending final operator review at Phase 4
**Date:** 2026-10-20
