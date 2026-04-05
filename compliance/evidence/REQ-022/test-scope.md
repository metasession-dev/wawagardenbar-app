# Test Scope — REQ-022

**Risk Level:** MEDIUM
**Requirement:** Fix financial reports using current inventory cost instead of snapshotted order cost; remove duplicate Cost Per Unit field from inventory section; auto-sync inventory cost on price update
**GitHub Issue:** #46
**Date:** 2026-04-05

## Test Approach

Standard gates plus targeted verification.

**Universal gates (mandatory — verified locally AND in CI):**

- TypeScript compilation: 0 errors
- SAST scan: 0 high/critical findings
- Dependency audit: 0 high/critical vulnerabilities
- E2E suite: all pass (full suite local, unauthenticated subset in CI)
- Human code review via PR

**Additional testing required by risk level:**

- [x] Historical report accuracy: verify daily/custom reports use snapshotted `item.costPerUnit` from orders, not current inventory cost
- [x] Public sales summary: verify COGS calculation uses order-snapshotted cost
- [x] Price update sync: verify `PriceHistoryService.updatePrice()` syncs `Inventory.costPerUnit` alongside `MenuItem.costPerUnit`
- [x] Inventory analytics: verify waste cost, stock valuation, profitability still work after sync change
- [x] Form field removal: verify Cost Per Unit no longer appears in Inventory section of menu item edit form
- [x] No regression: existing report tests continue to pass

## Validation Approach

- Generate a daily report for a date with known orders — verify cost/profit figures match the costs snapshotted at order time, not current menu/inventory costs
- Change a menu item's cost via Price Management — verify Inventory.costPerUnit is updated in sync
- Confirm the edit form no longer shows a separate Cost Per Unit in the Inventory section

## Acceptance Criteria

- [x] `financial-report-service.ts` uses `item.costPerUnit` from order records (not `inventory.costPerUnit`) in both daily and custom report generation
- [x] `app/api/public/sales/summary/route.ts` uses `item.costPerUnit` from order records
- [x] `PriceHistoryService.updatePrice()` syncs `Inventory.costPerUnit` when updating price/cost
- [x] Cost Per Unit field removed from Inventory section of both `menu-item-edit-form.tsx` and `menu-item-form.tsx`
- [x] `costPerUnit` no longer submitted as part of inventory form data in `updateMenuItemAction()`
- [x] Inventory analytics (waste cost, stock valuation) still function correctly via synced value
- [x] `Price (₦)` field in Basic Information section of edit form is read-only
- [x] `updateMenuItemAction()` no longer writes `MenuItem.price` directly
- [x] Create form still allows setting initial price
- [x] All additional testing items above pass
