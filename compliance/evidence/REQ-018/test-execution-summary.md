# Test Execution Summary — REQ-018

**Requirement:** Staff Pot — inventory loss deduction with configurable thresholds
**Date:** 2026-03-30
**Git SHA:** pending (this commit)

## Gate Results

| Gate                   | Result | Details                                           |
| ---------------------- | ------ | ------------------------------------------------- |
| TypeScript             | PASS   | 0 errors                                          |
| SAST (Semgrep)         | PASS   | 0 new high/critical (8 pre-existing baseline)     |
| Dependency Audit       | PASS   | 0 unaccepted high/critical (xlsx = accepted risk) |
| Unit Tests (Vitest)    | PASS   | 136 passed, 0 failed                              |
| E2E Tests (Playwright) | PASS   | 213 passed, 32 skipped (auth-dependent), 0 failed |
| Build                  | PASS   | Next.js production build succeeds                 |

## Test Changes

### New Unit Tests: `__tests__/staff-pot/staff-pot-inventory-loss.test.ts` (12 tests)

| Test                                                          | Result |
| ------------------------------------------------------------- | ------ |
| No deduction when feature is disabled                         | PASS   |
| No deduction when loss is below threshold                     | PASS   |
| No deduction when loss equals threshold                       | PASS   |
| Deduction when loss exceeds threshold (matches issue example) | PASS   |
| Food loss deducts from kitchen pot only                       | PASS   |
| Drink loss deducts from bar pot only                          | PASS   |
| Both food and drink loss exceed thresholds                    | PASS   |
| Deduction capped at pot amount (cannot go negative)           | PASS   |
| No deduction when no approved snapshots                       | PASS   |
| Loss uses negative discrepancies only                         | PASS   |
| Per-person bonus reflects post-deduction amount               | PASS   |
| Excess loss calculation from percentage and value             | PASS   |

### Updated E2E Tests: `e2e/staff-pot.spec.ts`

| Test                            | Change                                    | Result |
| ------------------------------- | ----------------------------------------- | ------ |
| Config form visible in settings | Added assertion for enable/disable toggle | PASS   |

## Acceptance Criteria → Test Mapping

| Criteria                         | Test Coverage                                           |
| -------------------------------- | ------------------------------------------------------- |
| Enable/disable toggle            | E2E: config form + Unit: disabled = 0 deduction         |
| Separate food/drink thresholds   | Unit: food-only, drink-only, both exceed                |
| Loss % from approved snapshots   | Service: queries approved status only                   |
| Excess deduction calculation     | Unit: threshold exceeded, matches example               |
| Food → kitchen, drink → bar      | Unit: food deducts kitchen only, drink deducts bar only |
| No deduction below threshold     | Unit: below and equal threshold                         |
| Deduction capped at pot          | Unit: capped at pot amount                              |
| Admin view: amount only          | E2E: admin view tests (no loss %, no threshold)         |
| Super-admin view: full breakdown | E2E: super-admin view tests                             |
| Feature disabled by default      | Config defaults: inventoryLossEnabled = false           |

## Bug Fix: #35 — Inventory Value Calculation

**Problem:** `calculateInventoryLoss` multiplied `costPerUnit * aggregateSystemTotal` for every inventory record instead of per-item. This produced inflated values (₦1.5B for a bar).

**Fix:** Calculate inventory value per snapshot item during the iteration pass. Batch-lookup costs upfront, then multiply `costPerUnit * systemInventoryCount` per item.

**Verification:** TypeScript clean, all 136 unit tests pass, all E2E pass.

## Evidence Locations

| Artifact          | Location                                      |
| ----------------- | --------------------------------------------- |
| Unit test results | META-COMPLY portal: wawagardenbar-app/REQ-018 |
| E2E results       | META-COMPLY portal: wawagardenbar-app/REQ-018 |
| SAST results      | META-COMPLY portal: wawagardenbar-app/REQ-018 |
| Dependency audit  | META-COMPLY portal: wawagardenbar-app/REQ-018 |
