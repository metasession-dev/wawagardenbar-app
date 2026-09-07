# Release Ticket: REQ-030 — E2E selector maintenance fix

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-09-07
**Requirement ID:** REQ-030
**Risk Level:** LOW
**PR:** [#709](https://github.com/metasession-dev/wawagardenbar-app/pull/709)

- **Absorbed predecessor releases:** REQ-102

## Summary

REQ-102's new "Edit All" button on `/dashboard/menu` broadened what
`getByRole('link'|'button', { name: /edit/i })` matches on that page,
so two pre-existing specs (`e2e/menu-customization-inventory.spec.ts`,
`e2e/menu-customization-picker.spec.ts`) started clicking it instead of
a real per-item edit link — breaking `E2E Regression` on `main` after
REQ-102's release PR (#699) merged and blocking the DevAudit portal's
"Approve Production and Mark Released" step for that already-live
release. This ticket carries only the test-selector fix; no application
behavior changes.

`REQ-102` is listed as an absorbed predecessor because it is already
fully deployed to production (Railway, commit `5da6667`, confirmed live
via `/api/health`) via PR #699 — this release does not re-introduce or
duplicate that work, it only fixes test infrastructure that regressed
because of it.

## Implementation details

- `e2e/menu-customization-inventory.spec.ts` — replaced the broad
  `/edit/i` link/button locator with opening the row's kebab dropdown
  ("Open menu" → "Edit" menuitem), the real per-item edit control per
  `components/features/admin/menu-items-table.tsx`. Also fixed a
  strict-mode violation surfaced once navigation correctly reaches an
  item's edit screen (`/Customization Options/i` matched both the
  section heading and the "No customization options yet" empty-state
  text) by switching to an exact-text match.
- `e2e/menu-customization-picker.spec.ts` — same selector fix for its
  AC14 admin-builder test.
- Added `tagTest()`/`evidenceShot()` calls to both fixed tests — they
  predate that convention and had none, which the mandatory-evidence CI
  gate treats as a failure even when the underlying tests pass.

## Verification

- Reproduced the exact `main` failure locally, root-caused to the DOM
  order collision with REQ-102's new button.
- Both fixed specs pass locally (5/5 non-skipped tests) against a
  disposable local stack matching CI's recipe.
- `npx tsc --noEmit` and `npx eslint` clean.
- CI (`PR #709`): Quality Gates pass, in-scope E2E pass (including the
  evidence-upload step, which failed before the tagTest/evidenceShot
  follow-up commit).

## Operator action

None. No env vars, migrations, or manual steps required.
