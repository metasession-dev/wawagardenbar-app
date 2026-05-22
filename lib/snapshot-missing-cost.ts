/**
 * @requirement REQ-039 — Missing-inventory cost on snapshot summaries.
 *
 * Pure helper used by both the submit-form live total and the
 * server-side `calculateSummary` aggregate. Single source of truth so
 * the UI and service never drift on what counts as "missing."
 *
 * Missing = item has `staffAdjustedCount` set AND `discrepancy < 0`.
 * Cost basis is the frozen `costPerUnitAtSnapshot` captured at submit
 * time; rows without it contribute 0 (legacy snapshots; rendered as
 * `—` at the UI layer rather than £0).
 */
import type { IInventorySnapshotItem } from '@/interfaces/inventory-snapshot.interface';

export function computeMissingCost(
  items: readonly IInventorySnapshotItem[]
): number {
  let total = 0;
  for (const it of items) {
    if (it.staffAdjustedCount === undefined) continue;
    if (it.discrepancy >= 0) continue;
    const cost = it.costPerUnitAtSnapshot ?? 0;
    total += Math.abs(it.discrepancy) * cost;
  }
  return total;
}
