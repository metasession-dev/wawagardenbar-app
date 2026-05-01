# Implementation Plan — REQ-034

**Requirement:** REQ-034 — Recipes + Production + Kitchen-Ingredient Inventory + Kitchen role
**GitHub Issue:** [#74](https://github.com/metasession-dev/wawagardenbar-app/issues/74)
**Risk Level:** HIGH (financial data, multi-collection writes, new transaction type, customer-menu query change, new role)
**Prereq:** [REQ-033 (#73)](https://github.com/metasession-dev/wawagardenbar-app/issues/73) — UoM registry must ship and soak ≥1 week first
**Date:** 2026-05-01

## Approach

Single `Inventory` collection gains a `kind` discriminator (`menu-item` | `kitchen-ingredient`); the `StockMovement` audit log gains a new `category: 'production'` value (joins `'sale'`, `'restock'`, `'adjustment'`). Recipes link a target MenuItem (kind:menu-item) to a list of ingredient inventories (kind:kitchen-ingredient) with quantities and units (REQ-033 registry). A Production event executes a recipe in a single Mongoose transaction: deducts each ingredient, adds yield to the target menu inventory, persists a Production row with full audit. Auto-link from Direct Cost Expenses to kitchen-ingredient inventory keeps the buy → cook → sell flow contained without manual stock entry. New `kitchen` role is added to the role enum, gated to `/dashboard/kitchen/*` and explicitly excluded from order-creation surfaces.

Pure logic (recipe execution math, expense→inventory mapping) extracted to helpers and exhaustively unit-tested. Transaction behaviour and rollback paths covered by service-level integration tests using an in-memory Mongoose. UI flow and sign-off via Playwright E2E + manual UAT walkthrough.

## Order of operations

1. **Pre-flight verify REQ-033 has shipped and soaked ≥1 week.** Without the UoM registry, recipe ingredient ↔ inventory unit-matching cannot validate.
2. Add `kind` field to `Inventory` model; write `scripts/backfill-inventory-kind.ts` (idempotent); run on develop.
3. Extend role enum to include `kitchen`; add `requireKitchen`, `requireAdminOrKitchen` helpers; update settings admin UI dropdown.
4. Add `kind:'menu-item'` filter at every customer-menu query touchpoint (6 sites listed below); E2E covers AC2.
5. Build `Recipe` model + interface + service (CRUD + validation); pure helper `computeIngredientsForBatches` first (TDD).
6. Build `Production` model + service with transactional execute + void; pure helper `validateProductionPreFlight` first.
7. Build kitchen pages + recipe builder + make-batch dialog.
8. Add `linkedInventoryId` + `stockMovementId` to Expense schema; auto-link logic on save/edit/delete; update `expense-form.tsx` with the new dropdown.
9. Split inventory dashboard into Sellable / Kitchen tabs.
10. E2E specs (recipe-and-production journey + role-isolation).
11. SDLC artefact gates (validator).

## Files to Create

### Models / interfaces

- `models/recipe-model.ts` — Mongoose schema with embedded `ingredients` array + `targetMenuItemId` ref + indexes on `targetMenuItemId` and `isActive`.
- `interfaces/recipe.interface.ts` — `IRecipe`, `IRecipeIngredient`, `CreateRecipeDTO`, `UpdateRecipeDTO`.
- `models/production-model.ts` — schema with `ingredientsDeducted` snapshot array + `stockMovementIds` ref array + indexes on `recipeId`, `targetMenuItemId`, `performedAt`, `status`.
- `interfaces/production.interface.ts` — `IProduction`, `CreateProductionDTO`.

### Services

- `services/recipe-service.ts` — `createRecipe`, `updateRecipe`, `deactivateRecipe`, `listActiveRecipes`, `getRecipeById`. Validates: ingredients exist + kind:kitchen-ingredient, target menu item kind:menu-item, no duplicates, yield > 0, strict unit-match against REQ-033 registry.
- `services/production-service.ts` — `executeProduction(recipeId, batchCount, actualYield?, performedBy)`, `voidProduction(productionId, voidedBy)`. Transactional via Mongoose session.

### Server actions

- `app/actions/kitchen/recipe-actions.ts` — `createRecipeAction`, `updateRecipeAction`, `deactivateRecipeAction`, `listRecipesAction`. Gated by `requireAdminOrKitchen`.
- `app/actions/kitchen/production-actions.ts` — `executeProductionAction`, `voidProductionAction`, `listProductionsAction`. `voidProductionAction` is `requireSuperAdmin`.

### Pages

- `app/dashboard/kitchen/recipes/page.tsx` — list view with "Add Recipe" button, grouped by target MenuItem.
- `app/dashboard/kitchen/recipes/[recipeId]/page.tsx` — edit view (uses recipe-builder component).
- `app/dashboard/kitchen/production/page.tsx` — production history + "Make a batch" button (uses make-batch-dialog component).

### Components

- `components/features/kitchen/recipe-builder.tsx` — target menu item dropdown + yield input + repeatable ingredient rows (ingredient dropdown + quantity input + unit autofilled from inventory record + notes). Server-side validation re-rendered with path-qualified errors.
- `components/features/kitchen/recipe-list.tsx` — list of recipes grouped by target MenuItem with edit link + isActive toggle.
- `components/features/kitchen/make-batch-dialog.tsx` — modal with recipe select + batch count + expected yield (read-only) + actual yield (overrideable, defaults to expected) + notes textarea + submit. Calls `executeProductionAction` server-side.
- `components/features/kitchen/production-history.tsx` — table of recent productions: recipe, batches, expectedYield, actualYield, variance, performedBy, performedAt, status. Super-admin sees a void button on rows ≤24h old.

### Pure helpers (testable in isolation)

- `lib/recipe-execution.ts` — `computeIngredientsForBatches(recipe, batchCount)`, `validateProductionPreFlight({recipe, batchCount, currentStocks})`, `computeYieldVariance({expected, actual})`. No DB calls; takes data shapes in and returns either errors or numeric outputs.
- `lib/expense-inventory-link.ts` — `buildStockMovementFromExpense({expense, performedBy})`, `applyExpenseEdit({oldExpense, newExpense})`, `applyExpenseDelete({expense})`. Returns the action set for the calling service to execute (create / void / no-op), keeping the orchestration logic testable.

### Tests

- `__tests__/lib/recipe-execution.test.ts` — 10 tests
- `__tests__/lib/expense-inventory-link.test.ts` — 8 tests
- `__tests__/services/recipe-service.test.ts` — 12 tests
- `__tests__/services/production-service.test.ts` — 10 tests (includes transaction rollback)
- `__tests__/services/expense-inventory-link.test.ts` — 6 tests (service-side edit/delete reversal flow)
- `__tests__/services/category-service.kind-filter.test.ts` — verifies all 3 customer-menu queries exclude kitchen ingredients
- `e2e/kitchen/recipe-and-production.spec.ts` — kitchen-role journey
- `e2e/kitchen/role-isolation.spec.ts` — kitchen role excluded from `/dashboard/orders/express/*`; csr role excluded from `/dashboard/kitchen/*`

### Migration scripts

- `scripts/backfill-inventory-kind.ts` — idempotent, sets `kind: 'menu-item'` on every existing Inventory row. Skip-already-migrated; reports row count.

### SDLC artefacts

- `compliance/evidence/REQ-034/{security-summary,test-execution-summary,uat-checklist,ai-prompts,ai-use-note}.md` (post-implementation)
- `compliance/evidence/REQ-034/gates/{tsc.txt,vitest-summary.txt,semgrep.json,dependency-audit.json}` (post-implementation)
- `compliance/pending-releases/RELEASE-TICKET-REQ-034.md` (already created at scaffold time)

## Files to Modify

- `models/inventory-model.ts` (+ `kind` field, default `'menu-item'`, indexed)
- `interfaces/inventory.interface.ts` (+ kind type union)
- `models/expense-model.ts` (+ `linkedInventoryId?: ObjectId`, `stockMovementId?: ObjectId`)
- `interfaces/expense.interface.ts` (+ same)
- `models/stock-movement-model.ts` (extend `category` enum to include `'production'`; add optional `productionId?: ObjectId` ref)
- `interfaces/user.interface.ts` (UserRole +`'kitchen'`)
- `interfaces/api-key.interface.ts` (same)
- `lib/session.ts` (+ `isKitchenStaff` helper)
- `lib/auth-middleware.ts` (+ `requireKitchen`, `requireAdminOrKitchen`)
- `lib/permissions.ts` (extend `hasPermission`)
- `services/inventory-service.ts` (kind-aware list filters: default `kind: 'menu-item'`, accept override)
- `services/category-service.ts` (3 menu queries at lines 32, 60, 91 gain `kind: 'menu-item'` join via populated Inventory ref or via aggregation lookup)
- `app/actions/admin/express-actions.ts` (1 menu query gains kind filter)
- `app/actions/admin/order-edit-actions.ts` (2 menu queries gain kind filter)
- `app/actions/finance/expense-actions.ts` — auto-link logic: on create, if `linkedInventoryId` set, emit StockMovement + bump inventory + persist `stockMovementId`; on update, apply `lib/expense-inventory-link.ts:applyExpenseEdit`; on delete, apply `applyExpenseDelete`.
- `app/actions/finance/pending-expense-actions.ts` — same auto-link rules apply when a pending group is approved & flushed.
- `components/features/finance/expense-form.tsx` — add Add-to-inventory Select (visible only when expenseType = 'direct-cost'), populated from `services/inventory-service.ts:listKitchenIngredients`.
- `app/dashboard/inventory/page.tsx` + `inventory-items-client.tsx` — split into Sellable / Kitchen tabs (URL query `?kind=menu-item|kitchen-ingredient`).
- `app/dashboard/settings/admins/page.tsx` — role dropdown gains `Kitchen` option in CreateAdminDialog and the admin-list edit form.
- `compliance/RTM.md` — REQ-034 row TESTED - PENDING SIGN-OFF after implementation lands

## Risk Mitigation

- **Atomic transaction with rollback test**: `production-service.test.ts` deliberately fails one ingredient deduction mid-batch and asserts no `StockMovement` rows persist. Production rollback is the highest-risk path.
- **Snapshot the ingredient list in Production**: `ingredientsDeducted` is captured at execution time, independent of subsequent recipe edits. Audit-traceable.
- **Strict unit match (no conversion)**: REQ-033's registry guarantees identifiers match across recipe and inventory. The recipe-service validation rejects mismatches at save time, before any production can fail mid-batch.
- **Kitchen role explicitly excluded from order-creation**: page guard + server action guard. `e2e/kitchen/role-isolation.spec.ts` verifies both.
- **Customer-menu kind filter at every touchpoint**: 6 sites listed; `category-service.kind-filter.test.ts` covers all 3 service-layer queries; E2E covers the action-layer ones.
- **Auto-link Expense edits preserve audit**: edit emits a void + a fresh StockMovement, never updates in place. Same pattern as REQ-026 pending-expense edits.
- **Void window 24h, super-admin only**: older mistakes go through manual stock-adjustment (existing flow). Prevents arbitrary audit rewrites.
- **Backfill is idempotent and safe**: `kind` defaults at the schema layer, backfill sets explicit value on existing rows. Re-runnable on UAT issues.

## Dependencies

- Blocks: nothing currently planned.
- Depends on: REQ-033 (#73) UoM registry; REQ-026 (Inventory + StockMovement audit log); REQ-028 (expense category groups — UI integration); REQ-030/031 (linked-inventory pattern reused for production).

## Definition of Done

- All ACs (1-15) verified per `test-plan.md`'s functional test mapping
- 46 new unit + integration tests pass (10+8+12+10+6 + 2 service-tier mini-suites)
- 462 + previous additions baseline passes (no regression)
- 2 new E2E specs pass on UAT
- Inventory backfill run on UAT + production (idempotent)
- Kitchen role created + assigned to at least one staff user during UAT
- TypeScript: 0 errors
- Build: succeeds
- Compliance validator passes for REQ-034
- 2 reviewers signed off; ai-prompts.md captured
- Manual UAT round-trip: kitchen staff creates a recipe, executes a batch, sees inventory deltas + voids the batch + sees reversals
