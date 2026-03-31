# Test Plan — REQ-018

**Requirement:** Staff Pot — inventory loss deduction with configurable thresholds
**Risk Level:** MEDIUM
**Date:** 2026-03-30

## Unit Tests

### New: `__tests__/staff-pot/staff-pot-inventory-loss.test.ts`

| Test                                            | Description                                             |
| ----------------------------------------------- | ------------------------------------------------------- |
| no deduction when feature is disabled           | Config `inventoryLossEnabled: false` → deductions are 0 |
| no deduction when loss is below threshold       | Food loss 1%, threshold 2% → no food deduction          |
| deduction when loss exceeds threshold           | Food loss 4%, threshold 2% → deduct 2% excess           |
| food loss deducts from kitchen pot only         | Drink pot unchanged                                     |
| drink loss deducts from bar pot only            | Kitchen pot unchanged                                   |
| both food and drink loss exceed thresholds      | Both pots deducted independently                        |
| deduction capped at pot amount                  | Cannot go negative                                      |
| no deduction when no approved snapshots         | 0% loss, 0 deduction                                    |
| loss uses negative discrepancies only           | Positive discrepancies (surplus) ignored                |
| per-person bonus reflects post-deduction amount | Kitchen/bar per-person recalculated                     |

### Update: `__tests__/staff-pot/staff-pot-calculation.test.ts`

| Test                  | Change                                              |
| --------------------- | --------------------------------------------------- |
| Existing payout tests | Verify unchanged when `inventoryLossEnabled: false` |

## E2E Tests

### Update: `e2e/staff-pot.spec.ts`

| Test                        | Change                                                                |
| --------------------------- | --------------------------------------------------------------------- |
| config form visible         | Add assertions for enable/disable toggle, food/drink threshold fields |
| config saves and persists   | Test saving loss deduction settings                                   |
| super-admin daily breakdown | Verify loss breakdown section visible when enabled                    |
| admin view                  | Verify deduction text visible, no loss % or threshold shown           |

## Regression

Run full Playwright suite — all existing tests must pass.

## Verification

- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Full suite — no regressions
