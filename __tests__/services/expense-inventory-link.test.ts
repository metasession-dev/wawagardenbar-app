/**
 * @requirement REQ-034 — AC6
 * Saving an expense with linkedInventoryId auto-creates a StockMovement,
 * bumps Inventory.currentStock, and writes a weighted-average cost row
 * to InventoryItemCostHistory.
 *
 * STUB: filled in during Phase A tests-first commit.
 */
import { describe, it } from 'vitest';

describe.skip('REQ-034 AC6 — Expense → Inventory link save', () => {
  it('creates StockMovement{category:restock, type:addition} on save', () => {});
  it('bumps Inventory.currentStock by expense.quantity', () => {});
  it('defaults expense.quantity to 1 when missing (REQ-032 default)', () => {});
  it('writes a new InventoryItemCostHistory row with cost = expense.amount / quantity', () => {});
  it('persists Expense.stockMovementId back-ref', () => {});
  it('weighted-average cost: first link sets cost = expense.amount/quantity', () => {});
  it('weighted-average cost: subsequent link recomputes (existing+new)/(qty+expense.qty)', () => {});
});
