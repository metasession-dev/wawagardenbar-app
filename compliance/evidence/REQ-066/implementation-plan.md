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

7. **AC7 — E2E invariant specs for BOTH completion-UI surfaces.** First invariant-class specs from #280. Both UIs route through the same `updateOrderStatusAction` → `OrderService.completeOrder` chokepoint at the action layer, but the UI shapes differ (kitchen-display steps through `preparing → ready → completed` via discrete buttons; orders-page has direct "Complete" buttons that can jump from `ready` to `completed`) and a UI-level regression on either surface wouldn't be caught by a single-path spec.
   - **AC7a — kitchen-display path** (`e2e/admin-order-inventory-delta.kitchen-display.spec.ts`): seed inventory + create order; advance through the kitchen-display order-card buttons; read inventory before + after; assert decrement at the `completed` transition (not earlier).
   - **AC7b — orders-page path** (`e2e/admin-order-inventory-delta.orders-page.spec.ts`): same seed + order; advance through the `/dashboard/orders` admin order-card; same delta assertion.
   - Both specs assert NEGATIVE invariants on intermediate transitions (inventory unchanged at `preparing` and `ready`) — proves the chokepoint is the ONLY mutation site.
   - Same DB-seed shape as `e2e/support-ticket-staff-flow.spec.ts`. Live against UAT.

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

### Post-deploy operator-reported defect — added AC8 (location routing)

Operator tested a fresh Desperados order on UAT after AC7a/AC7b shipped and observed inventory still showing 1 after completion. Investigation:

- The chokepoint fired correctly (`inventoryDeducted: true`, stockmovement written with `qty: -1`)
- BUT the Desperados inventory's `locations[0]` (the `store` bucket) was at 0 stock
- `applyOrderStockDelta` always targeted `locations[0]`, so `Math.max(0, 0 + -1) = 0` silently clamped the deduction
- The post-save hook then recomputed the aggregate `currentStock` as the sum of locations (0 + 1 = 1) — unchanged

This is the _original_ #277 bug. The 3-round root-cause refinement narrowed in on the chokepoint layer but never asked the operator's literal observation: "stockmovements are written but inventory doesn't change". The chokepoint refactor (AC1-AC6) is structurally correct but did not address the customer-facing symptom.

The fix is at the `applyOrderStockDelta` routing layer + a data backfill:

