# Test Scope — REQ-050

**Requirement:** REQ-050 — Expense-restock stock-leak fix for `trackByLocation` inventory
**Risk Level:** HIGH
**GitHub Issue:** [#175](https://github.com/metasession-dev/wawagardenbar-app/issues/175)
**Date:** 2026-05-28

## What changed

Three code paths in `services/expense-inventory-link-service.ts` (apply, reverse, runReversalPass safety net) switched from `InventoryModel.updateOne($inc currentStock)` to **doc-mutation + `inventory.save()`**, routed through a new private `applyExpenseStockDelta` helper. For `trackByLocation` items, the helper mutates the receiving location's `currentStock` (`defaultReceivingLocation`, falling back to `locations[0]`); the pre-save hook then correctly recomputes top-level `currentStock = sum(locations[].currentStock)`. Mirrors REQ-044's order-path pattern.

Plus a new operational tool — `scripts/reconcile-track-by-location-stock.ts` — to repair pre-existing drifted rows from before this fix landed.

## In scope (new + regression)

- **`applyExpenseStockDelta`** (helper) — routes the delta to the receiving location for `trackByLocation` items; throws on negative-result; falls back to top-level for non-tracked.
- **`applyExpenseInventoryLink`** (apply path) — new path runs via the helper + save; `lastRestocked` set; `totalRestocked` incremented; status set by the pre-save hook (no manual recompute).
- **`reverseExpenseInventoryLink`** (reverse path) — same shape with negative delta. AC7 block-on-negative is now **receiving-location-aware** for trackByLocation (a sufficient sum doesn't mask an insufficient receiving location).
- **`runReversalPass`** (safety net inside apply's catch) — re-loads the doc and applies the negative delta via the helper + save; preserves the best-effort error-swallowing pattern.
- **`scripts/reconcile-track-by-location-stock.ts`** — pure helpers (`replayMovements`, `computeDriftPlan`) + CLI bootstrap. Default dry-run; `--apply` writes; honest about the unrecorded-initial-stock limitation (flags rows for manual review rather than auto-applying).
- **Regression:** non-trackByLocation items keep the original observable behaviour — top-level `currentStock` incremented/decremented via the same helper's fallback branch.

## Out of scope

- **E2E (Playwright) coverage** — the bug is service-layer; the inventory dashboard UI just reflects state. Service-level integration tests (with vitest mocks) cover the behaviour. Discussed + agreed at Phase 0.
- **Generalising `applyOrderStockDelta` + `applyExpenseStockDelta`** into one shared helper — possible refactor (both do the same thing for different code paths) but deliberately not in REQ-050 to keep the diff focused. Worth a follow-up `refactor:` ticket.
- **Data repair for non-Orijin drifted rows** — the script ships with this REQ for systematic recovery; running it on UAT (and the eventual prod) is operational follow-up, not part of the code-fix release.
- **P0 #5** (comms-prefs enforcement) — deferred until WA-2.
