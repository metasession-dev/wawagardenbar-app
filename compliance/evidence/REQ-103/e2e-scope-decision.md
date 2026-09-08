---
req: REQ-103
generated_by: e2e-test-engineer
generated_at: 2026-09-08T20:44:00Z
e2e_required: true
spec_path: e2e/admin/menu-edit-all.spec.ts, e2e/admin/pricing-windows.spec.ts
---

# E2E scope decision — REQ-103

## Outcome

**E2E required — covered.** Existing specs `e2e/admin/menu-edit-all.spec.ts` and `e2e/admin/pricing-windows.spec.ts` extended with a `menuManagement`-permitted (non-super-admin) admin fixture and a negative (no-permission) fixture.

## Detail

- **`e2e_required`:** `true` — this REQ's fix is exercised through UI save flows (Edit All row save, Pricing Window save).
- **Rationale:** N/A — covered below.
- **Spec path(s):**
  - `e2e/admin/menu-edit-all.spec.ts` — new `adminTest` describe block (AC1/AC2), new top-level `csrTest` (AC5).
  - `e2e/admin/pricing-windows.spec.ts` — new `adminTest` (AC3), new top-level `csrTest` (AC5).
- **ACs covered:**
  - AC1, AC2 — `e2e/admin/menu-edit-all.spec.ts` (`adminTest` describe, using `.auth/admin.json` — `e2e-admin`, role `admin` + `permissions.menuManagement: true`).
  - AC3 — `e2e/admin/pricing-windows.spec.ts` (`adminTest`).
  - AC5 (page-level defense-in-depth) — both spec files' `csrTest` (using `.auth/csr.json` — `e2e-csr`, `permissions.menuManagement: false`), confirming the pre-existing, unchanged `routePermissions['/dashboard/menu']` gate in `proxy.ts` still redirects a non-permitted session to `/dashboard/forbidden`. **AC5's actual save-action-level negative behaviour is proven by unit tests** (`__tests__/actions/admin/menu-actions.edit-all-row.test.ts`, `__tests__/actions/admin/price-management-actions.test.ts`, `__tests__/actions/admin/pricing-windows-action.test.ts`), since a session blocked at the page level never reaches the save form to exercise the action gate directly.
  - AC4 — covered by unit tests only (`__tests__/actions/admin/price-management-actions.test.ts`); no dedicated e2e negative/positive pairing was added beyond the pre-existing `e2e/admin/price-management-triple-price.spec.ts` (super-admin path, unchanged, re-verified green in the regression run below).
  - AC6 — unit-only (`__tests__/actions/admin/pricing-windows-action.test.ts`), not a user-observable UI journey per the plan's own AC-writing guidance.

## Test execution

- Focused new-spec run (both modified files, `--workers=1` to avoid dev-server contention): **15/15 passed**.
- Scoped adjacent-regression run (areas sharing code with this REQ — admin permissions UI, price management, authenticated dashboard smoke, CSR RBAC UAT, RBAC smoke — `--workers=1`): **91/91 passed**, including every pre-existing REQ-102 test in the touched files.
- A full-suite (300+ spec) regression attempt was interrupted mid-run by an OOM kill caused by a concurrent, unrelated Claude Code session building/testing on the same shared machine (visible in `ps aux` as a separate `issue-685-devaudit-update` process) — not a failure of this REQ's changes. Of the ~358 specs that completed before the kill, all passed except one pre-existing failure in `e2e/kitchen/inventory-crud.spec.ts` (REQ-037, kitchen ingredient restore) — an unrelated area with no code-path overlap with this REQ's diff (`lib/auth-middleware.ts`, `app/actions/admin/menu-actions.ts`, `app/actions/admin/price-management-actions.ts`, `components/features/admin/pricing-windows-form.tsx`).
- The project's CI runs on a dedicated self-hosted runner (`sdlc-config.json: "runner": "self-hosted"`) without this resource contention; the full regression pack runs there per the project's existing 3-tier E2E gating model.

## Operator sign-off

I have reviewed the e2e-scope verdict above and confirm it matches the actual scope of this REQ's diff.

**Reviewer:** REPLACE — operator name
**Date:** REPLACE — YYYY-MM-DD