8. **AC8 — Sales deductions route to `defaultSalesLocation`.** Mutate `applyOrderStockDelta` so trackByLocation deductions land on the row's `defaultSalesLocation` (the front-of-house bucket — chiller* for drinks, freezer* for frozen items). If unset (legacy data), walk locations[] and take from the first non-empty bucket (safe fallback). If the sale-point can't satisfy the deduction, throw — the chokepoint catches and writes an `inventory_deduction_failed` IncidentEvent (matches the operator's stipulation that the system never auto-spills from store to sale-point; managers must move stock manually). Refills always land on `locations[0]` (the storeroom — unchanged from prior behavior).

   The `defaultSalesLocation` field already existed on the `Inventory` schema (line 61) and interface (line 63) but was never wired into deduction routing. A legacy migration (`scripts/migrate-location-tracking.ts`) had bulk-set it to `'store'` for all rows — the wrong target. A one-shot idempotent backfill (`scripts/backfill-sale-point-location.ts`) rewrites the field to chiller*/freezer* when those locations exist on the row.

   New tests:
   - `__tests__/services/inventory-service.sale-point-routing.test.ts` — 8 cases covering all 7 routing branches.
   - `__tests__/lib/sale-point-location-backfill.test.ts` — 15 cases on the pure helper (mapping rule + idempotency predicate + mongo filter).
   - `__tests__/services/inventory-service.track-by-location.test.ts` — 1 case updated (the test that codified the BROKEN clamp-at-zero behavior now asserts the new fall-through routing).
   - `e2e/admin-order-inventory-delta.sale-point.spec.ts` (AC8) — live E2E that force-mutates a seeded inventory into the Desperados-shape (locations[0]=0, locations[1]>=1, defaultSalesLocation=locations[1]) and confirms the deduction lands on locations[1].

   Backfill ran against UAT 2026-06-04: 37 of 39 trackByLocation rows touched (34 REWRITE from 'store', 3 SET fresh; 2 LEFT — items with only a store location, handled by the runtime fallback).

### Upstream skill gaps filed (out-of-scope for this REQ)

While composing the evidence pack, operator asked about screenshot density per spec role (feature-mode rich, regression-mode sparse). Two upstream issues filed against `metasession-dev/DevAudit-Installer`:

- [#113](https://github.com/metasession-dev/DevAudit-Installer/issues/113) — `evidenceShot`: add `tier` parameter to gate screenshot density on `EvidenceShotOrigin`
- [#114](https://github.com/metasession-dev/DevAudit-Installer/issues/114) — `e2e-test-engineer`: screenshot density policy guidance

These are out-of-scope for REQ-066. The REQ-066 evidence pack keeps the existing 3 curated screenshots (one per AC7a/7b/8).

### Post-deploy operator-reported UX gap — added AC9 (deduction-failure warning surfacing)

After AC8 landed and the operator manually tested on UAT (post prod-restore), they hit two related UX gaps on the over-sell scenario:

1. The kitchen-display "Complete Order" toast showed "Success" even when the chokepoint had logged an `inventory_deduction_failed` IncidentEvent — silent failure UX, operator only finds out via `/dashboard/incidents`.
2. The Express order / Quick Actions order-creation paths allowed the over-sell to be created in the first place — there's no pre-sale availability check on those surfaces (separate issue, deferred to **REQ-067**).

Item 1 is in scope as AC9; item 2 is filed as REQ-067 follow-up.

9. **AC9 — Completion surface flags deduction failure to the operator.** `OrderService.completeOrder` extends its return shape with `deductionFailed?: boolean` + `deductionError?: string` set when the chokepoint catches a throw. `updateOrderStatusAction` reads these and adds an optional `warning` to its `ActionResult`. The three UI surfaces that call `updateOrderStatusAction` (kitchen-order-card, admin order-card, admin order-actions-sidebar) show a destructive-variant toast titled "Completed — inventory not deducted" with the chokepoint's error message + a pointer to `/dashboard/incidents` when `result.warning` is set. The original "Success" toast still fires on the happy path.

   New / updated tests:
   - `__tests__/services/order-service.completeOrder.test.ts` — 2 new cases (AC9 return shape on throw + on happy path).
   - `e2e/admin-order-inventory-delta.over-sell.spec.ts` (AC9) — force-mutates an item so chiller1 has 2 units, seeds an order for 3 units, advances via kitchen-display. Asserts: status → completed, `inventoryDeducted: false`, IncidentEvent written with `defaultSalesLocation='chiller1'` mentioned in the error message, locations unchanged (no over-deduction, no clamp-at-zero), zero stockmovement rows for the order.

   What's still out of scope for REQ-066:
   - Pre-sale availability check on Express + Quick Actions + customer-ordering paths — surfaced and tracked as **REQ-067** (sale-point-aware availability across multiple order-create surfaces). The chokepoint's throw + IncidentEvent ensures over-sells never cause data corruption; managers see them on `/dashboard/incidents`. The pre-sale gate is a UX improvement, not a correctness fix.

### Post-AC9 operator workflow Q — added AC10 (IncidentEvent remediation)

Operator asked: when `/dashboard/incidents` shows an `inventory_deduction_failed` event, what's the remediation workflow? Two scenarios surfaced:

- **Scenario A** (chiller empty, store has stock) — has an in-system remediation today (transfer stock + wait up to 15 min for the cron) but the IncidentEvent spams every 15 min until it resolves + the operator has to wait the full cron cycle.
- **Scenario B** (no stock anywhere) — has no in-system remediation today (no manual override, no cancel-refund for completed orders). Filed as **REQ-068**.

Operator selected: roll Gap 1 (cron dedup) + Gap 2 (Retry-now button) + nav-link with permission gating into REQ-066 as AC10; defer Gap 3-5 to REQ-068.

10. **AC10 — IncidentEvent remediation UX.**
    1. **Cron dedup.** `services/inventory-service.ts` `reconcileMissedDeductions` catch — call `IncidentEventService.dedupRecent({ kind: 'inventory_deduction_failed', entityId: orderId, withinHours: 1 })` before `recordIncident`. Matches the existing pattern in `OrderService.scanStalePaidOrders`. 2 new unit cases in `__tests__/services/inventory-service.reconcile.test.ts`.
    2. **Retry-now action.** New `app/actions/admin/incidents-actions.ts` — `retryInventoryDeductionAction(orderId): ActionResult`. Requires the new `incidentsAccess` permission, calls `InventoryService.deductStockForOrder`, returns `{ success: true, message }` on success, `{ success: true, warning: <error> }` on throw (matches AC9 ActionResult shape so the destructive-toast UI pattern from AC9 fires identically). Audit-logs both success + failure paths with new `incidents.retry_deduction_succeeded` + `incidents.retry_deduction_failed` audit-action constants. 7 new unit cases in `__tests__/actions/admin/incidents-actions.test.ts`.
    3. **`/dashboard/incidents` Action column.** New rightmost column. Server-side joins Order.inventoryDeducted state for `inventory_deduction_failed` rows (single `OrderModel.find({ _id: { $in: orderIds } })`). Renders: `[Retry now]` button (new client component `components/features/admin/incident-retry-button.tsx`) when `inventoryDeducted: false`; `✓ Deducted` text when `true`; `—` for `stale_paid_order` rows.
    4. **Incidents in main nav.** New nav item at `components/features/admin/dashboard-nav.tsx` between "Audit Logs" and "Settings", `roles: ['csr', 'admin', 'super-admin']`, `permission: 'incidentsAccess'`. Same two-tier filter pattern (role + permission) as Recipes/Production.
    5. **`incidentsAccess` permission.** New field on `IAdminPermissions` interface (default-true across all role presets). The `permissions-editor.tsx` toggle card uses AlertTriangle icon. The page's layout switched to `requirePermission('incidentsAccess')` (was `requireRole`) for fine-grained gating. `lib/permissions.ts` `routePermissions` map adds `/dashboard/incidents`.
    6. **Soft-default for legacy users.** `app/actions/auth/admin-login.ts` reads `incidentsAccess: admin.permissions.incidentsAccess !== false` so users whose DB record predates AC10 keep access on first login without a data backfill. `permissions-editor.tsx` merges over `DEFAULT_ADMIN_PERMISSIONS` so missing keys show their default state in the toggle UI.
    7. **E2E AC10.** New test case in `e2e/admin-order-inventory-delta.over-sell.spec.ts` — drives an over-sell via UI, transfers stock via Mongo, navigates to `/dashboard/incidents`, clicks Retry now, asserts the order's `inventoryDeducted` flips + the inventory drops by the expected delta. Pre-merge state: `test.fixme` (deploy-gated; AC10 UI surface ships in this PR). Un-fixme'd post-merge after Railway redeploys UAT.

    What's deferred to **REQ-068** ([wawagardenbar-app #286 follow-up — separate issue to be filed]):
    - Manual mark-as-deducted override for Scenario B (no-stock-anywhere data-drift remediation)
    - Cancel/refund flow for `completed` orders
    - Per-row Delete/Dismiss actions on `/dashboard/incidents` beyond Retry now
    - Promote `FIFTEEN_MIN_MS` + `STALE_PAID_ORDER_THRESHOLD_HOURS` to `SystemSettings` with admin UI (the cron-cadence editor the operator asked about)
