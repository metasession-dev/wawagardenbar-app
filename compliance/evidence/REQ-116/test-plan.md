# Test plan — REQ-116

| Test file                                                      | Type            | ACs           |
| -------------------------------------------------------------- | --------------- | ------------- |
| `__tests__/lib/whatsapp.verification-pin.test.ts`              | unit            | AC9           |
| `__tests__/lib/whatsapp-template-contract.test.ts`             | unit (update)   | AC9           |
| `__tests__/api/whatsapp-webhook-route.test.ts`                 | unit            | AC1, AC2, AC3 |
| `__tests__/lib/whatsapp.handle-webhook.test.ts`                | unit            | AC5           |
| `__tests__/services/whatsapp-inbound-service.routing.test.ts`  | unit (update)   | AC4, AC6, AC7 |
| `__tests__/services/whatsapp-inbound-service.classify.test.ts` | unit (update)   | AC6           |
| `__tests__/lib/whatsapp.retry.test.ts`                         | unit            | AC8           |
| `e2e/critical/whatsapp-webhook-security.spec.ts`               | e2e (transport) | AC1, AC2      |
| `e2e/critical/whatsapp-inbound-idempotency.spec.ts`            | e2e (transport) | AC4, AC5      |
| `e2e/critical/whatsapp-optout-optin.spec.ts`                   | e2e (transport) | AC6           |
| `e2e/critical/express-order-portion-pricing-req097.spec.ts`    | e2e (update)    | AC11          |
| `e2e/helpers/express-menu.ts`                                  | e2e infra       | AC11          |
| `e2e/critical/webhook-idempotency-replay.spec.ts`              | e2e (update)    | AC12          |
| `e2e/critical/cost-snapshot.spec.ts`                           | e2e (update)    | AC13          |
| `e2e/critical/partial-payments.spec.ts`                        | e2e (update)    | AC13          |
| `e2e/staff-pot.spec.ts`                                        | e2e (update)    | AC14          |
| `e2e/csr-uat.spec.ts`                                          | e2e (update)    | AC15          |
| `e2e/support-ticket-staff-flow.spec.ts`                        | e2e (update)    | AC15          |
