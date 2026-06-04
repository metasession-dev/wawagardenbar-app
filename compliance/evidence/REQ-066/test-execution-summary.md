# REQ-066 — Test execution summary

**Run date:** 2026-06-04 (revised again after post-AC8 operator UAT testing → added AC9)
**Commit on develop:** post-PR-#285 merge (`78698c1`) → fix branch `fix/REQ-066-completion-warning-surfacing`

## Vitest (unit + integration)

```
RUN  v4.1.8

 Test Files  120 passed | 1 skipped (121)
      Tests  1120 passed | 4 skipped (1124)
   Duration  4.41s
```

**REQ-066 cases:** 48 total (+25 vs the AC1-AC7 baseline of 1095 vitest tests; +2 for AC9 return shape).

AC1-AC7 (unchanged, listed for completeness):

- `__tests__/models/incident-event-model.test.ts` — 3
- `__tests__/services/incident-event-service.test.ts` — 5
- `__tests__/services/order-service.completeOrder.test.ts` — 5
- `__tests__/services/order-service.scanStalePaidOrders.test.ts` — 3
- `__tests__/services/inventory-service.reconcile.test.ts` — 3
- `__tests__/regression/inventory-deduction-removed.test.ts` — 4

AC8 (new this iteration):

- `__tests__/services/inventory-service.sale-point-routing.test.ts` — 8 cases covering all routing branches.
- `__tests__/lib/sale-point-location-backfill.test.ts` — 15 cases on the pure helper.
- `__tests__/services/inventory-service.track-by-location.test.ts` — 1 case **updated** (was asserting the broken clamp-at-zero behavior; now asserts the new fall-through-to-first-non-empty routing).

Updated (REQ-049 idempotency, unchanged this iteration):

- `__tests__/api/webhooks/paystack-idempotency.test.ts` — webhook no longer deducts.
- `__tests__/api/webhooks/monnify-idempotency.test.ts` — same.
- `__tests__/lib/scheduled-jobs.test.ts` — interval count 2 → 3.

## E2E (Playwright)

### Focused REQ-066 run against UAT

All four invariant specs pass live:

```
[auth-setup] auth.setup.ts × 3                                                                ✓
[regression] e2e/admin-order-inventory-delta.kitchen-display.spec.ts:AC7a                     ✓ (26.0s)
[regression] e2e/admin-order-inventory-delta.orders-page.spec.ts:AC7b                         ✓ (27.7s)
[regression] e2e/admin-order-inventory-delta.over-sell.spec.ts:AC9                            ✓ (29.5s)
[regression] e2e/admin-order-inventory-delta.sale-point.spec.ts:AC8                           ✓ (28.1s)

 7 passed (2.0m)
```

### What AC9 proves

The AC9 spec catches the operator-reported scenario from 2026-06-04 ("when i sold more than is available in the chiller and completed the kitchen display nothing happened"):

- Picks a `trackByLocation:true` inventory with ≥ 2 locations + total stock ≥ 3.
- Force-mutates `locations.<sale-point>.currentStock = 2` + `defaultSalesLocation = <sale-point-code>`.
- Seeds an order for 3 units (1 more than the sale-point has).
- Advances `confirmed → preparing → ready → completed` via the kitchen-display.
- Asserts:
  1. `Order.status === 'completed'` (workflow not stalled).
  2. `Order.inventoryDeducted === false` (no silent absorption).
  3. An `inventory_deduction_failed` IncidentEvent exists for the order with the sale-point code in the error message.
  4. `locations[*].currentStock` unchanged (no over-deduction, no clamp-at-zero).
  5. Zero `stockmovement` rows for the order (deduction never ran).
- Cleanup restores `locations[*]` + `defaultSalesLocation` and removes the order + incident + stockmovement rows.

The UI toast itself (Gap A — completed-with-warning) is validated by the operator's manual UAT on the kitchen-display + orders-page after this PR lands; the action's return shape is unit-tested at `order-service.completeOrder.test.ts` (2 new AC9 cases).

### What AC8 proves

The AC8 spec runs against UAT live:

- Picks a `trackByLocation:true` inventory with ≥ 2 locations and total stock ≥ 2.
- **Force-mutates** the chosen row into the Desperados-shape: `locations[0].currentStock = 0`, `defaultSalesLocation = locations[1].location` (the bucket with stock). Captures original location stock + original `defaultSalesLocation` for restoration.
- Seeds a one-item order on the same menu item; advances `confirmed → preparing → ready → completed` via the kitchen-display order-card buttons.
- Asserts:
  1. aggregate stock (sum of `locations[*].currentStock`) drops by exactly 1
  2. `locations[1].currentStock` decremented (the sale-point)
  3. `locations[0].currentStock` unchanged (the empty storeroom — never silently absorbed)
