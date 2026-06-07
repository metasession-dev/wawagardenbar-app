# REQ-075 — Test execution summary

**Date:** 2026-06-07
**Operator:** ostendo-io
**Branch:** `feat/REQ-075-configurable-main-categories`

## Unit tests (vitest)

```
$ npx vitest run __tests__/services/main-category-service.test.ts

 RUN  v4.1.8 wawagardenbar app

 ✓ REQ-075 — MainCategoryService > list / get > list returns sorted entries
 ✓ REQ-075 — MainCategoryService > list / get > get finds a known slug
 ✓ REQ-075 — MainCategoryService > list / get > get returns null for unknown slug
 ✓ REQ-075 — MainCategoryService > create > derives slug from label when not provided
 ✓ REQ-075 — MainCategoryService > create > rejects duplicate slug
 ✓ REQ-075 — MainCategoryService > create > rejects reserved slug
 ✓ REQ-075 — MainCategoryService > create > rejects invalid slug format
 ✓ REQ-075 — MainCategoryService > create > rejects empty label
 ✓ REQ-075 — MainCategoryService > update > patches label without touching slug
 ✓ REQ-075 — MainCategoryService > update > rejects unknown slug
 ✓ REQ-075 — MainCategoryService > reorder > sets order from array index
 ✓ REQ-075 — MainCategoryService > reorder > rejects when input slug set differs from current set
 ✓ REQ-075 — MainCategoryService > rename > updates MenuItem.mainCategory + relocates sub-categories + updates registry
 ✓ REQ-075 — MainCategoryService > rename > rejects identical old/new slug
 ✓ REQ-075 — MainCategoryService > rename > rejects when newSlug already exists
 ✓ REQ-075 — MainCategoryService > rename > rejects reserved newSlug
 ✓ REQ-075 — MainCategoryService > delete > refuses when MenuItems still reference the main category
 ✓ REQ-075 — MainCategoryService > delete > refuses when sub-categories still configured
 ✓ REQ-075 — MainCategoryService > delete > removes from list when no references

 Test Files  1 passed (1)
      Tests  19 passed (19)
   Duration  567ms
```

## Full vitest pack

```
$ npx vitest run

 Test Files  123 passed | 1 skipped (124)
      Tests  1154 passed | 4 skipped (1158)
   Duration  4.94s
```

Net: 1135 (REQ-074 baseline) + 19 (new MainCategoryService cases) = 1154 pass.

## TypeScript

```
$ npx tsc --noEmit
$ echo $?
0
```

No type errors after the schema relaxation + IMenuSettings restructure + envelope change + all 27+ call-site updates.

## E2E — to land against UAT

| Spec                                                                          | Project    | Tests         | Status               |
| ----------------------------------------------------------------------------- | ---------- | ------------- | -------------------- |
| `e2e/admin/main-categories-config.spec.ts` (NEW)                              | regression | 4             | _pending UAT deploy_ |
| `e2e/api/public-contracts-authenticated.spec.ts` (REQ-071 envelope updated)   | regression | 8 (1 updated) | _pending UAT deploy_ |
| `e2e/requirements-verification.spec.ts` Section 13 (new REQ-MENUMGT-005 stub) | regression | +1            | _pending UAT deploy_ |

Operator runs the focused E2E suite via:

```
BASE_URL=https://wawagardenbar-app-uat.up.railway.app \
  MONGODB_URI=$MONGODB_UAT_EXTERNAL_URI \
  MONGODB_DB_NAME=wawagardenbar_uat \
  npx playwright test e2e/admin/main-categories-config.spec.ts e2e/api/public-contracts-authenticated.spec.ts --project=regression --reporter=list
```

Update this file with the final pass/fail + wall-clock after the UAT run.

## Defects found / fixed mid-cycle

None against this REQ. Long-tail call sites all updated in Phase 4 without breaking the 1135 pre-existing vitest cases.

## Honesty notes

- The 4 new E2E tests pin service-layer correctness (the same path the new server actions exercise). Per-row UI flow (drag-reorder, inline rename via the form, the delete-confirm dialog) is **operator-walked manually** at UAT — UI-driven E2E for this surface is deferred to a follow-up REQ. The reasoning matches REQ-070/REQ-073: storage-layer correctness is the load-bearing gate.
- The `console.warn` paths in `financial-report-service.ts`, `staff-pot-service.ts`, and `app/api/public/sales/summary/route.ts` are intentional aggregation back-compat (any future-added main category lands in the `food` or `other` bucket with a log line). They are NOT silent truncation: every emitted warning names the slug + the call site.
- The BREAKING `/api/public/menu/categories` envelope is documented in the route's JSDoc + the REQ-071 spec + the REQ-API-006 amendment in SRS. Any external consumer pinned to the old shape will get a 200 with a non-matching body until they migrate.
