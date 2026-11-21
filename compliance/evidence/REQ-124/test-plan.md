# Test plan — REQ-124

| Test file                                                    | Type | ACs      |
| ------------------------------------------------------------ | ---- | -------- |
| `__tests__/lib/order-tracking-token.test.ts`                 | unit | AC3      |
| `__tests__/services/order-status-notifier.test.ts`           | unit | AC1      |
| `__tests__/actions/order-status-notify-call-site.test.ts`    | unit | AC1, AC2 |
| `__tests__/lib/socket-join-order-auth.test.ts`               | unit | AC3      |
| `__tests__/lib/serving-label.test.ts`                        | unit | AC4      |
| `__tests__/components/kitchen-order-card.test.tsx`           | unit | AC4, AC5 |
| `__tests__/lib/whatsapp-template-params.test.ts`             | unit (update) | AC6 |
| `__tests__/lib/whatsapp-template-contract.test.ts`           | unit (update) | AC6 |
| `e2e/critical/whatsapp-order-tracking.spec.ts`               | e2e  | AC1, AC3 |
| `e2e/critical/kitchen-serving-check.spec.ts`                 | e2e  | AC4, AC5 |

AC6 is also evidenced by `compliance/evidence/REQ-124/template-submissions.md` (per-account status via the WhatsApp MCP).
