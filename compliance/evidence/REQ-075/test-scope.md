# REQ-075 — Test scope

## In scope (this PR)

### Production code

- `interfaces/main-category.interface.ts` — registry config + seed + reserved set + slug regex (NEW)
- `interfaces/menu-item.interface.ts` — `MenuMainCategory` widened to `string`
- `interfaces/menu-settings.interface.ts` — `IMenuSettings` restructured to `Record<string, IMenuCategoryConfig[]>`
- `interfaces/inventory-snapshot.interface.ts` — `mainCategory: 'food' | 'drinks'` → `string`
- `models/menu-item-model.ts` — Mongoose enum constraint removed
- `models/inventory-snapshot-model.ts` — Mongoose enum constraint removed
- `services/main-category-service.ts` — CRUD + reference-counted-delete + sequential-rename (NEW)
- `services/system-settings-service.ts` — `getMainCategories` + `updateMainCategories`
- `services/category-service.ts` — `getCategories` envelope rewritten + `getItemsByMainCategory` signature
- `services/financial-report-service.ts` — `other` aggregate bucket + `console.warn` on non-food/drink slugs
- `services/staff-pot-service.ts` — `console.warn` skip for non-food/drink in loss aggregation
- `services/inventory-snapshot-service.ts` — `mainCategory: string` across 3 method signatures
- `services/restock-recommendation-service.ts` — `mainCategory: string` on params + result type
- `app/dashboard/settings/actions.ts` — 6 new server actions (`createMainCategoryAction`, `updateMainCategoryAction`, `renameMainCategoryAction`, `reorderMainCategoriesAction`, `deleteMainCategoryAction`, `getMainCategoryReferenceCountAction`, `getMainCategoriesAction`)
- `app/dashboard/settings/page.tsx` — mount `MainCategoriesForm` above `MenuCategoriesForm`, pass registry to both
- `app/dashboard/menu/new/page.tsx` + `[itemId]/edit/page.tsx` — pass `mainCategories` prop
- `app/dashboard/menu/page.tsx` — per-main item counts dynamic
- `app/api/public/menu/route.ts` — free-form `mainCategory` querystring slug
- `app/api/public/menu/categories/route.ts` — BREAKING envelope + amended docstring
- `app/api/public/sales/summary/route.ts` — `console.warn` for non-food/drink (food bucket back-compat)
- `app/actions/admin/menu-actions.ts` — free-form `mainCategory` assignment
- `app/actions/admin/kitchen-ingredient-actions.ts` — REQ-075 note (inert `food` default for hidden docs)
- `app/actions/admin/staff-pot-actions.ts` — REQ-075 note (eligibility gate unchanged)
- `app/actions/inventory/snapshot-actions.ts` — `mainCategory: string` on 3 action signatures
- `app/actions/inventory/restock-recommendation-actions.ts` — new `AvailableCategoriesEnvelope` return type
- `components/features/admin/main-categories-form.tsx` — settings card (NEW)
- `components/features/admin/menu-categories-form.tsx` — dynamic-tabbed over registry
- `components/features/admin/menu-item-form.tsx` + `menu-item-edit-form.tsx` — registry-driven Select + portions gate
- `components/features/admin/menu-items-table.tsx` — REQ-075 note (2-tone palette back-compat)
- `components/features/menu/category-navigation.tsx` — dynamic main-tabs + sub-categories
- `components/features/menu/menu-content.tsx` — new prop type
- `components/features/menu/menu-item.tsx` + `menu-item-detail-modal.tsx` — drop `mainCategory === 'food'` gates
- `components/features/inventory/restock-recommendations-client.tsx` — driven by `getAvailableCategoriesAction` envelope
- `components/features/inventory/inventory-summary-client.tsx` + `snapshots-list-client.tsx` + `previous-inventory-updates-client.tsx` — registry-driven filter Selects + Badge labels

### Unit tests

- `__tests__/services/main-category-service.test.ts` — 19 cases (NEW)
  - list / get (3)
  - create (5 — auto-derive slug + 4 guards)
  - update (2)
  - reorder (2)
  - rename (4 — including 3-step cascade)
  - delete (3 — blocked + blocked + orphan)
- `__tests__/services/category-service.kind-filter.test.ts` — mock extended with `getMainCategories` seed

### E2E specs

- `e2e/admin/main-categories-config.spec.ts` — service-layer contract pin (NEW, 4 tests: create / rename / delete-blocked / delete-allowed)
- `e2e/api/public-contracts-authenticated.spec.ts` — REQ-071 categories envelope assertion updated to the REQ-075 shape
- `e2e/requirements-verification.spec.ts` — Section 13 REQ-MENUMGT-005 settings-route auth stub

## SRS items covered

| SRS ID                  | Covered by                                | Status                                 |
| ----------------------- | ----------------------------------------- | -------------------------------------- |
| REQ-MENUMGT-005 (NEW)   | unit + new E2E spec + settings-route stub | **Pinned**                             |
| REQ-API-006 (AMENDED)   | updated REQ-071 envelope test             | **Pinned** against the new envelope    |
| REQ-071 source-of-truth | same                                      | **Re-pinned** against the new envelope |

## Out of scope (deferred to follow-up REQs)

| Item                                                                                                      | Why deferred                                                                                                      |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Per-main icon plumbing on customer surfaces                                                               | Registry stores `icon`; surfacing it on `menu-item.tsx` needs a small `MenuItemWithStock` enrichment. Future REQ. |
| Per-main badge colour palette                                                                             | Same — needs a `colour` field on `IMainCategoryConfig` + colour utility. Future REQ.                              |
| Drag-and-drop reorder via dnd-kit                                                                         | V1 uses up/down buttons; HTML5 drag-and-drop is a future polish REQ.                                              |
| Extending staff-pot eligibility gate to non-food/drink categories                                         | Needs explicit operator decision per category. Intentionally left as-is.                                          |
| Backporting old `{food, drinks}` envelope behind a versioned route                                        | Operator opted into the breaking change. No `/api/public/v1/menu/categories` shim.                                |
| Backfilling `MenuItem.mainCategory` to a renamed slug for documents created BEFORE the registry was added | The rename operation handles this in-place; no backfill needed.                                                   |

## Manual UAT — required this cycle

**No env-var setup, no migration.** The default registry seed mirrors the historical `food` + `drinks` pair so existing documents continue to work without operator action. The operator's manual walkthrough is:

1. Open `/dashboard/settings`, scroll to "Main Categories".
2. Confirm `food` + `drinks` rows render with labels Food / Drinks.
3. Add a third main category (e.g. "Snacks"). Reload `/menu`. Confirm a "Snacks" tab appears.
4. Disable the third main. Reload `/menu`. Confirm the tab disappears.
5. Attempt to delete `food`. Confirm the action errors with a reference-count message.
6. Rename `food` → `meals`. Confirm `/menu` tab label changes to "Meals" and every menu item under it still renders.
7. Rename back to `food` to leave state matching the seed.

Operator confirms the BREAKING contract change in any external menu-categories integration before merging the release PR.
