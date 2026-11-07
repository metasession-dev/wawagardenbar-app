# Security Evidence Summary — REQ-119

**Date:** 2026-11-06
**Risk class:** HIGH (staff authorization / RBAC, new roles, privileged role management, staff data migration)

| Control                             | Result               | Evidence                                                                                                                                                                                                                                      |
| ----------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency audit                    | PASS                 | `scripts/evaluate-npm-audit.sh` on a fresh `npm audit --json`: `0 accepted, 0 unresolved`. `package.json` and `package-lock.json` unchanged (the only audit findings are moderate, in dev tooling)                                            |
| SAST                                | PASS (local) / CI    | `npx tsc --noEmit`: 0 errors. `npm run lint`: 0 errors. `semgrep` is not installed locally; CI Quality Gates runs it on the PR                                                                                                                |
| No direct role comparison           | PASS                 | `__tests__/lib/no-direct-role-checks.test.ts` scans `app/`, `lib/`, `services/`, `components/`, `hooks/` and `proxy.ts` and fails on `session.role`, `<x>.role ===` or `.includes(<x>.role)` outside the helper modules: 0 offenders          |
| Access did not widen by accident    | PASS                 | Behaviour-preserving sweep; `isAdmin` excludes `kitchen`; kitchen-only e2e is refused on settings, menu, inventory, customers, rewards, incidents, reports, express and tabs; the four existing single-role specs pass unchanged (15/15)      |
| Customer and guest sessions         | PASS                 | `session-roles.test.ts` (customer, guest, null, tampered `roles: ['customer']`); e2e: a customer session is redirected from `/dashboard/*` and gets 401/403 from `/api/admin/*`                                                               |
| Privilege escalation via the new UI | PASS                 | Enforced in `AdminService.updateRoles`, not only in the dialog: at least one role, no self-edit, only a super-admin grants or removes `admin` or `super-admin` or touches their holders, last super-admin protected (19 unit tests)           |
| Auditability                        | PASS                 | One `admin.roles-updated` audit row per creation or change with actor, target, before, after, added and removed (unit and e2e). The first real run found the audit-log model enum missing the action; fixed and pinned                        |
| Forged or stale session roles       | PASS, accepted limit | The cookie is sealed; roles are set only at login from the database. A removed role stays effective in a signed-in browser until the 7-day cookie expires (R-053, accepted for this release; suspend the account to cut access immediately)   |
| Migration safety                    | PASS                 | `scripts/migrate-staff-roles.ts`: dry-run by default, `--apply` to write, guarded and idempotent, never changes `role`, never touches customers; record file written. Unit-tested (8 tests); to be run by the operator on UAT then production |
| Availability / loops                | PASS                 | A kitchen-only member could loop forever between a forbidden route and the forbidden page (`ERR_TOO_MANY_REDIRECTS`); found by the first real e2e run, fixed (`/dashboard/forbidden` allowlisted for every staff role) and pinned             |
| Public API                          | PASS                 | `POST /api/public/admins` validates `role` and `roles` against the staff roles and rejects `customer` and unknown values (400); unchanged scope (`settings:write`)                                                                            |
| New dependencies / external calls   | PASS                 | None                                                                                                                                                                                                                                          |

## Data handling

No new personal data. Audit rows reference staff user ids, usernames and role names, already recorded for other admin actions under the same retention. `kitchen` and `manager` default to minimal permissions (data protection by design).

## Post-deploy controls

- Revert the merge to roll back. `roles` is an additive field that old code ignores and `role` is still written (the highest role), so old code keeps working. A member holding only `kitchen` or `manager` is denied by old code (fails closed) until given a legacy role.
- Operator: run `npx tsx scripts/migrate-staff-roles.ts` (dry run), then `--apply`, on UAT and then production; keep the record file as evidence. The application is correct before and after, so the order relative to the deploy does not matter.
- Operator: after the UAT deploy sign in as a multi-role account (for example csr + kitchen) and as a kitchen-only account, and record the date in evidence (never the credentials).
- File the follow-up issue for a session version check (R-053).
