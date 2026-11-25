# Test plan — REQ-126

| Test file                                                        | Type | ACs                |
| ---------------------------------------------------------------- | ---- | ------------------ |
| `__tests__/services/whatsapp-inbound-intents.test.ts`            | unit | AC1, AC2, AC5      |
| `__tests__/services/whatsapp-inbound-order-status.test.ts`       | unit | AC1, AC2, AC5, AC6 |
| `__tests__/services/support-ticket-service.order-status.test.ts` | unit | AC3, AC4           |
| `e2e/critical/whatsapp-order-link.spec.ts`                       | e2e  | AC1, AC5           |
| `e2e/critical/whatsapp-status-enquiry.spec.ts`                   | e2e  | AC2, AC3, AC4, AC6 |

Shared helper: `e2e/helpers/whatsapp-inbound-seed.ts`. The reply text (menu link and acknowledgement) is asserted in the unit tests; WhatsApp is off in CI, so the e2e specs assert the recorded intent and outcome, the ticket and the staff alert.
