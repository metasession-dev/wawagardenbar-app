/**
 * @requirement REQ-066 AC8 — Pure helpers for the `defaultSalesLocation` backfill.
 *
 * Wawa's data convention: drinks live in `chiller1` (the bar chiller),
 * frozen items in `freezer`. A legacy migration
 * (`scripts/migrate-location-tracking.ts`) bulk-set every Inventory row's
 * `defaultSalesLocation` to `'store'`, which mismatches operations
 * reality (sales physically come from the chiller). The backfill helper
 * picks the right physical location and the script REWRITES the wrong
 * existing value when a chiller or freezer location is present.
 */
import { describe, it, expect } from 'vitest';
import {
  deriveSalePointLocation,
  SALE_POINT_LOCATION_BACKFILL_FILTER,
  isSalePointBackfillCandidate,
} from '@/lib/sale-point-location-backfill';

const loc = (location: string, currentStock = 0) => ({
  location,
  currentStock,
});

describe('deriveSalePointLocation', () => {
  it('returns chiller1 when locations include a chiller1 bucket', () => {
    expect(
      deriveSalePointLocation({
        trackByLocation: true,
        locations: [loc('store', 13), loc('chiller1', 10)],
      })
    ).toBe('chiller1');
  });

  it('returns chiller1 even when only chiller1 has stock (Desperados shape)', () => {
    expect(
      deriveSalePointLocation({
        trackByLocation: true,
        locations: [loc('store', 0), loc('chiller1', 1)],
      })
    ).toBe('chiller1');
  });

  it('returns freezer when locations include a freezer but no chiller', () => {
    expect(
      deriveSalePointLocation({
        trackByLocation: true,
        locations: [loc('store', 5), loc('freezer', 10)],
      })
    ).toBe('freezer');
  });

  it('prefers chiller1 over freezer when both exist (drinks > frozen)', () => {
    expect(
      deriveSalePointLocation({
        trackByLocation: true,
        locations: [loc('store', 5), loc('chiller1', 10), loc('freezer', 3)],
      })
    ).toBe('chiller1');
  });

  it('returns null when locations contain only a storeroom (no clear sale point)', () => {
    expect(
      deriveSalePointLocation({
        trackByLocation: true,
        locations: [loc('store', 50)],
      })
    ).toBeNull();
  });

  it('returns null when not trackByLocation', () => {
    expect(
      deriveSalePointLocation({
        trackByLocation: false,
        locations: [loc('store', 50), loc('chiller1', 10)],
      })
    ).toBeNull();
  });

  it('returns null when locations is empty', () => {
    expect(
      deriveSalePointLocation({ trackByLocation: true, locations: [] })
    ).toBeNull();
  });
});

describe('isSalePointBackfillCandidate', () => {
  it('candidate when defaultSalesLocation is undefined and a chiller/freezer is derivable', () => {
    expect(
      isSalePointBackfillCandidate({
        trackByLocation: true,
        locations: [loc('store', 5), loc('chiller1', 1)],
      })
    ).toBe(true);
  });

  it('candidate when defaultSalesLocation is null', () => {
    expect(
      isSalePointBackfillCandidate({
        trackByLocation: true,
        locations: [loc('chiller1', 1)],
        defaultSalesLocation: null,
      })
    ).toBe(true);
  });

  it('candidate when defaultSalesLocation is the legacy "store" but a chiller exists (REWRITE)', () => {
    // Operator-confirmed: legacy migration bulk-set everything to 'store';
    // backfill must rewrite to the chiller-shaped sale point.
    expect(
      isSalePointBackfillCandidate({
        trackByLocation: true,
        locations: [loc('store', 13), loc('chiller1', 10)],
        defaultSalesLocation: 'store',
      })
    ).toBe(true);
  });

  it('candidate when defaultSalesLocation is the legacy "store" but a freezer exists', () => {
    expect(
      isSalePointBackfillCandidate({
        trackByLocation: true,
        locations: [loc('store', 5), loc('freezer', 10)],
        defaultSalesLocation: 'store',
      })
    ).toBe(true);
  });

  it('NOT a candidate when defaultSalesLocation already matches the derived value (idempotency)', () => {
    expect(
      isSalePointBackfillCandidate({
        trackByLocation: true,
        locations: [loc('store', 13), loc('chiller1', 10)],
        defaultSalesLocation: 'chiller1',
      })
    ).toBe(false);
  });

  it('NOT a candidate when no clear sale point is derivable (storeroom only)', () => {
    // Leave intentional / non-chilled items alone; the runtime fallback
    // ("first non-empty location") handles them safely.
    expect(
      isSalePointBackfillCandidate({
        trackByLocation: true,
        locations: [loc('store', 50)],
        defaultSalesLocation: 'store',
      })
    ).toBe(false);
  });

  it('NOT a candidate when trackByLocation is false', () => {
    expect(
      isSalePointBackfillCandidate({ trackByLocation: false, locations: [] })
    ).toBe(false);
  });
});

describe('SALE_POINT_LOCATION_BACKFILL_FILTER', () => {
  it('selects all trackByLocation rows (the candidate predicate narrows per-row)', () => {
    // The mongo filter is broad on purpose; the per-row decision (rewrite
    // vs skip) happens in `isSalePointBackfillCandidate` against the
    // already-loaded row, so a single legacy-migration value like 'store'
    // doesn't escape the rewrite filter.
    expect(SALE_POINT_LOCATION_BACKFILL_FILTER).toEqual({
      trackByLocation: true,
    });
  });
});
