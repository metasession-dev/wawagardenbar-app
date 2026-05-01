# Test Plan — REQ-034

**Requirement:** REQ-034 — Recipes + Production + Kitchen-Ingredient Inventory + Kitchen role
**Risk Level:** HIGH
**GitHub Issue:** [#74](https://github.com/metasession-dev/wawagardenbar-app/issues/74)
**Prereq:** [REQ-033 (#73)](https://github.com/metasession-dev/wawagardenbar-app/issues/73)
**Date:** 2026-05-01

## Acceptance Criteria

- **AC1** — Inventory rows split by `kind: 'menu-item' | 'kitchen-ingredient'`; existing rows backfilled to `'menu-item'` by `scripts/backfill-inventory-kind.ts` (idempotent).
- **AC2** — Customer-order menu queries never return inventory with `kind: 'kitchen-ingredient'`. Verified at all 6 touchpoints (`services/category-service.ts:32, 60, 91`; `app/actions/admin/express-actions.ts`; `app/actions/admin/order-edit-actions.ts:×2`).
- **AC3** — Inventory dashboard `/dashboard/inventory` shows two tabs: **Sellable** (kind: menu-item) and **Kitchen ingredients** (kind: kitchen-ingredient). Default tab is Sellable.
- **AC4** — Kitchen role exists (`UserRole = 'customer' | 'csr' | 'admin' | 'super-admin' | 'kitchen'`). Kitchen users access `/dashboard/kitchen/*` but receive 403/redirect when attempting `/dashboard/orders/express/*`.
- **AC5** — Expense form shows "Add to inventory" Select only when `expenseType === 'direct-cost'`. Dropdown is filtered to `Inventory.kind: 'kitchen-ingredient'`, grouped by COGS category.
- **AC6** — Saving an Expense with `linkedInventoryId` set auto-creates one `StockMovement{category: 'restock', type: 'addition'}` and bumps `Inventory.currentStock` by `expense.quantity ?? 1` in the **same Mongoose transaction**. Persists `Expense.stockMovementId` for back-ref.
- **AC7** — Editing an Expense with linked inventory: if `quantity` or `linkedInventoryId` changes, the prior `StockMovement` is voided (reversal entry, not deletion) and a fresh one created. Deleting voids the linked movement. Audit trail preserved across all paths.
- **AC8** — Recipe builder rejects: non-existent inventory, wrong kind (`menu-item` instead of `kitchen-ingredient`), duplicate ingredients, `yieldPortions ≤ 0`, ingredient unit mismatch. Errors are path-qualified (`ingredients[i].unitId`).
- **AC9** — Recipe ingredient `unitId` MUST equal the linked inventory's `unitId` (strict-match, no conversion in v1). Builder validates client-side; server re-validates at save.
- **AC10** — Production pre-flight blocks if any ingredient `currentStock < required quantity × batchCount`. Error names every short ingredient with required vs available amounts.
- **AC11** — Production deducts ingredients + adds `actualYield` portions to target MenuItem.inventory **atomically** (single Mongoose session). On any partial failure, the entire transaction rolls back; no `StockMovement` rows persist for a failed batch.
- **AC12** — Actual yield defaults to `recipe.yieldPortions × batchCount`; staff overrides via numeric input. `yieldVariance` = `actualYield - expectedYield` is recorded per Production row.
- **AC13** — Voiding a production: super-admin only, within 24h of `performedAt`. Reverses every linked `StockMovement` (creates reversal entries). Sets `Production.status = 'voided'`.
- **AC14** — Per-portion COGS calculation downstream still works: `enrichOrderItemsWithCosts` (existing) reads from `Inventory.kind: 'menu-item'` records as today; ingredient costs flow into reports via the existing aggregate paths.
- **AC15** — REQ-030/031 customization-linked inventory deduction unchanged: `lib/customization-inventory.ts` still resolves linked inventory by `_id` regardless of `kind`. All REQ-031 E2E specs pass unchanged.

## Tests to Add

### Pure helpers (vitest)

- [ ] `__tests__/lib/recipe-execution.test.ts` — `computeIngredientsForBatches(recipe, batchCount)`, `validateProductionPreFlight({recipe, batchCount, currentStocks})`, `computeYieldVariance({expected, actual})`. ~10 tests covering: scales every ingredient by batchCount, rejects when batchCount ≤ 0, pre-flight passes when all stocks sufficient, fails with path-qualified error naming each short ingredient, variance positive/negative/zero.
- [ ] `__tests__/lib/expense-inventory-link.test.ts` — `buildStockMovementFromExpense({expense, performedBy})`, `applyExpenseEdit({oldExpense, newExpense})`, `applyExpenseDelete({expense})`. ~8 tests covering: creates `addition` movement on initial save with linkedInventoryId, no movement when no link, edit voids prior + creates fresh on quantity change, edit voids prior + creates fresh on linkedInventoryId change, edit-with-no-relevant-change is a no-op, delete voids the prior movement, default quantity=1 if missing, default unit='each' if missing.

### Service (vitest)

- [ ] `__tests__/services/recipe-service.test.ts` — CRUD + validate. ~12 tests covering: createRecipe rejects duplicate ingredients, rejects unit mismatch, rejects non-existent inventory, rejects wrong-kind inventory, rejects yield ≤ 0, accepts valid input, updateRecipe validates same rules, deactivate flips isActive, listActiveRecipes returns only active, recipe targeting a deleted MenuItem still readable but warned, ingredient referencing a deleted Inventory still readable but warned.
- [ ] `__tests__/services/production-service.test.ts` — execute + void with transaction rollback. ~10 tests covering: pre-flight passes → all StockMovements created + Production persisted, pre-flight fails → no rows written, mid-batch ingredient deduction failure → entire transaction rolls back, void-within-24h reverses every movement, void-after-24h rejected, void by non-super-admin rejected, voiding twice rejected, actualYield defaults to expected, override accepted, yieldVariance computed correctly.
- [ ] `__tests__/services/expense-inventory-link.test.ts` — service-side integration of expense save / edit / delete with auto-link. ~6 tests covering the full edit/delete reversal flow against an in-memory Mongoose.

### E2E (Playwright)

- [ ] `e2e/kitchen/recipe-and-production.spec.ts` — kitchen-role user logs in, navigates to `/dashboard/kitchen/recipes`, creates a recipe, executes 1 batch via the production modal, verifies both ingredient deductions and target MenuItem yield addition appear in the inventory dashboard with paired `StockMovement` rows. Skips gracefully if seed data missing.
- [ ] `e2e/kitchen/role-isolation.spec.ts` — kitchen-role user tries to navigate to `/dashboard/orders/express/create-order`; verifies redirect or 403. Inverse: csr-role user tries to navigate to `/dashboard/kitchen/recipes`; verifies redirect or 403.

## Tests to Update

- [ ] `__tests__/services/inventory-service.customization-linked.test.ts` (REQ-031 service tests) — verify still green; no behaviour change expected since kind-aware filtering doesn't apply at the linked-deduction path.
- [ ] `e2e/menu-customization-picker.spec.ts` (REQ-031 user-journey) — verify still green.
- [ ] Any existing inventory-list test that asserts "all rows" returned now needs to assert "rows of kind menu-item" by default (or add a kind-filter parameter).

## Tests to Remove

None.

## Functional Test Mapping

| Acceptance Criterion                              | Test File                                                                                                     | Test Name                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| AC1 — Inventory split by kind, backfill           | manual UAT script run + DB inspection                                                                         | Captured in `uat-checklist.md`                                                               |
| AC2 — Customer queries exclude kitchen ingredient | `__tests__/services/category-service.kind-filter.test.ts`                                                     | "category-service queries return only kind:menu-item" (per touchpoint)                       |
| AC3 — Inventory tabs                              | manual UAT walkthrough                                                                                        | UAT checklist                                                                                |
| AC4 — Kitchen role gating                         | `e2e/kitchen/role-isolation.spec.ts`                                                                          | "AC4: kitchen role denied at /dashboard/orders/express; csr denied at /kitchen"              |
| AC5 — Expense Add-to-inventory dropdown           | `e2e/kitchen/recipe-and-production.spec.ts`                                                                   | "AC5: Direct Cost expense form shows kitchen-ingredient dropdown"                            |
| AC6 — Auto-link transaction                       | `__tests__/services/expense-inventory-link.test.ts`                                                           | "creates one StockMovement and bumps stock atomically on save with linkedInventoryId"        |
| AC7 — Edit/delete reversal                        | `__tests__/lib/expense-inventory-link.test.ts`                                                                | "edit voids prior + creates fresh on quantity change" (etc.)                                 |
| AC8 — Recipe builder validation                   | `__tests__/services/recipe-service.test.ts`                                                                   | All 12 tests                                                                                 |
| AC9 — Strict unit match                           | `__tests__/services/recipe-service.test.ts`                                                                   | "rejects unit mismatch"                                                                      |
| AC10 — Production pre-flight                      | `__tests__/lib/recipe-execution.test.ts`                                                                      | "validateProductionPreFlight — fails with path-qualified error naming each short ingredient" |
| AC11 — Atomic transaction + rollback              | `__tests__/services/production-service.test.ts`                                                               | "mid-batch deduction failure rolls back entire transaction"                                  |
| AC12 — Yield default + override + variance        | `__tests__/lib/recipe-execution.test.ts`                                                                      | "computeYieldVariance — variance positive/negative/zero"                                     |
| AC13 — Void within 24h, super-admin only          | `__tests__/services/production-service.test.ts`                                                               | "void-within-24h reverses every movement" / "void-after-24h rejected"                        |
| AC14 — COGS regression                            | full vitest suite + manual UAT spot-check on reports                                                          | Existing tests; UAT verifies                                                                 |
| AC15 — REQ-031 regression                         | `__tests__/services/inventory-service.customization-linked.test.ts` + `e2e/menu-customization-picker.spec.ts` | Existing — verify still pass                                                                 |

## Non-Functional Tests

- **Security**: AC4 RBAC gates, AC2 isolation guard, AC8 path-qualified errors (no DB ID leakage). Reuses `requireRole` helper pattern.
- **Performance**: production execution is a single Mongoose transaction with N+1 writes (N ingredients + 1 yield). For typical recipes (<10 ingredients) this is sub-100ms. No load testing required for v1; flag if a batch with >50 ingredients ever appears (none expected in the bar context).
- **Accessibility**: kitchen role pages follow existing dashboard a11y patterns (labelled inputs, keyboard nav, focus management). Production modal trapped focus within dialog.
- **Audit completeness**: every production + every auto-link expense creates traceable `StockMovement` rows. Voiding never deletes; only emits reversal entries.

## Out of Scope (per design decision)

(See test-scope.md "Out of Scope" section for the canonical list.)
