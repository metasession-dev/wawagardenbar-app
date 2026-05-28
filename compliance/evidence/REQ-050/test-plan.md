# Test Plan — REQ-050

**Requirement:** REQ-050 — Expense-restock stock-leak fix for `trackByLocation` inventory
**Risk Level:** HIGH → unit + integration; e2e n/a per `test-scope.md`
**Date:** 2026-05-28

## Approach

Vitest, fully mocked per `__tests__/services/*.test.ts` convention. 50 cases pass across 4 test files (new + updated). The load-bearing assertion is the invariant: after `applyExpenseInventoryLink` on a `trackByLocation` item, `sum(locations) === expected post-save currentStock` — so a subsequent `inventory.save()` (which would fire the pre-save hook) does NOT clobber the restock.

## Cases

### 1. New trackByLocation coverage — `__tests__/services/expense-inventory-link.trackbylocation.test.ts`

- **apply, defaultReceivingLocation set** — `+48` restock; assert `locations[0]` (the receiving one) `currentStock` is 48; other location unchanged; `inventory.save` called once; `totalRestocked` incremented.
- **apply, no defaultReceivingLocation** — falls back to `locations[0]`.
- **the invariant** — pre-existing stock in receiving location (5) + new restock (48); assert `sum(locations) === 53` (matches what the pre-save hook would compute, so a downstream save wouldn't clobber).
- **reverse, trackByLocation** — `−48` reversal from the receiving location; assert receiving goes to 0; other location unchanged; compensating StockMovement still recorded.
- **AC7 receiving-location-aware block** — sum=80 but receiving has only 10; attempt reversal of 40 → throws; **no writes happened** (StockMovement not created, save not called) — the validate's new receiving-aware check stops it BEFORE the StockMovement create, preventing an orphaned audit row.
- **regression: non-trackByLocation** — same apply path increments top-level `currentStock`; save called.

### 2. Reconcile-script pure-helper coverage — `__tests__/scripts/reconcile-track-by-location-stock.test.ts`

- **`replayMovements`** — additions count positive (regardless of stored sign); deductions count negative (regardless of stored sign); adjustments take face value; mixed run yields expected total; empty history → 0.
- **`computeDriftPlan`** — zero drift → `skip-no-drift`; negative replay → `manual-review-required` (unrecorded initial stock); trackByLocation drift → `apply` to receiving location; trackByLocation without default → falls back to `locations[0]`; non-trackByLocation drift → `apply` top-level; negative-location floor → `Math.max(0, …)`.

### 3. Existing REQ-034 tests — `__tests__/services/expense-inventory-link.test.ts` + `__tests__/services/expense-inventory-link.reversal.test.ts`

Updated to assert via `inventory.save()` instead of `InventoryModel.updateOne $inc`. The observable behaviour is the same; the mock-assertion mechanism changed. 33 cases pass.

## Gates run on develop @ `4f0cbeb`

- `npx tsc --noEmit` — exit 0
- `npx vitest run` (full suite) — **875 pass / 0 fail / 4 skip** (50 new + updated REQ-050 cases included)
- `npx eslint <changed files>` — 0 errors
- `npm audit --audit-level=high` — 0 high/critical
