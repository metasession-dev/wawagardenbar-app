/**
 * @requirement REQ-034 — AC14
 * Per-portion COGS calculation downstream still works using the
 * weighted-average cost from InventoryItemCostHistory.
 *
 * STUB: filled in during Phase B tests-first commit.
 */
import { describe, it } from 'vitest';

describe.skip('REQ-034 AC14 — Per-portion COGS regression', () => {
  it('reads current cost from InventoryItemCostHistory most-recent row', () => {});
  it('weighted-average correctly reflects multiple expense links', () => {});
  it('per-portion COGS = sum(ingredient.qty × ingredient.cost) / yieldPortions', () => {});
  it('falls back to 0 cost when no cost-history row exists (legacy ingredient)', () => {});
});
