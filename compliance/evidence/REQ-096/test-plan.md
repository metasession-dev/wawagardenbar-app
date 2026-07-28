# Test Plan — REQ-096

| AC  | Planned test target                                                                                                                             | Test type        | Expected evidence                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------ |
| AC1 | `__tests__/services/order-service.test.ts` (new `deleteOrder` describe block) — default-allowed path                                            | Unit             | Test execution summary                           |
| AC2 | `__tests__/actions/order-management-actions.test.ts` — `deleteOrderAction` role gate; `e2e/critical/delete-order.spec.ts`                       | Unit/E2E         | Test execution summary and named E2E screenshots |
| AC3 | `__tests__/services/order-service.test.ts` — inventory-revert branch                                                                            | Unit             | Test execution summary                           |
| AC4 | `__tests__/services/order-service.test.ts` — payment-revert branch; `__tests__/services/financial-report-service.test.ts` — exclusion assertion | Unit/integration | Test execution summary                           |
| AC5 | `__tests__/services/order-service.test.ts` — leave-as-is branch                                                                                 | Unit             | Test execution summary                           |
| AC6 | `__tests__/services/tab-service.test.ts` — `deleteTab` `revertPayment` branch; `__tests__/services/financial-report-service.test.ts`            | Unit/integration | Test execution summary                           |
| AC7 | `__tests__/services/tab-service.test.ts` — `partialPayments` refusal; `e2e/critical/delete-tab-payment-revert.spec.ts`                          | Unit/E2E         | Test execution summary and named E2E screenshots |
| AC8 | `__tests__/services/order-service.test.ts`, `__tests__/services/tab-service.test.ts` — audit-log call-shape assertions per branch               | Unit             | Test execution summary                           |

E2E scenarios and evidence calls will be designed by `e2e-test-engineer` after the HIGH-risk plan checkpoint is approved. No test is considered portal evidence until a REQ-096-scoped CI run uploads the named PNG screenshots and their sidecar provenance with the stage/cycle metadata.
