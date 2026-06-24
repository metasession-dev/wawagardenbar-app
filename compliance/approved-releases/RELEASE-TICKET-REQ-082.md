# Release Ticket: REQ-082 — Progressive Category Display

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-06-19
**Requirement ID:** REQ-082
**Risk Level:** MEDIUM
**PR:** [Will be linked when PR is created]

---

## Summary

Replaced the strict drill-down category cascade (Main → Sub → Items) with progressive disclosure across express order, menu management, and inventory management. Items are now visible on landing grouped by main category then sub category. Search always filters items (not categories). Breadcrumb navigation shows "All Categories > Main > Sub" with clickable segments.

## AI Involvement

- **AI Tool Used:** Cascade (Windsurf)
- **AI-Generated Files:** `category-cascade-filter.tsx`, `menu-items-client.tsx`, `inventory-items-client.tsx`, `express/create-order/page.tsx`, `e2e/menu-category-cascade.spec.ts`, `e2e/helpers/express-menu.ts`
- **Human Reviewer of AI Code:** William
- **Components Regenerated:** None

## Implementation Details

**Files Modified:**

- `components/features/admin/category-cascade-filter.tsx` — Rewritten for progressive disclosure: search, breadcrumb, and category buttons always visible together. Category buttons act as toggle filters. Breadcrumb shows "All Categories > Main > Sub" with clickable navigation.
- `components/features/admin/menu-items-client.tsx` — Removed `canBrowseItems` gate. Items grouped by main/sub category with section headers. Sub-category selection shows flat table.
- `components/features/admin/inventory-items-client.tsx` — Same grouped display pattern. Fixed hooks-after-early-return lint error.
- `app/dashboard/orders/express/create-order/page.tsx` — Fetches all items on landing. Grouped card display with category headers. Fixed duplicate price display.
- `e2e/menu-category-cascade.spec.ts` — 3 tests rewritten: no prompt text assertions, items visible on landing, simplified navigation helpers.
- `e2e/helpers/express-menu.ts` — Simplified `revealFirstExpressMenuCard`: items visible on landing, fallback uses toggle filtering.

**Dependencies Added/Changed:**

- No dependency changes

## Test Evidence

| Test Type        | Count | Passed | Failed | Evidence Location               |
| ---------------- | ----- | ------ | ------ | ------------------------------- |
| E2E (Playwright) | 3     | 3      | 0      | CI artifact: playwright-report/ |
| Unit             | 1234  | 1234   | 0      | Local: 1234 passed, 4 skipped   |

## Security Evidence

| Check            | Result          | Evidence Location                                      |
| ---------------- | --------------- | ------------------------------------------------------ |
| SAST             | 0 high/critical | CI artifact (run on push)                              |
| Dependency Audit | 0 high/critical | CI artifact (run on push)                              |
| Access Control   | N/A             | Git: `compliance/evidence/REQ-082/security-summary.md` |
| Audit Log        | N/A             | Git: `compliance/evidence/REQ-082/security-summary.md` |

## Acceptance Criteria

- [x] AC1: All surfaces show items on landing, grouped by main category then sub category
- [x] AC2: Selecting a main category filters to that category, items still grouped by sub category
- [x] AC3: Selecting a sub category filters to that sub category, items shown flat
- [x] AC4: Search always filters items (not categories), scoped to selected category or all
- [x] AC5: Clear breadcrumb navigation showing current category path
- [x] AC6: Back navigation is intuitive (single clear back action)
- [x] AC7: E2E tests updated to reflect progressive disclosure pattern
- [x] AC8: No regression in express order checkout flow
- [x] All E2E tests passing
- [x] TypeScript clean
- [x] SAST clean
- [x] Dependencies clean
- [x] AI use documented

## Risk Assessment

- R-001: Express order performance with all items loaded on landing (mitigation: server-side pagination or lazy loading if needed in future)
- R-002: E2E test breakage across multiple specs (mitigated: updated tests in same commit)

## Post-Deploy Actions

| Type | Script / Command | Target | Required | Notes                           |
| ---- | ---------------- | ------ | -------- | ------------------------------- |
| —    | None             | —      | —        | No post-deploy actions required |

---

## Reviewer Checklist

- [ ] Code matches requirement
- [ ] Test evidence present and all-pass
- [ ] Security evidence present and clean
- [ ] Test scope fully addressed
- [ ] RTM correct status and risk
- [ ] No sensitive data committed
- [ ] No regressions
- [ ] AI code reviewed (if applicable)
- [ ] No hallucinated dependencies
- [ ] Post-deploy actions documented (or confirmed none required)

---

## Audit Trail

| Date       | Action                   | Actor   | Notes                           |
| ---------- | ------------------------ | ------- | ------------------------------- |
| 2026-06-19 | Requirement created      | William | Risk: MEDIUM                    |
| 2026-06-19 | Implementation completed | Cascade | 6 files, +460/-399 lines        |
| 2026-06-19 | AI code reviewed         | William | Fixed lint + syntax errors      |
| 2026-06-19 | Tests passed             | Cascade | tsc clean, 1234 unit tests pass |
| 2026-06-19 | Submitted for review     | TBD     | PR pending                      |
