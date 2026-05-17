# Implementation Plan — REQ-037

**Risk Level:** MEDIUM
**Issue:** [#83](https://github.com/metasession-dev/wawagardenbar-app/issues/83)
**Depends on:** REQ-034 (#74) — Kitchen Management feature (closed 2026-05-15)
**Date:** 2026-05-16

## Codebase reconnaissance findings (2026-05-16)

These shape the implementation. Confirmed by reading the tree, not assumed from the issue.

1. **Kitchen ingredients are 1:1 paired with hidden MenuItems.** `MenuItemModel.menuItemId` is `{ required: true, unique: true }` on Inventory, and REQ-034 / D7 creates the pair atomically in `createKitchenIngredientAction`. Every write surface (edit, archive, restore) must operate on **both** rows or the pair invariant breaks.
2. **Mongo is standalone (no `withTransaction`).** Same constraint as REQ-034. Two-row writes use the same compensating-revert pattern: write MenuItem first; if Inventory write fails, undo the MenuItem write so the pair stays consistent.
3. **Recipes are the only place a kitchen ingredient is "in use" today.** `recipe-model.ts` stores `ingredients[].inventoryId`. Expense → Inventory link stores `linkedInventoryId` on `Expense`, but expenses are historical events — they don't make an ingredient currently "in use", they just back-reference it.
4. **Soft-delete via `archivedAt: Date` mirrors the existing Recipe deactivate / reactivate pattern.** No physical delete; all StockMovement / CostHistory / Expense back-references continue to resolve.
5. **Three listing surfaces filter at the source.** `InventoryService.listByKind` is the single source of truth for the Kitchen tab default view, the Recipe-builder ingredient dropdown (via `getKitchenIngredientFormOptionsAction`), and the Expense form "Add to kitchen inventory" dropdown (via `pending-expense-actions.ts`). Adding `archivedAt: { $exists: false }` to that one method propagates to all three.
6. **Unit field is load-bearing on history rows.** Changing `Inventory.unitId` retroactively would corrupt every `StockMovement.quantity`, `InventoryItemCostHistory.costPerUnit`, and any `Recipe.ingredients[].unitId` referencing this ingredient. Edit dialog must lock the Unit field and signal why.

## Single-PR plan

All scope ships in one PR develop → main after UAT (consistent with REQ-034 pattern). Branch: develop carries scaffold + implementation + the in-flight verb refactor (Delete → Archive + Restore) folded in at user request before the PR is opened.

---

## Order of work

The following 6 steps are ordered for safe progression: schema first, then services, then actions, then UI, then tests. Tests are written before each step's implementation per `feedback_tests_before_push.md`.

1. **Add `archivedAt?: Date` to Inventory + MenuItem schemas + indices `{ kind: 1, archivedAt: 1 }`.** Mirror in interfaces. No migration — absent on existing documents, queries default to "not archived".
2. **Extend `InventoryService` with `listByKind` + `listArchivedByKind`** filtering on `archivedAt` existence; populate `menuItemId.{name,mainCategory,category}` for both.
3. **Add `RecipeService.findActiveRecipesReferencingInventory(inventoryId)`** returning `Pick<IRecipe, '_id' | 'name'>[]`. This is the load-bearing safe-removal guard.
4. **Three new server actions** in `app/actions/admin/kitchen-ingredient-actions.ts`: `updateKitchenIngredientAction`, `archiveKitchenIngredientAction` (initially named `delete…`, renamed during in-flight refactor), `restoreKitchenIngredientAction`. Each gated by super-admin OR `inventoryManagement`. Archive blocks on active recipes; error names them. Restore rejects rows that aren't archived (clear-intent). All three use the compensating-revert pattern.
5. **UI: Edit + Archive dialogs + 3-action row on Kitchen tab + "Show archived" toggle + Restore action on archived rows.** Use a `renderRowActions` render-prop on `InventoryTable` so kitchen rows can compose View Details + Edit + Archive while sellable rows keep their default actions. Edit dialog disables the Unit field with a `<Lock>` icon and an HTML `title` tooltip explaining the lock.
6. **Tests + E2E + SDLC artefacts.** Vitest extends the existing kitchen-ingredient-actions test (auth, validation, partial-write, active-recipe guard) and adds new service tests for `findActiveRecipesReferencingInventory` + `listByKind`/`listArchivedByKind`. New Playwright spec `e2e/kitchen/inventory-crud.spec.ts` registered as `kitchen-inventory-crud` project, with 20 tests covering every AC1–AC7 behaviour per the user's "maximise automated coverage" instruction.

Tests-first commits land before each implementation step. RTM flips DRAFT → TESTED at the end of step 6; → APPROVED at Stage 5 finalize.

### Files (create)

- `components/features/admin/edit-kitchen-ingredient-dialog.tsx` — pre-filled, Unit field disabled with `<Lock>` icon + `title` tooltip
- `components/features/admin/archive-kitchen-ingredient-dialog.tsx` — non-destructive "Archive" framing
- `__tests__/services/recipe-service.references.test.ts` — active-recipe guard (5 tests)
- `__tests__/services/inventory-service.list-by-kind.test.ts` — active + archived filter (3 tests)
- `e2e/kitchen/inventory-crud.spec.ts` — 20 tests covering AC1–AC7

### Files (modify)

- `models/inventory-model.ts` (+ `archivedAt` + index)
- `models/menu-item-model.ts` (+ `archivedAt` + index)
- `interfaces/{inventory,menu-item}.interface.ts` (mirror)
- `services/inventory-service.ts` (+ `listByKind` archived filter + `listArchivedByKind`)
- `services/recipe-service.ts` (+ `findActiveRecipesReferencingInventory`)
- `app/actions/admin/kitchen-ingredient-actions.ts` (+ `updateKitchenIngredientAction`, `archiveKitchenIngredientAction`, `restoreKitchenIngredientAction`)
- `app/actions/finance/pending-expense-actions.ts` (kitchen-inventory list excludes archived)
- `app/dashboard/inventory/page.tsx` (load `archivedKitchenInventory` in parallel)
- `components/features/admin/inventory-table.tsx` (+ `renderRowActions` render-prop + exported `InventoryItem`)
- `components/features/admin/inventory-items-client.tsx` (kitchen rows: 3 actions; "Show archived (N)" toggle; archived sub-section with Restore)
- `__tests__/actions/admin/kitchen-ingredient-actions.test.ts` (extend with update + archive + restore coverage)
- `playwright.config.ts` (register `kitchen-inventory-crud` project)
- `compliance/RTM.md`

### AC coverage

All 7 ACs (AC1–AC7) ship in this PR. AC7 covers the in-flight verb refactor (Delete → Archive + Restore) added at user request.

---

## Risk register

| Risk                                                                                  | Mitigation                                                                                                                                                                            |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pair invariant breaks if MenuItem update succeeds but Inventory update fails          | Compensating revert pattern: undo the MenuItem write on Inventory failure; partial-write test asserts the pair stays consistent                                                       |
| Operator archives an ingredient that's still in use, orphaning a recipe               | Active-recipe guard blocks with a clear error naming the offending recipes; deactivated recipes are not a blocker                                                                     |
| Operator changes the Unit field on Edit and corrupts every historical quantity        | Edit dialog renders the Unit field disabled with a tooltip pointing to "archive + recreate" if a different unit is genuinely needed                                                   |
| Operator silently changes `currentStock` via Edit, bypassing the StockMovement audit  | `currentStock` is not in the Edit dialog at all                                                                                                                                       |
| Restore brings back an ingredient that was archived for a real reason                 | Restore is auth-gated (`inventoryManagement`); audit-logged via timestamps; no data is corrupted by the round-trip; operator can re-archive                                           |
| New listing surface added in a future REQ misses the `archivedAt` filter              | All three current surfaces filter at one source (`listByKind`); future surfaces should call the same method. E2E asserts the three current surfaces hide archived rows.               |
| Render-prop refactor on `InventoryTable` regresses sellable-row default action layout | Type-export `InventoryItem` from the table; sellable callers continue to use the default `renderRowActions === undefined` branch. tsc + existing sellable E2E tests catch regression. |

## Backout

Single bundled revert (one merge commit). Schema additions are additive optional fields with no default — reverting code leaves the `archivedAt` field unset on most documents and harmless on the ones that were archived during the live window. Recipe + Production back-references continue to resolve unchanged. The Edit + Archive + Restore actions disappear from the UI on revert; no UI surface is broken because the pre-REQ-037 Kitchen tab had no row actions on these rows.

## AI involvement

- **AI Tool Used:** Claude Code (Claude Opus 4.7, 1M context)
- **AI-Generated Files:** all schema additions, server actions, service helpers, Edit + Archive dialog components, Show-archived toggle + Restore wiring, archived-row filter additions, all SDLC artefacts, all tests, all commit messages.
- **Human Reviewers:** ostendo-io (1 reviewer per MEDIUM Risk-Tiered Review Policy).
- **Components Regenerated:** None — every change is a targeted edit.
- **Prompt log:** `compliance/evidence/REQ-037/ai-prompts.md`.
