---
req: REQ-119
generated_by: risk-register-keeper
generated_at: 2026-11-06T16:36:00Z
---

# Risk assessment — REQ-119

## Summary

This REQ opened the following entries in `compliance/risk-register.md`. None is closed by this REQ alone: two need operator steps (the live UAT check and the migration run) before their status can move.

| Risk  | Title                                         | Status this cycle                                            | Residual L × I                 |
| ----- | --------------------------------------------- | ------------------------------------------------------------ | ------------------------------ |
| R-052 | Access change from the role-check sweep       | OPEN; controls landed and tested, awaiting UAT               | low × medium (was low × high)  |
| R-053 | Stale staff sessions after a role change      | OPEN; accepted for this release (plan decision D3, option A) | medium × medium while accepted |
| R-054 | Staff role data migration                     | OPEN until the migration is run on UAT and production        | low × low                      |
| R-055 | Role-grant escalation through role management | OPEN; server-side rules landed and tested, awaiting UAT      | low × medium                   |

## Evidence behind the residual ratings

- **R-052.** `__tests__/lib/no-direct-role-checks.test.ts` fails the build on any direct role comparison (0 found); the unchanged single-role specs (`csr-order-tab-parity-req109`, `main-category-report-access-control`, `kitchen/permission-gating`, `admin/main-category-report-permissions-ui`) passed 15/15; negative e2e for kitchen-only, manager and customer sessions passed; `isAdmin` excludes `kitchen` (unit-tested). The first real e2e run found one defect in the new work, a redirect loop for a kitchen-only member on forbidden routes (fixed and pinned by a unit test), which is why the rating is not lower until UAT.
- **R-053.** Dialog text and the action's success message state that a change takes effect at the next sign-in (up to 7 days) and that suspending the account cuts access immediately. A follow-up issue for a session version check is to be filed by the operator (see sign-off).
- **R-054.** `lib/staff-roles-migration.ts` is unit-tested for idempotence, no `role` rewrite, customers untouched and unchanged access (`__tests__/scripts/migrate-staff-roles.test.ts`, 8 tests); the script is dry-run by default and guards each write on `roles` still being empty; the application reads `[role]` when `roles` is missing, so deploy order does not matter.
- **R-055.** `AdminService.updateRoles` rejects: empty roles, unknown roles, a self-edit, a non-admin actor, an admin granting or touching `admin` or `super-admin`, and demoting the last super-admin (19 unit tests in `admin-service.roles.test.ts`); one `admin.roles-updated` row per change is asserted in e2e. The first real run found the audit-log model enum lacked the new action, so every role-change audit write would have thrown (fixed and pinned by `audit-log-roles-action.test.ts`).

## Framework cross-references

- ISO27001.A.5.15 (access control), A.5.18 (access rights), A.8.2 (privileged access rights), A.8.3 (information access restriction), A.8.32 (change management): R-052, R-053, R-054, R-055
- SOC2.CC6.1, CC6.2, CC6.3 (logical access): R-052, R-053, R-055
- SOC2.CC8.1 (change management): R-054

## Operator sign-off

I have reviewed the risk register entries above and confirm:

- [ ] Each entry's residual rating is defensible given the controls landing in this REQ.
- [ ] No risk was downgraded without evidence (control demonstrated effective via tests).
- [ ] OPEN entries have follow-up tracking (issue / deadline / next-review-due). R-053 needs the follow-up issue for a session version check; R-054 needs the migration run recorded.

**Reviewer:** PENDING (operator)
**Date:** PENDING
