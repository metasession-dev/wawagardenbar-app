# Test scope — REQ-124

Risk class: HIGH · Issue #970 · Plan: `compliance/plans/REQ-124/implementation-plan.md`

| AC  | Summary                                                                                                   | SRS-ID                                      | Verification                                   |
| --- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------- |
| AC1 | Customer notified once per status change (template outside window, free-form inside); staff orders never | REQ-ORDER-007 (new)                         | unit + e2e (US-A4.1, US-A4.2, US-A4.3)         |
| AC2 | Single call site in the status actions                                                                    | REQ-ORDER-007 (new)                         | unit                                           |
| AC3 | Tracking page and socket require owner or valid token; messages link with token                           | REQ-ORDER-008 (new), REQ-ORDER-001 (updated) | unit + e2e (US-A4.4)                           |
| AC4 | `Table N · FirstName` / Pickup / Delivery header on kitchen card, order card, queue; kitchen first name only | REQ-KITCHEN-010 (new)                      | unit + e2e (US-B1.5, US-B1.6)                  |
| AC5 | Delivery address and instructions on the kitchen card                                                     | REQ-KITCHEN-011 (new)                       | unit + e2e (US-B1.7)                           |
| AC6 | `order_status_update_v2` template submitted to UAT and production; status recorded                           | REQ-WA-002 (updated)                        | contract test + MCP template status (evidence) |
