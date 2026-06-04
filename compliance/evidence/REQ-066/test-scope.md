# REQ-066 — Test scope

## In scope (unit + integration — load-bearing for this REQ)

- `OrderService.completeOrder` chokepoint: happy path + idempotency + deduction-throw-writes-IncidentEvent + order-not-found + cancelled-order rejection.
- `InventoryService.reconcileMissedDeductions`: query shape, success retry, failure IncidentEvent write.
- `OrderService.scanStalePaidOrders`: query shape (paid + non-completed/cancelled + `createdAt < threshold`), positive flag write, 24h-dedup skip.
- `IncidentEventModel` schema (defaults, required fields, enum gate on `kind`).
- `IncidentEventService` API: `recordIncident` persistence, `list` kind-filter shape, `dedupRecent` window check.
- `scheduled-jobs.ts` interval count updated 2 → 3 (idempotent on second call).
- **AC8 — `applyOrderStockDelta` routing:** all 7 branches covered by `__tests__/services/inventory-service.sale-point-routing.test.ts` (default-sales-location set + sufficient stock, set + insufficient → throws, set + non-existent code → fallback, unset + locations[0] empty → fallback, unset + locations[0] stock → fallback, total-insufficient → throws, refill always lands on locations[0], non-location-tracked unchanged).
- **AC8 — backfill helper:** `__tests__/lib/sale-point-location-backfill.test.ts` (mapping rule chiller* > freezer* > null, REWRITE candidate predicate, idempotency, mongo filter shape).
- **Regression guards** (CRITICAL — the structural promise of this REQ):
  - `__tests__/regression/inventory-deduction-removed.test.ts` — source-code-level assertion that the 4 historical files have exactly the allowed `deductStockForOrder(` call count (0 for webhooks + tab-service; 1 for `services/order-service.ts` where the canonical site lives).
  - `__tests__/api/webhooks/paystack-idempotency.test.ts` + `monnify-idempotency.test.ts` — REQ-049's existing idempotency tests updated to assert webhooks NO LONGER call `deductStockForOrder` (regression guard at the behavioural layer).
  - `__tests__/services/inventory-service.track-by-location.test.ts` — the test that _codified_ the broken clamp-at-zero behavior is updated to assert the new fall-through-to-first-non-empty routing. The bug shape is now in the regression pack.

## In scope (E2E — live-passing against UAT)

- `e2e/admin-order-inventory-delta.kitchen-display.spec.ts` (AC7a): seeds an order via direct Mongo write; advances `confirmed → preparing → ready → completed` via the kitchen-display order-card buttons; reads UAT inventory at each step; asserts NEGATIVE invariant on preparing + ready (unchanged) + positive delta of −1 at completed. Cleanup is location-aware — it computes the actual deducted amount from the order's stockmovements and restores `locations[0].currentStock` (for `trackByLocation` rows) or the aggregate.
- `e2e/admin-order-inventory-delta.orders-page.spec.ts` (AC7b): same shape via the `/dashboard/orders` admin order-card. Same location-aware cleanup.
- `e2e/admin-order-inventory-delta.sale-point.spec.ts` (AC8): **force-mutates** a seeded inventory into the Desperados-shape (locations[0]=0, defaultSalesLocation=locations[1].location), advances the order via kitchen-display, asserts the deduction lands on the sale-point bucket NOT the empty storeroom. Cleanup restores `locations[*]` and `defaultSalesLocation` exactly. This is the spec that catches the original #277 bug shape.
- All three specs use `describe.configure({ mode: 'serial' })` because they share inventory state on the shared UAT database.

## In scope (operational scripts)

- `scripts/backfill-sale-point-location.ts` — one-shot idempotent backfill. Ran against UAT 2026-06-04 (37/39 rows touched). Will run against production at release time. Unit-tested via the pure helper in `lib/sale-point-location-backfill.ts`.

## Out of scope

- **No new E2E for `/dashboard/incidents`** — the UI mirrors REQ-064's `/dashboard/support` which already has RBAC + rendering coverage via the unit-tested layout `requireRole` gate. Manual UAT covers the kind-filter chips.
- **No E2E for the reconciliation cron** — runs server-side without a UI; unit tests for `reconcileMissedDeductions` cover the load-bearing logic.
- **No load-test for high-volume order completion** — the chokepoint adds the same Mongo writes that the previous 6 sites collectively did. Worst-case latency is unchanged.
- **No admin UI for setting `defaultSalesLocation`** — the backfill picks sensible defaults for all current items (chiller* > freezer* > null). Per-item operator override is a future REQ if needed.
- **No migration script for existing `inventoryDeducted: false` orders** — the reconciliation cron picks them up on the next tick after deployment.
- **No upstream `evidenceShot` tier param work** — filed as separate issues against `metasession-dev/DevAudit-Installer` ([#113](https://github.com/metasession-dev/DevAudit-Installer/issues/113) helper change + [#114](https://github.com/metasession-dev/DevAudit-Installer/issues/114) skill density guidance).

## Manual UAT — what to check

1. **Kitchen-display happy path** — Open `/dashboard/kitchen-display` as super-admin; advance a real paid order through `confirmed → preparing → ready → completed`. Check the order's inventory item in `/dashboard/inventory` after each step. Inventory should be UNCHANGED at preparing + ready, DECREMENTED at completed.
2. **Orders-page happy path** — Same lifecycle via `/dashboard/orders` admin cards. Same assertion.
3. **AC8 — Desperados shape** — Pick any inventory with `locations[0].currentStock === 0` and stock in a chiller / freezer location. Complete a paid order via kitchen-display. Inventory aggregate should drop by 1. The chiller (or whichever location is set as `defaultSalesLocation`) is the one that gets decremented. Check `/dashboard/incidents` — should be empty (no `inventory_deduction_failed` event for this order).
4. **AC8 — insufficient stock at sale-point** — Pick an inventory where `defaultSalesLocation` is set but that location has 0 stock AND other locations have stock. Complete a paid order via kitchen-display. The deduction should throw → an `inventory_deduction_failed` IncidentEvent appears on `/dashboard/incidents`. The order's status still flips to completed (workflow does not stall). Manager moves stock manually via the inventory transfer UI; a subsequent retry (cron-driven or new order) succeeds.
5. **`/dashboard/incidents`** — Verify the page renders for csr / admin / super-admin sessions; that the kind filter chips work; that the empty-state copy shows when filtered out.
6. **Stale-paid-order visibility** — Pay a `pickup` order via the customer flow, then DON'T touch the kitchen-display. Wait 2h+15min (one cron cycle). A `stale_paid_order` IncidentEvent should appear in `/dashboard/incidents`.
7. **Cron is retry-only** — Pre-set an order to `completed` + `inventoryDeducted: false` in Mongo. Next cron tick should retry the deduction and flip the flag. The order's status MUST NOT change.
