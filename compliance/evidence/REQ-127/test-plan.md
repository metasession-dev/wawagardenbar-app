# Test plan — REQ-127

| Test file                                            | Type | ACs                |
| ---------------------------------------------------- | ---- | ------------------ |
| `__tests__/lib/checkout-attempt.test.ts`             | unit | AC1, AC2, AC3      |
| `__tests__/actions/cancel-superseded-order.test.ts`  | unit | AC2                |
| `e2e/critical/checkout-payment-init-failure.spec.ts` | e2e  | AC1, AC2, AC3, AC4 |

The payment-start failure is forced in the browser (the `initializePayment` server-action request is aborted) because the e2e app always starts payments.

AC3 (cart and stored attempt cleared when the payment starts) is covered by the unit test and by UAT step 17, not by the critical e2e (CI has no working gateway).
