/**
 * @requirement REQ-050 — Reconcile script pure-helper coverage
 *
 * Tests the deterministic logic — `replayMovements` (sum signed deltas with
 * the right per-type sign rules) and `computeDriftPlan` (decide skip / apply
 * / manual-review based on drift + replay sanity). The Mongo IO in the
 * script is thin; the load-bearing assurance is these pure helpers.
 */
import { describe, expect, it } from 'vitest';

import {
  replayMovements,
  computeDriftPlan,
  type MovementRow,
  type InventoryForReconcile,
} from '@/scripts/reconcile-track-by-location-stock';

describe('REQ-050: replayMovements', () => {
  it('additions count positive (regardless of stored sign)', () => {
    const m: MovementRow[] = [
      { quantity: 5, type: 'addition' },
      { quantity: -3, type: 'addition' }, // legacy sign-stored — abs always
    ];
    expect(replayMovements(m)).toBe(8);
  });

  it('deductions count negative (regardless of stored sign)', () => {
    const m: MovementRow[] = [
      { quantity: 5, type: 'deduction' },
      { quantity: -3, type: 'deduction' },
    ];
    expect(replayMovements(m)).toBe(-8);
  });

  it('adjustments preserve sign (the row IS the delta)', () => {
    const m: MovementRow[] = [
      { quantity: -6, type: 'adjustment' },
      { quantity: 12, type: 'adjustment' },
    ];
    expect(replayMovements(m)).toBe(6);
  });

  it('mixed run yields the expected running total', () => {
    const m: MovementRow[] = [
      { quantity: 24, type: 'addition' }, // weekly restock
      { quantity: 5, type: 'deduction' }, // sales
      { quantity: 2, type: 'deduction' },
      { quantity: -1, type: 'adjustment' }, // snapshot reconcile
      { quantity: 24, type: 'addition' },
    ];
    expect(replayMovements(m)).toBe(40); // 24 - 5 - 2 - 1 + 24
  });

  it('empty history → 0', () => {
    expect(replayMovements([])).toBe(0);
  });
});

const tracked = (
  o: Partial<InventoryForReconcile> = {}
): InventoryForReconcile => ({
  _id: { toString: () => 'inv-1' },
  currentStock: 0,
  trackByLocation: true,
  defaultReceivingLocation: 'store',
  locations: [
    { location: 'store', currentStock: 0 },
    { location: 'chiller1', currentStock: 0 },
  ],
  ...o,
});

const untracked = (
  o: Partial<InventoryForReconcile> = {}
): InventoryForReconcile => ({
  _id: { toString: () => 'inv-2' },
  currentStock: 10,
  trackByLocation: false,
  locations: [],
  ...o,
});

describe('REQ-050: computeDriftPlan', () => {
  it('zero drift → skip-no-drift', () => {
    const plan = computeDriftPlan(tracked({ currentStock: 5 }), 5);
    expect(plan.action).toBe('skip-no-drift');
  });

  it('negative replay (unrecorded initial stock) → manual-review-required', () => {
    const plan = computeDriftPlan(tracked({ currentStock: 0 }), -28);
    expect(plan.action).toBe('manual-review-required');
    if (plan.action !== 'manual-review-required') return;
    expect(plan.expected).toBe(-28);
    expect(plan.reason).toBe('unrecorded-initial-stock');
  });

  it('trackByLocation + positive drift → apply to receiving location', () => {
    const inv = tracked({
      currentStock: 0,
      locations: [
        { location: 'store', currentStock: 0 },
        { location: 'chiller1', currentStock: 5 },
      ],
    });
    const plan = computeDriftPlan(inv, 48);
    expect(plan.action).toBe('apply');
    if (plan.action !== 'apply') return;
    expect(plan.drift).toBe(48);
    expect(plan.target).toEqual({ location: 'store', before: 0, after: 48 });
  });

  it('trackByLocation + no defaultReceivingLocation → falls back to locations[0]', () => {
    const inv = tracked({
      defaultReceivingLocation: undefined,
      currentStock: 0,
      locations: [
        { location: 'fridge', currentStock: 0 },
        { location: 'store', currentStock: 0 },
      ],
    });
    const plan = computeDriftPlan(inv, 10);
    if (plan.action !== 'apply') {
      throw new Error('expected apply');
    }
    expect(plan.target).toEqual({ location: 'fridge', before: 0, after: 10 });
  });

  it('non-trackByLocation + drift → apply to top-level', () => {
    const plan = computeDriftPlan(untracked({ currentStock: 5 }), 8);
    expect(plan.action).toBe('apply');
    if (plan.action !== 'apply') return;
    expect(plan.target).toBe('top-level');
    expect(plan.drift).toBe(3);
  });

  it('floors negative location stock at 0 (drift would push receiving below 0)', () => {
    // Positive-but-below-zero-floor case: expected=3, currentStock=10
    // → drift=-7; receiving has 2 → 2 - 7 = -5 → floored to 0.
    // (A scenario where expected<0 short-circuits to manual-review-required
    // is covered separately above.)
    const plan = computeDriftPlan(
      tracked({
        currentStock: 10,
        locations: [
          { location: 'store', currentStock: 2 },
          { location: 'chiller1', currentStock: 8 },
        ],
      }),
      3
    );
    if (plan.action !== 'apply') throw new Error('expected apply');
    expect(plan.target).toEqual({ location: 'store', before: 2, after: 0 });
  });
});
