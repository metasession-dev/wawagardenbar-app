---
title: 'Test scope — REQ-128'
requirement_id: 'REQ-128'
risk_class: 'HIGH'
---

# Test scope — REQ-128

Extracted from `compliance/plans/REQ-128/implementation-plan.md` §1.

| AC  | Summary                                                                    | SRS-ID        | Verification         |
| --- | -------------------------------------------------------------------------- | ------------- | -------------------- |
| AC1 | Paystack refund client, `Refund` ledger, refund webhooks                   | REQ-PAY-011   | unit + e2e           |
| AC2 | Customer cancel before preparation: automatic full refund and reversal     | REQ-PAY-012   | unit + e2e           |
| AC3 | After preparation: refund-request ticket, manager approve/reject           | REQ-PAY-013   | unit + e2e           |
| AC4 | Partial refunds and approvals staff-only, role-gated                       | REQ-PAY-014   | unit + e2e           |
| AC5 | Customer notified on cancel, refund processed, rejection                   | REQ-WA-019    | unit + e2e           |
| AC6 | Refund report and audit log                                                | REQ-FIN-010   | unit + e2e           |
| AC7 | Templates `order_cancelled`, `refund_processed` submitted to both accounts | REQ-WA-019    | unit + evidence file |
| AC8 | Delivery "ready" message does not say pickup (#1071)                       | REQ-ORDER-007 | unit                 |
