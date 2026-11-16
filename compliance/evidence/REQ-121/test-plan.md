# Test plan — REQ-121

| Test file                                                      | Type          | ACs        |
| -------------------------------------------------------------- | ------------- | ---------- |
| `__tests__/lib/checkout/checkout-rules.test.ts`                | unit          | AC1 to AC6 |
| `__tests__/actions/create-order-wrapper.test.ts`               | unit (update) | AC2, AC3   |
| `__tests__/actions/initialize-payment-customer-charge.test.ts` | unit          | AC1, AC4   |
| `__tests__/services/customer-order-service.test.ts`            | unit (update) | AC4        |
| `__tests__/services/user-service.checkout-profile.test.ts`     | unit          | AC2, AC3   |
| `e2e/critical/checkout-single-page.spec.ts`                    | e2e           | AC1 to AC6 |
| `e2e/smoke/req-084-checkout-separation.spec.ts`                | e2e (update)  | AC1        |
