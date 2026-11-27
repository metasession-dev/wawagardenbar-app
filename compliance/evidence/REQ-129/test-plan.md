---
title: 'Test plan — REQ-129'
requirement_id: 'REQ-129'
risk_class: 'MEDIUM'
---

# Test plan — REQ-129

Extracted from `compliance/plans/REQ-129/implementation-plan.md` §1. File paths are reconciled with the files actually written in Phase 2 (step 4b).

| Test file                                             | Type | ACs                     |
| ----------------------------------------------------- | ---- | ----------------------- |
| `__tests__/services/booking-service.test.ts`          | unit | AC1, AC2, AC4, AC5, AC6 |
| `__tests__/actions/booking-actions.test.ts`           | unit | AC1, AC4, AC5, AC6      |
| `__tests__/lib/booking-validation.test.ts`            | unit | AC1                     |
| `__tests__/services/whatsapp-inbound-booking.test.ts` | unit | AC3                     |
| `__tests__/services/booking-notifier.test.ts`         | unit | AC2, AC4, AC7           |
| `__tests__/lib/whatsapp-template-contract.test.ts`    | unit | AC7                     |
| `e2e/critical/booking-customer.spec.ts`               | e2e  | AC1, AC2, AC6           |
| `e2e/critical/whatsapp-booking-intent.spec.ts`        | e2e  | AC3                     |
| `e2e/critical/booking-dashboard.spec.ts`              | e2e  | AC4, AC5                |
