# Test Scope — REQ-037

**Risk Level:** MEDIUM (inventory data write path; multi-collection writes per action; archived-filter at a single source — a missed surface leaks archived rows; active-recipe guard is the load-bearing safety check)
**Requirement:** Edit + archive + restore kitchen ingredients (with safe-removal guard for active recipes)
**GitHub Issue:** [#83](https://github.com/metasession-dev/wawagardenbar-app/issues/83)
**Date:** 2026-05-16

## Test Approach

MEDIUM-risk additive CRUD completion on top of REQ-034. No new collections; two modified collections (Inventory + `archivedAt`, MenuItem + `archivedAt`); three new server actions (`update`, `archive`, `restore`). Soft-delete pattern via `archivedAt` mirrors the existing Recipe deactivate / reactivate behaviour. Pair-write integrity (MenuItem + Inventory updated together) handled by the same compensating-revert pattern REQ-034 used for production-execution reversal.

**Universal gates (mandatory):**

- TypeScript compilation: 0 errors
- SAST (Semgrep): 0 new high/critical findings
- Dependency audit: 0 new high/critical vulnerabilities (REQ-034 baseline preserved)
- Vitest unit suite: 720 baseline + ~14 new tests all pass (target landing at 728 / 4 skipped)
- Playwright E2E: existing kitchen suites unchanged + new `kitchen-inventory-crud` project covering 20 AC behaviours
- Human code review via PR (×1 — MEDIUM risk)

**Risk-tier-specific gates:**

- AI prompt log compiled before merge (`ai-prompts.md`) — MEDIUM risk policy.
- Single-PR bundle (consistent with REQ-034 pattern; no two-PR split).
- No migration script needed — `archivedAt` is an optional Date field, absent on existing documents.

## In Scope

### Edit kitchen ingredient

1. **`updateKitchenIngredientAction`** — auth-gated (super-admin OR `inventoryManagement`); writes both paired MenuItem + Inventory rows; partial failure surfaces a clear error naming what didn't write. Compensating revert keeps the pair consistent.
2. **Editable fields** — name, COGS category, min/max stock thresholds. Validation: non-blank name, `maximumStock ≥ minimumStock`, non-negative thresholds.
3. **Locked fields** — Unit (would corrupt historical StockMovement / CostHistory / Recipe rows) and currentStock (would bypass StockMovement audit log). Edit dialog renders the Unit input disabled with an HTML `title` tooltip; `currentStock` is not in the dialog at all.

### Archive kitchen ingredient (soft delete)

4. **`archiveKitchenIngredientAction`** — auth-gated; sets `archivedAt: Date` on both paired rows; compensating revert if Inventory write fails.
5. **Active-recipe guard** — blocks when any active recipe (`isActive !== false`) references the inventory. Error message names the offending recipe(s) so the operator can deactivate them first. Deactivated recipes are not a blocker.
6. **Listing surfaces filter archived rows at one source** — `InventoryService.listByKind` adds `archivedAt: { $exists: false }`. Touchpoints that inherit the filter: Inventory dashboard Kitchen tab default view, Recipe builder ingredient dropdown (`getKitchenIngredientFormOptionsAction`), Expense form "Add to kitchen inventory" dropdown (`pending-expense-actions.ts` kitchen branch).
7. **Sellable tab is unaffected** — Sellable count remains unchanged when a kitchen ingredient is archived (kitchen and sellable counts are independent).

### Restore archived kitchen ingredient

8. **`restoreKitchenIngredientAction`** — auth-gated; clears `archivedAt` on both paired rows. Rejects rows that are NOT archived (clear-intent: prevents silent no-op writes). Rejects non-kitchen-ingredient kinds. Compensating revert if Inventory write fails (re-archives MenuItem).
9. **"Show archived (N)" toggle on Kitchen tab** — reveals a sub-section beneath the active list with archived rows, View Details + Restore actions only. `InventoryService.listArchivedByKind` is the data source.
10. **Restore round-trip** — archived ingredient reappears in every active-listing surface (Kitchen tab, Recipe builder dropdown, Expense form dropdown) immediately after restore.

### Verb honesty

11. **"Archive" + "Restore" verbs** — dialog title and primary button read "Archive" (no Delete anywhere visible). Restore action labelled "Restore", not "Undelete" or "Unarchive". UI states what it actually does — the action is reversible, the verbs reflect that.

### Audit-trail row preservation

12. **No physical delete** — soft-archive sets `archivedAt: Date`. Historical StockMovement / Expense / CostHistory rows continue to resolve their `_id` references on the archived MenuItem + Inventory.

### Regression

13. REQ-034 Expense → Inventory link (D10 unit conversion path) — untouched. Helpers in `lib/expense-inventory-link.ts` not modified.
14. REQ-034 Recipe builder + production — ingredient listing changes (archived filter at the source method); recipe creation and execution untouched.
15. REQ-034 customer-menu filter — archived menu-items pair to kitchen-ingredients which already filter out of customer-menu queries via `kind !== 'menu-item'`; no new surface to worry about.
16. REQ-033 UoM registry — consumed read-only; Unit-locked-on-edit relies on the registry but does not modify it.
17. Daily Financial Report — unaffected; soft-delete preserves cost-history rows so weighted-average calculations remain valid.

## Out of Scope

- **Editing Unit on an existing ingredient.** Out of scope — would require migration of every StockMovement / CostHistory / Recipe ingredient row. Operator path: archive + recreate with the new unit.
- **Editing `currentStock` via the Edit dialog.** Out of scope — inventory adjustments must go through the existing StockMovement audit-log path (REQ-026), not the Edit dialog.
- **Physical delete of kitchen ingredients.** Out of scope and unlikely to ever be in scope — would orphan audit-trail back-refs.
- **Bulk archive / bulk restore.** v1 is one-at-a-time. Bulk would need additional auth + audit-trail thinking.
- **Archive of sellable menu-items.** Out of scope — sellable items are managed via the Menu surface, not the Inventory dashboard. A future REQ may extend the soft-archive pattern there.
- **Date-filtered Show-archived list.** v1 shows all archived rows. Date range filtering deferred to a future REQ when the archived list grows large enough to need it.

## Test Types

- **Unit (Vitest):** service-layer methods (`InventoryService.listByKind`, `listArchivedByKind`, `RecipeService.findActiveRecipesReferencingInventory`); server actions (auth, validation, pair-write happy-path, partial-write compensation, active-recipe guard, restore-not-archived rejection).
- **Integration (Vitest with Mongoose mocks):** chainable `find/findOne/sort/lean` mocks covering active + archived filters; populate behaviour on the paired MenuItem document.
- **E2E (Playwright):** 20 tests in `e2e/kitchen/inventory-crud.spec.ts` covering every AC1–AC7 surface — Edit dialog pre-fill + locked Unit field + happy-path saves, validation errors, Archive dialog rendering + happy-path + active-recipe guard + deactivate-then-archive recovery, archived disappearance from three surfaces, Sellable count unaffected, three-action row preservation, View Details navigation, Show archived toggle + Restore round-trip, Archive-verb-not-Delete.
- **Manual UAT:** `compliance/evidence/REQ-037/uat-checklist.md` thin per the REQ-034 D11 pattern — residual items are the historical-data regression check (StockMovement / Expense rows still render for an archived ingredient) and the sign-off ceremony.

## Risks

1. **Pair invariant breaks if MenuItem write succeeds but Inventory write fails.** Mitigated by compensating revert pattern in all three actions; partial-write test asserts the pair stays consistent.
2. **Operator archives an ingredient still in use, orphaning a recipe.** Mitigated by `findActiveRecipesReferencingInventory` guard; error names the offending recipes.
3. **Operator changes the Unit field on Edit and corrupts historical quantities.** Mitigated by Unit field disabled in Edit dialog with explanatory tooltip; recipe-validation already requires matching units.
4. **Operator silently bumps `currentStock` via Edit, bypassing StockMovement audit.** Mitigated by `currentStock` not being a field in the Edit dialog at all.
5. **A new listing surface added in a future REQ misses the `archivedAt` filter.** Mitigated by all three current surfaces filtering at one source (`InventoryService.listByKind`); future surfaces should call the same method. E2E asserts the three current surfaces hide archived rows so a regression on any one is caught.
6. **Restore brings back an ingredient that was archived for a real reason.** Acceptable trade-off — restore is a deliberate, auth-gated action requiring `inventoryManagement`; the round-trip corrupts no data; operator can re-archive.
7. **`InventoryTable` render-prop refactor regresses sellable-row default action layout.** Mitigated by exporting `InventoryItem` type from the table; sellable callers continue to use the default branch (no `renderRowActions` prop). tsc + existing sellable E2E tests catch regression.
