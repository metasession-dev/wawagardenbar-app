# REQ-066 — Inventory deduction correctness + reconciliation

**Status:** IN PROGRESS · **Risk:** HIGH · **Issue:** #277 (root cause refined three times in comments); pattern context: #280

## Context

Operator reported: "items being sold are not deducted from inventory count. The audit log shows it."

After three rounds of refinement:

1. First framed as catch-and-swallow at `OrderService.createOrder:205-218`.
2. Then framed as customer path bypassing OrderService (deferred to payment-webhook).
3. **Operator-correct frame:** "items get deducted after it's set to completed in the kitchen display." Plus: "I don't want anything bypassing the kitchen display, I don't want cron jobs doing that either." And: tab orders DO go through kitchen-display individually.

The intended semantic is **single canonical site at kitchen-display `completed`**. Every other deduction site is premature and must be removed. No automation may mutate `status: completed` — only kitchen staff via the display.

## Current state — what's wrong

Today, `deductStockForOrder` is called from **6 sites**, and there are **3 distinct functions** that all flip status to `completed`:

**Deduction sites to REMOVE (premature):**

- `services/order-service.ts:205-218` — `createOrder` (admin/API/express)
- `services/order-service.ts:754-763` — `completeOrderPaymentManually` (express POS + manual payment)
- `app/api/webhooks/paystack/route.ts:122-136` — payment-confirmed
- `app/api/webhooks/monnify/route.ts:131-135` — payment-confirmed
- `services/tab-service.ts:358-369` — tab open path
- `services/tab-service.ts:845-852` — tab close path (operator confirmed tab orders DO go through kitchen-display)

**Completion functions to CONSOLIDATE:**

- `app/actions/order/complete-order-action.ts:23` — `completeOrderAndDeductStockAction`
- `app/actions/order/complete-order-action.ts:125` — `updateOrderStatusAction`
- `app/actions/admin/order-management-actions.ts:272` — `updateOrderStatusAction` (the kitchen-display one)

All three flip status + attempt deduction with their own catch-and-swallow. The structural cleanup is to make ONE chokepoint that the kitchen-display calls (directly or indirectly) and that no other path can bypass.

## Acceptance criteria

1. **AC1 — Single canonical completion function.** New `OrderService.completeOrder(orderId, actor)` is the only place in the codebase that sets `Order.status = 'completed'`. It:
   - flips `status` to `completed`
   - adds the status-history row
   - calls `InventoryService.deductStockForOrder(orderId)` guarded by `!inventoryDeducted`
   - on success: sets `inventoryDeducted`, `inventoryDeductedAt`, `inventoryDeductedBy`
   - on throw: writes an `IncidentEvent` row tagged `inventory_deduction_failed` + DOES NOT block the status flip (kitchen workflow must not stall)
   - writes the existing `AuditLogService` entry
   - saves

   The kitchen-display action (`order-management-actions.ts:updateOrderStatusAction`) routes through this function when `newStatus === 'completed'`. The two duplicate functions in `complete-order-action.ts` are removed (or thinned to thin wrappers that call `OrderService.completeOrder`); a regression-guard test ensures they never re-grow inline deduction logic.

2. **AC2 — Remove 6 premature deduction sites.** Delete the inline `deductStockForOrder` blocks at the 6 sites listed above. Each removal carries a regression-guard unit test asserting that the function no longer calls `InventoryService.deductStockForOrder` directly.

3. **AC3 — `IncidentEventModel` for persistent silent-fail audit.** New schema (`kind`, `entityId`, `summary`, `errorDetails`, `createdAt`). Initial kinds: `inventory_deduction_failed`, `stale_paid_order` (the visibility-only one in AC5). Indexes on `(kind, createdAt: -1)` and `(entityId, createdAt: -1)`.