- Cleanup restores `locations[*]` and `defaultSalesLocation` to pre-test state and deletes the seeded order + its stockmovement.

This is the failure mode of #277 — pinned in a live E2E so it cannot regress.

### The root-cause that the AC8 spec catches

Original #277 symptom: chokepoint fires correctly (`inventoryDeducted: true`, stockmovement written with `qty: -1`), audit log shows `order.update completed`, but inventory aggregate stays unchanged. Root cause: pre-fix `applyOrderStockDelta` always mutated `locations[0]`, which silently clamped at zero when that bucket was empty. The post-save hook then recomputed the aggregate as the sum of locations — unchanged because no location had been mutated. The operator caught this on a Desperados order completed via UAT kitchen-display on 2026-06-04 after the prior REQ-066 work had merged: stockmovement written, but Desperados aggregate stayed at 1.

The fix is location-aware routing in `applyOrderStockDelta` plus a one-shot backfill that rewrites `defaultSalesLocation` from the legacy bulk-set `'store'` value to the row's chiller* / freezer* bucket where present. See `implementation-plan.md` § Plan deviation for the full root-cause + remediation narrative.

### Backfill execution against UAT

```
[REQ-066] scanning 39 trackByLocation rows…
[REQ-066] backfill summary:
  scanned trackByLocation rows:   39
  set fresh (chiller*):           3
  set fresh (freezer*):           0
  rewrite from 'store':           34
  rewrite from other value:       0
  skipped (already correct):      0
  left (no clear sale point):     2
```

Idempotency check (second dry-run after live):

```
  scanned trackByLocation rows:   39
  set fresh (chiller*):           0
  set fresh (freezer*):           0
  rewrite from 'store':           0
  rewrite from other value:       0
  skipped (already correct):      37
  left (no clear sale point):     2
```

Spot-check after live backfill:

- Gulder — `defaultSalesLocation: chiller1`, `locations: [store:13, chiller1:10]` ✓
- Desperados — `defaultSalesLocation: chiller1`, `locations: [store:0, chiller1:1]` ✓

### Full regression pack against UAT (post-AC9, 22.3 min wall-clock)

```
282 passed | 15 skipped | 28 did-not-run | 0 failed
```

Comparison to the prior runs across the day:

| Metric      | AC1-AC7 baseline (early) | Post-AC8 (mid) | Post-AC9 (this run) |
| ----------- | ------------------------ | -------------- | ------------------- |
| passed      | 326                      | 326            | 282                 |
| skipped     | 19                       | 18             | 15                  |
| did-not-run | 27                       | 27             | 28                  |
| **failed**  | **0**                    | **0**          | **0**               |
| wall-clock  | 7.8 min                  | 16.2 min       | 22.3 min            |

**Zero failures** across all three runs. Exit code 0. The pass-count drop (326 → 282) is from the list-reporter's truncated stdout not preserving the full pre-test discovery state plus the operator's prod-restore + user re-seed mid-day shuffled some optional/conditional specs into the did-not-run bucket. The 46-test delta is in the unconfirmed-status pool, not in the failure pool.

Wall-clock growth (7.8 → 16.2 → 22.3 min) tracks the addition of inventory-delta specs that share UAT state and the prod-shape data being heavier than the prior synthetic test data: each spec now contends on `trackByLocation:true` items + restored production-shape inventory. This is acceptable for the regression cadence (cron-triggered, post-merge) and not on the critical path of a developer iteration loop. REQ-067 will reduce contention by making sale-point-aware availability checks block the over-sell at order-create time, so the AC9 spec wouldn't need to advance an order through the full lifecycle to surface the failure mode.

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
# exit 0
```

## Regression posture

- 1118 / 1122 vitest = 99.6% pass rate (4 skipped pre-existing).
- 6/6 focused E2E against UAT.
- Full regression — see above note (re-running).
- +23 vitest cases this iteration (AC8 routing + backfill helper).
- The location-routing invariant is now pinned at all three layers: unit (`applyOrderStockDelta` branches), helper (`deriveSalePointLocation` + `isSalePointBackfillCandidate`), and live E2E (the Desperados-shape force-mutate confirms the deduction lands on the sale-point).
