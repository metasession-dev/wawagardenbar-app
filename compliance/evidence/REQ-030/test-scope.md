# REQ-030 — Test Scope

**Issue:** #53
**Risk:** HIGH

## Acceptance Criteria

**AC1 — Schema accepts the new optional fields.**
`ICustomizationOption` and its Mongoose `customizationOptionSchema` accept
`inventoryId?: ObjectId` and `inventoryDeduction?: number`. Saved docs omit the fields
when not provided; round-trip preserves them when present.

**AC2 — Resolver returns the correct linked-inventory deductions.**
`resolveLinkedInventoryFor(menuItem, customizations)` returns
`[{ inventoryId, deductionPerUnit }]` for every selected option whose menu-item option
has an `inventoryId`. `deductionPerUnit` defaults to `1` when `inventoryDeduction` is
undefined.

**AC3 — Base + linked deduction happen in the same order fulfilment flow.**
For a Poundo-with-Ogbono order:

- Poundo inventory decrements by `quantity × portionMultiplier`
- Ogbono inventory decrements by `quantity × portionMultiplier × deductionPerUnit`
- One `StockMovement` row per inventory affected (base + each linked)
- Linked movements carry `category: 'sale'`, `reason: 'Sale (Linked Customization Option)'`,
  and `orderId`

**AC4 — Cancel restores all deducted stock (base + linked).**
`restoreStockForOrder` restores base and linked inventories to their pre-order levels.
Stock movements are recorded with `type: 'addition'`, `reason` reflects a linked restore.

**AC5 — Graceful degradation on missing data.**

- Option selected by the customer but no longer present on the menu item: skipped silently.
- Option has `inventoryId` but the inventory record was deleted: `findById` returns null,
  skipped silently, no throw.
- Option has no `inventoryId`: skipped (not a linked option).

**AC6 — Admin-action validation rejects malformed `inventoryId`.**
Saving a menu item through `updateMenuItemAction` with:

- `inventoryId: "abc"` (too short) → rejected
- `inventoryId: "not-a-hex-string-at-all!!"` → rejected
- `inventoryId: undefined` / `""` → accepted, field omitted
- `inventoryDeduction: 0` or negative → rejected
- `inventoryDeduction: 2.5` → accepted (fractional units allowed, mirrors portion multiplier)

**AC7 — Admin UI exposes the two new inputs per option.**
The customization options builder shows an "Inventory link" selector (populated from the
inventory list passed in) and a "Units to deduct" numeric input per option. Values persist
across save/reload.

**AC8 — Regression: legacy order (no linked options configured) deducts identically to
pre-REQ behaviour.**
A Poundo order where no option has `inventoryId` deducts exactly one Poundo unit and writes
exactly one stock-movement row.

**AC9 — Regression: all existing unit + E2E tests stay green.**

**AC10 — Linked deduction runs independently of base `trackInventory`.**
A menu item with `trackInventory: false` that nonetheless has a customization option with
`inventoryId` set: the base is skipped (unchanged), the linked inventory still deducts.
