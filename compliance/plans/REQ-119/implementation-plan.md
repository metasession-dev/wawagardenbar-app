---
title: 'Implementation plan — REQ-119'
requirement_id: 'REQ-119'
risk_class: 'HIGH'
change_type: 'feat'
authored_by: 'sdlc-implementer (Claude) for operator'
authored_at: '2026-11-06'
---

# Implementation plan — REQ-119

Issue: #965 (WA-03, tracker #953). Solo release (Release 2), no bundle. Risk HIGH: staff authorization (RBAC) is rewritten across the whole app (261 references to `session.role` in 74 files, not the "about 64" in the issue), two new roles are introduced, a role-management flow is added, and staff user documents are migrated.

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

Closes ISO 29119 §3.4 (§1), ISO 27001 A.8.25 (§5), GDPR Art. 25 (§6), EU AI Act Art. 11 (§7).

## 1. Goal + acceptance criteria

- **Goal:** A staff member can hold several roles at once. Access is the union of the roles. `kitchen` and `manager` exist so that WA-11 (refund approval) and WA-12 (staff alerts) can target them. Existing staff keep exactly the access they have today, and a customer session can never gain staff access.

| AC  | Description (Given / When / Then)                                                                                                                                                                                                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | **Given** a staff account, **Then** it carries `roles: StaffRole[]` (`csr`, `kitchen`, `manager`, `admin`, `super-admin`), the session carries `roles` and a back-compat `role` (the highest role), customers keep `role: 'customer'` with `roles: []`, and an account or session that has only `role` is read as `[role]`.      |
| AC2 | **Given** any staff authorization check, **Then** it is an any-of check over the roles through the helpers in `lib/session.ts`; no direct `session.role` comparison remains in `app/`, `lib/`, `services/`, `components/` or `proxy.ts` (a unit test fails the build if one is added); `'kitchen-staff'` is mapped to `kitchen`. |
| AC3 | **Given** an admin creating or editing a staff member, **When** they choose roles, **Then** the roles are checkboxes with at least one required, only a super-admin can grant or remove `admin` or `super-admin`, nobody can change their own roles, and the last super-admin cannot lose that role.                             |
| AC4 | **Given** existing staff accounts, **When** `scripts/migrate-staff-roles.ts` runs (repeatedly), **Then** every non-customer user has `roles = [role]` and keeps the same access; the run is idempotent and has a dry-run mode; the deploy works before, during and after the migration.                                          |
| AC5 | **Given** a role grant, removal or change (including at account creation), **Then** one audit-log row records the actor, the target, the roles before and after, and which roles were added and removed.                                                                                                                         |
| AC6 | **Given** a customer session (or no session), **When** it calls a staff action, route or API, **Then** it is rejected; `isAdmin`, `hasAnyRole` and `requireRole` return false for it.                                                                                                                                            |
| AC7 | **Given** a staff member with several roles, **Then** their effective feature permissions are the union of each role's defaults (defined once, in `lib/permissions.ts`) plus the user's existing per-user overrides, and super-admin keeps full access.                                                                          |
| AC8 | **Given** a staff member, **Then** dashboard navigation items, the `proxy.ts` route gate and the dashboard landing redirect show or allow an item when any of their roles grants it, and a `kitchen`-only member lands on a page they can use.                                                                                   |
| AC9 | **Given** the public admins API, seed scripts and sessions issued before this release, **Then** `POST /api/public/admins` still accepts `role` and also accepts `roles`, scripts create `roles`, and a pre-release session cookie (only `role`) keeps working until it expires.                                                  |

## SRS items proposed/touched

| AC            | SRS item                    | Status        | Notes                                                                                |
| ------------- | --------------------------- | ------------- | ------------------------------------------------------------------------------------ |
| AC1, AC2, AC6 | REQ-AUTHA-004 (existing)    | stale, update | RBAC route gating becomes any-of over `roles[]`; kitchen and manager added           |
| AC1, AC7, AC8 | REQ-AUTHA-005 (new)         | stub          | multiple roles per staff account; union of access, permissions and navigation        |
| AC3, AC5      | REQ-AUTHA-006 (new)         | stub          | role management: checkboxes, grant limits, self and last-super-admin guards, audit   |
| AC4, AC9      | REQ-AUTHA-007 (new)         | stub          | staff role migration and backward compatibility (fallback, public API, old sessions) |
| AC3, AC5      | REQ-SETTINGS-002 (existing) | update        | admin management now includes role editing                                           |

