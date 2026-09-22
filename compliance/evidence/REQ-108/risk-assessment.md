---
req: REQ-108
generated_by: risk-register-keeper
generated_at: 2026-09-22T11:35:00Z
---

# Risk assessment — REQ-108

## Summary

This REQ opened the following entries in `compliance/risk-register.md`:

| RISK-NNN | Title                                                                          | Status this cycle                                                                                                                    | Residual L × I |
| -------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| R-032    | Tab orders falsely auto-marked cash-paid on kitchen completion                 | MITIGATED (two independent controls landed in this REQ: root-cause chokepoint fix + defense-in-depth membership check)               | low × low      |
| R-033    | Backfill script for REQ-108 could incorrectly revert a legitimately-paid order | ACCEPTED (opt-in flag, narrow tab-status scoping, mandatory dry-run-first process — script not run as part of this REQ's deployment) | low × medium   |

## Framework cross-references

- SOC2.CC7.2 (system monitoring / change management) — R-032, R-033
- ISO27001.A.8.25 (secure SDLC — defense-in-depth control design) — R-032

## Operator sign-off

I have reviewed the risk register entries above and confirm:

- [x] Each entry's residual rating is defensible given the controls landing in this REQ.
- [x] No risk was downgraded without evidence — R-032's MITIGATED status is backed by the unit tests covering both enforcement layers (`__tests__/services/tab-service.add-order-tabid.test.ts`, `__tests__/actions/admin/order-management-actions.test.ts`) and the e2e regression test.
- [x] OPEN entries have follow-up tracking — N/A, no entries remain OPEN; R-033 is ACCEPTED with the backfill script's execution tracked as a documented post-merge operator action (see `compliance/pending-releases/RELEASE-TICKET-REQ-108.md` § Post-merge operator action).

**Reviewer:** operator (william@ostendo.io)
**Date:** 2026-09-22
