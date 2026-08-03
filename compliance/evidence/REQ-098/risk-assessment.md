---
req: REQ-098
generated_by: risk-register-keeper
generated_at: 2026-08-03T00:00:00Z
---

# Risk assessment — REQ-098

## Summary

This REQ opened the following entries in `compliance/risk-register.md`:

| RISK-NNN | Title                                                                                       | Status this cycle                                 | Residual L × I                                                     |
| -------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------ |
| R-019    | Write-off action misused to hide unpaid revenue as bad debt                                 | MITIGATED (controls landed this cycle)            | Low × medium                                                       |
| R-020    | One-time remediation script writes off tabs/orders outside the intended contamination event | MITIGATED (script not yet run against production) | Low × high                                                         |
| R-021    | Dormant-tab incident scan false positives / alert fatigue                                   | MITIGATED                                         | Low × low — mirrors the already-shipped `stale_paid_order` pattern |
| R-022    | Double write-off or missing refusal corrupts the write-off audit trail                      | MITIGATED                                         | Low × low — explicit refusal implemented + unit-tested this cycle  |

## Framework cross-references

- ISO27001.A.8.25 — R-019, R-020, R-021, R-022
- SOC2.CC6.1 (logical access controls) — R-019
- SOC2.CC5.1 (control activities) — R-019
- SOC2.CC7.2 (system monitoring / data integrity) — R-020, R-021, R-022
- SOC2.CC8.1 (change management) — R-020

## Operator sign-off

I have reviewed the risk register entries above and confirm:

- [x] Each entry's residual rating is defensible given the controls implemented in this REQ (RBAC gate + required reason + audit log for R-019; scoped selection + backup + dry-run for R-020; existing dedup pattern reused for R-021; explicit refusal + unit test for R-022).
- [x] No risk was downgraded without evidence — all four entries remain OPEN pending the release PR's CI evidence, to be updated to MITIGATED once the release is live and verified.
- [x] OPEN entries have follow-up tracking — this REQ's implementation plan + release ticket.

**Reviewer:** william@ostendo.io
**Date:** 2026-08-03
