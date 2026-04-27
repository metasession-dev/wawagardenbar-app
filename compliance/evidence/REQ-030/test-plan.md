# REQ-030 — Test Plan

**Issue:** #53
**Risk:** HIGH
**Branch:** `develop`

Maps each acceptance criterion in `test-scope.md` to concrete test files and cases. Unit tests
are TDD and MUST be written before implementation. E2E tests are written against the working
implementation.

## Testing approach

Follows the project pattern of pure unit tests with `@/lib/mongodb` and the Mongoose models
mocked (see `__tests__/services/system-settings-service.expense-categories.test.ts`,
`__tests__/services/expense-service.search.test.ts`).

A new `lib/customization-inventory.ts` module holds the resolver; it has no Mongo
dependency and is the primary unit-test target. Service tests mock `InventoryModel`,
`MenuItemModel`, `OrderModel`, `StockMovementModel` and assert query-shape / side effects.

## Test files

| Status    | Path                                                                   | Purpose                                                                                                                   |
| --------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| NEW       | `__tests__/lib/customization-inventory.test.ts`                        | Pure unit tests for the resolver — AC2, AC5 (name mismatch path)                                                          |
| NEW       | `__tests__/services/inventory-service.customization-linked.test.ts`    | Mocked-model unit tests for `deductStockForOrder` + `restoreStockForOrder` — AC3, AC4, AC5 (missing inventory), AC8, AC10 |
| NEW       | `__tests__/actions/admin/menu-actions.customization-inventory.test.ts` | Admin action validation — AC6                                                                                             |
| NEW       | `e2e/menu-customization-inventory.spec.ts`                             | Playwright — AC7 (admin UI round-trip)                                                                                    |
| UNCHANGED | all other existing unit and E2E spec files                             | Regression — must stay green — AC9                                                                                        |

## Unit tests (Phase 1 — TDD, before implementation)

### `__tests__/lib/customization-inventory.test.ts`

```
describe('REQ-030: resolveLinkedInventoryFor')
  it('returns empty array when menu item has no customizations')                 // AC2 baseline
  it('returns empty array when order item has no selected customizations')       // AC2 baseline
  it('returns empty array when selected option has no inventoryId')              // AC2
  it('returns one entry per selected option with an inventoryId')                // AC2, AC3 setup
  it('defaults deductionPerUnit to 1 when inventoryDeduction omitted')           // AC2
  it('uses inventoryDeduction verbatim when provided')                           // AC2
  it('returns multiple entries when multiple groups link inventories')           // AC2
  it('skips selected option when menu item group name no longer matches')        // AC5
  it('skips selected option when menu item option name no longer matches')      // AC5
  it('returns duplicate entries when two options point at the same inventoryId') // AC2 (aggregation is loop-side, not resolver-side)
```

### `__tests__/services/inventory-service.customization-linked.test.ts`

Mocks `@/lib/mongodb`, `@/models/inventory-model`, `@/models/menu-item-model`,
`@/models/order-model`, `@/models/stock-movement-model`. Uses `vi.spyOn` on `findById` and
`findOne` to capture arguments, and on `StockMovementModel.create` to assert one call per
deducted inventory.

```
describe('REQ-030: deductStockForOrder — linked customization options')
  it('deducts base Poundo stock AND Ogbono stock for a Poundo-with-Ogbono order')   // AC3
  it('records one stock-movement row for base, one for each linked inventory')       // AC3
  it('scales linked deduction by item.quantity')                                     // AC3
  it('scales linked deduction by item.portionMultiplier (half portion)')             // AC3
  it('applies inventoryDeduction multiplier (option says deduct 2)')                 // AC2 + AC3
  it('is a no-op on linked stock when order item has no customizations')             // AC8
  it('is a no-op on linked stock when selected option has no inventoryId')           // AC8
  it('silently skips linked deduction when inventory record is missing')             // AC5
  it('still deducts linked stock when base menuItem.trackInventory is false')        // AC10
  it('records stock-movement with category=sale and linked reason string')           // AC3

describe('REQ-030: restoreStockForOrder — linked customization options')
  it('restores base AND linked stock for a cancelled Poundo-with-Ogbono order')      // AC4
  it('records addition-type stock movements for each linked inventory')              // AC4
  it('is a no-op when order was never inventory-deducted')                           // existing behaviour preserved
```

