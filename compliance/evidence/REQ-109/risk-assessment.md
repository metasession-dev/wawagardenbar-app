---
req: REQ-109
generated_by: risk-register-keeper
generated_at: 2026-09-30T02:54:00Z
---

# Risk assessment — REQ-109

## Summary

This REQ opened / mitigated the following entries in `compliance/risk-register.md` (project convention: `R-NNN`):

| R-NNN | Title                                                                                                   | Status this cycle                                         | Residual L × I |
| ----- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------- |
| R-034 | `csr` granted destructive tab/order-management actions previously restricted to admin/super-admin       | ACCEPTED (intentional per issue #902, operator-confirmed) | low × medium   |
| R-035 | Role-guard widening for `csr` could accidentally also loosen the `super-admin`-only delete-tab override | MITIGATED (controls landed in this REQ)                   | low × high     |

Both entries were drafted at Stage 1 covering the originally-scoped files (`express-actions.ts`, `tab-actions.ts`, `order-management-actions.ts`). Implementation discovered additional in-scope surface — page-level `redirect()` gates and 5 general-tier functions in `app/actions/inventory/snapshot-actions.ts` (see the implementation plan's Plan deviation section) — which present the identical risk shape (widened `csr` access to a general-tier action; a separate approval/override tier deliberately left untouched). No new register entry was needed: R-034/R-035 already cover this risk surface by description, not by an enumerated file list.

## Framework cross-references

- SOC2.CC6.1 (logical access) — R-034, R-035
- SOC2.CC7.2 (system monitoring / change management) — R-034, R-035
- ISO27001.A.8.25 (secure SDLC — regression test as a durable control) — R-035

## Operator sign-off

I have reviewed the risk register entries above and confirm:

- [x] Each entry's residual rating is defensible given the controls landing in this REQ (R-034: existing unchanged audit-log attribution; R-035: isolated diff + AC7's permanent regression test, verified passing).
- [x] No risk was downgraded without evidence — R-035's MITIGATED status is backed by a passing regression test (`e2e/critical/csr-order-tab-parity-req109.spec.ts`'s AC7 case, plus the parallel admin-fixture sibling test).
- [x] R-034 (ACCEPTED) needs no follow-up tracking beyond its existing 365-day review-due date; no OPEN entries from this REQ.

**Reviewer:** sdlc-implementer (agent) — operator sign-off pending final review
**Date:** 2026-09-30
