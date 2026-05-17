/**
 * @requirement REQ-039 — Missing-inventory cost on snapshot summaries.
 *
 * Pure helper: sum the cost of inventory reported as missing on an
 * inventory snapshot. Missing = items where `staffAdjustedCount` is
 * lower than `systemInventoryCount` (negative `discrepancy`).
 * Cost-per-unit is the value frozen at submission time
 * (`costPerUnitAtSnapshot`); when absent the row contributes 0.
 */
import { describe, expect, it } from 'vitest';
import { computeMissingCost } from '@/lib/snapshot-missing-cost';
import type { IInventorySnapshotItem } from '@/interfaces/inventory-snapshot.interface';

function item(
  overrides: Partial<IInventorySnapshotItem>
): IInventorySnapshotItem {
  return {
    menuItemId: 'mi-1',
    menuItemName: 'Test',
    mainCategory: 'drinks',
    category: 'beer',
    systemInventoryCount: 10,
    todaySalesCount: 0,
    staffConfirmed: false,
    discrepancy: 0,
    requiresAdjustment: false,
    ...overrides,
  };
}

describe('computeMissingCost', () => {
  it('returns 0 for an empty array', () => {
    expect(computeMissingCost([])).toBe(0);
  });

  it('returns abs(discrepancy) × cost for a single negative-discrepancy item', () => {
    const items = [
      item({
        staffAdjustedCount: 7,
        discrepancy: -3,
        costPerUnitAtSnapshot: 5,
      }),
    ];
    expect(computeMissingCost(items)).toBe(15);
  });

  it('sums across multi-row mixed positive + negative — only negatives count', () => {
    const items = [
      item({
        staffAdjustedCount: 7,
        discrepancy: -3,
        costPerUnitAtSnapshot: 5,
      }), // missing: 3 × 5 = 15
      item({
        menuItemId: 'mi-2',
        staffAdjustedCount: 12,
        discrepancy: 2,
        costPerUnitAtSnapshot: 4,
      }), // positive — ignored
      item({
        menuItemId: 'mi-3',
        staffAdjustedCount: 4,
        discrepancy: -6,
        costPerUnitAtSnapshot: 10,
      }), // missing: 6 × 10 = 60
    ];
    expect(computeMissingCost(items)).toBe(75);
  });

  it('ignores items where discrepancy is exactly 0', () => {
    const items = [
      item({
        staffAdjustedCount: 10,
        discrepancy: 0,
        costPerUnitAtSnapshot: 5,
      }),
    ];
    expect(computeMissingCost(items)).toBe(0);
  });

  it('ignores items with no costPerUnitAtSnapshot (legacy rows)', () => {
    const items = [
      item({ staffAdjustedCount: 7, discrepancy: -3 }),
      item({
        menuItemId: 'mi-2',
        staffAdjustedCount: 5,
        discrepancy: -2,
        costPerUnitAtSnapshot: 4,
      }), // 2 × 4 = 8
    ];
    expect(computeMissingCost(items)).toBe(8);
  });

  it('ignores items with no staffAdjustedCount (no decision made = no missing claim)', () => {
    const items = [
      // discrepancy field happens to be -3 (default-out-of-date) but
      // staffAdjustedCount unset → operator hasn't reported anything
      // missing on this row; cost should not contribute.
      item({
        staffAdjustedCount: undefined,
        discrepancy: -3,
        costPerUnitAtSnapshot: 5,
      }),
    ];
    expect(computeMissingCost(items)).toBe(0);
  });

  it('handles fractional cost (e.g. £2.50/unit × 3 missing = 7.50)', () => {
    const items = [
      item({
        staffAdjustedCount: 7,
        discrepancy: -3,
        costPerUnitAtSnapshot: 2.5,
      }),
    ];
    expect(computeMissingCost(items)).toBe(7.5);
  });

  it('returns 0 if all items are positive-discrepancy', () => {
    const items = [
      item({
        staffAdjustedCount: 12,
        discrepancy: 2,
        costPerUnitAtSnapshot: 5,
      }),
      item({
        menuItemId: 'mi-2',
        staffAdjustedCount: 15,
        discrepancy: 5,
        costPerUnitAtSnapshot: 3,
      }),
    ];
    expect(computeMissingCost(items)).toBe(0);
  });
});
