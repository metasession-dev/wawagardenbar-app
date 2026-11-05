# Test plan — REQ-118

| Test file                                                     | Type          | ACs        |
| ------------------------------------------------------------- | ------------- | ---------- |
| `__tests__/services/support-ticket-service.threading.test.ts` | unit          | AC1        |
| `__tests__/services/support-ticket-service.window.test.ts`    | unit          | AC2        |
| `__tests__/services/support-ticket-service.sla.test.ts`       | unit          | AC3        |
| `__tests__/services/support-ticket-service.test.ts`           | unit (update) | AC1, AC2   |
| `__tests__/services/whatsapp-inbound.support-ticket.test.ts`  | unit (update) | AC1, AC3   |
| `e2e/critical/whatsapp-support-thread.spec.ts`                | e2e           | AC1 to AC3 |
| `e2e/support-ticket-whatsapp-inbound.spec.ts`                 | e2e (update)  | AC1        |
| `e2e/support-ticket-staff-flow.spec.ts`                       | e2e (update)  | AC2        |

AC4 is an operator task with no product behaviour; its evidence is `compliance/evidence/REQ-118/template-status.md`. The live send of both reply modes is the UAT round-trip once `support_reply` is approved.
