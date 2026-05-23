/**
 * Pure-helper coverage for the simplified expense line auto-derive.
 *
 * Rules (#104):
 * - `total = quantity × unitCost`. Qty is the anchor.
 * - `computeTotal(q, u)` returns null when q ≤ 0; else q × u rounded to
 *   2dp (currency).
 * - `computeUnitCost(q, t)` returns null when q ≤ 0; else t / q rounded
 *   to 4dp (sub-pound items).
 * - `roundForField` rounding rules are unchanged from the earlier
 *   implementation.
 *
 * Ref: #104
 */
import { describe, it, expect } from 'vitest';
import {
  computeTotal,
  computeUnitCost,
  roundForField,
} from '@/lib/expense-line-derivation';

describe('roundForField', () => {
  it('rounds totalCost to 2 decimals (currency)', () => {
    expect(roundForField('totalCost', 54.0)).toBe(54);
    expect(roundForField('totalCost', 54.005)).toBe(54.01);
    expect(roundForField('totalCost', 54.004)).toBe(54);
  });

  it('rounds unitCost to 4 decimals (sub-pound items)', () => {
    expect(roundForField('unitCost', 0.082499)).toBe(0.0825);
    expect(roundForField('unitCost', 4.50001)).toBe(4.5);
  });

  it('rounds quantity to 4 decimals (drift-safe)', () => {
    expect(roundForField('quantity', 11.99999)).toBe(12);
    expect(roundForField('quantity', 0.250001)).toBe(0.25);
  });
});

describe('computeTotal', () => {
  it('qty × unitCost rounded to 2dp', () => {
    expect(computeTotal(2, 4.5)).toBe(9);
    expect(computeTotal(12, 4.5)).toBe(54);
  });

  it('handles fractional qty', () => {
    expect(computeTotal(0.5, 4.5)).toBe(2.25);
  });

  it('returns null when qty is 0', () => {
    expect(computeTotal(0, 4.5)).toBeNull();
  });

  it('returns null when qty is negative (defensive)', () => {
    expect(computeTotal(-1, 4.5)).toBeNull();
  });

  it('zero unit cost with positive qty yields total = 0', () => {
    expect(computeTotal(5, 0)).toBe(0);
  });

  it('does not throw on NaN inputs (returns null)', () => {
    expect(computeTotal(Number.NaN, 4.5)).toBeNull();
  });
});

describe('computeUnitCost', () => {
  it('total / qty rounded to 4dp', () => {
    expect(computeUnitCost(2, 70000)).toBe(35000);
    expect(computeUnitCost(12, 54)).toBe(4.5);
  });

  it('handles spice-mix corner case (sub-pound unit cost)', () => {
    expect(computeUnitCost(500, 41.25)).toBe(0.0825);
  });

  it('returns null when qty is 0 (would divide by zero)', () => {
    expect(computeUnitCost(0, 70000)).toBeNull();
  });

  it('returns null when qty is negative', () => {
    expect(computeUnitCost(-1, 70000)).toBeNull();
  });

  it('zero total yields unit cost = 0', () => {
    expect(computeUnitCost(5, 0)).toBe(0);
  });

  it('UAT scenario: qty=2 + total=70000 → unitCost=35000', () => {
    // The exact scenario the operator reported (#106 prompt). With
    // qty=2 entered and total=70000 entered, unit cost auto-derives.
    expect(computeUnitCost(2, 70000)).toBe(35000);
  });
});
