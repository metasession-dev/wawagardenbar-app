# Test scope — REQ-120

Risk class: HIGH · Issue #967 · Plan: `compliance/plans/REQ-120/implementation-plan.md` · Solo release (no bundle)

| AC  | Summary                                                                                 | SRS-ID           | Verification                                |
| --- | --------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------- |
| AC1 | All customer entry points use `createCustomerOrder`; guest, `pay-now`, `tabId` rejected | REQ-CHECKOUT-012 | unit + e2e                                  |
| AC2 | Server-side validation, server totals, typed errors                                     | REQ-CHECKOUT-012 | unit (US-A2.10) + e2e (US-A2.6, A2.7, A2.8) |
| AC3 | Idempotency on every customer entry point                                               | REQ-CHECKOUT-012 | unit + e2e (US-A2.9)                        |
| AC4 | Single order-number format                                                              | REQ-CHECKOUT-012 | unit                                        |
| AC5 | `origin`/`channel` recorded; idempotent migration                                       | REQ-ORDMGT-019   | unit/integration                            |
| AC6 | Customers cannot create, join or add to tabs; staff flows unchanged                     | REQ-TABMGT-011   | e2e (US-B2.4, US-B2.1) + unit               |
| AC7 | `getOrderingOptionsAction`                                                              | REQ-CHECKOUT-013 | unit                                        |
| AC8 | Customer key bound to a user; staff key keeps staff path                                | REQ-API-007      | unit                                        |
