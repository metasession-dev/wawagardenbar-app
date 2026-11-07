# Release Ticket: REQ-119 — Multiple roles per staff account (WA-03)

**Status:** RELEASED
**Date:** 2026-11-06
**Requirement ID:** REQ-119
**Risk Level:** HIGH
**Issue:** [#965](https://github.com/metasession-dev/wawagardenbar-app/issues/965) (sub-issue of tracker [#953](https://github.com/metasession-dev/wawagardenbar-app/issues/953); Release 2, solo, no bundle)
**Implementation branch:** `feat/REQ-119-multi-role-staff`
**Absorbed predecessor releases:** None

## Summary

A staff member can hold several roles at once, and access is the combination of them. `kitchen` and `manager` exist so that refund approval (WA-11) and staff alerts (WA-12) can target them. Existing staff keep exactly the access they have, and a customer session can never gain staff access.

- **Model and session:** `roles[]` (`csr`, `kitchen`, `manager`, `admin`, `super-admin`) on staff users and in the session. `role` stays one more release as the highest role and as the read fallback, so a session or document with only `role` is read as `[role]`; deploy order and migration timing do not matter.
- **Authorization:** every check is an any-of check through one helper module (`lib/roles.ts`, re-exported from `lib/session.ts`). 261 direct `session.role` references in 74 files were replaced; a unit test fails the build if one is added. `isAdmin` keeps meaning "csr or above" and excludes `kitchen` (ADR-009).
- **New roles:** `kitchen` has orders (view and advance status) and the kitchen display only, and lands on the kitchen display. `manager` has everything `csr` has plus reports and incidents; no settings, menu, inventory or finance.
- **Role management:** role checkboxes in Create Admin; a new Edit Roles dialog; the customers-page single-role dialog now uses the same service. Server-side rules: at least one role; no self-edit; only a super-admin grants or removes `admin` or `super-admin` or touches their holders; the last super-admin is protected. One `admin.roles-updated` audit row per change.
- **Permissions:** a new member gets the union of their roles' defaults; on a role change a permission is switched on if an added role grants it and off only if a removed role alone granted it; edits made in the permissions editor persist.
- **Migration:** `scripts/migrate-staff-roles.ts` sets `roles = [role]` for staff whose `roles` is empty. Dry run by default, `--apply` to write, idempotent, never changes `role`, never touches customers.
- **Public API:** `POST /api/public/admins` accepts `role` or `roles`.
- **Fixed on the way:** the audit-log model lacked the new action (role-change audit writes would have thrown); a kitchen-only member looped between a forbidden route and the forbidden page.

## Bundled Changes

- **Core tracked release:** `REQ-119`
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** housekeeping since `origin/main`: DevAudit 1.12.1 template sync (#1010) and the REQ-117/118 close-out; no declared bundle.
- **Why bundled here:** not bundled. Solo release per the #953 plan (WA-03 sweeps role checks across the app and is better reviewed on its own).
- **Evidence impact:** evidence for REQ-119 only (`compliance/evidence/REQ-119/`).
- **Reviewer impact:** one HIGH-risk approval envelope for this REQ.
- **Security / risk impact:** R-052 to R-055; see `compliance/evidence/REQ-119/risk-assessment.md`.
- **Reference:** commit range `origin/main..HEAD`, branch `feat/REQ-119-multi-role-staff`

## Absorbed Predecessor Releases

None.

## AI contributors

| Tool        | Version    | Commits                                                                     | Date       |
| ----------- | ---------- | --------------------------------------------------------------------------- | ---------- |
| Claude Code | Sonnet 5.5 | plan, ADR, risk, implementation, test and compliance commits on this branch | 2026-11-06 |

## Implementation details

- **Core:** `interfaces/user.interface.ts`, `models/user-model.ts`, `lib/roles.ts` (new), `lib/session.ts`, `lib/permissions.ts` (route allowlists, role default permissions, permission recompute), `lib/auth-middleware.ts` (`requireStaff`), `proxy.ts`.
- **Sweep:** about 70 files under `app/actions`, `app/api`, `app/dashboard`, `components`, `services`.
- **Role management:** `services/admin-service.ts` (`createAdmin`, `updateRoles`), `app/actions/admin/admin-management-actions.ts`, `app/actions/admin/user-actions.ts`, `components/features/admin/{role-checkboxes,edit-roles-dialog,create-admin-dialog,admin-list,admin-actions-dropdown,dashboard-nav,role-badge,user-management-actions}.tsx`, `models/audit-log-model.ts`.
- **Migration and scripts:** `lib/staff-roles-migration.ts`, `scripts/migrate-staff-roles.ts`, `scripts/seed-test-users.ts`.
- **Tests:** seven new unit files, three updated, six existing test mocks adjusted; one new critical spec (9 tests) and one helper.
- **Design:** ADR-009. **SRS:** REQ-AUTHA-005 to REQ-AUTHA-007 new; REQ-AUTHA-004 and REQ-SETTINGS-002 updated. **Risk register:** R-052 to R-055.

## Operator tasks (not code)

1. After the UAT deploy: run `npx tsx scripts/migrate-staff-roles.ts` (dry run), then `--apply`; keep the record file as evidence. Repeat on production after release. Order relative to the deploy does not matter.
2. After the UAT deploy: sign in as a multi-role account (for example csr + kitchen) and as a kitchen-only account; record the date in evidence, never the credentials.
3. File the follow-up issue for a session version check (R-053), and sign off R-052 to R-055 residual ratings and ADR-009 in the evidence artefacts.
4. Sign off the SRS alignment, architecture decision, risk assessment and e2e scope decision in `compliance/evidence/REQ-119/`.
5. Independent UAT reviewer (not the operator, `dual_actor`) executes the UAT pack in `compliance/evidence/REQ-119/uat/` (briefing, 17-step procedure, execution record), then records UAT and approves in the portal with the completed record attached; a person approves Production.

## Verification

- TypeScript: 0 errors. ESLint: 0 errors (pre-existing warnings only). `npm run build`: green.
- Unit/integration: 1924 passed, 4 skipped (full suite).
- E2E: new critical spec 9/9; existing single-role specs 15/15 unchanged; full `critical` tier 346 passed, 1 failed, 0 skipped, with the one failure a known flake that passes in isolation (REQ-095 daily report). Isolated server and disposable MongoDB. CI runs the `regression` tier.
- Dependency audit: `0 accepted, 0 unresolved`; no dependency changed.
- Full detail: `compliance/evidence/REQ-119/test-execution-summary.md` and `security-summary.md`.
- Not yet done (operator): the migration runs and the live UAT sign-ins.

## Sign-off (dual-actor)

HIGH risk, `approval.mode: dual_actor`: the UAT reviewer must be a different person from the operator who triggered this work. The AI tooling that implemented the REQ and the human reviewers are distinct actors.

- **Submitter (implementation):** Claude Code (Sonnet 5.5)
- **Operator approvals on record:** plan approval (2026-11-06, `PROCEED`) with the recommended options for D1 (kitchen and manager defaults), D3 (stale-session lag accepted, follow-up issue) and D4 (extra guard rails); ADR-009 Accepted; R-052 to R-055 signed off at plan approval.
- **UAT reviewer / approver:** pending, on the DevAudit portal.
