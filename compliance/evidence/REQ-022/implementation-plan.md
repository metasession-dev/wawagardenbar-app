# Implementation Plan — REQ-022

**Requirement:** REQ-022
**Risk Level:** MEDIUM
**GitHub Issue:** #46
**Date:** 2026-04-05

## Overview

Fix financial reports to use order-snapshotted cost data instead of current inventory cost. Remove the duplicate Cost Per Unit field from the inventory section of the menu item edit form. Auto-sync `Inventory.costPerUnit` when prices are updated via Price Management.

## Part A — Reports: use order-snapshotted cost

### Files to modify

1. **`services/financial-report-service.ts`** (lines 306-316, 563-573)
   - Remove `InventoryModel.findOne()` lookup for cost
   - Use `item.costPerUnit` directly from order items instead of `inventory?.costPerUnit`
   - Applies to both `generateDailySummary()` and custom date range report

2. **`app/api/public/sales/summary/route.ts`** (lines 94-101)
   - Remove `InventoryModel.findOne()` lookup for cost
   - Use `item.costPerUnit` directly from order items

### Approach

The order items already have `costPerUnit` snapshotted at creation time by `OrderService.enrichOrderItemsWithCosts()`. The reports currently ignore this and re-fetch from inventory. The fix is to stop fetching and use what's already there.

## Part B — Remove duplicate Cost Per Unit field from form

### Files to modify

3. **`components/features/admin/menu-item-edit-form.tsx`**
   - Remove the `costPerUnit` field from the inventory section (lines 878-888)
   - Remove `costPerUnit` from the Zod schema (line 67)
   - Remove `costPerUnit` from form default values (line 174)
   - Remove `costPerUnit` from FormData append (line 279)

4. **`app/actions/admin/menu-actions.ts`** (line 390)
   - Remove the `costPerUnit` update from `updateMenuItemAction()` — inventory cost should only be set via Price Management sync

## Part C — Auto-sync inventory cost on price update

### Files to modify

5. **`services/price-history-service.ts`** (lines 105-109)
   - After updating `MenuItem.costPerUnit`, also update `Inventory.costPerUnit` for the linked inventory record
   - Import `InventoryModel`
   - Add: `await InventoryModel.findOneAndUpdate({ menuItemId }, { costPerUnit: newCostPerUnit })`

## Architecture Decisions

- **Why not remove `Inventory.costPerUnit` entirely?** It's used by `inventory-service.ts` for waste cost, stock valuation, and profitability analytics. Removing it would require refactoring those to look up MenuItem or PriceHistory, which is out of scope. Auto-sync keeps them working.
- **Why sync from PriceHistoryService, not from the form?** Single source of truth — all cost changes flow through Price Management, which creates an audit trail. The form no longer has a path to update inventory cost independently.

## Part C — Make price read-only in Basic Information

### Files to modify

6. **`components/features/admin/menu-item-edit-form.tsx`**
   - Make the `Price (₦)` field in Basic Information read-only — display current price but prevent editing
   - Add helper text indicating price changes should be made via Price Management

7. **`app/actions/admin/menu-actions.ts`** (line 331)
   - Remove `if (!isNaN(price)) menuItem.price = price;` from `updateMenuItemAction()` — price should only be set via `PriceHistoryService.updatePrice()`

### Architecture Decisions

- **Why read-only instead of removing?** Users need to see the current price in context alongside other item details. Hiding it would make the form confusing. Read-only with a pointer to Price Management is the clearest UX.
- **Create form keeps price editable** — new items need an initial price set. Only the edit form locks it down since Price Management is available there.

## Order of Implementation

1. Write tests first (per test plan) ✅
2. Part A — fix reports ✅
3. Part B — remove cost form field, add auto-sync ✅
4. Part C — make price read-only in edit form, remove price write from update action
5. Run all gates
