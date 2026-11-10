# Test plan — REQ-120

| Test file                                                     | Type | ACs                     | Stories                   |
| ------------------------------------------------------------- | ---- | ----------------------- | ------------------------- |
| `__tests__/services/customer-order-service.test.ts`           | unit | AC1, AC2, AC3, AC4, AC8 | US-A2.10                  |
| `__tests__/actions/tab-actions-staff-only.test.ts`            | unit | AC6                     | US-B2.4                   |
| `__tests__/actions/ordering-options-actions.test.ts`          | unit | AC7                     |                           |
| `__tests__/scripts/migrate-order-origin.test.ts`              | unit | AC5                     |                           |
| `e2e/critical/customer-order-validation.spec.ts`              | e2e  | AC2, AC3                | US-A2.6, A2.7, A2.8, A2.9 |
| `e2e/critical/customer-cannot-use-tabs.spec.ts`               | e2e  | AC6                     | US-B2.4                   |
| `e2e/critical/csr-order-tab-parity-req109.spec.ts` (existing) | e2e  | AC6                     | US-B2.1                   |

Paths are predicted and reconciled in Phase 2 step 4b.
