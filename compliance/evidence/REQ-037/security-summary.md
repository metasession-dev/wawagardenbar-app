# Security Summary — REQ-037

**Date:** 2026-05-16
**Risk Level:** MEDIUM

## Authorisation & authentication

- Both new server actions (`updateKitchenIngredientAction`, `deleteKitchenIngredientAction`) require **super-admin OR `inventoryManagement` permission**, mirroring the existing `createKitchenIngredientAction` from REQ-034 / D7. Permission check happens server-side in the action; the UI hide-button-when-no-permission is defence-in-depth, not the load-bearing gate.

- No new route added (the actions are invoked from existing kitchen-tab UI under `/dashboard/inventory`, which is already gated by `inventoryManagement` at the layout level).

## Authorisation matrix (post-REQ-037)

| Role / Permission                   | Add (REQ-034) | Edit (REQ-037) | Delete (REQ-037) |
| ----------------------------------- | ------------- | -------------- | ---------------- |
| super-admin                         | ✅ allow      | ✅ allow       | ✅ allow         |
| admin with `inventoryManagement`    | ✅ allow      | ✅ allow       | ✅ allow         |
| admin without `inventoryManagement` | ❌ forbidden  | ❌ forbidden   | ❌ forbidden     |
| csr (default permissions)           | ❌ forbidden  | ❌ forbidden   | ❌ forbidden     |

## Data integrity

- **Soft-delete, not physical removal.** Both paired rows (MenuItem + Inventory) get an `archivedAt: Date` field; queryable by `_id` so historical `StockMovement`, `InventoryItemCostHistory`, and `Expense.linkedInventoryId` back-references continue to resolve.
- **Active-recipe guard** prevents deletion of an ingredient that any active recipe consumes. The guard names the offending recipes so the operator can deactivate them first. Deactivated recipes are not a blocker — they're not used for production batches anyway.
- **Unit field is locked on edit.** Changing the storage unit retroactively would corrupt every prior `StockMovement.quantity`, `InventoryItemCostHistory.costPerUnit`, and any `Recipe.ingredients[].unitId` referencing this ingredient. The Edit dialog renders the field disabled with a tooltip pointing to delete + recreate if a different unit is genuinely needed.
- **currentStock is locked on edit.** Inventory adjustment is a separate concern; conflating it with the edit flow would let an operator silently move stock without a `StockMovement` audit row. Out of scope for REQ-037.

## Threat model (deltas from REQ-034)

| Threat                                                                                   | Mitigation                                                                                      |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Malicious admin deletes a kitchen ingredient still in use, orphaning recipes             | Active-recipe guard blocks with a clear error naming the recipes                                |
| Physical delete corrupts audit trail (StockMovement references → null inventory rows)    | Soft-delete preserves the rows; archive flag is a UI-side filter only                           |
| Operator changes unit on edit and corrupts past quantities                               | Unit field disabled in Edit dialog (UI gate); recipe-validation already requires matching units |
| Operator silently changes `currentStock` via edit, bypassing the StockMovement audit log | `currentStock` field is not in the Edit dialog at all                                           |
| csr or admin without `inventoryManagement` reaches the actions                           | Auth check in the server action (mirrors REQ-034 / D7 pattern); UI hides the buttons            |

## Tests added

- Unit tests covering every threat-table row above (see `test-plan.md` AC mapping)
- E2E walks covering the UI gates + happy-paths + blocking-error rendering
