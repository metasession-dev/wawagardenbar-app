/**
 * @requirement REQ-034 — AC7
 * Editing/deleting an expense voids the prior StockMovement and creates
 * the reversal (audit preserved). Block if reversal would drive
 * currentStock < 0.
 *
 * STUB: filled in during Phase A tests-first commit.
 */
import { describe, it } from 'vitest';

describe.skip('REQ-034 AC7 — Expense → Inventory reversal', () => {
  describe('edit flow', () => {
    it('voids the prior StockMovement (no physical delete)', () => {});
    it('creates a new StockMovement for the new quantity', () => {});
    it('updates Inventory.currentStock by the diff', () => {});
    it('writes a new InventoryItemCostHistory row', () => {});
  });

  describe('delete flow', () => {
    it('voids the linked StockMovement (no physical delete)', () => {});
    it('reduces Inventory.currentStock by the original quantity', () => {});
  });

  describe('block-on-negative', () => {
    it('refuses edit if reversal would drive currentStock below 0', () => {});
    it('refuses delete if reversal would drive currentStock below 0', () => {});
    it('error message names the inventory + how much has been consumed', () => {});
    it('no partial state written when blocked', () => {});
  });
});
