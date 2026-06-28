# Test Execution Summary — REQ-087

**Date:** 2026-06-28
**Git SHA:** 70beeae
**CI Run:** local

## Test design (devaudit#50)

**Layers planned:** unit, e2e

**Layers covered:** unit ✓, e2e deferred (Playwright browsers not installed locally; E2E runs in CI)

**Deferrals:**

- E2E: Playwright browsers not installed on local machine. Over-sell spec updated to assert `failedItems` array instead of top-level `errorDetails.message`. Will run in CI.
- Visual regression N/A — backend service change, no UI affected.

**Skill invocation:** manual scope decision — operator chose layers directly because backend-only change.

## Gate Results

| Gate             | Result   | Details                                                              |
| ---------------- | -------- | -------------------------------------------------------------------- |
| TypeScript       | PASS     | 0 errors                                                             |
| SAST             | PASS     | 8 findings (6 baseline + 2 pre-existing in order-service.ts) — 0 new |
| Dependency Audit | PASS     | 0 high/critical (4 moderate, pre-existing)                           |
| E2E Tests        | DEFERRED | Playwright browsers not installed locally; CI will run               |
| Unit Tests       | PASS     | 1256 passed, 4 skipped                                               |

## Test Cycles

| Cycle | CI Run | Gate Status | E2E Result | Coverage | Date       |
| ----- | ------ | ----------- | ---------- | -------- | ---------- |
| #1    | local  | PASS        | deferred   | N/A      | 2026-06-28 |

**Final assessment:** All local gates passed. E2E deferred to CI.

## Test Changes in This Release

**Added:**

- `__tests__/services/inventory-service.deduct-per-item.test.ts` — 6 tests (AC1 partial failure, AC2 skip-on-retry, AC4 all-succeed, menuItem not found, order not found, StockMovement creation)
- `__tests__/services/order-service.completeOrder.test.ts` — 1 test added (AC3 partial-failure IncidentEvent with per-item breakdown)

**Updated:**

- `__tests__/services/inventory-service.reconcile.test.ts` — updated mock return type from `void` to `IDeductionResult`; added partial-failure test case
- `__tests__/services/inventory-service.sale-point-routing.test.ts` — updated 2 tests from `rejects.toThrow` to `result.allSucceeded === false`
- `__tests__/services/order-service.completeOrder.test.ts` — updated 2 tests mock return from `undefined` to `IDeductionResult`
- `__tests__/actions/admin/incidents-actions.test.ts` — updated happy path mock return from `undefined` to `IDeductionResult`
- `__tests__/services/inventory-service.customization-linked.test.ts` — updated 1 test from `resolves.toBeUndefined` to `result.allSucceeded === true`
- `__tests__/services/order-service.tip.test.ts` — updated mock return type
- `__tests__/services/tab-service.tip.test.ts` — updated mock return type
- `__tests__/services/tab-service.tip-method.test.ts` — updated mock return type
- `e2e/critical/admin-order-inventory-delta.over-sell.spec.ts` — updated incident assertions to check `failedItems` array

**Removed:**

- none

## Test Plan Coverage

| Acceptance Criterion                            | Status   | Test                                                                 |
| ----------------------------------------------- | -------- | -------------------------------------------------------------------- |
| AC1 — partial failure deducts remaining items   | PASS     | `inventory-service.deduct-per-item.test.ts::AC1 — partial failure`   |
| AC2 — skip-on-retry prevents double deduction   | PASS     | `inventory-service.deduct-per-item.test.ts::AC2 — skip-on-retry`     |
| AC3 — IncidentEvent contains per-item breakdown | PASS     | `order-service.completeOrder.test.ts::REQ-087 AC3 — partial failure` |
| AC4 — all-succeed sets inventoryDeducted        | PASS     | `inventory-service.deduct-per-item.test.ts::AC4 — all items succeed` |
| AC5 — over-sell regression                      | DEFERRED | `admin-order-inventory-delta.over-sell.spec.ts` — E2E in CI          |

## Evidence Locations

| Evidence         | Location                                        |
| ---------------- | ----------------------------------------------- |
| E2E results      | DevAudit: wawagardenbar-app/REQ-087 (CI upload) |
| SAST results     | DevAudit: wawagardenbar-app/REQ-087 (CI upload) |
| Dependency audit | DevAudit: wawagardenbar-app/REQ-087 (CI upload) |
| Unit test output | DevAudit: wawagardenbar-app/REQ-087 (CI upload) |
