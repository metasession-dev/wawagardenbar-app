# REQ-066 — Test plan

**Requirement ID:** REQ-066
**Risk:** HIGH (financial / cross-entity correctness; affects every order-create path)
**Related issue:** [#277](https://github.com/metasession-dev/wawagardenbar-app/issues/277) · pattern context: [#280](https://github.com/metasession-dev/wawagardenbar-app/issues/280)
**Date:** 2026-06-04

## Acceptance criteria → tests

| AC   | Statement                                                                                                                                                                       | Test                                                                                                                                                                                                                                                                                |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1  | New canonical `OrderService.completeOrder` — only place that sets `Order.status='completed'` AND triggers deduction. On throw writes IncidentEvent, does NOT block status flip. | `__tests__/services/order-service.completeOrder.test.ts` — 5 cases (happy path, idempotency, deduction throw writes IncidentEvent + still flips status, order-not-found, cancelled-order rejected)                                                                                  |
| AC2  | 6 premature deduction sites REMOVED + regression-guard tests ensure they stay removed                                                                                           | `__tests__/regression/inventory-deduction-removed.test.ts` — 4 source-code-shape regression guards (services/order-service.ts allows exactly 1 site, the canonical one; webhooks + tab-service allow 0). REQ-049 webhook idempotency tests updated to assert deduction NOT called.  |
| AC3  | `IncidentEventModel` schema + service (recordIncident, list, dedupRecent)                                                                                                       | `__tests__/models/incident-event-model.test.ts` — 3 cases (required fields, valid construction, enum gate). `__tests__/services/incident-event-service.test.ts` — 5 cases (record persists; list filter; dedupRecent true/false windows)                                            |
| AC4  | Retry-only reconciliation cron (15 min). NEVER mutates `Order.status`.                                                                                                          | `__tests__/services/inventory-service.reconcile.test.ts` — 3 cases (query shape; success retry flips flag; failure writes IncidentEvent + leaves flag false). `__tests__/lib/scheduled-jobs.test.ts` — interval count 2 → 3 (idempotent).                                           |
| AC5  | Stale-paid-orders visibility scan (2h threshold, 24h dedup). NEVER mutates state.                                                                                               | `__tests__/services/order-service.scanStalePaidOrders.test.ts` — 3 cases (query shape with `$nin`/`$lt`; flagged write; dedup skip)                                                                                                                                                 |
| AC6  | `/dashboard/incidents` admin view with kind filter chips. RBAC csr/admin/super-admin.                                                                                           | Manual UAT verification (the section layout uses the same `requireRole(['csr','admin','super-admin'])` pattern as `/dashboard/support` from REQ-064, which has unit-tested RBAC coverage in `support-actions.rbac.test.ts`).                                                        |
| AC7a | E2E invariant — kitchen-display lifecycle preserves inventory until completed, then decrements by 1                                                                             | **E2E** `e2e/admin-order-inventory-delta.kitchen-display.spec.ts` — `test.fixme`'d. Spec authored end-to-end (Mongo seed + UI lifecycle advance + inventory delta polling + cleanup). Live execution blocked by an unresolved Playwright × Next.js server-action interaction issue. |
| AC7b | E2E invariant — orders-page lifecycle preserves inventory until completed, then decrements by 1                                                                                 | **E2E** `e2e/admin-order-inventory-delta.orders-page.spec.ts` — `test.fixme`'d, same triage as AC7a.                                                                                                                                                                                |

## Test environment

- **Unit:** vitest 4.1.x. `@/lib/mongodb` / `@/lib/session` / `iron-session` / `next/headers` mocked at the import boundary. Mongoose models mocked per file. `@/services/inventory-service` partially spied via `vi.spyOn(default, 'deductStockForOrder')` for the reconciliation tests. `@/services/audit-log-service` mocked. Order documents use ObjectId-shape strings so the `Types.ObjectId.isValid` guard inside `completeOrder` passes.
- **E2E:** Playwright via the existing 2-project setup (smoke + regression by location). Specs use direct Mongo writes for seeding (same shape as `e2e/support-ticket-staff-flow.spec.ts`); use `superAdminTest` fixture for auth; UAT Mongo via `MONGODB_UAT_EXTERNAL_URI`.

## Quality gates

| Gate                            | Expected   | Actual (2026-06-04)                                       |
| ------------------------------- | ---------- | --------------------------------------------------------- |
| `npx tsc --noEmit`              | exit 0     | exit 0                                                    |
| `npx vitest run` (full)         | 0 failures | 1095 pass / 4 skip / 0 fail                               |
| `npx eslint . --max-warnings=0` | 0 errors   | 0 errors / 950 pre-existing console warnings              |
| `npm run build`                 | exit 0     | exit 0                                                    |
| E2E focused REQ-066 (UAT)       | per scope  | 0 failures; 2 cases `test.fixme`'d (Playwright × Next.js) |
| E2E full regression pack (UAT)  | green      | 326 pass / 19 skip / 27 did-not-run / 0 fail (7.8 min)    |
