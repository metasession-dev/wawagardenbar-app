# Test plan — REQ-122

| Test file                                                  | Type | ACs                  |
| ---------------------------------------------------------- | ---- | -------------------- |
| `__tests__/services/staff-notification-service.test.ts`    | unit | AC1, AC2             |
| `__tests__/services/staff-alert-rules.test.ts`             | unit | AC6                  |
| `__tests__/jobs/staff-alert-escalation.test.ts`            | unit | AC6, AC7             |
| `__tests__/services/whatsapp-inbound.staff-number.test.ts` | unit | AC8                  |
| `__tests__/actions/staff-alert-number.test.ts`             | unit | AC4, AC5             |
| `e2e/critical/staff-notifications.spec.ts`                 | e2e  | AC1 to AC3, AC5, AC7 |
| `e2e/critical/staff-alert-number.spec.ts`                  | e2e  | AC4                  |
| `e2e/critical/whatsapp-staff-number-routing.spec.ts`       | e2e  | AC8                  |
