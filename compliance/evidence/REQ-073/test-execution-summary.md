# REQ-073 — Test execution summary

**Date:** 2026-06-05
**Target:** UAT (`https://wawagardenbar-app-uat.up.railway.app`, db `wawagardenbar_uat`)
**Risk:** MEDIUM

## Focused E2E run

```
$ BASE_URL=https://wawagardenbar-app-uat.up.railway.app \
  MONGODB_URI=$MONGODB_UAT_EXTERNAL_URI \
  MONGODB_DB_NAME=wawagardenbar_uat \
  npx playwright test e2e/admin/menu-item-delete.spec.ts \
                      e2e/admin/menu-item-duplicate.spec.ts \
                      e2e/admin/kitchen-void-batch.spec.ts \
                      --project=regression --reporter=list

Running 7 tests using 3 workers
  ✓ 1 [auth-setup] › authenticate as admin (3.5s)
  ✓ 2 [auth-setup] › authenticate as csr (3.5s)
  ✓ 3 [auth-setup] › authenticate as super-admin (3.6s)
  ✓ 4 [regression] › menu-item-delete.spec.ts › AC1: deleteOne removes the active item; existing Order snapshot persists (4.2s)
  ✓ 5 [regression] › menu-item-duplicate.spec.ts › AC2: duplicate creates a distinct MenuItem with " (Copy)" suffix + new slug + isAvailable=false; original unchanged (3.6s)
  ✓ 6 [regression] › kitchen-void-batch.spec.ts › AC3: voidBatch flips status + restores ingredient + reverses yield + writes audit StockMovement rows (8.6s)
  ✓ 7 [regression] › kitchen-void-batch.spec.ts › AC4: re-voiding an already-voided batch is a no-op (idempotent) (3.3s)

  7 passed (19.7s)
```

4 contract tests pass against live UAT. 3 auth-setup tests pass (regression project's dependency).

## Vitest

```
$ npx vitest run --reporter=dot
 Test Files  121 passed | 1 skipped (122)
      Tests  1129 passed | 4 skipped (1133)
   Duration  5.54s
```

Unchanged from REQ-072 baseline — zero unit tests added or modified.

## TypeScript

```
$ npx tsc --noEmit
(exit 0)
```

## Notes on the run

- All 3 specs use synthetic `e2e-req073-{ts}` identifiers (collection-prefixed names + slugs) — zero collision with real records.
- Each spec's `afterAll` deletes every seeded document by `_id`. Verified clean teardown (no residue on UAT).
- Spec 3 (void-batch) seeds Production with `status: 'completed'`, `actualYield = 10`, one ingredient deduction of `5g`. The yield Inventory is seeded at `currentStock: 10` so the $gte guard in `voidBatch` succeeds; voiding decrements it to 0. The ingredient Inventory is seeded at `currentStock: 0`; voiding restores it to 5g. Two StockMovement rows written (one 'addition' for ingredient, one 'deduction' for yield reversal). All asserted.
- Spec 3 idempotency test (AC4) captures the post-first-void DB state, calls `voidBatch` a second time, and asserts no further state changes.

## What this run proves

✓ `MenuItemModel.deleteOne()` removes the active item document from the `menuitems` collection.
✓ Order documents seeded with `items: [{ menuItemId, name, price }]` retain the embedded snapshot after the menu item is hard-deleted — the history layer at the order-item level is not lost.
✓ Duplicate logic from `app/actions/admin/menu-actions.ts:891-909` produces a new MenuItem with the documented modifications (name suffix, slug uniqueness, isAvailable=false) and leaves the original unchanged.
✓ `ProductionService.voidBatch` correctly orchestrates state transitions across 3 collections (Production status flip + Inventory increments/decrements + StockMovement audit row writes).
✓ `voidBatch` is idempotent — the second call on an already-voided production exits at the `production.status === 'voided'` guard without further state changes.

## What this run does NOT prove

✗ Action-layer auth wrapping (`requireRole(['admin','super-admin'])`) — covered by action-layer unit tests if any; out of scope for V1 E2E.
✗ AuditLog row writes from the action layer for delete + duplicate paths — Spec 1/2 don't drive the action so `AuditLog.create` isn't fired. Documented honestly. Spec 3 verifies StockMovement rows = the void path's audit trail.
✗ UI flows — admin menu list → delete button → confirm modal → row removed (deferred to V2 browser-context specs).
✗ Inventory tracking branch of duplicate (lines 911-948) — deferred V2 if needed.

## Comparison to V1 sub-issue scope

| Sub-issue proposed             | V1 status           |
| ------------------------------ | ------------------- |
| menu-item-delete-soft          | ✓ Shipped (AC1)     |
| menu-item-duplicate            | ✓ Shipped (AC2)     |
| kitchen-void-batch             | ✓ Shipped (AC3+AC4) |
| tab-delete-reverses-payments   | ✗ Deferred          |
| force-password-change          | ✗ Deferred          |
| data-deletion-request-approval | ✗ Deferred          |
| soft-delete-enforcement        | ✗ Deferred          |
| kitchen-ingredient-archive     | ✗ Deferred          |

3 of 8 shipped — the 3 highest-value-lowest-cost ones (storage-layer behavior is well-defined, no UI required, seed-and-assert pattern fits cleanly).
