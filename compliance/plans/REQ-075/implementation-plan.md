# REQ-075 — Configurable main categories (#322)

## Context

`MenuItem.mainCategory` shipped as a hardcoded `'food' | 'drinks'` union, baked into 27+ call sites across services, components, actions, and the public API. Issue [#322](https://github.com/metasession-dev/wawagardenbar-app/issues/322) asks for admin-configurable main categories from `/dashboard/settings`:

- Rename existing entries (cascades to every `MenuItem.mainCategory` row + per-main `'menu-categories'` sub-category keys).
- Add new entries with kebab-case slug derivation + reserved/duplicate/format guards.
- Delete entries, blocked while any `MenuItem` or sub-category still references the slug.
- Disable (soft-hide) entries without removing.

The pre-REQ-075 hardcoded pair (`food`, `drinks`) ships as the default registry seed so existing documents carry through unchanged.

## Risk classification

**MEDIUM** — touches the most-referenced field on `MenuItem`, plus a BREAKING change to the public `/api/public/menu/categories` envelope (REQ-071 spec amendment required in the same release). Risk is bounded by: the default seed preserves the legacy slug pair; the Mongoose enum is dropped but the application layer holds slug validation via `MainCategoryService`; the schema change is forward-compatible (existing rows match the seed slugs); the rename operation is idempotent on partial failure.

Operator approved at plan review (this file). 4 high-stakes decisions confirmed pre-coding:

1. Drop Mongoose enum on `MenuItem.mainCategory` — yes.
2. "Other" aggregate in `financial-report-service.ts` with logged `console.warn` for non-food/non-drinks slugs — yes.
3. Breaking API contract (envelope change) + same-PR REQ-071 SRS amendment — yes.
4. `[REQ-075]` square-brackets in every commit subject (CI release attribution) — yes.

## Architecture

### Registry shape (`interfaces/main-category.interface.ts`)

```ts
interface IMainCategoryConfig {
  readonly slug: string; // immutable; rename uses a distinct operation
  label: string;
  order: number;
  isEnabled: boolean;
  icon?: string;
  portionsEnabled?: boolean;
}
```

Persisted under SystemSettings key `'main-categories'`. Default seed mirrors the legacy `food` + `drinks` pair so existing docs continue to match.

- Slug regex: `/^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/` (max 32 chars).
- Reserved slugs: `all`, `other`, `unknown`.

### Service (`services/main-category-service.ts`)

CRUD + reference-counted delete + sequential rename:

- `list`, `get`, `referenceCount` — reads.
- `create({ label, slug?, icon?, portionsEnabled? }, adminUserId)` — auto-derives kebab slug from label when not provided; appends `order = max + 1`.
- `update(slug, patch, adminUserId)` — patches mutable fields (`slug` is immutable).
- `reorder(slugs[], adminUserId)` — sets `order` from array index; refuses on missing/extra slugs.
- `rename(oldSlug, newSlug, adminUserId)` — sequential 3-step:
  1. `MenuItemModel.updateMany({ mainCategory: oldSlug }, { $set: { mainCategory: newSlug } })`
  2. Relocate the sub-category list under `'menu-categories'` from `oldSlug` key to `newSlug` key.
  3. Rewrite the registry entry's slug in place.
     Standalone Mongo (no `withTransaction`) — matches `services/production-service.ts` precedent. Idempotent on partial failure.
- `delete(slug, adminUserId)` — refuses while `menuItems > 0 || subCategories > 0` with a reference-count message.

### Server actions (`app/dashboard/settings/actions.ts`)

`createMainCategoryAction`, `updateMainCategoryAction`, `renameMainCategoryAction`, `reorderMainCategoriesAction`, `deleteMainCategoryAction`, `getMainCategoryReferenceCountAction`, `getMainCategoriesAction`. All mutations super-admin gated via `requireSuperAdmin`; the read action is unauthenticated for parity with the public `/api/public/menu/categories` endpoint and to keep admin client filters simple.

### Settings UI

`components/features/admin/main-categories-form.tsx` — new card mounted above the existing `MenuCategoriesForm`. Per-row inline label edit, enabled toggle, rename slug prompt, reorder buttons, delete with reference-count check. New entry sub-form below the list.

`MenuCategoriesForm` is now dynamic-tabbed over the registry instead of two hardcoded `food` / `drinks` tabs — when a new main category appears in the registry, a corresponding sub-categories tab appears automatically.

### Schema relaxation

- `interfaces/menu-item.interface.ts`: `MenuMainCategory` becomes `string`.
- `models/menu-item-model.ts`: `enum: ['drinks', 'food']` constraint removed.
- `interfaces/menu-settings.interface.ts`: `IMenuSettings` restructured from `{ food: [], drinks: [] }` to `Record<string, IMenuCategoryConfig[]>`. Default seed keeps the historical `food` and `drinks` keys.
- `interfaces/inventory-snapshot.interface.ts`: `mainCategory: 'food' | 'drinks'` → `string`. Matching enum constraint on `models/inventory-snapshot-model.ts` removed.

### Public API (BREAKING)

`GET /api/public/menu/categories`:

```jsonc
// Before (REQ-071)
{ "success": true, "data": { "drinks": [...], "food": [...] }, "meta": {...} }

// After (REQ-075)
{
  "success": true,
  "data": {
    "mainCategories": [
      { "slug": "food", "label": "Food", "order": 0, "subCategories": [...] },
      { "slug": "drinks", "label": "Drinks", "order": 1, "subCategories": [...] }
    ]
  },
  "meta": {...}
}
```

REQ-071 spec test in `e2e/api/public-contracts-authenticated.spec.ts` updated to assert the new envelope. REQ-API-006 and REQ-071's SRS bullet amended in `docs/SRS.md` in the same PR.

### Financial reports

`services/financial-report-service.ts` keeps explicit `food` + `drink` buckets for back-compat with downstream dashboards, and adds an `other` aggregate bucket. Items with `mainCategory` outside the legacy pair land in `other` with a `console.warn`. Both daily-summary and date-range generators get the new bucket + matching gross-profit accounting.

`services/staff-pot-service.ts` continues to require `food` + `drink` snapshots only for the staff-pot eligibility gate — extending the gate to new main categories is out of scope (would need explicit operator decision per category). Items in other slugs are skipped with a `console.warn`.

`app/api/public/sales/summary/route.ts` keeps the 2-bucket envelope for back-compat; items outside the legacy pair aggregate into food with a `console.warn`.

### Components updated to consume the registry

Admin forms (`menu-item-form`, `menu-item-edit-form`) and the customer menu (`category-navigation`, `menu-item`, `menu-item-detail-modal`) all read the registry now. The portion-options gate moved off the `mainCategory === 'food'` check onto the registry's `portionsEnabled` flag at form-edit time (admin); customer-facing pages just respect the item's stored `portionOptions` flags.

Three inventory client components (`inventory-summary-client`, `snapshots-list-client`, `previous-inventory-updates-client`, `restock-recommendations-client`) load the registry on mount via `getMainCategoriesAction` and render Select/Badge options dynamically.

## Tests

- 19 new vitest cases at `__tests__/services/main-category-service.test.ts` (list/get + create + update + reorder + rename + delete).
- New E2E spec `e2e/admin/main-categories-config.spec.ts` (REQ-MENUMGT-005) — service-layer contract pin for create / rename / delete-blocked / delete-allowed against UAT Mongo.
- `e2e/api/public-contracts-authenticated.spec.ts` REQ-071 envelope assertion updated.
- `e2e/requirements-verification.spec.ts` gains a REQ-MENUMGT-005 settings-route auth stub under Section 13.
- Existing test pack: 1154 / 4 skipped / 0 failing (unchanged from REQ-074 baseline).

## Critical files

| Type      | Path                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------ |
| New       | `interfaces/main-category.interface.ts`                                                                |
| New       | `services/main-category-service.ts`                                                                    |
| New       | `components/features/admin/main-categories-form.tsx`                                                   |
| New       | `e2e/admin/main-categories-config.spec.ts`                                                             |
| New tests | `__tests__/services/main-category-service.test.ts`                                                     |
| Edit      | `services/system-settings-service.ts` (getMainCategories + updateMainCategories)                       |
| Edit      | `services/category-service.ts` (getCategories envelope; getItemsByMainCategory signature)              |
| Edit      | `services/financial-report-service.ts` (other bucket + console.warn)                                   |
| Edit      | `services/staff-pot-service.ts` (console.warn skip for non-food/drink)                                 |
| Edit      | `services/inventory-snapshot-service.ts` (mainCategory: string)                                        |
| Edit      | `services/restock-recommendation-service.ts` (mainCategory: string)                                    |
| Edit      | `app/dashboard/settings/actions.ts` (createMainCategoryAction et al.)                                  |
| Edit      | `app/dashboard/settings/page.tsx` (MainCategoriesForm slot)                                            |
| Edit      | `app/dashboard/menu/new/page.tsx` + `[itemId]/edit/page.tsx` (mainCategories prop)                     |
| Edit      | `app/dashboard/menu/page.tsx` (per-main stats)                                                         |
| Edit      | `app/api/public/menu/route.ts` + `/categories/route.ts` (free-form slug + new envelope)                |
| Edit      | `app/api/public/sales/summary/route.ts` (console.warn)                                                 |
| Edit      | `app/actions/admin/menu-actions.ts` (free-form assignment)                                             |
| Edit      | `app/actions/admin/kitchen-ingredient-actions.ts` (note)                                               |
| Edit      | `app/actions/admin/staff-pot-actions.ts` (note)                                                        |
| Edit      | `app/actions/inventory/snapshot-actions.ts` (free-form params)                                         |
| Edit      | `app/actions/inventory/restock-recommendation-actions.ts` (new envelope)                               |
| Edit      | `components/features/admin/menu-item-form.tsx` + `menu-item-edit-form.tsx`                             |
| Edit      | `components/features/admin/menu-categories-form.tsx` (dynamic-tabbed)                                  |
| Edit      | `components/features/admin/menu-items-table.tsx` (badge note)                                          |
| Edit      | `components/features/menu/category-navigation.tsx` + `menu-content.tsx`                                |
| Edit      | `components/features/menu/menu-item.tsx` + `menu-item-detail-modal.tsx`                                |
| Edit      | `components/features/inventory/inventory-summary-client.tsx` + 3 sibling clients                       |
| Edit      | `models/menu-item-model.ts` + `inventory-snapshot-model.ts` (enum removed)                             |
| Edit      | `interfaces/menu-item.interface.ts` + `menu-settings.interface.ts` + `inventory-snapshot.interface.ts` |
| Edit      | `e2e/api/public-contracts-authenticated.spec.ts` (REQ-071 envelope)                                    |
| Edit      | `e2e/requirements-verification.spec.ts` (REQ-MENUMGT-005 stub)                                         |
| Edit      | `docs/SRS.md` (REQ-MENUMGT-005 row + REQ-API-006 amendment)                                            |
| Edit      | `compliance/RTM.md` (REQ-075 IN PROGRESS row)                                                          |

## Branch + PR

1. Branch `feat/REQ-075-configurable-main-categories` off develop.
2. 7-phase implementation per plan above.
3. Every commit subject prefixed `[REQ-075]` so `derive-release-version.sh` attributes CI evidence correctly.
4. PR title: `feat: configurable main categories [REQ-075]`.
5. Tracked-REQ release path — single-REQ release, not a housekeeping bundle.

## Security

- `MainCategoryService` mutations all funnel through `requireSuperAdmin` via the new server actions.
- Read action `getMainCategoriesAction` is unauthenticated — same data is already exposed publicly via `/api/public/menu/categories`.
- Slug validation server-side rejects reserved names and invalid formats; no client-only validation.
- No new env vars, no new packages, no new external integrations.
- BREAKING API contract is intentional + documented; rolled into the release notes.

## Verification

1. `npx tsc --noEmit` → exit 0
2. `npx vitest run` → 1154 pass + 4 skip + 0 fail (unchanged baseline + 19 new MainCategoryService cases included).
3. Focused E2E once UAT deploys: `npx playwright test e2e/admin/main-categories-config.spec.ts e2e/api/public-contracts-authenticated.spec.ts --project=regression`.
4. Manual UAT walkthrough: rename `food` to `meals` via the admin UI; verify customer `/menu` tab label changes to "Meals"; rename back; verify menu items unaffected.

## Done when

- All 7 phases complete, tsc/vitest green.
- Public envelope contract change documented in REQ-071 amendment + the route docstring.
- E2E spec passes against UAT.
- Evidence pack + release ticket on develop before the release PR.
- PR open against develop with the `[REQ-075]` commit attribution.
