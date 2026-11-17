# Test scope — REQ-121

Risk class: HIGH · Issue #968 · Plan: `compliance/plans/REQ-121/implementation-plan.md` · Bundle: REQ-121 (core) + REQ-122

| AC  | Summary                                                                          | SRS-ID                                                                           | Verification                    |
| --- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------- |
| AC1 | One page, no stepper, no customer-info, tab or payment-method step, single Pay   | REQ-CHECKOUT-014 (new), REQ-CHECKOUT-001 (updated)                               | e2e (US-A2.1) + unit            |
| AC2 | Name asked once only if missing; no email                                        | REQ-CHECKOUT-015 (new)                                                           | e2e (US-A2.1, US-A2.2) + unit   |
| AC3 | Fields per order type; address only for delivery; saved address, fee and radius  | REQ-CHECKOUT-016 (new), REQ-CHECKOUT-002 (updated), REQ-CHECKOUT-003 (unchanged) | e2e (US-A2.3 to US-A2.5) + unit |
| AC4 | Inline tip checkbox; tip in the charge; no tip method                            | REQ-CHECKOUT-006 (updated)                                                       | e2e (US-A2.11) + unit           |
| AC5 | Order type and table preselected from query parameters; last-used type otherwise | REQ-CHECKOUT-017 (new)                                                           | e2e (US-A2.3) + unit            |
| AC6 | Typed errors inline; closed state disables Pay                                   | REQ-CHECKOUT-018 (new), REQ-CHECKOUT-012 (unchanged)                             | e2e (US-A2.12) + unit           |
