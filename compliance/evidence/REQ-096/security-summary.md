# Security Evidence Summary — REQ-096

**Date:** 2026-07-28

| Control                              | Result | Evidence                                                                                                                                              |
| ------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| SAST                                 | PASS   | `npm run lint` — 0 errors (965 pre-existing warnings, unrelated)                                                                                      |
| Dependency audit                     | PASS   | No new dependencies introduced                                                                                                                        |
| Role-gate enforcement (R-013)        | PASS   | `deleteOrderAction`/`deleteTabAction` re-enforce `session.role === 'super-admin'` server-side; unit tests assert rejection regardless of client input |
| Idempotency (R-014)                  | PASS   | `revertPayment`/`isDeleted` guards proven idempotent by unit test                                                                                     |
| Soft-delete surface coverage (R-015) | PASS   | `getActiveOrders`/`getRecentOrders`/`getOrdersAction` all filter `isDeleted`; e2e proves exclusion from `/dashboard/orders`                           |
| Partial-payments guard (R-016)       | PASS   | Server-side refusal (not just UI-disable) proven by unit + e2e test                                                                                   |
| Audit trail (AC8)                    | PASS   | `order.delete`/`tab.delete` audit-log entries record revert booleans + acting user; enum fix in `models/audit-log-model.ts` (see below)               |
| Financial report correctness         | PASS   | `financial-report-service.payment-revert-exclusion.test.ts` proves a reverted order is excluded from revenue with zero query changes                  |

## Finding surfaced during e2e execution (not a security vulnerability, a completeness gap)

`models/audit-log-model.ts`'s Mongoose `action` field enum did not include `order.delete` — the TypeScript `AuditAction` union type was updated but the separate runtime schema enum was not, so every `order.delete` audit-log write threw a validation error in the real (non-mocked) database. Caught only by e2e execution against real Mongo, not by the fully-mocked unit tests. Fixed in this REQ (`models/audit-log-model.ts`).

## Post-deploy controls

- No migration required — `isDeleted`/`deletedAt`/`deletedBy` are additive fields with no backfill needed (`{ $ne: true }` matches missing/undefined/false alike).
- No new secrets, credentials, or external dependencies.
- Existing admin/super-admin guards unchanged; this REQ only extends an already-gated surface.
