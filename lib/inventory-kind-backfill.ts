/**
 * REQ-034 — pure helpers for the Inventory.kind backfill.
 *
 * Kept separate from `scripts/backfill-inventory-kind.ts` so the filter
 * and candidate predicate can be unit-tested without mongoose, and so
 * the script and the test reference the same source of truth.
 */
import type { FilterQuery } from 'mongoose';
import type { IInventory } from '@/interfaces/inventory.interface';

export const INVENTORY_KIND_BACKFILL_FILTER: FilterQuery<IInventory> = {
  $or: [{ kind: { $exists: false } }, { kind: null }],
};

/** Returns true when `row` is missing a `kind` value and should be backfilled. */
export function isInventoryKindBackfillCandidate(row: {
  kind?: unknown;
}): boolean {
  return row.kind === undefined || row.kind === null;
}
