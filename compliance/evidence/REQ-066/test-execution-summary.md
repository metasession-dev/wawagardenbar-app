# REQ-066 — Test execution summary

**Run date:** 2026-06-04
**Commit on develop:** post-PR-#281 merge (`6f259ae`)

## Vitest (unit + integration)

```
RUN  v4.1.8 /home/william/Documents/SoftwareProjects/Metasession/wawagardenbar app

 Test Files  118 passed | 1 skipped (119)
      Tests  1095 passed | 4 skipped (1099)
   Start at  00:01:32
   Duration  4.49s
```

**REQ-066 cases (new):** 23 total.

- `__tests__/models/incident-event-model.test.ts` — 3 new (required fields; valid construction; enum gate).
- `__tests__/services/incident-event-service.test.ts` — 5 new (recordIncident persistence; list filter shape; list "all" omits clause; dedupRecent true; dedupRecent false).
- `__tests__/services/order-service.completeOrder.test.ts` — 5 new (happy path flips status + deducts + audit log; idempotency on already-completed + deducted; throw writes IncidentEvent + still flips status; not-found returns failure; cancelled rejected).
- `__tests__/services/order-service.scanStalePaidOrders.test.ts` — 3 new (query shape `paymentStatus=paid` + `$nin` + `$lt`; positive flag + summary; dedupRecent skip).
- `__tests__/services/inventory-service.reconcile.test.ts` — 3 new (query filter; success retry; failure IncidentEvent).
- `__tests__/regression/inventory-deduction-removed.test.ts` — 4 new regression-guard cases.

**Updated:**

- `__tests__/api/webhooks/paystack-idempotency.test.ts` — 2 cases assert webhook NO LONGER calls `deductStockForOrder` (REQ-049 idempotency still holds for the reward award; the deduction is owned by the kitchen-completion chokepoint).
- `__tests__/api/webhooks/monnify-idempotency.test.ts` — same.
- `__tests__/lib/scheduled-jobs.test.ts` — interval count 2 → 3.

## E2E (Playwright)

### Focused REQ-066 run against UAT

Both AC7 specs pass live against UAT:

```
[auth-setup] auth.setup.ts × 3                                                                  ✓
[regression] e2e/admin-order-inventory-delta.kitchen-display.spec.ts:AC7a                       ✓ (25.1s)
[regression] e2e/admin-order-inventory-delta.orders-page.spec.ts:AC7b                           ✓ (27.5s)

 5 passed (1.1m)
```

### What the specs prove

For both UI surfaces (kitchen-display and `/dashboard/orders`):

- **Seed:** picks the first UAT menu item with `trackInventory: true` and its linked Inventory row, snapshots the true baseline stock (location-aware — see below), inserts a one-item order with `status: 'confirmed'`, `paymentStatus: 'paid'`, `inventoryDeducted: false`. Includes `estimatedWaitTime` (Mongoose-required; missing this field caused `order.save()` inside the server action to silently fail with a validation error during initial triage).
- **UI advance:** routes through the kitchen-display order-card buttons (AC7a) or the `/dashboard/orders` admin order-card buttons (AC7b). Pre-seeds `cookieConsent` via `addInitScript` so the REQ-065 bottom-fixed banner does not intercept clicks on viewport-edge buttons.
- **Mongo polling:** asserts `Order.status` flips on each transition + reads true `Inventory` stock between steps; NEGATIVE invariant at preparing and ready (stock unchanged), POSITIVE assertion at completed (stock decremented by exactly 1).
- **Cleanup:** `afterEach` reads the order's `stockmovements` to compute the actual deducted amount, deletes the order + its stock-movement rows, then increments `locations[0].currentStock` (for `trackByLocation` rows) or the aggregate `currentStock` (for non-location rows) by the same amount — restoring the inventory exactly.

### Location-aware stock handling — root-cause note

Initial live runs against UAT failed with the chokepoint-decremented stock showing as 23 (not the expected baseline − 1 = 39). Root cause: the seeded menu item (Gulder) has `trackByLocation: true` with 2 locations, and the Inventory model's post-save hook recomputes the aggregate `currentStock` field as the sum of `locations[*].currentStock`. The original seed snapshotted the aggregate field which had drifted stale relative to the locations array; the deduction wrote to `locations[0]` and the post-save hook then recomputed the aggregate to its correct (lower) value, exposing the drift.

Fix applied to both specs: a `computeStockFromInventory()` helper that returns the sum of locations for `trackByLocation` rows (or the aggregate otherwise) is used at baseline-capture, inter-step polling, and the final delta poll. Cleanup is symmetric: it `$inc`s `locations.0.currentStock` (or the aggregate) by the absolute total of `stockmovements.quantity` rows for the seeded order, leaving UAT inventory exactly as it was found.

The specs are configured with `describe.configure({ mode: 'serial' })` since they share inventory state with each other on the shared UAT database.

### Full regression pack against UAT (7.8 min wall-clock)

```
326 passed | 19 skipped | 27 did-not-run | 0 failed
```

Comparison to the REQ-065 evidence-pack baseline (2026-06-03):

| Metric      | REQ-065 baseline | REQ-066 evidence | Delta    |
| ----------- | ---------------- | ---------------- | -------- |
| passed      | 290              | 326              | +36      |
| skipped     | 15               | 19               | +4       |
| did-not-run | 34               | 27               | -7       |
| failed      | 0                | 0                | **0**    |
| wall-clock  | 10.1 min         | 7.8 min          | -2.3 min |

**Zero regressions from REQ-066** despite removing 6 inventory-deduction call sites + the dead duplicate completion file + adding a 15-min cron + new admin view. The +36 passed delta includes the new REQ-066 specs + a few previously did-not-run specs that now execute (the worker scheduler likely benefited from the lighter REQ-049 webhook tests no longer mocking deduction).

## TypeScript

```
$ npx tsc --noEmit
# exit 0
```

0 errors.

## ESLint

```
$ npx eslint . --max-warnings=10000
✖ 950 problems (0 errors, 950 warnings)
```

0 errors; 950 pre-existing `no-console` warnings unchanged.

## Build

```
$ npm run build
# exit 0 — all routes built including /dashboard/incidents + the new
# IncidentEventModel registration during build-time module evaluation.
```

## Regression posture

- 1095 / 1099 vitest = 99.6% pass rate (4 skipped are pre-existing).
- 326 / 0 E2E against UAT.
- 0 new failures relative to the REQ-065 baseline.
- +23 vitest delta (REQ-066 unit + integration + regression-guard cases).
- The 27 "did not run" bucket remains as the operational follow-up flagged on prior cycles. NOT a REQ-066 regression — actually improved by 7 specs.