### `__tests__/actions/admin/menu-actions.customization-inventory.test.ts`

Mocks `@/lib/mongodb`, `@/models/menu-item-model`, `@/lib/session`, `next/cache`.
Builds a `FormData` and drives `updateMenuItemAction`.

```
describe('REQ-030: updateMenuItemAction — customization inventory links')
  it('accepts valid 24-hex inventoryId + numeric inventoryDeduction and persists both')  // AC6
  it('accepts customizations with no inventoryId at all (legacy shape preserved)')        // AC6
  it('accepts inventoryId undefined or empty string (field omitted on save)')             // AC6
  it('rejects inventoryId that is not 24 hex chars')                                      // AC6
  it('rejects inventoryId with non-hex characters')                                       // AC6
  it('rejects inventoryDeduction of 0')                                                   // AC6
  it('rejects negative inventoryDeduction')                                               // AC6
  it('accepts fractional inventoryDeduction (2.5)')                                       // AC6
  it('rejects inventoryDeduction that is NaN / Infinity')                                 // AC6
```

## E2E tests (Phase 3 — after implementation)

### `e2e/menu-customization-inventory.spec.ts`

Seeds one menu item with one customization group ("Soup") and two options
("Ogbono", "None") via API or direct service call. Seeds two inventory records. Uses the
existing `auth.setup.ts` super-admin session.

```
test.describe('REQ-030: Menu customization inventory links — admin UI')
  test('inventory link select + units input render per option on edit page')     // AC7
  test('saving with a linked inventory persists across reload')                  // AC7
  test('clearing the inventory link removes it from the saved doc on reload')    // AC7
```

One Playwright spec. No checkout E2E (the server-side deduction is covered by unit tests
that assert the precise query shapes).

## Mapping AC → tests (traceability)

| AC   | Unit (lib)                          | Unit (service)                         | Unit (action)            | E2E                  |
| ---- | ----------------------------------- | -------------------------------------- | ------------------------ | -------------------- |
| AC1  | schema types exercised via fixtures | —                                      | round-trip persist test  | reload persistence   |
| AC2  | resolver suite (9 tests)            | — (consumes resolver)                  | —                        | —                    |
| AC3  | —                                   | Poundo+Ogbono deduction + movement row | —                        | —                    |
| AC4  | —                                   | cancel restore suite                   | —                        | —                    |
| AC5  | name-mismatch skip                  | missing-inventory silent skip          | —                        | —                    |
| AC6  | —                                   | —                                      | 9 validation tests       | —                    |
| AC7  | —                                   | —                                      | —                        | admin UI round-trip  |
| AC8  | —                                   | no-op when customizations empty        | accepts legacy-shape     | —                    |
| AC9  | —                                   | existing tests unchanged               | existing tests unchanged | existing specs green |
| AC10 | —                                   | base untracked / linked still tracks   | —                        | —                    |

## Gates (Phase 4)

```
npx tsc --noEmit                    # 0 errors
semgrep scan --config auto .        # 0 high/critical
npm audit --audit-level=high        # 0 (xlsx allowlisted)
npx vitest run                      # all pass (new + existing)
npx playwright test                 # all pass (new + existing)
```

Evidence captured: vitest output, playwright report, semgrep JSON, npm audit JSON — uploaded
to META-COMPLY; markdown summary committed to
`compliance/evidence/REQ-030/test-execution-summary.md` after CI green.

## Test authorship discipline

- **Phase 1** — the three unit test files above are written FIRST. They must initially fail
  against current `main` code (no `lib/customization-inventory.ts`, no new schema fields).
  Commit as `test: [REQ-030] ...` BEFORE any implementation commit.
- **Phase 2** — implementation is written until every unit test above is green.
- **Phase 3** — E2E spec is written against the working implementation.
- **Phase 4** — all gates run locally, then single push.

No implementation code is committed before Phase 1 tests exist.
