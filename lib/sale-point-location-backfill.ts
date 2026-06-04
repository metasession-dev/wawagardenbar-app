/**
 * REQ-066 AC8 — Pure helpers for the `Inventory.defaultSalesLocation` backfill.
 *
 * Wawa's data convention: drinks live in `chiller1` (the bar chiller —
 * front of house), frozen items in `freezer`. A legacy migration
 * (`scripts/migrate-location-tracking.ts`) bulk-set every Inventory row's
 * `defaultSalesLocation` to `'store'` (the back of the house), which
 * mismatches operations reality and is the data-side root cause of #277
 * (sales appeared not to deduct because they were routed to an empty
 * `store` bucket).
 *
 * This helper does two things:
 *   1. `deriveSalePointLocation(row)` — picks the right physical sale
 *      point for a row (chiller* > freezer* > null).
 *   2. `isSalePointBackfillCandidate(row)` — true when the row's
 *      current `defaultSalesLocation` differs from the derived value
 *      AND a derived value exists. This is what makes the backfill
 *      REWRITE rows misconfigured by the legacy migration, not just
 *      fill in the blanks.
 *
 * Recognition is case-insensitive and tolerant of separator variants
 * (`chiller-1`, `chiller_1`, `Chiller1`) so the helper survives small
 * deviations between manual entries and seeded data.
 */
import type { FilterQuery } from 'mongoose';
import type { IInventory } from '@/interfaces/inventory.interface';

/**
 * Broad mongo filter — every trackByLocation row is loaded; the per-row
 * decision happens in `isSalePointBackfillCandidate` so a legacy 'store'
 * value can't escape the rewrite.
 */
export const SALE_POINT_LOCATION_BACKFILL_FILTER: FilterQuery<IInventory> = {
  trackByLocation: true,
};

interface BackfillCandidate {
  trackByLocation: boolean;
  locations: Array<{ location: string; currentStock?: number }>;
  defaultSalesLocation?: string | null;
}

const normalize = (s: string): string => s.toLowerCase().replace(/[-_\s]/g, '');

const CHILLER_PATTERN = /^chiller\d*$/; // chiller, chiller1, chiller2, ...
const FREEZER_PATTERN = /^freezer\d*$/;

/**
 * Returns the location code to set as `defaultSalesLocation`, or `null`
 * when no clear sale-point can be derived (the runtime fallback handles
 * these cases safely). Preferences: chiller* > freezer* > null.
 */
export function deriveSalePointLocation(
  inv: Pick<BackfillCandidate, 'trackByLocation' | 'locations'>
): string | null {
  if (!inv.trackByLocation) return null;
  if (!inv.locations || inv.locations.length === 0) return null;

  const chiller = inv.locations.find((l) =>
    CHILLER_PATTERN.test(normalize(l.location))
  );
  if (chiller) return chiller.location;

  const freezer = inv.locations.find((l) =>
    FREEZER_PATTERN.test(normalize(l.location))
  );
  if (freezer) return freezer.location;

  return null;
}

/**
 * True when the row needs its `defaultSalesLocation` set or rewritten.
 *
 *   - non-trackByLocation rows → never candidates (no routing applies)
 *   - no derivable sale point → never candidates (leave the
 *     legacy 'store' value alone; runtime fallback handles deductions)
 *   - already matches derived → skip (idempotent)
 *   - everything else → candidate (covers both fresh-set on legacy
 *     unset/null rows AND force-rewrite on the bulk 'store' default)
 */
export function isSalePointBackfillCandidate(inv: BackfillCandidate): boolean {
  if (!inv.trackByLocation) return false;
  const derived = deriveSalePointLocation(inv);
  if (derived === null) return false;
  return inv.defaultSalesLocation !== derived;
}
