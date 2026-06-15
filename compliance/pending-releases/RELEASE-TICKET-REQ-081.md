# Release Ticket: REQ-081 - Category cascade selection across admin item workflows

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-06-15
**Requirement ID:** REQ-081
**Risk Level:** MEDIUM
**GitHub Issue:** [#387](https://github.com/metasession-dev/wawagardenbar-app/issues/387)
**Integration PR:** pending
**DevAudit Release:** `REQ-081`

---

## Summary

REQ-081 changes staff/admin item discovery so express create order, menu management, and sellable inventory selection start from Main Menu Categories and then narrow to sub-categories before item selection.

## AI Involvement

- **AI Tool Used:** OpenAI Codex
- **AI-Generated Files:** express-order/admin cascade implementation, focused automated tests, and compliance evidence files
- **Human Reviewer of AI Code:** pending PR review
- **Components Regenerated:** none

## Implementation Details

**Files Modified:**

- `app/dashboard/orders/express/create-order/page.tsx` - express item selection now uses the main-category to sub-category cascade with back navigation and cart preservation.
- `app/actions/admin/express-actions.ts` - express search accepts `mainCategory` and category loading returns the grouped registry-backed envelope.
- `components/features/admin/category-cascade-filter.tsx` - shared compact cascade selector for admin surfaces.
- `app/dashboard/menu/page.tsx` and `components/features/admin/menu-items-client.tsx` - menu management now filters main -> sub before showing rows.
- `app/dashboard/inventory/page.tsx` and `components/features/admin/inventory-items-client.tsx` - sellable inventory now filters main -> sub.
- `components/features/admin/menu-item-form.tsx` and `components/features/admin/menu-item-edit-form.tsx` - stale sub-category values are cleared when the main category changes.
- `__tests__/services/category-service.kind-filter.test.ts` and `e2e/menu-category-cascade.spec.ts` - focused automated coverage for the new cascade behavior.
- `docs/SRS.md`, `compliance/RTM.md`, `compliance/evidence/REQ-081/*` - requirement and evidence updates.

**Dependencies Added/Changed:**

- No dependency changes in REQ-081.

## Test Evidence

| Test Type                       |                                        Count | Passed | Failed | Evidence Location                                       |
| ------------------------------- | -------------------------------------------: | -----: | -----: | ------------------------------------------------------- |
| Focused unit/integration        | 2 REQ-081 assertions added to existing suite |   PASS |      0 | `compliance/evidence/REQ-081/test-execution-summary.md` |
| E2E (CI)                        |                              branch CI suite |   PASS |      0 | CI run 27546511660 and DevAudit release evidence        |
| TypeScript                      |                            branch CI + local |   PASS |      0 | CI run 27546511660 and local verification               |
| SAST / Dependency Audit / Build |                              branch CI gates |   PASS |      0 | CI run 27546511660 and DevAudit release evidence        |

## Security Evidence

| Check            | Result    | Evidence Location                                 |
| ---------------- | --------- | ------------------------------------------------- |
| SAST             | PASS      | CI and DevAudit release evidence                  |
| Dependency Audit | PASS      | CI and DevAudit release evidence                  |
| Access Control   | Unchanged | `compliance/evidence/REQ-081/security-summary.md` |
| Audit Log        | Unchanged | `compliance/evidence/REQ-081/security-summary.md` |

## Acceptance Criteria

- [x] Express order starts at main categories before sub-categories/items.
- [x] Users can navigate back to main/sub-category levels without losing express cart context.
- [x] Menu management uses the same cascade before showing rows.
- [x] Sellable inventory uses the same cascade before showing rows.
- [x] Menu create/edit forms clear invalid sub-category selections.
- [x] Category registry remains the source of truth and permissions remain unchanged.
- [x] CI TypeScript, SAST, dependency audit, E2E, build, and evidence upload passed.
- [x] AI use documented.

## Risk Assessment

Medium risk because the change affects shared admin/staff item-selection behavior across multiple workflows. Risk is bounded by keeping auth/RBAC unchanged, using the existing category registry as the source of truth, preserving express cart state during back navigation, and passing the full CI gate suite on run 27546511660.

## Post-Deploy Actions

| Type | Script / Command | Target | Required | Notes                                         |
| ---- | ---------------- | ------ | -------- | --------------------------------------------- |
| -    | None             | -      | No       | No migration or post-deploy command required. |

## Reviewer Checklist

- [ ] Code matches requirement.
- [ ] Test evidence present and all-pass.
- [ ] Security evidence present and clean.
- [ ] Test scope fully addressed.
- [ ] RTM correct status and risk.
- [ ] No sensitive data committed.
- [ ] No regressions.
- [ ] AI code reviewed.
- [ ] No hallucinated dependencies.
- [ ] Post-deploy actions documented or confirmed none required.

## Audit Trail

| Date       | Action                   | Actor                         | Notes                                                        |
| ---------- | ------------------------ | ----------------------------- | ------------------------------------------------------------ |
| 2026-06-15 | Requirement created      | OpenAI Codex                  | REQ-081 planned from issue #387.                             |
| 2026-06-15 | Implementation completed | OpenAI Codex                  | Category cascade implementation committed as `b7c1d29`.      |
| 2026-06-15 | Tests passed             | OpenAI Codex / GitHub Actions | CI run 27546511660 passed Quality Gates and Upload Evidence. |
| 2026-06-15 | Submitted for review     | pending                       | Integration PR to `develop` not yet opened.                  |
