# Test plan — REQ-123

| Test file                                                       | Type          | ACs                |
| --------------------------------------------------------------- | ------------- | ------------------ |
| `__tests__/services/payment-service.paystack-customer.test.ts`  | unit          | AC1, AC2           |
| `__tests__/services/paystack-service.test.ts`                   | unit          | AC2, AC3           |
| `__tests__/actions/initialize-payment-stable-reference.test.ts` | unit          | AC1, AC2           |
| `__tests__/api/paystack-webhook.test.ts`                        | unit          | AC3, AC4           |
| `__tests__/services/order-service.mark-order-paid.test.ts`      | unit          | AC4                |
| `__tests__/services/order-service.live-queue-gate.test.ts`      | unit          | AC5                |
| `__tests__/jobs/expire-unpaid-orders.test.ts`                   | unit          | AC6, AC7           |
| `__tests__/lib/whatsapp-template-params.test.ts`                | unit (update) | AC8                |
| `__tests__/lib/whatsapp-template-contract.test.ts`              | unit (update) | AC8                |
| `e2e/critical/paystack-payment-lifecycle.spec.ts`               | e2e           | AC1, AC2, AC3, AC4 |
| `e2e/critical/kitchen-paid-gate.spec.ts`                        | e2e           | AC5                |
| `e2e/critical/whatsapp-payment-link.spec.ts`                    | e2e           | AC7                |
