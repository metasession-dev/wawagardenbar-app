# Test plan — REQ-125

| Test file                                                      | Type | ACs                               |
| -------------------------------------------------------------- | ---- | --------------------------------- |
| `__tests__/lib/whatsapp-notification-catalogue.test.ts`        | unit | AC1, AC4                          |
| `__tests__/lib/whatsapp-send-gate.test.ts`                     | unit | AC2, AC3, AC4                     |
| `__tests__/services/notification-service.suppressed.test.ts`   | unit | AC3                               |
| `__tests__/services/system-settings-whatsapp-switches.test.ts` | unit | AC2, AC7                          |
| `__tests__/actions/notification-settings-actions.test.ts`      | unit | AC7, AC8                          |
| `e2e/critical/whatsapp-notification-settings.spec.ts`          | e2e  | AC2, AC3, AC4, AC5, AC6, AC7, AC8 |

AC9 (runbook) is evidenced by `docs/operations/` review.
