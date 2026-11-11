# Test plan — REQ-120

| Test file                                                                | Type             | ACs                | Stories                          |
| ------------------------------------------------------------------------ | ---------------- | ------------------ | -------------------------------- |
| `__tests__/services/customer-order-service.test.ts`                      | unit             | AC1, AC2, AC3      | US-A2.6, A2.7, A2.8, A2.9, A2.10 |
| `__tests__/actions/create-order-wrapper.test.ts`                         | unit             | AC1, AC3           |                                  |
| `__tests__/lib/order-number-single-format.test.ts`                       | unit             | AC4                |                                  |
| `__tests__/lib/order-origin-migration.test.ts`                           | unit             | AC5                |                                  |
| `__tests__/actions/tabs/tab-actions-staff-only.test.ts`                  | unit             | AC6                | US-B2.4                          |
| `__tests__/actions/ordering-options-actions.test.ts`                     | unit             | AC7                |                                  |
| `__tests__/api/public/orders-customer-path.test.ts`                      | unit             | AC6, AC8           | US-A2.10                         |
| `__tests__/services/api-key-service.customer-binding.test.ts`            | unit             | AC8                |                                  |
| `e2e/critical/customer-order-validation.spec.ts`                         | e2e (transport)  | AC1, AC2, AC3, AC4 | US-A2.6, A2.7, A2.8, A2.9        |
| `e2e/critical/customer-cannot-use-tabs.spec.ts`                          | e2e              | AC6                | US-B2.4                          |
| `e2e/critical/customer-order-journey.spec.ts`                            | e2e (UI journey) | AC1, AC2, AC4      | US-A2.1, A2.2, A2.3              |
| `e2e/critical/customer-tab-refusal-ui.spec.ts`                           | e2e (UI)         | AC6                | US-B2.4                          |
| `e2e/critical/csr-order-tab-parity-req109.spec.ts` (existing, unchanged) | e2e              | AC6                | US-B2.1                          |

Paths reconciled with the files on disk in Phase 2 (step 4b). Existing specs updated because the customer tab path was removed: `e2e/smoke/req-084-checkout-separation.spec.ts`, `e2e/critical/daily-report-payments.spec.ts`, `e2e/requirements-verification.spec.ts`.
