# Test plan — REQ-089

**Requirement:** REQ-089 — Admin order management: portion size selection, manual price override, per-item special instructions, stock validation
**Risk class:** MEDIUM

## Test file listing with AC coverage

| Test file                                                     | ACs covered        | Test type |
| ------------------------------------------------------------- | ------------------ | --------- |
| `__tests__/lib/order-line-totals.price-override.test.ts`      | AC3, AC4, AC8      | Unit      |
| `__tests__/actions/admin/express-create-order-req084.test.ts` | AC1, AC3, AC6, AC8 | Unit      |
| `__tests__/actions/admin/order-edit-actions.test.ts`          | AC2, AC4, AC7      | Unit      |
| `__tests__/components/cart-item-no-price-override.test.ts`    | AC5                | Unit      |
| `e2e/critical/express-order-portion-price-override.spec.ts`   | AC1, AC3, AC6, AC9 | E2E       |
| `e2e/critical/edit-order-portion-instructions.spec.ts`        | AC2, AC4, AC7      | E2E       |
| `e2e/customer/cart-no-price-override.spec.ts`                 | AC5                | E2E       |

## Coverage summary

| AC  | Unit test                                                                          | E2E test                                       |
| --- | ---------------------------------------------------------------------------------- | ---------------------------------------------- |
| AC1 | `express-create-order-req084.test.ts`                                              | `express-order-portion-price-override.spec.ts` |
| AC2 | `order-edit-actions.test.ts`                                                       | `edit-order-portion-instructions.spec.ts`      |
| AC3 | `order-line-totals.price-override.test.ts` + `express-create-order-req084.test.ts` | `express-order-portion-price-override.spec.ts` |
| AC4 | `order-line-totals.price-override.test.ts` + `order-edit-actions.test.ts`          | `edit-order-portion-instructions.spec.ts`      |
| AC5 | `cart-item-no-price-override.test.ts`                                              | `cart-no-price-override.spec.ts`               |
| AC6 | `express-create-order-req084.test.ts`                                              | `express-order-portion-price-override.spec.ts` |
| AC7 | `order-edit-actions.test.ts`                                                       | `edit-order-portion-instructions.spec.ts`      |
| AC8 | `order-line-totals.price-override.test.ts` + `express-create-order-req084.test.ts` | —                                              |
| AC9 | —                                                                                  | `express-order-portion-price-override.spec.ts` |
