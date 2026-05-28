# REQ-050 — Expense-restock stock-leak fix for trackByLocation inventory

- **Issue:** #175 (Ref: #117 P0 follow-up — closes the gap REQ-044 left in the expense-restock path)
- **Risk:** HIGH
- **Commit type:** `fix`
- **Stage:** 1 (Plan) — awaiting plan approval before Stage 2 (HIGH = mandatory checkpoint)

## Context

User-reported on UAT 2026-05-28: 40 bottles of "Orijin - Small" added via expense restock, Stock Movement History shows the `+48` Addition row, but the inventory page reads **Total Stock: 0** (Main Store + Bar Chiller both 0).

Same defect class as **REQ-044/PR #115** (the `trackByLocation` inventory bug fixed for the _order_ deduct/restore path), applied to the **expense-restock** path that REQ-044 didn't audit.

### Mechanism

- `services/expense-inventory-link-service.ts:155-164` (apply) and `:280+` (reverse) use `InventoryModel.updateOne({ $inc: { currentStock: ±qty } })`. The `#98` code comment explicitly notes this bypasses the `pre('save')` hook.
- `models/inventory-model.ts:86-93`'s pre-save hook is the load-bearing invariant for `trackByLocation` items: `currentStock = sum(locations[].currentStock)`.
- The `$inc` updates the top-level `currentStock` only — `locations[*].currentStock` is left untouched.
- The next `inventory.save()` anywhere in the system (9 callsites; `inventory-snapshot-service.ts:366` is the most likely actual clobberer based on the screenshot's May 20 snapshot row) fires the hook and silently resets `currentStock = sum(locations)`.

REQ-044 fixed this for the order path by switching to **doc-mutation + save** (`inventory-service.ts:26-39 applyOrderStockDelta` — mutate `locations[0].currentStock` for trackByLocation, then `save()` so the pre-save hook recomputes correctly and the locations + top-level stay in sync).

## Acceptance criteria

- After `applyExpenseInventoryLink` on a `trackByLocation` item:
  - `sum(locations[].currentStock) === currentStock` (the invariant).
  - A subsequent `inventory.save()` (anywhere in the system) does **not** change `currentStock`.
  - The receiving location's `currentStock` reflects the added quantity (`defaultReceivingLocation` if set, else `locations[0]`).
- After `reverseExpenseInventoryLink` on a `trackByLocation` item:
  - The same invariant holds; the receiving location's `currentStock` is decremented by the same quantity that was added.
  - AC7 block-on-negative still holds (cannot drive the receiving location's `currentStock` below 0).
- Non-`trackByLocation` items: existing behaviour preserved (top-level `currentStock` incremented; no regression).
- The reversal-pass safety net (`runReversalPass`) inside `applyExpenseInventoryLink`'s catch handles the new write pattern correctly — partial-failure scenarios still recover.
- Audit trail unchanged: one `StockMovement{category:restock, type:addition}` row per applied link (same as today).

## Technical approach

Mirror REQ-044's pattern in `services/expense-inventory-link-service.ts`. Three functions to update + a shared helper.

### New shared helper

Introduce `applyExpenseStockDelta(inventory, delta, performedById, performedByName, when)` colocated with the service (or extracted to a small helper file), mirroring `inventory-service.ts:26-39`:

```ts
function applyExpenseStockDelta(
  inventory: InstanceType<typeof InventoryModel>,
  delta: number,
  performedById: Types.ObjectId,
  performedByName: string | undefined,
  when: Date
): void {
  if (inventory.trackByLocation && inventory.locations.length > 0) {
    const receivingLocId =
      inventory.defaultReceivingLocation ?? inventory.locations[0].location;
    const loc =
      inventory.locations.find((l) => l.location === receivingLocId) ??
      inventory.locations[0];
    loc.currentStock = Math.max(0, loc.currentStock + delta);
    loc.lastUpdated = when;
    loc.updatedBy = performedById;
    loc.updatedByName = performedByName;
  } else {
    inventory.currentStock = Math.max(0, inventory.currentStock + delta);
  }
}
```

(Slightly more sophisticated than REQ-044's `locations[0]` — uses `defaultReceivingLocation` when set, falling back to `locations[0]`. Matches the spirit of "where does restock arrive" without breaking REQ-044's existing behaviour for items where the default isn't set.)

### Apply path (`applyExpenseInventoryLink`, `:65+`)

Replace the `updateOne($inc)` block at `:155-164` with:

1. The findById at `:72` already loaded the doc — reuse it.
2. Compute `newStatus` from the **pre-mutation** `inventory.currentStock + quantity` (same as today — the operator's UI doesn't change).
3. Call `applyExpenseStockDelta(inventory, +quantity, …)`.
4. Set `inventory.totalRestocked += quantity` and `inventory.lastRestocked = input.date`. (Status will be set by pre-save hook — drop the manual `$set: { status: newStatus }`.)
5. `await inventory.save()`.

The `incResult.modifiedCount !== 1` race-guard goes away (save will throw on doc not found / version mismatch; the catch + reversal-pass already handles thrown errors).

### Reverse path (`reverseExpenseInventoryLink`, `:253+`)

Same shape, with `delta = -quantity`. Preserve AC7 block-on-negative: pre-check `getReceivingLocationStock(inventory) >= quantity` before calling the helper (or rely on `Math.max(0, …)` only after a separate guard).

### Reversal safety net (`runReversalPass`)

Today it does `$inc(-quantityToUndo)` to undo a partial apply. With the new pattern it needs to re-load the doc and call `applyExpenseStockDelta(inventory, -quantityToUndo, …)` + save. Same correctness, same scope (already in the try/catch).

## Security considerations

- **No new auth/RBAC surface.** The fix tightens an existing ledger-correctness invariant; no new endpoint, no role change.
- **The fix CLOSES a value-leak vulnerability** (the bug, by itself, allowed stock additions to disappear silently → operators couldn't trust the displayed count → real-world reordering and accounting errors).
- **No new external attack surface.** The expense-link path is admin-only (already RBAC-gated upstream by `confirmTransfer` / `updateExpense` callers).
- **Audit trail unchanged.** Same `StockMovement` row per delta; the per-event audit improves only in that the displayed `currentStock` matches what was recorded.
- **Race-safety**: the existing optimistic-deduction reversal pattern is preserved — partial-failure recovery still runs via `runReversalPass`. The doc-level save uses Mongoose's `__v` versioning by default, which catches concurrent-write races (a second concurrent restock on the same doc fails the save and the catch's reversal pass kicks in cleanly).

## Dependencies

- Internal only. No external npm dependencies.
- No DB migration. The fix is a code change; existing rows whose `locations[]` are out of sync are **data-state**, repaired separately (out of scope per the issue).

## Test scope (HIGH → unit + integration; e2e n/a per Phase-0 read)

Vitest, fully mocked per `__tests__/services/*.test.ts` convention.

### Unit / integration

`__tests__/services/expense-inventory-link.trackbylocation.test.ts` (new):

- **apply, trackByLocation** — given an inventory fixture with `trackByLocation: true` + two locations (one `defaultReceivingLocation`), call `applyExpenseInventoryLink` with `quantity = 48`. Assert: receiving location's `currentStock` increased by 48; top-level `currentStock` equals `sum(locations)`; a simulated subsequent `.save()` (force re-fire the hook) leaves `currentStock` unchanged.
- **apply, trackByLocation, no defaultReceivingLocation** — same shape but falls back to `locations[0]`.
- **apply, non-trackByLocation** — existing behaviour preserved (top-level `currentStock` += quantity).
- **reverse, trackByLocation** — call with `quantity = 48`, assert receiving location decremented + invariant holds.
- **reverse, AC7 block-on-negative** — pre-existing guard still fires when the reversal would drive the receiving location below 0.
- **reversal pass after apply failure** — simulate failure at step 4 (cost-history insert); assert the safety net correctly undoes the location's `currentStock` (not just the top-level).
- **regression on `expense-inventory-link.reversal.test.ts`** — existing tests still pass (no change to non-trackByLocation behaviour).

### Gates (all required)

`tsc --noEmit` · `eslint` · `vitest run` · `semgrep scan --config auto` · `npm audit --audit-level=high`.

## Threat model (STRIDE) — HIGH

| Category                   | Threat                                                             | Mitigation                                                                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S**poofing               | Attacker submits a forged expense to inflate inventory.            | Pre-existing: expense submission is admin-only RBAC-gated. Unchanged by REQ-050.                                                                                                                          |
| **T**ampering              | Attacker modifies `locations[].currentStock` directly via the API. | Pre-existing: no direct API endpoint for location stock — only via expense link / order flow / admin stock-adjust. Unchanged.                                                                             |
| **R**epudiation            | Operator denies that a restock was recorded.                       | StockMovement audit row continues to be written per delta. **Improved by this REQ**: the displayed `currentStock` now matches the audit row, so disputes are resolvable without manual reconciliation.    |
| **I**nformation disclosure | Restock leaks data.                                                | No new exposed fields.                                                                                                                                                                                    |
| **D**enial of service      | Concurrent restocks corrupt state.                                 | Doc-level save uses Mongoose `__v` versioning — concurrent writes lose at save and trigger the catch's reversal pass. Net: race-safety improves vs. the current `updateOne` (which had no version guard). |
| **E**levation of privilege | Restock confers role privileges.                                   | n/a.                                                                                                                                                                                                      |

**Primary threat closed:** silent value loss of recorded restocks for trackByLocation inventory items. Secondary improvement: concurrent-write race safety via doc versioning.

## Four-eyes attestation (HIGH — required slot)

- **Submitter:** `@ostendo-io` (skill-trigger user, this implementation cycle).
- **UAT Reviewer:** `@<TO-BE-NAMED>` — per `approval.mode: dual_actor`, the portal-side approver MUST differ from the submitter. Recommendation per REQ-049 pattern: substantively walk the portal UAT-approve step (rather than rely on the bootstrap-mode false-pass [DevAudit-Installer #74]). If only `@ostendo-io` is available, that's the same documented control-gap accepted on REQ-049; no fresh consideration here.

## Rollback plan

- **Code rollback:** revert the release merge commit on `main`. Both apply + reverse paths return to the current behaviour (the value leak returns). ETA ~5 min (revert PR + Railway auto-deploy).
- **Data rollback:** none required — the fix is to the write pattern, not to schema. Data state isn't transformed by this fix.
- **Trigger for rollback:** prod smoke fails after deploy, OR observed legitimate expense restocks not landing in `locations[*]` after the fix (would indicate the fix is wrong).
- **Communication:** the `[INCIDENT]` defect-issue path (per the skill's Phase 5 rollback contract).

## Reconciliation script (in-scope per operator decision 2026-05-28)

Ships alongside the code fix: `scripts/reconcile-track-by-location-stock.ts` — a one-shot operational tool to repair rows whose `locations[*]` are out of sync from the pre-REQ-050 leak. CLI shape:

```
npx tsx scripts/reconcile-track-by-location-stock.ts <UAT|PROD-URI> \
  [--inventory-id <id>]   # one row only; if omitted, scans all trackByLocation items
  [--dry-run]              # default; reports plan, no writes
  [--apply]                # actually write the fix
  [--receiving-location <name>]  # override; defaults to defaultReceivingLocation else locations[0]
```

Algorithm per inventory item:

1. Load the doc + all `StockMovement{inventoryId: <id>}` rows ordered by `timestamp`.
2. Replay deltas: `expected = sum(movement.quantity)` (with sign — additions positive, deductions negative). Compare to `inventory.currentStock`; if they match within tolerance, nothing to repair (skip).
3. If they differ: set the receiving location's `currentStock = max(0, current_receiving_stock + drift)` where `drift = expected − inventory.currentStock`. The other locations' counts are untouched (they're not the leak path's victim).
4. `inventory.save()` — pre-save hook recomputes top-level `currentStock = sum(locations)` correctly.
5. Emit a per-item before/after summary; aggregate at the end.

Dry-run is the default so the operator sees the proposed plan before any writes. The fix is applied with `--apply` explicitly. Safe to run repeatedly — once a row is reconciled, subsequent runs are no-ops (the drift is 0).

**Test scope** for the script: unit test on the pure replay logic (input: movements + starting state; output: drift + per-location plan). The Mongo IO is thin enough that an integration test is overkill; the unit on the replay logic is the load-bearing assurance.

## Out of scope (filed / explicit)

- **P0 #5** (comms-prefs enforcement) — deferred until WA-2.
- **Refund flow** (P3 #18) — separate.
- **Generalising the `applyOrderStockDelta` + new `applyExpenseStockDelta` into one helper** — possible refactor (both are doing the same thing for different code paths) but explicitly **not** in REQ-050 to keep the diff focused. Worth a follow-up `refactor:` ticket post-release.
