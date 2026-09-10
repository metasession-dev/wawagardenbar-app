---
req: REQ-103
generated_by: risk-register-keeper
generated_at: 2026-09-08T20:52:00Z
---

# Risk assessment — REQ-103

## Summary

This REQ opened / updated the following entries in `compliance/risk-register.md`:

| RISK  | Title                                                                                      | Status this cycle                                     | Residual L × I    |
| ----- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------- | ----------------- |
| R-028 | Menu/pricing save actions widen from super-admin-only to menuManagement-permission-holders | OPEN (opened in this REQ)                             | low × medium      |
| R-026 | Bulk "Edit All" page broadens blast radius of a compromised/careless super-admin session   | OPEN (updated — actor pool widened by this REQ's fix) | low-medium × high |

Both entries are unit- and e2e-test-backed: the shared `hasSessionPermission()` gate (24 passing unit tests across 4 files) and the AC5 negative-case e2e coverage (both `menu-edit-all.spec.ts` and `pricing-windows.spec.ts`) directly guard the failure modes R-028 describes.

## Framework cross-references

- ISO27001.A.8.25 — R-028, R-026 (secure development life cycle — authorization-gate change with explicit positive/negative test coverage)
- SOC2.CC6.1 — R-028 (logical access controls — permission-based, not role-hard-coded)
- SOC2.CC7.2 — R-026 (system monitoring / data integrity — audit trail via price-history snapshots, unchanged by this REQ)

## Operator sign-off

I have reviewed the risk register entries above and confirm:

- [ ] Each entry's residual rating is defensible given the controls landing in this REQ.
- [ ] No risk was downgraded without evidence (control demonstrated effective via tests).
- [ ] OPEN entries have follow-up tracking (annual review date recorded in the register).

**Reviewer:** REPLACE — operator name
**Date:** REPLACE — YYYY-MM-DD
