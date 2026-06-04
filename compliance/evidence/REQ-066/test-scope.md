# REQ-066 — Test scope

## In scope (unit + integration — load-bearing for this REQ)

- `OrderService.completeOrder` chokepoint: happy path + idempotency + deduction-throw-writes-IncidentEvent + order-not-found + cancelled-order rejection.
- `InventoryService.reconcileMissedDeductions`: query shape, success retry, failure IncidentEvent write.
- `OrderService.scanStalePaidOrders`: query shape (paid + non-completed/cancelled + `createdAt < threshold`), positive flag write, 24h-dedup skip.
- `IncidentEventModel` schema (defaults, required fields, enum gate on `kind`).
- `IncidentEventService` API: `recordIncident` persistence, `list` kind-filter shape, `dedupRecent` window check.
- `scheduled-jobs.ts` interval count updated 2 → 3 (idempotent on second call).
- **Regression guards** (CRITICAL — the structural promise of this REQ):
  - `__tests__/regression/inventory-deduction-removed.test.ts` — source-code-level assertion that 4 historical files have exactly the allowed `deductStockForOrder(` call count (0 for webhooks + tab-service; 1 for `services/order-service.ts` where the canonical site lives).
  - `__tests__/api/webhooks/paystack-idempotency.test.ts` + `monnify-idempotency.test.ts` — REQ-049's existing idempotency tests updated to assert webhooks NO LONGER call `deductStockForOrder` (regression guard at the behavioural layer).

## In scope (E2E — authored; live execution blocked)

- `e2e/admin-order-inventory-delta.kitchen-display.spec.ts` (AC7a): seeds an order via direct Mongo write with an inventory-linked menu item; advances through `confirmed → preparing → ready → completed` via the kitchen-display order-card buttons; reads UAT inventory at each step; asserts NEGATIVE invariant on preparing + ready (unchanged), positive delta of −1 at completed. Cleanup in afterEach restores baseline.
- `e2e/admin-order-inventory-delta.orders-page.spec.ts` (AC7b): same seed + lifecycle via the `/dashboard/orders` admin order-card; same delta assertions.
- **Both `test.fixme`'d** — see `test-execution-summary.md` § Honest scope note for the Playwright × Next.js server-action interaction triage. The seed + Mongo-assertion plumbing is intact; only the click invocation needs further investigation.

## Out of scope

- **No new E2E for `/dashboard/incidents`** — the UI mirrors REQ-064's `/dashboard/support` which already has RBAC + rendering coverage via the unit-tested layout `requireRole` gate. Manual UAT covers the kind-filter chips.
- **No E2E for the reconciliation cron** — the cron runs server-side without a UI; the unit tests for `reconcileMissedDeductions` cover the load-bearing logic.
- **No load-test for high-volume order completion** — the chokepoint adds the same Mongo writes that the previous 6 sites collectively did. Worst-case latency is unchanged.
- **No migration script for existing `inventoryDeducted: false` orders** — the reconciliation cron picks them up on the next tick after deployment. The 2h staleness threshold also means historical `paid` orders sitting in earlier states get flagged for management attention.

## Manual UAT — what to check

1. **Kitchen-display happy path** — Open `/dashboard/kitchen-display` as super-admin; advance a real paid order through `confirmed → preparing → ready → completed`. Check the order's inventory item in `/dashboard/inventory` after each step. Inventory should be UNCHANGED at preparing + ready, DECREMENTED at completed.
2. **Orders-page happy path** — Same lifecycle via `/dashboard/orders` admin cards. Same assertion.
3. **`/dashboard/incidents`** — Verify the page renders for csr / admin / super-admin sessions; that the kind filter chips work; that the empty-state copy ("No incidents matching this filter — good sign") shows when the filter excludes all rows.
4. **IncidentEvent on deduction throw** — Hard to reproduce manually; the operator can simulate by completing an order whose linked inventory row has been pre-corrupted (`unset` `currentStock`) then verifying an `inventory_deduction_failed` row lands in `/dashboard/incidents` and the order's status DID flip to completed (workflow not stalled).
5. **Stale-paid-order visibility** — Pay a `pickup` order via the customer flow, then DON'T touch the kitchen-display. Wait 2h+15min (one cron cycle). A `stale_paid_order` IncidentEvent should appear in `/dashboard/incidents`. The order's status remains unchanged.
6. **Cron is retry-only** — Pre-set an order to `completed` + `inventoryDeducted: false` in Mongo, then watch the next cron tick. The deduction should retry and the flag should flip to true. The order's status should NOT have been changed by the cron.
