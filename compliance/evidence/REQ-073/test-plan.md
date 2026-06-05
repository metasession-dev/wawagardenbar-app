# REQ-073 — Test plan

**Requirement ID:** REQ-073
**Risk:** MEDIUM (inherits from sub-issue #296's cluster classification; pure test addition)
**Related issue:** [#296](https://github.com/metasession-dev/wawagardenbar-app/issues/296) (sub-issue of umbrella [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291))
**Date:** 2026-06-05

## Acceptance criteria → tests

| AC  | Statement                                                                                                                                                                                                                                                      | Test                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| AC1 | `MenuItemModel.deleteOne()` against a seeded item removes it; Order document seeded with that item's `menuItemId` retains its embedded snapshot (name + price + reference) intact.                                                                             | `e2e/admin/menu-item-delete.spec.ts` — test 1    |
| AC2 | Duplicate creates a new MenuItem with `" (Copy)"` name suffix + unique slug (`-copy-${ts}`) + `isAvailable: false`; original unchanged.                                                                                                                        | `e2e/admin/menu-item-duplicate.spec.ts` — test 1 |
| AC3 | `ProductionService.voidBatch` flips production.status to 'voided' + sets voidedBy/voidedAt + restores ingredient inventory + reverses yield inventory + writes 2 StockMovement audit rows (one 'addition' per ingredient, one 'deduction' for yield reversal). | `e2e/admin/kitchen-void-batch.spec.ts` — test 1  |
| AC4 | Re-voiding an already-voided batch is a no-op (idempotent — second call leaves inventory + StockMovement counts unchanged).                                                                                                                                    | `e2e/admin/kitchen-void-batch.spec.ts` — test 2  |

## Storage-layer contracts under test

| Contract                                                                           | Source                                      | Pinned by                |
| ---------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------ |
| `menuItem.deleteOne()` removes the active item                                     | `app/actions/admin/menu-actions.ts:594`     | menu-item-delete spec    |
| Order.items[].menuItemId snapshot persistence after MenuItem hard-delete           | implicit in `Order.items` schema            | menu-item-delete spec    |
| Duplicate name suffix " (Copy)" + isAvailable false + unique slug                  | `app/actions/admin/menu-actions.ts:901-906` | menu-item-duplicate spec |
| `ProductionService.voidBatch` ingredient + yield reversal + 2 StockMovement writes | `services/production-service.ts:300-393`    | kitchen-void-batch spec  |
| `voidBatch` idempotency on already-voided                                          | `services/production-service.ts:314-317`    | kitchen-void-batch spec  |

## Test environment

E2E only. Playwright via the `regression` project (depends on `auth-setup`). Specs use no browser pages — Mongo driver + service-layer import only:

- `mongoConn()` reads `MONGODB_URI` (set to `MONGODB_UAT_EXTERNAL_URI`'s value for UAT runs).
- Each spec's `beforeAll` seeds isolated state with `e2e-req073-{ts}` identifiers (zero collision with real records).
- Each spec's `afterAll` deletes every seeded document by `_id`. No residue on UAT.
- Configured `describe.configure({ mode: 'serial' })` to keep Mongo state ordering deterministic per spec.

## Quality gates

| Gate                           | Expected   | Actual (2026-06-05)                                           |
| ------------------------------ | ---------- | ------------------------------------------------------------- |
| `npx tsc --noEmit`             | exit 0     | exit 0                                                        |
| `npx vitest run` (full)        | 0 failures | 1129 pass / 4 skip / 0 fail (unchanged from REQ-072 baseline) |
| Focused E2E REQ-073 (UAT)      | 0 failures | 7 passed (3 auth-setup + 4 contract tests), 19.7s             |
| E2E full regression pack (UAT) | green      | _CI run on push_                                              |

## Out of scope (this PR)

Tracked on sub-issue [#296](https://github.com/metasession-dev/wawagardenbar-app/issues/296)'s checklist:

- `tab-delete-reverses-payments` (REQ-TABMGT-004)
- `force-password-change` (REQ-AUTHA-003)
- `data-deletion-request-approval` (REQ-SETTINGS-004 + REQ-PRIVACY-002)
- `soft-delete-enforcement` (REQ-PRIVACY-002)
- `kitchen-ingredient-archive` (REQ-KITCHEN-006)

See `test-scope.md` for rationale on each.
