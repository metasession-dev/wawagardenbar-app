---
req: REQ-102
generated_by: risk-register-keeper
generated_at: 2026-09-04T22:10:00Z
---

# Risk assessment — REQ-102

## Summary

This REQ opened the following entries in `compliance/risk-register.md`:

| RISK-NNN | Title                                                                           | Status this cycle         | Residual L × I |
| -------- | ------------------------------------------------------------------------------- | ------------------------- | -------------- |
| R-024    | Time-window price precedence bug charges the wrong price                        | OPEN (opened in this REQ) | low × high     |
| R-025    | Missing `showPrice`/`happyHourPrice` on legacy documents breaks order creation  | OPEN (opened in this REQ) | low × high     |
| R-026    | Bulk "Edit All" page broadens blast radius of a compromised super-admin session | OPEN (opened in this REQ) | low × high     |
| R-027    | Manual price override loses precedence to time-window price resolution          | OPEN (opened in this REQ) | low × high     |

All four residual ratings reflect: financial impact of a bug in this surface is High (matches R-023's precedent for the same order-pricing lineage), but likelihood is Low because each risk has a concrete, testable control — centralized resolution (ADR-004) for R-024, a migration script + AC9 verification for R-025, RBAC reuse + audit trail for R-026, and a dedicated regression test for R-027.

## Framework cross-references

- ISO27001.A.8.25 (secure SDLC — arithmetic/logical correctness in a financial calculation path) — R-024, R-027
- ISO27001.A.8.25 (secure SDLC — data migration integrity) — R-025
- ISO27001.A.8.25 (secure SDLC — no new authorization surface) — R-026
- SOC2.CC7.1 / SOC2.CC7.2 (system monitoring — unit/regression test suite as the control) — R-024, R-026, R-027
- SOC2.CC8.1 (change management — migration sequenced before dependent code path) — R-025

## Operator sign-off

I have reviewed the risk register entries above and confirm:

- [x] Each entry's residual rating is defensible given the controls landing in this REQ (centralized resolver, migration script, reused RBAC, dedicated regression test — see `compliance/plans/REQ-102/implementation-plan.md` §5).
- [x] No risk was downgraded without evidence — all four remain OPEN pending operator review; residual ratings are pre-mitigation-verification estimates.
- [x] OPEN entries have follow-up tracking — each references this REQ's implementation plan and issue #696; no separate follow-up issue needed since the mitigations ship in this same REQ.

**Reviewer:** REPLACE — operator to confirm before merge
**Date:** REPLACE — YYYY-MM-DD