4. **AC4 — Retry-only reconciliation cron.** 15-minute job via `lib/scheduled-jobs.ts` (REQ-048 precedent). **Does NOT change order status.** Only action: scan for orders with `status === 'completed' AND inventoryDeducted === false`; retry `deductStockForOrder`; on success flip the flag; on failure write a fresh `IncidentEvent`. Pure backstop for the AC1 catch-and-incident-log path.

5. **AC5 — Stale-paid-orders visibility (NOT automation).** Same 15-min job ALSO scans for orders with `paymentStatus === 'paid' AND status NOT IN ('completed', 'cancelled') AND createdAt > N hours` (N defaults to `2`, configurable via new `SystemSettings.stalePaidOrderThresholdHours`). For each such order, writes an `IncidentEvent` tagged `stale_paid_order` (one per scan cycle; dedup by `entityId + threshold-band`). Does NOT change order state. Surfaces in AC6.

6. **AC6 — `/dashboard/incidents` admin view.** Server-rendered list of `IncidentEvent` rows, newest-first, with a `kind` filter chip bar (`inventory_deduction_failed`, `stale_paid_order`, `all`). RBAC `csr` / `admin` / `super-admin`. Read-only — no actions in this REQ. Mirrors `/dashboard/support` (REQ-064) in structure.

7. **AC7 — E2E invariant spec for kitchen-completion.** First invariant-class spec from #280. Admin path: seed inventory + create order + advance through `confirmed → preparing → ready → completed` via the kitchen-display actions; read inventory before + after; assert decrement. Same DB-seed shape as `e2e/support-ticket-staff-flow.spec.ts`. Live against UAT.

## Technical approach

### New models / services (3 new files)

- `models/incident-event-model.ts` — schema per AC3.
- `services/incident-event-service.ts` — `recordIncident(kind, entityId, summary, errorDetails?)` + `list({ kind?, limit, skip })` + `dedupRecent(kind, entityId, withinHours)` for the stale-paid-order dedup.
- `services/inventory-service.ts` — add `reconcileMissedDeductions()` (Pass for AC4) + `findStalePaidOrders(hours)` helper (used by AC5 scan).

### Canonical completion function (1 new file)

- `services/order-service.ts` — add `completeOrder({ orderId, actorUserId, actorRole, note? })`. The kitchen-display + the express + any other status-update path that reaches `completed` must call this. The two duplicate functions in `complete-order-action.ts` become thin wrappers (or are deleted if no longer referenced).

### Removed inline deductions (6 sites, modifications across)

- `services/order-service.ts:205-218` — remove block.
- `services/order-service.ts:754-763` — remove block.
- `app/api/webhooks/paystack/route.ts:122-136` — remove block. Status still flips to `confirmed`.
- `app/api/webhooks/monnify/route.ts:131-135` — remove block.
- `services/tab-service.ts:358-369` — remove block.
- `services/tab-service.ts:845-852` — remove block.

### Order-management action (1 modified file)

- `app/actions/admin/order-management-actions.ts:333` — keep the line-333 detection of `newStatus === 'completed'` but route through `OrderService.completeOrder` instead of `completeOrderAndDeductStockAction`. Replace the `console.error` at line 337 with `IncidentEventService.recordIncident` (now buried inside `OrderService.completeOrder`).

### Cron registration (1 modified file)

- `lib/scheduled-jobs.ts` — register a new 15-minute job that calls `InventoryService.reconcileMissedDeductions()` then `InventoryService.findStalePaidOrders()` (which writes `IncidentEvent` rows; no state changes).

### Settings (1 modified file)

- `models/system-settings-model.ts` — add `stalePaidOrderThresholdHours` (optional, default `2`).

### Incidents UI (3 new files)

- `app/dashboard/incidents/layout.tsx` — `requireRole(['csr', 'admin', 'super-admin'])`.
- `app/dashboard/incidents/page.tsx` — server-rendered list + filter chips.
- (No detail page in v1; future REQ adds it.)

### E2E (1 new file)

- `e2e/admin-order-inventory-delta.spec.ts` — invariant spec per AC7.

## Risk

