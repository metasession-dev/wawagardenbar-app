# REQ-030 — Implementation Plan

**Issue:** #53
**Title:** Multi-component inventory deduction via customization option inventory links
**Risk:** HIGH (MEDIUM baseline — inventory/finance + critical order-creation path — with AI-involvement +1)
**Branch:** `develop`

---

## Problem

A combo dish like "Poundo with Ogbono" is one menu item with one inventory record. Today,
ordering it deducts only one unit of stock — the swallow. The soup side (Ogbono / Egusi / Ugu)
is its own inventory record and never gets touched. Stock counts drift; reorder signals lie.

There is no way in the data model to say "this customization option consumes stock from that
other inventory record."

## Solution (one-line)

Let any `ICustomizationOption` carry an optional `(inventoryId, inventoryDeduction)` pair.
When the order deduction loop runs, for every selected option that has an `inventoryId`,
also decrement that inventory record by `quantity × portionMultiplier × inventoryDeduction`.

## Architecture Decisions

- **D1 — Optional fields, no migration.** `inventoryId?` and `inventoryDeduction?` are optional
  on the schema. All existing documents stay valid. `inventoryDeduction` defaults to 1 when
  `inventoryId` is present but the number is omitted.
- **D2 — Match order-item customization to menu-item option by `(groupName, optionName)`.**
  The order already persists `customizations: [{ name, option, price }]`. The lookup walks
  `menuItem.customizations[].options[]` and matches on `(group.name === c.name) && (option.name === c.option)`.
  No new stable IDs; strings are already how the order recorded the choice.
- **D3 — Linked deduction is `InventoryModel.findById(inventoryId)`.** Distinct from the base
  deduction which is `findOne({ menuItemId })`. The two are independent: a linked option's
  `inventoryId` points at an inventory record (e.g. "Ogbono stock"), not at a menu item.
- **D4 — Portion multiplier applies to linked stock too.** Half-portion Poundo ⇒ half a unit of
  Ogbono. Quantity × portionMultiplier × inventoryDeduction.
- **D5 — Linked deduction runs independently of the base item's `trackInventory`.** A drink
  menu item could theoretically link a customization option to a garnish inventory record
  even if the drink itself doesn't track stock. Covered by test.
- **D6 — Restore on cancel mirrors deduction.** `restoreStockForOrder` already restores
  base stock; we add the symmetric restore for every linked option on every item.
- **D7 — Server-side validation at the admin action boundary.** `inventoryId` must be a
  24-hex ObjectId string; `inventoryDeduction` must be a finite number > 0. Missing/empty
  allowed. Malformed rejected with a clear error. (Zod schema in the action.)
- **D8 — Same-inventory aggregation is lossless.** If two selected options on a single order
  item both link the same `inventoryId`, we deduct each one separately (two stock-movement
  rows, clear audit trail). Totals match.
- **D9 — Single source of truth for the option → inventory mapping.** A new
  `lib/customization-inventory.ts` module exposes:
  - `resolveLinkedInventoryFor(menuItem, orderItemCustomizations)` ⇒ `Array<{ inventoryId, deductionPerUnit }>`

  Consumed by both `deductStockForOrder` and `restoreStockForOrder`; never inlined.

## Out of Scope (explicit)

- **Pre-order availability check across linked inventories.** Combo may become unorderable
  when the soup is out. That's a separate REQ — the current `isItemAvailable` /
  `checkAvailability` only look at the base menu item. Documented as a follow-up.
- **Reports / analytics code changes.** Inventory reports read from `InventoryModel` and
  `StockMovementModel`. Linked deductions will show up in both naturally; no change needed.
- **Multi-location deduction for linked options.** The base deduction today uses the
  non-location path (`currentStock`). Linked deduction will match that. Location-aware
  deduction is a follow-up for both.
- **Backfill of `inventoryId` on existing customization options.** None exist today, so
  there is nothing to backfill.
- **Cart / checkout UI changes.** The selection mechanism already exists. Only the admin UI
  (where an operator configures the link) is new.

## Files

### New

- `lib/customization-inventory.ts` — option-to-inventory resolution helper
- `__tests__/lib/customization-inventory.test.ts`
- `__tests__/services/inventory-service.customization-linked.test.ts`
- `__tests__/actions/admin/menu-actions.customization-inventory.test.ts`
- `e2e/menu-customization-inventory.spec.ts`
- `compliance/evidence/REQ-030/` — plan, test-scope, test-plan, ai-prompts, ai-use-note

### Modified

- `interfaces/menu-item.interface.ts` — `ICustomizationOption` gains `inventoryId?`, `inventoryDeduction?`
- `models/menu-item-model.ts` — mirror fields on `customizationOptionSchema`
- `services/inventory-service.ts` — `deductStockForOrder` + `restoreStockForOrder` call linked-option path
- `app/actions/admin/menu-actions.ts` — Zod validation on customizations before save
- `components/features/admin/customization-options-builder.tsx` — inventory link select + units input per option
- `components/features/admin/menu-item-edit-form.tsx` — load inventory list, pass to builder
- `components/features/admin/menu-item-form.tsx` — same treatment for the create form (verify inventory list already fetched or add a loader)
- `compliance/RTM.md` — REQ-030 row

## Dependencies

None added. No package bumps.

## Rollback

Revert the merge commit on `main`. No data changes required; all new fields are optional.

## Risk Register

| Risk                                                                       | Mitigation                                                                                                                                 |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Stock under-deducts on legacy orders (no linked option configured yet)     | Resolver returns empty array — identical to pre-REQ behaviour. Regression test asserts this.                                               |
| Malformed `inventoryId` persisted by a misbehaving client                  | Zod validation at the admin action boundary rejects. Unit-tested.                                                                          |
| Linked inventory record deleted after menu item saved                      | Resolver returns the id, deduction loop does `findById` and no-ops silently if not found. Matches existing "skip if no inventory" pattern. |
| Double-deduction if same `inventoryId` is on two options of one order item | Each option deducts once, separately. Correct by construction ("2 soups chosen ⇒ 2 soups deducted").                                       |
| ReDoS / injection                                                          | None. No regex, no user strings in query keys.                                                                                             |
