# REQ-075 — Test plan

**Requirement ID:** REQ-075
**Risk:** MEDIUM
**Related issue:** [#322](https://github.com/metasession-dev/wawagardenbar-app/issues/322)
**Date:** 2026-06-07

## Acceptance criteria → tests

| AC  | Statement                                                                                                                                                                                                                      | Test                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | `MainCategoryService.create({ label }, adminUserId)` derives a kebab slug, appends `order = max + 1`, persists to SystemSettings `'main-categories'`.                                                                          | `__tests__/services/main-category-service.test.ts` — "create > derives slug from label when not provided"                                                                                   |
| AC2 | `create` rejects duplicate, reserved, invalid-format, and empty inputs.                                                                                                                                                        | same file — 4 negative cases under `describe('create')`                                                                                                                                     |
| AC3 | `update(slug, patch, adminUserId)` patches mutable fields and leaves `slug` immutable; rejects unknown slug.                                                                                                                   | same file — `describe('update')` (2 cases)                                                                                                                                                  |
| AC4 | `reorder(slugs[], adminUserId)` sets `order` from array index; rejects when input slug set differs.                                                                                                                            | same file — `describe('reorder')` (2 cases)                                                                                                                                                 |
| AC5 | `rename(oldSlug, newSlug, adminUserId)` updates every referencing `MenuItem.mainCategory`, relocates the sub-category list under `'menu-categories'` from old key to new, rewrites the registry slug in place. Returns counts. | same file — "rename > updates MenuItem.mainCategory + relocates sub-categories + updates registry" + 3 guard cases. Plus storage-layer pin: `e2e/admin/main-categories-config.spec.ts` AC2. |
| AC6 | `delete(slug, adminUserId)` refuses while `MenuItem` rows or sub-categories still reference the slug; allows otherwise.                                                                                                        | same file — `describe('delete')` (3 cases). Plus storage-layer pin: spec AC3 + AC4.                                                                                                         |
| AC7 | `GET /api/public/menu/categories` returns the new envelope `{ mainCategories: [{ slug, label, order, subCategories[] }] }`.                                                                                                    | `e2e/api/public-contracts-authenticated.spec.ts` — REQ-071 envelope assertion updated to the REQ-075 shape.                                                                                 |
| AC8 | Admin can mount `/dashboard/settings` and the route is super-admin gated like every other settings entry.                                                                                                                      | `e2e/requirements-verification.spec.ts` — Section 13 REQ-MENUMGT-005 stub.                                                                                                                  |

## Surfaces / contracts under test

| Surface                                        | Source-of-truth                                                            | Pinned by                                  |
| ---------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------ |
| Registry persistence shape                     | `services/main-category-service.ts`                                        | unit tests AC1-AC6 + E2E AC5/AC6           |
| Public envelope contract                       | `app/api/public/menu/categories/route.ts` + `services/category-service.ts` | E2E AC7                                    |
| Default seed (`food` + `drinks`) carry-through | `interfaces/main-category.interface.ts`                                    | implicit via every test starting from SEED |
| Reference-counted delete guard                 | `services/main-category-service.ts:delete` + `:referenceCount`             | unit AC6 + E2E AC3                         |
| Sequential rename cascade                      | `services/main-category-service.ts:rename` (3 steps)                       | unit AC5 + E2E AC2                         |
| Settings route gating                          | `app/dashboard/settings/page.tsx`                                          | E2E AC8                                    |

## Test environment

- **Unit:** vitest + Mongo mocked + `SystemSettingsService` mocked. No network, no DB. 19 cases pass deterministic.
- **E2E:** Playwright + UAT URL + UAT Mongo (read+write at the service layer; cleanup deletes every seeded slug + MenuItem `_id` in `afterAll`).
- **API contracts:** existing REQ-071 spec extended; runs in `serial` mode against UAT.

## Quality gates

| Gate                                 | Expected                                    | Actual (2026-06-07)           |
| ------------------------------------ | ------------------------------------------- | ----------------------------- |
| `npx tsc --noEmit`                   | exit 0                                      | exit 0                        |
| `npx vitest run` (full)              | 1135 + 19 new = 1154 pass / 4 skip / 0 fail | 1154 pass / 4 skip / 0 fail   |
| Focused E2E (UAT) — new spec         | 4/4 pass                                    | _to confirm after UAT deploy_ |
| Focused E2E (UAT) — REQ-071 envelope | 1/1 pass against new envelope               | _to confirm after UAT deploy_ |

## Out of scope

- Per-main icon plumbing on customer-facing surfaces (the registry stores an `icon` field; the customer `menu-item.tsx` still uses the legacy two-emoji fallback until a follow-up REQ wires the registry icon through).
- Per-main colour palette for badges (still defaults until a follow-up REQ adds metadata).
- Automated UI E2E around the MainCategoriesForm (drag-reorder, inline rename) — service-layer contract pin is the V1 gate; UI flow is operator-walked manually pre-release.
- Extending the staff-pot eligibility gate to non-food/non-drink main categories (intentionally left untouched; needs explicit operator decision per category).
- Backporting the BREAKING `/api/public/menu/categories` envelope to a versioned route — operator opted into the breaking change, REQ-API-006 + REQ-071 SRS amended in this release.
