---
title: 'Test plan — REQ-128'
requirement_id: 'REQ-128'
risk_class: 'HIGH'
---

# Test plan — REQ-128

Extracted from `compliance/plans/REQ-128/implementation-plan.md` §1. File paths are reconciled with the files actually written in Phase 2 (step 4b).

| Test file                                            | Type | ACs                     |
| ---------------------------------------------------- | ---- | ----------------------- |
| `__tests__/services/paystack-service-refund.test.ts` | unit | AC1                     |
| `__tests__/services/refund-service.test.ts`          | unit | AC1, AC2, AC3, AC4      |
| `__tests__/api/webhooks/paystack-refund.test.ts`     | unit | AC1                     |
| `__tests__/actions/refund-actions.test.ts`           | unit | AC3, AC4, AC6           |
| `__tests__/actions/cancel-order-with-refund.test.ts` | unit | AC2, AC3                |
| `__tests__/services/whatsapp-inbound-cancel.test.ts` | unit | AC2, AC3, AC5           |
| `__tests__/services/refund-notifier.test.ts`         | unit | AC5, AC7                |
| `__tests__/services/refund-report.test.ts`           | unit | AC6                     |
| `__tests__/services/order-status-notifier.test.ts`   | unit | AC8                     |
| `__tests__/lib/whatsapp-template-contract.test.ts`   | unit | AC7                     |
| `e2e/critical/refund-flow.spec.ts`                   | e2e  | AC1, AC2, AC3, AC4, AC5 |
| `e2e/critical/refund-report.spec.ts`                 | e2e  | AC4, AC6                |
