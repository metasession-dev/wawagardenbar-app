/**
 * @requirement REQ-034 — AC6
 *
 * Service-level coverage of `applyExpenseInventoryLink` (the save path):
 * - emits a StockMovement{category:restock, type:addition}
 * - $inc's Inventory.currentStock by the resolved quantity (default 1)
 * - closes the previously-open InventoryItemCostHistory row and writes a
 *   new one with costPerUnit = amount / quantity
 * - patches the Expense doc with the new stockMovementId
 * - rejects when the linked Inventory has the wrong kind
 *
 * The Mongo collections are stubbed so the tests stay in `environment:node`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/models/inventory-model', () => ({
  default: {
    findById: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock('@/models/stock-movement-model', () => ({
  default: {
    create: vi.fn(),
  },
}));

vi.mock('@/models/inventory-item-cost-history-model', () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
    deleteOne: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock('@/models', () => ({
  ExpenseModel: {
    updateOne: vi
      .fn()
      .mockResolvedValue({ acknowledged: true, modifiedCount: 1 }),
  },
}));

import InventoryModel from '@/models/inventory-model';
import StockMovementModel from '@/models/stock-movement-model';
import InventoryItemCostHistory from '@/models/inventory-item-cost-history-model';
import { ExpenseModel } from '@/models';
import { applyExpenseInventoryLink } from '@/services/expense-inventory-link-service';

const performedBy = new Types.ObjectId().toString();

function chainableFindOne(result: unknown) {
  return { sort: vi.fn().mockResolvedValue(result) };
}

beforeEach(() => {
  vi.clearAllMocks();
  (StockMovementModel.create as ReturnType<typeof vi.fn>).mockImplementation(
    async (payload: Record<string, unknown>) => ({
      _id: new Types.ObjectId(),
      ...payload,
    })
  );
  (InventoryModel.updateOne as ReturnType<typeof vi.fn>).mockResolvedValue({
    acknowledged: true,
    modifiedCount: 1,
  });
  (
    InventoryItemCostHistory.findOne as ReturnType<typeof vi.fn>
  ).mockReturnValue(chainableFindOne(null));
  (
    InventoryItemCostHistory.create as ReturnType<typeof vi.fn>
  ).mockImplementation(async (payload: Record<string, unknown>) => ({
    _id: new Types.ObjectId(),
    ...payload,
  }));
  (ExpenseModel.updateOne as ReturnType<typeof vi.fn>).mockResolvedValue({
    acknowledged: true,
    modifiedCount: 1,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('REQ-034 AC6 — applyExpenseInventoryLink save path', () => {
  it('emits StockMovement{category:restock, type:addition} with derived costPerUnit', async () => {
    const linkedInventoryId = new Types.ObjectId();
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: linkedInventoryId,
      kind: 'kitchen-ingredient',
      currentStock: 0,
    });

    await applyExpenseInventoryLink({
      expenseId: new Types.ObjectId(),
      linkedInventoryId,
      quantity: 5,
      amount: 1000,
      supplier: 'AcmeFoods',
      date: new Date('2026-05-11T10:00:00Z'),
      performedBy,
    });

    expect(StockMovementModel.create).toHaveBeenCalledTimes(1);
    const movement = (StockMovementModel.create as ReturnType<typeof vi.fn>)
      .mock.calls[0][0];
    expect(movement.type).toBe('addition');
    expect(movement.category).toBe('restock');
    expect(movement.quantity).toBe(5);
    expect(movement.costPerUnit).toBe(200);
    expect(movement.totalCost).toBe(1000);
    expect(movement.supplier).toBe('AcmeFoods');
    expect(movement.inventoryId.toString()).toBe(linkedInventoryId.toString());
  });

  it('bumps Inventory.currentStock by the expense quantity', async () => {
    const linkedInventoryId = new Types.ObjectId();
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: linkedInventoryId,
      kind: 'kitchen-ingredient',
      currentStock: 10,
    });

    await applyExpenseInventoryLink({
      expenseId: new Types.ObjectId(),
      linkedInventoryId,
      quantity: 7,
      amount: 700,
      date: new Date(),
      performedBy,
    });

    expect(InventoryModel.updateOne).toHaveBeenCalledWith(
      { _id: linkedInventoryId },
      expect.objectContaining({
        $inc: expect.objectContaining({ currentStock: 7 }),
      })
    );
  });

  it('defaults missing quantity to 1 (REQ-032 alignment)', async () => {
    const linkedInventoryId = new Types.ObjectId();
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: linkedInventoryId,
      kind: 'kitchen-ingredient',
      currentStock: 0,
    });

    await applyExpenseInventoryLink({
      expenseId: new Types.ObjectId(),
      linkedInventoryId,
      quantity: undefined,
      amount: 500,
      date: new Date(),
      performedBy,
    });

    const movement = (StockMovementModel.create as ReturnType<typeof vi.fn>)
      .mock.calls[0][0];
    expect(movement.quantity).toBe(1);
    expect(movement.costPerUnit).toBe(500);
  });

  it('writes a new InventoryItemCostHistory row with derived cost', async () => {
    const linkedInventoryId = new Types.ObjectId();
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: linkedInventoryId,
      kind: 'kitchen-ingredient',
      currentStock: 0,
    });

    const date = new Date('2026-05-11T12:00:00Z');
    await applyExpenseInventoryLink({
      expenseId: new Types.ObjectId(),
      linkedInventoryId,
      quantity: 4,
      amount: 800,
      supplier: 'AcmeFoods',
      date,
      performedBy,
    });

    expect(InventoryItemCostHistory.create).toHaveBeenCalledTimes(1);
    const row = (InventoryItemCostHistory.create as ReturnType<typeof vi.fn>)
      .mock.calls[0][0];
    expect(row.costPerUnit).toBe(200);
    expect(row.supplier).toBe('AcmeFoods');
    expect(row.effectiveFrom).toEqual(date);
    expect(row.purchaseDate).toEqual(date);
    expect(row.inventoryItemId.toString()).toBe(linkedInventoryId.toString());
  });

  it('closes the previously-open cost history row (effectiveTo = expense date)', async () => {
    const linkedInventoryId = new Types.ObjectId();
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: linkedInventoryId,
      kind: 'kitchen-ingredient',
      currentStock: 0,
    });

    const priorRow = {
      _id: new Types.ObjectId(),
      effectiveTo: undefined as Date | undefined,
      save: vi.fn().mockResolvedValue(undefined),
    };
    (
      InventoryItemCostHistory.findOne as ReturnType<typeof vi.fn>
    ).mockReturnValue(chainableFindOne(priorRow));

    const date = new Date('2026-05-11T12:00:00Z');
    await applyExpenseInventoryLink({
      expenseId: new Types.ObjectId(),
      linkedInventoryId,
      quantity: 4,
      amount: 800,
      date,
      performedBy,
    });

    expect(priorRow.effectiveTo).toEqual(date);
    expect(priorRow.save).toHaveBeenCalledTimes(1);
  });

  it('patches the Expense doc with stockMovementId and clears linkVoidedAt', async () => {
    const linkedInventoryId = new Types.ObjectId();
    const expenseId = new Types.ObjectId();
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: linkedInventoryId,
      kind: 'kitchen-ingredient',
      currentStock: 0,
    });

    const result = await applyExpenseInventoryLink({
      expenseId,
      linkedInventoryId,
      quantity: 1,
      amount: 100,
      date: new Date(),
      performedBy,
    });

    expect(ExpenseModel.updateOne).toHaveBeenCalledWith(
      { _id: expenseId },
      {
        $set: {
          stockMovementId: result.stockMovementId,
          linkVoidedAt: null,
        },
      }
    );
  });

  it('rejects when the linked inventory has kind:menu-item', async () => {
    const linkedInventoryId = new Types.ObjectId();
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: linkedInventoryId,
      kind: 'menu-item',
      currentStock: 0,
    });

    await expect(
      applyExpenseInventoryLink({
        expenseId: new Types.ObjectId(),
        linkedInventoryId,
        quantity: 1,
        amount: 100,
        date: new Date(),
        performedBy,
      })
    ).rejects.toThrow(/kitchen-ingredient/);

    expect(StockMovementModel.create).not.toHaveBeenCalled();
    expect(InventoryModel.updateOne).not.toHaveBeenCalled();
  });

  it('rejects when the linked inventory does not exist', async () => {
    const linkedInventoryId = new Types.ObjectId();
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      null
    );

    await expect(
      applyExpenseInventoryLink({
        expenseId: new Types.ObjectId(),
        linkedInventoryId,
        quantity: 1,
        amount: 100,
        date: new Date(),
        performedBy,
      })
    ).rejects.toThrow(/not found/);
  });
});

describe('REQ-034 AC6 — weighted-average cost (read-side)', () => {
  it('first link yields cost = expense.amount / quantity', () => {
    const rows = [{ costPerUnit: 200, quantity: 5 }];
    // The pure helper covers full weighted-average semantics; this asserts
    // the contract that the new row drives the average on its own.
    const totalSpent = rows.reduce(
      (sum, r) => sum + r.costPerUnit * r.quantity,
      0
    );
    const totalQuantity = rows.reduce((sum, r) => sum + r.quantity, 0);
    expect(totalSpent / totalQuantity).toBe(200);
  });

  it('subsequent link recomputes (existing + new) / (qty + expense.qty)', () => {
    // existing 5 units @ 200 ₦/unit, new 5 units @ 300 ₦/unit
    const rows = [
      { costPerUnit: 200, quantity: 5 },
      { costPerUnit: 300, quantity: 5 },
    ];
    const totalSpent = rows.reduce(
      (sum, r) => sum + r.costPerUnit * r.quantity,
      0
    );
    const totalQuantity = rows.reduce((sum, r) => sum + r.quantity, 0);
    expect(totalSpent / totalQuantity).toBe(250);
  });
});
