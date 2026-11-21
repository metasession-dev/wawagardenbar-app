# Test scope — REQ-123

Risk class: HIGH · Issue #969 · Plan: `compliance/plans/REQ-123/implementation-plan.md`

| AC  | Summary                                                                                     | SRS-ID                                              | Verification                                        |
| --- | ------------------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------- |
| AC1 | Customer orders use Paystack only; staff and tab routing unchanged                          | REQ-PAY-005 (new), REQ-CHECKOUT-010 (updated)       | unit + e2e (US-A2.13)                               |
| AC2 | Stable payment reference and checkout URL until paid; placeholder email                     | REQ-PAY-006 (new)                                   | unit + e2e (US-A2.13)                               |
| AC3 | Webhook: raw-body signature, order lookup before dedup, amount check, replay safe           | REQ-PAY-007 (new), REQ-PAY-003 (updated)            | unit + e2e (US-A2.14 to US-A2.17)                   |
| AC4 | Single idempotent `markOrderPaid`: kitchen emit once, rewards, confirmation and receipt     | REQ-PAY-008 (new)                                   | unit + e2e (US-A2.14, US-A2.15)                     |
| AC5 | Kitchen and live queues show staff orders always and customer orders only when paid         | REQ-KITCHEN-009 (new), REQ-ORDMGT-001 (updated)     | unit + e2e (US-B1.3, US-B1.4)                       |
| AC6 | Unpaid customer orders expire after 30 minutes (Paystack asked first)                       | REQ-PAY-009 (new)                                   | unit (US-A2.18)                                     |
| AC7 | `payment_link` sent once for an abandoned payment                                           | REQ-PAY-010 (new)                                   | unit + e2e (US-A2.19)                               |
| AC8 | Templates defined, categorised, param-built and submitted to both accounts; status recorded | REQ-WA-002 (updated)                                | contract test + MCP template status (evidence)      |
| AC9 | Paystack refund capability recorded                                                         | `@srs-deferred` (evidence of an account capability) | `paystack-refund-capability.md` (operator confirms) |
