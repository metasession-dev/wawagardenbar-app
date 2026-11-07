# Test Execution Summary — REQ-119

**Date:** 2026-11-06
**Implementation branch:** `feat/REQ-119-multi-role-staff` (solo release, no bundle; not yet pushed when this was written)
**Risk class:** HIGH (staff authorization / RBAC, new roles, privileged role management, staff data migration)

**CI as of:** none yet — the integration PR has not been opened. Regenerate this summary after its CI, and the release PR's CI, reach a terminal state.

## Test design

**Layers planned:** unit, UI end-to-end (new critical spec plus the existing single-role specs as the regression proof), type-check, lint, production build, dependency gate. Visual regression is not configured.

**Layers covered:** unit ✓; UI E2E ✓ (new critical spec, 9 tests; full `critical` tier); type-check ✓; lint ✓; build ✓; dependency gate ✓.

**Exemptions:**

- **AC4 (migration) and AC9 (public API, old-session fallback) are unit-only:** the migration is an operator script with no UI surface, and the API and fallback are pure logic. Proved in `__tests__/scripts/migrate-staff-roles.test.ts`, `__tests__/api/public-admins-roles.test.ts`, `__tests__/lib/session-roles.test.ts`.
- **Server-side role-management rules are unit-level:** an admin acting on a super-admin holder, a self-edit and demoting the last super-admin are each rejected in `AdminService.updateRoles` (19 tests in `admin-service.roles.test.ts`). An admin has no UI route to these actions (the admins page is super-admin only), so the e2e proves the page refusal instead (plan deviation 2).
- **Disabled `admin` and `super-admin` checkboxes for a non-super-admin actor** are proved at unit level (`__tests__/components/role-checkboxes.test.ts`), for the same reason.
- **Live check on UAT (operator evidence):** signing in as a multi-role and a kitchen-only account after the UAT deploy is an operator step.
- **Visual regression (`NOT_NEEDED`):** no visual-regression tooling is configured.

**Skill invocation:** `e2e-test-engineer` was invoked in Phase 2 (2026-11-06, before any `e2e/**` file was edited) and authored `e2e/critical/staff-multi-role.spec.ts` and `e2e/helpers/staff-roles.ts`. `requirements-aligner`, `adr-author` and `risk-register-keeper` were invoked at Stage 1 and Stage 3.

## Gate results

| Gate                             | Result | Details                                                                                                                                                          |
| -------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency audit                 | PASS   | `scripts/evaluate-npm-audit.sh`: `0 accepted, 0 unresolved`. `package.json` and `package-lock.json` unchanged                                                    |
| TypeScript                       | PASS   | `npx tsc --noEmit`: 0 errors                                                                                                                                     |
| ESLint                           | PASS   | 0 errors; pre-existing warnings only                                                                                                                             |
| Production build                 | PASS   | `npm run build` completed                                                                                                                                        |
| Unit + integration               | PASS   | Full suite: 1924 passed, 4 skipped (201 files passed, 1 skipped)                                                                                                 |
| E2E (new critical spec)          | PASS   | `staff-multi-role.spec.ts`: 9/9                                                                                                                                  |
| E2E (existing single-role specs) | PASS   | Unchanged: `csr-order-tab-parity-req109`, `main-category-report-access-control`, `kitchen/permission-gating`, `admin/main-category-report-permissions-ui`: 15/15 |
| E2E (full `critical` tier)       | PASS   | 346 passed, 1 failed, 0 skipped (8.1 min, default workers); the one failure is a known flake that passes in isolation (see triage)                               |

## Test executions

| Source  | SDLC stage       | Execution | Kind                                                        | Outcome | Workflow / run                                                                                      |
| ------- | ---------------- | --------- | ----------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| REQ-119 | 2 implement/test | #1        | unit                                                        | passed  | Local Vitest, full suite: 1924 passed, 4 skipped                                                    |
| REQ-119 | 2 implement/test | #2        | e2e (new spec, first run)                                   | failed  | 10 passed, 2 failed: forbidden-page redirect loop, order-number collision in the spec's own fixture |
| REQ-119 | 2 implement/test | #3        | e2e (new spec, after fixes)                                 | passed  | 9/9 (plus 3 auth setup)                                                                             |
| REQ-119 | 2 implement/test | #4        | e2e (existing single-role specs)                            | passed  | 15/15, unchanged, isolated worktree server and disposable `mongo:7`                                 |
| REQ-119 | 2 implement/test | #5        | e2e (full `critical`, default workers)                      | failed  | 346 passed, 1 failed (see triage)                                                                   |
| REQ-119 | 2 implement/test | #6        | e2e (re-run of the failed spec file, with its dependencies) | passed  | 59 passed, 0 failed                                                                                 |

The portal's first-class execution read model was not queried (no `DEVAUDIT_API_KEY` in this session). CI records the authoritative executions.

## E2E failures & triage

| Spec / check                                                                                | Source        | Classification                | Evidence                                                                                                                                                                                                                                      | Disposition | Reference                                                                        |
| ------------------------------------------------------------------------------------------- | ------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------- |
| `staff-multi-role` US-03.6 (kitchen-only refused on `/dashboard/settings`)                  | local exec #2 | application defect (this REQ) | `ERR_TOO_MANY_REDIRECTS`: `proxy.ts` sent a kitchen-only member to `/dashboard/forbidden`, which was itself not allowed for kitchen. Fixed by allowlisting `/dashboard/forbidden` for every staff role; pinned in `permissions-roles.test.ts` | Fix         | #965 (plan deviation 6)                                                          |
| `staff-multi-role` US-03.6 fixture (`orderNumber` duplicate key)                            | local exec #2 | test bug                      | The spec truncated its own order number; collided on the unique index. Fixed to a unique value                                                                                                                                                | Fix         | #965                                                                             |
| `staff-multi-role` US-03.8 (second sign-in found no login form)                             | local exec #2 | test bug                      | `browser.newContext()` inside a test with a saved `storageState` inherits that login, so the member form never showed. `loginAsStaff` now passes an empty storage state                                                                       | Fix         | #965                                                                             |
| `daily-report-business-date-selection` (REQ-095, export period includes both boundary days) | local exec #5 | flake                         | Passes in isolation together with its aggregate dependencies (exec #6: 59 passed); not touched by this REQ; the same spec flaked in REQ-117's run and was triaged there as a flake                                                            | Fix         | #979 (consolidated reliability tracker; same spec triaged as a flake in REQ-117) |

## Test plan coverage

All 9 ACs are covered as described in `compliance/evidence/REQ-119/test-plan.md` and `test-scope.md`:

- **Unit (new):** `session-roles`, `no-direct-role-checks`, `admin-service.roles`, `migrate-staff-roles`, `public-admins-roles`, `role-checkboxes`, `audit-log-roles-action`; updated: `permissions-roles`, `auth-middleware.has-session-permission`; six existing action/API tests now keep the real role helpers in their `@/lib/session` mock.
- **E2E:** `e2e/critical/staff-multi-role.spec.ts` (AC1 to AC3, AC5 to AC8), with screenshots under `compliance/evidence/REQ-119/screenshots/`.
- **Operator evidence, not yet recorded:** the migration dry run and run on UAT and production; the live multi-role and kitchen-only sign-in on UAT.
- **Plan deviations:** recorded in `compliance/plans/REQ-119/implementation-plan.md` (nine items) and at the end of `test-plan.md`.

## Accepted skips

None.
