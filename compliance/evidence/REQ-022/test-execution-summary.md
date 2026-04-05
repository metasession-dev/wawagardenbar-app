# Test Execution Summary — REQ-022

**Date:** 2026-04-05
**Git SHA:** 68042ad
**CI Run:** 23999884423

## Gate Results

| Gate             | Result | Details                                                            |
| ---------------- | ------ | ------------------------------------------------------------------ |
| TypeScript       | PASS   | 0 errors                                                           |
| SAST             | PASS   | 1 pre-existing finding (xlsx-parser formatstring — tracked in #42) |
| Dependency Audit | PASS   | 1 high (xlsx, no fix available — pre-existing, tracked in #42)     |
| Unit Tests       | PASS   | 211/211 passed (12 new for REQ-022)                                |
| E2E Tests        | PASS   | 5/5 passed, 1 skipped (auth not available)                         |
| CI Pipeline      | PASS   | Run 23999884423 completed successfully                             |

## Test Changes in This Release

**Added:**

- `__tests__/reports/report-cost-snapshot.test.ts` — 4 tests (daily + custom reports use order-snapshotted cost)
- `__tests__/reports/public-sales-summary-cost.test.ts` — 3 tests (public sales COGS uses snapshotted cost)
- `__tests__/inventory/price-update-inventory-sync.test.ts` — 5 tests (price update syncs inventory, general save does not write cost)
- `e2e/cost-snapshot.spec.ts` — 3 tests (Cost Per Unit field absent from inventory section, daily report loads)

**Updated:**

- None

**Removed:**

- None

## Test Plan Coverage

| Acceptance Criterion                               | Status | Test                                                                                              |
| -------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| Reports use order-snapshotted cost (daily)         | PASS   | `report-cost-snapshot.test.ts::daily report uses item.costPerUnit from order`                     |
| Reports use order-snapshotted cost (custom)        | PASS   | `report-cost-snapshot.test.ts::custom date range report uses item.costPerUnit from order`         |
| Public sales API uses snapshotted cost             | PASS   | `public-sales-summary-cost.test.ts::COGS calculated from order item cost`                         |
| Price update syncs inventory cost                  | PASS   | `price-update-inventory-sync.test.ts::updatePrice syncs Inventory.costPerUnit`                    |
| Inventory cost matches MenuItem after update       | PASS   | `price-update-inventory-sync.test.ts::inventory costPerUnit matches MenuItem`                     |
| Menu item save does not write inventory cost       | PASS   | `price-update-inventory-sync.test.ts::updateMenuItemAction does not update Inventory.costPerUnit` |
| Cost Per Unit field removed from inventory section | PASS   | `cost-snapshot.spec.ts::menu item edit form does not have Cost Per Unit`                          |

## Evidence Locations

| Evidence          | Location                                                     |
| ----------------- | ------------------------------------------------------------ |
| E2E results       | META-COMPLY: wawagardenbar-app/REQ-022/e2e-results.json      |
| Unit test results | META-COMPLY: wawagardenbar-app/REQ-022/unit-test-results.txt |
| SAST results      | META-COMPLY: wawagardenbar-app/REQ-022/sast-results.json     |
| Dependency audit  | META-COMPLY: wawagardenbar-app/REQ-022/dependency-audit.json |