**HIGH.** Three vectors:

1. **Over-deduction.** Removing 6 inline call sites is safe only if `OrderService.completeOrder` is reachable from every legitimate completion path. **Mitigation:** Phase 1 verification step (before writing tests) — grep every callsite that mutates `Order.status` and confirm each routes through the new chokepoint.
2. **Under-deduction.** Cron miss + a buggy chokepoint = drift. **Mitigation:** unit tests at TDD red baseline; the visibility panel surfaces it within 15 minutes of the next scan.
3. **Workflow regression invisible to monitoring.** The new policy is "kitchen staff MUST complete every order." If they don't, drift returns. **Mitigation:** the stale-paid-orders panel makes the workflow gap visible to managers in real time; the operator has explicitly accepted this trade-off ("I don't want cron jobs doing that").

## Security considerations

- **Idempotency.** Every deduction call inside `OrderService.completeOrder` is guarded by `!inventoryDeducted`. Cron retry uses the same guard. Cannot double-decrement.
- **Auth.** Cron runs server-side without a session. `IncidentEvent` rows tagged by `actorUserId: 'system_reconciliation'` for traceability. Kitchen-staff completions remain attributed to the staff session.
- **No new data egress.** `IncidentEvent` rows hold operational metadata; the only PII is the existing `entityId` (orderId).

## Dependencies

- REQ-048 (RELEASED) — `lib/scheduled-jobs.ts` precedent.
- REQ-049 (RELEASED) — webhook idempotency, unchanged.
- REQ-055 (RELEASED) — NotificationLog shape mirrored by `IncidentEventModel`.

## Test scope

Vitest cases (target ~16):

1. `order-service.completeOrder.test.ts` — happy path: flips status, deducts, sets all flags, writes audit log.
2. `order-service.completeOrder.test.ts` — idempotency: second call on already-completed order doesn't double-deduct.
3. `order-service.completeOrder.test.ts` — deduction throw: writes IncidentEvent + still flips status (kitchen workflow not blocked).
4. `inventory-service.reconcileMissedDeductions.test.ts` — finds completed-but-not-deducted; retries; flips flag on success.
5. `inventory-service.reconcileMissedDeductions.test.ts` — failed retry writes IncidentEvent.
6. `inventory-service.findStalePaidOrders.test.ts` — query shape (paid + non-completed + non-cancelled + age > threshold); dedup window.
7. `incident-event-model.test.ts` — schema defaults.
8. `incident-event-service.test.ts` — recordIncident persists; list filter by kind; dedupRecent skips writes within window.
9. `incidents-page.rbac.test.ts` — RBAC.
10. **Regression guards** (5 cases) — assert that each of the 6 removed deduction sites no longer calls `InventoryService.deductStockForOrder` directly:
    - `order-service.createOrder.no-deduction.test.ts`
    - `order-service.completeOrderPaymentManually.no-deduction.test.ts`
    - `paystack-webhook.no-deduction.test.ts`
    - `monnify-webhook.no-deduction.test.ts`
    - `tab-service.no-deduction.test.ts` (covers both lines 358 + 845)

E2E:

- `e2e/admin-order-inventory-delta.spec.ts` — invariant spec.

## Phase 1 verification before TDD baseline

Before writing any test:

1. Grep every `order.status = 'completed'` and `{ status: 'completed' }` assignment across the codebase. Confirm each routes through `OrderService.completeOrder` after the refactor, or is a read-only query.
2. Grep every caller of `completeOrderAndDeductStockAction` and the two `updateOrderStatusAction`s. Plan migration paths for each.
3. Verify the tab → kitchen-display assumption by reading tab-creation and kitchen-display query logic. If tabs are excluded from kitchen-display by some filter, the operator needs to confirm before TabService deductions are removed.

These three checks are non-negotiable preconditions for the rest of the plan — they preserve AC1's "single chokepoint" promise.

## Plan deviation

_(to be filled if implementation requires divergence)_