## 2. Scope

In scope: the data model and session shape, the authorization helpers, the behaviour-preserving sweep of every direct role comparison, the two new roles with their defaults, the role-management UI and server action, the audit log entries, the migration script, seed and script updates, the public admins API, and tests. Out of scope: staff alert phone numbers and alert rules (WA-12), refund approval (WA-11), removing the `role` field (a later release), forcing existing sessions to re-login.

### Surface inventory

| Surface                                                                                                                                                                     | Change                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `interfaces/user.interface.ts`, `models/user-model.ts`                                                                                                                      | `StaffRole`; `roles` array; `role` enum gains `kitchen` and `manager` (needed because `role` keeps the highest role as a fallback)          |
| `lib/session.ts`                                                                                                                                                            | `SessionData.roles`; `getRoles`, `hasAnyRole`, `isStaff`, `isAdmin`, `isSuperAdmin`, `isCustomerSession`; `hasPermission` becomes any-of    |
| `lib/permissions.ts`                                                                                                                                                        | duplicate helpers delegate to `lib/session.ts`; `routePermissions` and `dashboardSections` gain the new roles; per-role default permissions |
| `lib/auth-middleware.ts`, `proxy.ts`                                                                                                                                        | `requireRole`, `requireAdmin`, `requireSuperAdmin` and the route gate become any-of                                                         |
| `app/actions/**` (about 11 admin, 5 finance, 4 inventory, 2 tabs, 2 kitchen, 2 auth files) and `app/dashboard/**` (about 30 pages and layouts)                              | direct comparisons replaced by helpers; `'kitchen-staff'` mapped to `kitchen`                                                               |
| `services/admin-service.ts`, `services/user-service.ts`, `lib/scheduled-jobs.ts`                                                                                            | create writes `roles`; role queries match `roles`; new `updateRoles` with guards and audit                                                  |
| `app/actions/auth/admin-login.ts`                                                                                                                                           | writes `session.roles` and the back-compat `session.role`                                                                                   |
| `app/actions/admin/admin-management-actions.ts`, `components/features/admin/create-admin-dialog.tsx`, new edit-roles dialog, `admin-list.tsx`, `admin-actions-dropdown.tsx` | checkboxes, edit-roles flow (does not exist today), role badges                                                                             |
| `components/features/admin/dashboard-nav.tsx`, `role-badge`                                                                                                                 | any-of nav filter; badges for several roles                                                                                                 |
| `app/api/public/admins/**`                                                                                                                                                  | accepts `roles` as well as `role`                                                                                                           |
| `scripts/migrate-staff-roles.ts` (new), `scripts/seed-e2e-admins.ts`, `scripts/seed-test-users.ts`, `scripts/create-super-admin.ts`, `scripts/update-admin-credentials.ts`  | migration; seeds and scripts write `roles`                                                                                                  |
| `interfaces/audit-log.interface.ts`                                                                                                                                         | new action `admin.roles-updated`                                                                                                            |

Issue-text corrections, for the record: the per-role permission defaults live in `lib/permissions.ts` and `interfaces/admin-permissions.interface.ts` (the issue names `app/dashboard/settings/permissions.ts`, which does not exist); there is no edit-admin dialog today, so editing roles is new work.

### Design (what makes this safe)

