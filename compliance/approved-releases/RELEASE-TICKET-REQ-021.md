# Release Ticket: REQ-021 — Crate/Unit Packaging for Inventory Items

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-04-01
**Requirement ID:** REQ-021
**Risk Level:** MEDIUM
**PR:** Included in next develop → main merge

---

## Summary

Adds optional crate size and packaging type fields to inventory items. When set, restock recommendations display crate-rounded order quantities (e.g. "3 crates (72)") and include crate columns in CSV export. Primarily for drinks where ordering is done in crates.

## Known Issue

- Serialization bug discovered during UAT — edit page omitted new fields from inventory data. **Fixed** in `556418c`. Regression tests added in `d88719c`.

## AI Involvement

- **AI Tool Used:** Claude Code (Claude Opus 4.6)
- **AI-Generated Files:** Model, interface, form, action, service, and client updates + unit tests
- **Human Reviewer of AI Code:** Pending (MEDIUM risk)
- **Components Regenerated:** None

## Implementation Details

**Files Modified:**

- `interfaces/inventory.interface.ts` — added crateSize, packagingType
- `models/inventory-model.ts` — added fields to schema
- `components/features/admin/menu-item-form.tsx` — added form fields (create)
- `components/features/admin/menu-item-edit-form.tsx` — added form fields (edit)
- `app/actions/admin/menu-actions.ts` — parse and save in create + update actions
- `app/dashboard/menu/[itemId]/edit/page.tsx` — include fields in serialization (bug fix)
- `services/restock-recommendation-service.ts` — crateSize, packagingType, cratesToOrder on items
- `components/features/inventory/restock-recommendations-client.tsx` — crate breakdown display, CSV columns

**Files Created:**

- `__tests__/inventory/crate-packaging.test.ts` — 18 unit tests (15 original + 3 regression)

**Dependencies Added/Changed:**

- No dependency changes

## Test Evidence

| Test Type        | Count | Passed | Failed | Evidence Location                             |
| ---------------- | ----- | ------ | ------ | --------------------------------------------- |
| Unit (Vitest)    | 18    | 18     | 0      | META-COMPLY portal: wawagardenbar-app/REQ-021 |
| E2E (Playwright) | 10    | 10     | 0      | META-COMPLY portal: wawagardenbar-app/REQ-021 |

## Security Evidence

| Check            | Result          | Evidence Location                                      |
| ---------------- | --------------- | ------------------------------------------------------ |
| SAST             | 0 new findings  | META-COMPLY portal: wawagardenbar-app/REQ-021          |
| Dependency Audit | 0 high/critical | META-COMPLY portal: wawagardenbar-app/REQ-021          |
| Access Control   | PASS            | Git: `compliance/evidence/REQ-021/security-summary.md` |
| Audit Log        | PASS (existing) | Git: `compliance/evidence/REQ-021/security-summary.md` |

## Acceptance Criteria

- [x] crateSize and packagingType fields added to inventory model/interface
- [x] Menu item creation form shows crate fields when trackInventory enabled
- [x] Menu item edit form shows crate fields
- [x] Crate fields save correctly on create and update
- [x] Restock recommendations show crate breakdown when crateSize set
- [x] Suggested reorder qty rounds up to nearest whole crate count
- [x] Items without crateSize show reorder qty as before
- [x] CSV export includes Crate Size and Crates to Order columns
- [x] All existing inventory functionality unchanged
- [x] AI use documented

## Risk Assessment

- Optional fields — no impact on existing inventory documents (MongoDB schemaless)
- No new endpoints or permissions
- No new dependencies
- Serialization bug caught during UAT, fixed with regression tests

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

| Date       | Action                   | Actor  | Notes                                  |
| ---------- | ------------------------ | ------ | -------------------------------------- |
| 2026-04-01 | Requirement created      | Claude | Risk: MEDIUM                           |
| 2026-04-01 | Implementation completed | Claude | Model, forms, service, client          |
| 2026-04-01 | Bug fix — serialization  | Claude | crateSize/packagingType not persisting |
| 2026-04-01 | Regression tests added   | Claude | 3 serialization tests                  |
| 2026-04-01 | Tests passed             | Claude | 18 unit, all gates green               |
