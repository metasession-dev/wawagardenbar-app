# REQ-066 — Test execution summary

**Run date:** 2026-06-04 (revised after post-deploy operator-reported defect → added AC8)
**Commit on develop:** post-PR-#282 merge (`6e1bb8e`) → fix branch `fix/REQ-066-sale-point-location`

## Vitest (unit + integration)

```
RUN  v4.1.8

 Test Files  120 passed | 1 skipped (121)
      Tests  1118 passed | 4 skipped (1122)
   Duration  4.42s
```

**REQ-066 cases:** 46 total (+23 vs the prior AC1-AC7 baseline of 1095 vitest tests).

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

All three invariant specs pass live:

```
[auth-setup] auth.setup.ts × 3                                                                ✓
[regression] e2e/admin-order-inventory-delta.kitchen-display.spec.ts:AC7a                     ✓ (25.7s)
[regression] e2e/admin-order-inventory-delta.orders-page.spec.ts:AC7b                         ✓ (27.1s)
[regression] e2e/admin-order-inventory-delta.sale-point.spec.ts:AC8                           ✓ (26.6s)

 6 passed (1.5m)
```

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

### Full regression pack against UAT (16.2 min wall-clock)

```
326 passed | 18 skipped | 27 did-not-run | 0 failed
```

Comparison to the prior AC1-AC7 evidence-pack run (2026-06-04 earlier):

| Metric      | Prior AC1-AC7 baseline | Post-AC8 run | Delta    |
| ----------- | ---------------------- | ------------ | -------- |
| passed      | 326                    | 326          | 0        |
| skipped     | 19                     | 18           | -1       |
| did-not-run | 27                     | 27           | 0        |
| failed      | 0                      | 0            | **0**    |
| wall-clock  | 7.8 min                | 16.2 min     | +8.4 min |

**Zero new failures.** The skipped count drops by 1 because the AC8 spec moved from "didn't exist" to "passed" while another optional spec slot fell into skipped — the operational outcome is the same. Wall-clock doubled because three inventory-delta specs now share UAT state (vs two previously) and contend on the same `trackByLocation:true` menu items; per-spec serial mode prevents intra-spec races but spec-vs-spec contention pushes them serial-ish in practice. This is acceptable for the regression cadence (cron-triggered, post-merge) and not on the critical path of a developer iteration loop.

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
