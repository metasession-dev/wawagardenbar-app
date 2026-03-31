# Test Execution Summary — REQ-018

**Requirement:** Staff Pot — inventory loss deduction with configurable thresholds
**Date:** 2026-03-31 (final)
**Git SHA:** 85d74bb

## Gate Results

| Gate                   | Result | Details                                           |
| ---------------------- | ------ | ------------------------------------------------- |
| TypeScript             | PASS   | 0 errors                                          |
| SAST (Semgrep)         | PASS   | 0 new high/critical (8 pre-existing baseline)     |
| Dependency Audit       | PASS   | 0 unaccepted high/critical (xlsx = accepted risk) |
| Unit Tests (Vitest)    | PASS   | 136 passed, 0 failed                              |
| E2E Tests (Playwright) | PASS   | 260 passed, 1 pre-existing failure (CSR dialog)   |
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

### New E2E Tests: `e2e/inventory-snapshots.spec.ts` (13 tests)

| Test                                                              | Result |
| ----------------------------------------------------------------- | ------ |
| Inventory page loads for super-admin                              | PASS   |
| Inventory summary page shows snapshot configuration               | PASS   |
| Can load food inventory data and see items                        | PASS   |
| Snapshots list page loads and shows entries                       | PASS   |
| Can filter snapshots by food category                             | PASS   |
| Can view snapshot details and see inventory items                 | PASS   |
| Approved food snapshot shows correct status and category          | PASS   |
| Pending snapshot shows approve and reject buttons                 | PASS   |
| Staff pot shows Inventory Loss Deductions when feature is enabled | PASS   |
| Food inventory value is non-zero (#35 regression guard)           | PASS   |

### Updated E2E Tests: `e2e/staff-pot.spec.ts`

| Test                            | Change                                               | Result |
| ------------------------------- | ---------------------------------------------------- | ------ |
| Config form visible in settings | Added assertion for enable/disable toggle            | PASS   |
| Monthly countdown               | Fixed selector to use heading role (strict mode fix) | PASS   |

## Acceptance Criteria → Test Mapping

| Criteria                             | Test Coverage                                            |
| ------------------------------------ | -------------------------------------------------------- |
| Enable/disable toggle                | E2E: config form + Unit: disabled = 0 deduction          |
| Separate food/drink thresholds       | Unit: food-only, drink-only, both exceed                 |
| Loss % from approved snapshots       | Service: queries approved status only                    |
| Excess deduction calculation         | Unit: threshold exceeded, matches example                |
| Food → kitchen, drink → bar          | Unit: food deducts kitchen only, drink deducts bar only  |
| No deduction below threshold         | Unit: below and equal threshold                          |
| Deduction capped at pot              | Unit: capped at pot amount                               |
| Admin view: inventory care           | E2E: admin view tests (progress bars, plain English)     |
| Super-admin view: full breakdown     | E2E: super-admin view tests                              |
| Feature disabled by default          | Config defaults: inventoryLossEnabled = false            |
| Snapshot inventoryId preserved (#35) | E2E: food inventory value non-zero regression guard      |
| Month-end finalization (#36)         | Functional: finalize button, config freeze, locked badge |
| Uncapped deduction display (#38)     | Functional: raw deduction + "capped at" note             |
| Last-day readiness checks (#39)      | Functional: checklist items, finalization gate, override |

## Bug Fixes Included

### #35 — Inventory Value Calculation

- Per-item aggregation fix (80a7538)
- inventoryId in snapshot submission payload (24936a3)
- menuItemId fallback in cost lookup (43d78c6)
- UAT backfill: 9 snapshots, 442 items fixed

### #38 — Deduction Display

- Show uncapped deduction with "capped at" note
- Excess % to 2 decimal places for precision

## Evidence Locations

| Artifact          | Location                                      |
| ----------------- | --------------------------------------------- |
| Unit test results | META-COMPLY portal: wawagardenbar-app/REQ-018 |
| E2E results       | META-COMPLY portal: wawagardenbar-app/REQ-018 |
| SAST results      | META-COMPLY portal: wawagardenbar-app/REQ-018 |
| Dependency audit  | META-COMPLY portal: wawagardenbar-app/REQ-018 |
