# Test Plan — REQ-022

**Requirement:** REQ-022
**Risk Level:** MEDIUM
**GitHub Issue:** #46
**Date:** 2026-04-05

## Tests to Add

- [ ] `__tests__/reports/report-cost-snapshot.test.ts` — verify daily and custom reports use order-snapshotted `item.costPerUnit`, not current inventory cost
- [ ] `__tests__/reports/public-sales-summary-cost.test.ts` — verify public sales summary COGS uses order-snapshotted cost
- [ ] `__tests__/inventory/price-update-inventory-sync.test.ts` — verify `PriceHistoryService.updatePrice()` syncs `Inventory.costPerUnit`

## Tests to Update

- None — `total-revenue-consistency.test.ts` reviewed, contains no cost assertions

## Tests to Remove

- None

## Functional Test Mapping

| Acceptance Criterion                         | Test File                                                 | Test Name                                                              |
| -------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| Reports use order-snapshotted cost (daily)   | `__tests__/reports/report-cost-snapshot.test.ts`          | `daily report uses item.costPerUnit from order, not current inventory` |
| Reports use order-snapshotted cost (custom)  | `__tests__/reports/report-cost-snapshot.test.ts`          | `custom date range report uses item.costPerUnit from order`            |
| Public sales API uses snapshotted cost       | `__tests__/reports/public-sales-summary-cost.test.ts`     | `COGS calculated from order item cost, not inventory`                  |
| Price update syncs inventory cost            | `__tests__/inventory/price-update-inventory-sync.test.ts` | `updatePrice syncs Inventory.costPerUnit`                              |
| Inventory cost not synced leaves stale value | `__tests__/inventory/price-update-inventory-sync.test.ts` | `inventory costPerUnit matches MenuItem after price update`            |
| Menu item save does not write inventory cost | `__tests__/inventory/price-update-inventory-sync.test.ts` | `updateMenuItemAction does not update Inventory.costPerUnit`           |

## Non-Functional Tests (MEDIUM)

- [ ] No new security concerns — changes reduce attack surface (fewer write paths)
- [ ] Form field removal verified via TypeScript compilation (removed field references won't compile)

## Test Data Requirements

- Mock order records with known `costPerUnit` values snapshotted at creation
- Mock inventory records with different `costPerUnit` to prove reports ignore them
- Mock MenuItem + Inventory for sync verification
