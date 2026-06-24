# Test Plan — REQ-084

**Requirement:** REQ-084
**Risk Level:** MEDIUM
**GitHub Issue:** #406
**Date:** 2026-06-22

## Tests to Add

- [x] `e2e/smoke/req-084-checkout-separation.spec.ts` — E2E: AC1-AC12 (guest banner, guest checkout, Monnify-only options, express pickup/delivery fields, admin tab checkout, anonymous menu-to-checkout)
- [x] `__tests__/actions/admin/express-create-order-req084.test.ts` — Unit: AC6 (calculateOrderTotals with orderType), AC8 (no price override in createOrder), AC9 (no isAdmin in customer checkout)

## Test Files

| File                                                          | Type        | ACs Covered                                    |
| ------------------------------------------------------------- | ----------- | ---------------------------------------------- |
| `e2e/smoke/req-084-checkout-separation.spec.ts`               | E2E (smoke) | AC1, AC2, AC3, AC4, AC5, AC7, AC10, AC11, AC12 |
| `__tests__/actions/admin/express-create-order-req084.test.ts` | Unit        | AC6, AC8, AC9                                  |

## Verification Strategy

- **E2E:** Playwright smoke project — 15 tests covering 9 ACs (some ACs have multiple test variants for required-field validation)
- **Unit:** Vitest — 8 tests covering 3 ACs
- **Manual smoke:** UAT verification on Railway auto-deploy (health check, checkout page, express create order)
