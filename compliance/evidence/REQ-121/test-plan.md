# Test plan — REQ-121

| Test file                                                        | Type         | ACs                |
| ---------------------------------------------------------------- | ------------ | ------------------ |
| `__tests__/components/checkout/customer-checkout-schema.test.ts` | unit         | AC1, AC2, AC3, AC4 |
| `__tests__/components/checkout/order-type-fields.test.ts`        | unit         | AC3, AC5           |
| `__tests__/components/checkout/tip-calculation.test.ts`          | unit         | AC4                |
| `__tests__/components/checkout/checkout-errors.test.ts`          | unit         | AC6                |
| `e2e/critical/checkout-single-page.spec.ts`                      | e2e          | AC1 to AC6         |
| `e2e/smoke/req-084-checkout-separation.spec.ts`                  | e2e (update) | AC1                |
