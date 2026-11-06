---
req: REQ-119
generated_by: e2e-test-engineer
generated_at: 2026-11-06T16:00:00Z
e2e_required: true
spec_path: e2e/critical/staff-multi-role.spec.ts
---

# E2E scope decision — REQ-119

## Outcome

**E2E required — covered.** `e2e/critical/staff-multi-role.spec.ts` (tier: critical, merge-gating) was written and passed locally on an isolated stack (disposable `mongo:7`, dev server from a clean worktree): 9 tests, all green. The four existing single-role specs named in the plan passed unchanged (US-03.12): `csr-order-tab-parity-req109`, `main-category-report-access-control`, `kitchen/permission-gating`, `admin/main-category-report-permissions-ui` (15 tests).

## Detail

- **`e2e_required`:** true
- **Rationale:** N/A, covered below.
- **Spec path(s):** `e2e/critical/staff-multi-role.spec.ts`; helper `e2e/helpers/staff-roles.ts` (throwaway staff accounts, no shared seed changes).
- **ACs covered by e2e:** AC1, AC2, AC3, AC5, AC6, AC7, AC8 (screenshots under `compliance/evidence/REQ-119/screenshots/`).
- **ACs covered by unit tests only:** AC4 (migration planner, idempotence, no `role` rewrite; `__tests__/scripts/migrate-staff-roles.test.ts`) and AC9 (public admins API, pre-release session fallback; `__tests__/api/public-admins-roles.test.ts`, `__tests__/lib/session-roles.test.ts`). Neither has a UI surface; the migration is an operator script run on UAT then production.
- **Server-side rules** (admin cannot grant or touch admin and super-admin holders, no self-edit, last super-admin, audit row) are unit-tested in `__tests__/services/admin-service.roles.test.ts`; an admin has no UI route to those actions (US-03.2 e2e).

## Operator sign-off

I have reviewed the e2e-scope verdict above and confirm it matches the actual scope of this REQ's diff.

**Reviewer:** PENDING (operator)
**Date:** PENDING
