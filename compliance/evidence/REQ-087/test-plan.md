# Test Plan — REQ-087

**Requirement:** REQ-087
**Risk Level:** HIGH
**GitHub Issue:** #411
**Date:** 2026-06-28

## Tests to Add

- [ ] `__tests__/services/inventory-service.deduct-per-item.test.ts` — unit tests for per-item deduction: all-succeed, partial-failure, skip-on-retry, linked-customization per-item try/catch
- [ ] `__tests__/services/order-service.complete-order-partial.test.ts` — unit tests for completeOrder consuming result object, writing detailed IncidentEvent

## Tests to Update

- [ ] `__tests__/services/inventory-service.reconcile.test.ts` — update mock return type of `deductStockForOrder` from `Promise<void>` to `Promise<DeductionResult>`
- [ ] `e2e/critical/admin-order-inventory-delta.over-sell.spec.ts` — verify still passes (regression; the over-sell scenario now produces per-item failure instead of throw)

## Tests to Remove

None

## Functional Test Mapping

| Acceptance Criterion                            | Test File                                     | Test Name                                          |
| ----------------------------------------------- | --------------------------------------------- | -------------------------------------------------- |
| AC1 — partial failure deducts remaining items   | inventory-service.deduct-per-item.test.ts     | "deducts items 1 and 3, fails item 2"              |
| AC2 — skip-on-retry prevents double deduction   | inventory-service.deduct-per-item.test.ts     | "skips already-deducted items on retry"            |
| AC3 — IncidentEvent contains per-item breakdown | order-service.complete-order-partial.test.ts  | "writes detailed IncidentEvent on partial failure" |
| AC4 — all-succeed sets inventoryDeducted        | inventory-service.deduct-per-item.test.ts     | "all items succeed → allSucceeded true"            |
| AC5 — over-sell regression                      | admin-order-inventory-delta.over-sell.spec.ts | existing E2E spec                                  |

## Non-Functional Tests (HIGH)

- [ ] Security: no new endpoints; existing auth unchanged — verified by regression
- [ ] Performance: per-item try/catch adds negligible overhead — same DB calls, restructured
- [ ] Accessibility: no UI changes in this REQ — N/A

## Test Data Requirements

- Unit tests use mocked models (no DB connection needed)
- E2E tests use existing UAT MongoDB seeding patterns