1. **Two-step sweep.** Step A is mechanical and behaviour-preserving: every `x.includes(session.role)` becomes `hasAnyRole(session, x)` with the same list, so no one gains or loses access. Step B is deliberate: `kitchen` and `manager` are added only where Section "Proposed defaults" says so. This keeps the 261-site change reviewable.
2. **`isAdmin` keeps meaning "csr or above"** (`csr`, `manager`, `admin`, `super-admin`). `kitchen` is not in it. A new `isStaff` means "holds any staff role" and is used only by the dashboard entry gate. A `kitchen`-only member therefore reaches only routes and actions that list `kitchen` explicitly (least privilege).
3. **Fallback makes deploy order irrelevant.** `getRoles` reads `roles`, and falls back to `[role]` for a session, a user document or an API-key record that only has `role`. The code is correct before, during and after the migration, and a rollback leaves `role` intact.
4. **`role` stays one more release** as the highest of `roles` (`super-admin` > `admin` > `manager` > `csr` > `kitchen`), written on create, edit and login.

### Proposed defaults for the new roles (operator to confirm; the issue does not define them)

| Role      | Routes and navigation                                                                                  | Feature permissions                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `kitchen` | `/dashboard/orders` (view and advance status), `/dashboard/kitchen-display`. Lands on kitchen display. | `orderManagement` only. Not the recipes or production pages (those stay behind `kitchenManagement`).      |
| `manager` | everything `csr` has, plus `/dashboard/kitchen-display`, reports and incidents                         | `csr` defaults plus `reportsAndAnalytics` and `incidentsAccess`. No settings, menu, inventory or finance. |

