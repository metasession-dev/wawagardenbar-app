# Test plan — REQ-122

| Test file                                                  | Type          | ACs                  |
| ---------------------------------------------------------- | ------------- | -------------------- |
| `__tests__/lib/staff-alerts/staff-alert-rules.test.ts`     | unit          | AC1, AC2, AC6, AC7   |
| `__tests__/services/staff-notification-service.test.ts`    | unit          | AC1 to AC3           |
| `__tests__/services/order-service.payment-alert.test.ts`   | unit          | AC1                  |
| `__tests__/services/support-ticket-service.test.ts`        | unit (update) | AC1                  |
| `__tests__/jobs/staff-alert-escalation.test.ts`            | unit          | AC6, AC7             |
| `__tests__/lib/scheduled-jobs.test.ts`                     | unit (update) | AC7                  |
| `__tests__/services/staff-alert-number-service.test.ts`    | unit          | AC4, AC5             |
| `__tests__/actions/staff-notification-actions.test.ts`     | unit          | AC2, AC4, AC5, AC6   |
| `__tests__/services/whatsapp-inbound.staff-number.test.ts` | unit          | AC8                  |
| `__tests__/lib/whatsapp-template-contract.test.ts`         | unit (update) | AC9                  |
| `e2e/critical/staff-notifications.spec.ts`                 | e2e           | AC1 to AC3, AC5, AC7 |
| `e2e/critical/staff-alert-number.spec.ts`                  | e2e           | AC4                  |
| `e2e/critical/whatsapp-staff-number-routing.spec.ts`       | e2e           | AC8                  |
| `e2e/critical/staff-alert-rules.spec.ts`                   | e2e           | AC6                  |