Order actions: `kitchen` may advance order status and add notes (today's `'kitchen-staff'` list); it may not cancel, delete, edit items or record payments. WA-11 will add refund approval to `manager` later.

## 3. Architecture decisions

- **ADR-009 — Staff authorization is any-of over `roles[]` through one helper module, with `role` kept as a read-only fallback for one release.** Proposed by `adr-author`; draft at `docs/ADR/ADR-009-staff-authorization-any-of-roles-array.md`. Operator edits and flips status to _Accepted_ at plan approval.
- **Decision for the operator (D3): role changes and live sessions.** Staff sessions are 7-day cookies that carry a snapshot of the roles, and nothing re-reads the user document per request. A role removed in the new dialog would stay effective in that person's browser until the cookie expires. Options: (A) accept it for this release, show "takes effect at next sign-in (up to 7 days)" in the dialog, record R-053, and file a follow-up issue for a session version check; (B) add a `rolesVersion` on the user, store it in the session, and compare it in `requireRole`, `requireAdmin` and the dashboard layout (one DB read per guarded request). Recommendation: A.
- **Decision for the operator (D4): guard rails** beyond the issue: nobody edits their own roles, an admin cannot change the roles of an `admin` or `super-admin` holder (only a super-admin can), and the last super-admin cannot be demoted. Recommendation: include all three.

## 4. E2E test coverage

New critical spec `e2e/critical/staff-multi-role.spec.ts` (merge-gating, every test tagged `tagTest('REQ-119', n)` with the story id in the title). The full scenario list is in `compliance/evidence/REQ-119/test-plan.md` for operator review before any spec is written. Existing single-role specs must pass unchanged as the regression proof: `csr-order-tab-parity-req109`, `main-category-report-access-control`, `e2e/kitchen/permission-gating`, `e2e/admin/main-category-report-permissions-ui`, `e2e/smoke/*` that log in as csr, admin or super-admin.

E2E authoring is delegated to `e2e-test-engineer`, and seed data to `e2e-test-data`, in Phase 2.

### Test data requirements

Three new seeded staff accounts in `scripts/seed-e2e-admins.ts` with saved logins by `e2e/auth.setup.ts`: `e2e-csr-kitchen` (`roles: [csr, kitchen]`), `e2e-kitchen` (`[kitchen]`), `e2e-manager` (`[manager]`). The role-editing scenarios create their own throwaway staff users inside the spec with unique usernames and delete them afterwards, so shared seeded accounts are never edited. One order fixture for the status-advance scenarios, created and removed in the spec.

## 5. Threat model + security considerations

| Threat (STRIDE)                                            | Surface                | Mitigation                                                                                                                           |
| ---------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Elevation: sweep accidentally widens access                | 261 call sites         | step A is list-for-list equivalent; AC2 guard test; existing role specs run unchanged; negative tests for `kitchen` and customer     |
| Elevation: `kitchen` or `manager` reaches admin surfaces   | new roles              | `isAdmin` excludes `kitchen`; explicit allowlists; negative e2e (US-03.6, US-03.7)                                                   |
| Elevation: an admin grants themselves or others `admin`    | role-management action | server-side checks in the action (not only disabled checkboxes); no self-edit; only super-admin touches admin or super-admin holders |
| Elevation: customer gains staff access via a shared helper | helpers, `proxy.ts`    | `roles` is empty for customers, `getRoles` never maps `customer` to a staff role; AC6 unit and e2e tests                             |
| Tampering: forged or stale `roles` in a cookie             | iron-session           | the cookie is sealed; roles are set only at login from the database; stale-session lag is risk R-053                                 |
| Repudiation: untraceable role change                       | audit log              | AC5 row with actor, target, before, after, added, removed                                                                            |
| Denial of service: last super-admin demoted                | role-management action | refused server-side                                                                                                                  |
| Tampering: migration corrupts roles                        | migration script       | idempotent, dry-run, only sets `roles` when empty, never touches `role`; test with before/after fixtures                             |

### Risk register entries

- **R-052 — Access change from the role-check sweep** — OPEN; residual low × high until the unchanged regression specs and negative tests pass. Opened by `risk-register-keeper`; the operator signs off the residual rating at plan approval.
- **R-053 — Stale staff sessions after a role change** — OPEN; accepted for this release if D3 option A is chosen (medium × medium), with a follow-up issue for a session version check.
- **R-054 — Staff role data migration** — OPEN; low × low (fallback makes deploy order irrelevant; idempotent, dry run).
- **R-055 — Role-grant escalation through the new role-management flow** — OPEN; low × medium (server-side rules, audit).

## 6. Data protection (GDPR Art. 25)

No new personal data. The audit-log rows reference staff user ids, usernames and role names, which are already recorded for other admin actions under the same retention. Access control is strengthened by least privilege (`kitchen` and `manager` get minimal defaults).

## 7. AI / model considerations (EU AI Act Art. 11)

No AI in scope. Implementation is drafted with Claude Code (disclosed on every commit); no model runs in the product.

## 8. Rollback plan

Revert the merge. `roles` is an additive field that old code ignores, and `role` is still written (the highest role), so old code keeps working. A user who holds only `kitchen` or `manager` has that value as their `role`, which old code does not recognise, so it denies them access (fails closed) until the operator sets a legacy role. Sessions issued by the new code carry both `roles` and `role` and are read correctly by either version.

## 9. Verification

Unit and integration tests per the AC table; the AC2 guard test; critical-tier e2e (`staff-multi-role.spec.ts`) plus the unchanged existing role specs; `npm run build`; migration run on UAT in dry-run mode first, then for real, with a count and a before/after access check recorded as evidence; a live UAT check by the operator logging in as a multi-role account.

## 10. Operator tasks (non-code)

1. Confirm the proposed defaults for `kitchen` and `manager` (Section 2), and decisions D3 and D4 (Section 3).
2. Review `compliance/evidence/REQ-119/test-plan.md` (the e2e scenarios) and request changes before implementation starts.
3. Sign off the new risk entries and ADR-009 at plan approval.
4. After the UAT deploy: run `scripts/migrate-staff-roles.ts --dry-run`, then for real; repeat on production after release.
5. UAT reviewer other than the operator (`dual_actor`) records UAT and approves in the portal; a person approves Production.

## 11. Sign-off

- **Plan approved by operator:** approved 2026-11-06 (HIGH-risk checkpoint). The operator replied `PROCEED` after the review checklist, with no amendments to the test plan; recorded as acceptance of the recommended options: D1 defaults for `kitchen` and `manager` as proposed in Section 2, D3 option A (accept stale-session lag, show it in the dialog, follow-up issue), D4 all three guard rails, ADR-009 Accepted, R-052 to R-055 signed off at the stated residual ratings. Test-plan open questions resolved by default: no assertion of the stale-session behaviour (Q2), no Support page added to US-03.1 (Q3).
