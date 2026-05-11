/**
 * @requirement REQ-034 — AC7
 *
 * Service-level coverage of `reverseExpenseInventoryLink` (edit / delete path):
 * - records a compensating StockMovement (audit-preserving — no physical delete)
 * - $inc's Inventory.currentStock by -quantity with `currentStock: { $gte }` guard
 * - closes the still-open InventoryItemCostHistory row
 * - stamps `Expense.linkVoidedAt` on success
 * - blocks (throws AC7 error, writes nothing) when reversal would drive
 *   currentStock below 0
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
import { reverseExpenseInventoryLink } from '@/services/expense-inventory-link-service';

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
  (ExpenseModel.updateOne as ReturnType<typeof vi.fn>).mockResolvedValue({
    acknowledged: true,
    modifiedCount: 1,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('REQ-034 AC7 — Expense → Inventory reversal: edit / delete flow', () => {
  it('records a compensating StockMovement (negative quantity, category:restock)', async () => {
    const linkedInventoryId = new Types.ObjectId();
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: linkedInventoryId,
      kind: 'kitchen-ingredient',
      currentStock: 10,
    });

    await reverseExpenseInventoryLink({
      expenseId: new Types.ObjectId(),
      linkedInventoryId,
      quantity: 5,
      performedBy,
      reason: 'Expense delete reversal',
    });

    expect(StockMovementModel.create).toHaveBeenCalledTimes(1);
    const mv = (StockMovementModel.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(mv.quantity).toBe(-5);
    expect(mv.type).toBe('deduction');
    expect(mv.category).toBe('restock');
    expect(mv.reason).toBe('Expense delete reversal');
  });

  it('decrements Inventory.currentStock with $gte guard against negative', async () => {
    const linkedInventoryId = new Types.ObjectId();
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: linkedInventoryId,
      kind: 'kitchen-ingredient',
      currentStock: 10,
    });

    await reverseExpenseInventoryLink({
      expenseId: new Types.ObjectId(),
      linkedInventoryId,
      quantity: 5,
      performedBy,
      reason: 'edit',
    });

    expect(InventoryModel.updateOne).toHaveBeenCalledWith(
      {
        _id: linkedInventoryId,
        currentStock: { $gte: 5 },
      },
      { $inc: { currentStock: -5, totalRestocked: -5 } }
    );
  });

  it('closes the still-open cost-history row', async () => {
    const linkedInventoryId = new Types.ObjectId();
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: linkedInventoryId,
      kind: 'kitchen-ingredient',
      currentStock: 10,
    });
    const openRow = {
      _id: new Types.ObjectId(),
      effectiveTo: undefined as Date | undefined,
      save: vi.fn().mockResolvedValue(undefined),
    };
    (
      InventoryItemCostHistory.findOne as ReturnType<typeof vi.fn>
    ).mockReturnValue(chainableFindOne(openRow));

    await reverseExpenseInventoryLink({
      expenseId: new Types.ObjectId(),
      linkedInventoryId,
      quantity: 5,
      performedBy,
      reason: 'edit',
    });

    expect(openRow.effectiveTo).toBeInstanceOf(Date);
    expect(openRow.save).toHaveBeenCalledTimes(1);
  });

  it('stamps Expense.linkVoidedAt on success', async () => {
    const linkedInventoryId = new Types.ObjectId();
    const expenseId = new Types.ObjectId();
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: linkedInventoryId,
      kind: 'kitchen-ingredient',
      currentStock: 10,
    });

    await reverseExpenseInventoryLink({
      expenseId,
      linkedInventoryId,
      quantity: 5,
      performedBy,
      reason: 'delete',
    });

    const updateCalls = (ExpenseModel.updateOne as ReturnType<typeof vi.fn>)
      .mock.calls as Array<[Record<string, unknown>, Record<string, unknown>]>;
    const stampCall = updateCalls.find((call) => {
      const filter = call[0];
      const id = filter._id as Types.ObjectId | string | undefined;
      return id?.toString() === expenseId.toString();
    });
    expect(stampCall).toBeDefined();
    expect(stampCall![1]).toEqual({
      $set: { linkVoidedAt: expect.any(Date) },
    });
  });

  it('respects markVoided:false (used when edit will immediately re-apply)', async () => {
    const linkedInventoryId = new Types.ObjectId();
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: linkedInventoryId,
      kind: 'kitchen-ingredient',
      currentStock: 10,
    });

    await reverseExpenseInventoryLink({
      expenseId: new Types.ObjectId(),
      linkedInventoryId,
      quantity: 5,
      performedBy,
      reason: 'edit',
      markVoided: false,
    });

    expect(ExpenseModel.updateOne).not.toHaveBeenCalled();
  });
});

describe('REQ-034 AC7 — block-on-negative', () => {
  it('throws (writes nothing) when reversal would drive currentStock < 0', async () => {
    const linkedInventoryId = new Types.ObjectId();
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: linkedInventoryId,
      kind: 'kitchen-ingredient',
      currentStock: 3,
    });

    await expect(
      reverseExpenseInventoryLink({
        expenseId: new Types.ObjectId(),
        linkedInventoryId,
        quantity: 5,
        performedBy,
        reason: 'delete',
      })
    ).rejects.toThrow(/short by 2/);

    expect(StockMovementModel.create).not.toHaveBeenCalled();
    expect(InventoryModel.updateOne).not.toHaveBeenCalled();
    expect(ExpenseModel.updateOne).not.toHaveBeenCalled();
  });

  it('error message names the inventory in the message', async () => {
    const linkedInventoryId = new Types.ObjectId();
    const menuItemId = new Types.ObjectId();
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: linkedInventoryId,
      menuItemId,
      kind: 'kitchen-ingredient',
      currentStock: 0,
    });

    await expect(
      reverseExpenseInventoryLink({
        expenseId: new Types.ObjectId(),
        linkedInventoryId,
        quantity: 10,
        performedBy,
        reason: 'delete',
      })
    ).rejects.toThrow(new RegExp(menuItemId.toString()));
  });

  it('still throws when inventory has been deleted between create and reversal', async () => {
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      null
    );

    await expect(
      reverseExpenseInventoryLink({
        expenseId: new Types.ObjectId(),
        linkedInventoryId: new Types.ObjectId(),
        quantity: 1,
        performedBy,
        reason: 'delete',
      })
    ).rejects.toThrow(/not found/);
  });

  it('treats undefined / missing prior quantity as 1 (REQ-032 default)', async () => {
    const linkedInventoryId = new Types.ObjectId();
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: linkedInventoryId,
      kind: 'kitchen-ingredient',
      currentStock: 1,
    });

    await expect(
      reverseExpenseInventoryLink({
        expenseId: new Types.ObjectId(),
        linkedInventoryId,
        quantity: undefined,
        performedBy,
        reason: 'delete',
      })
    ).resolves.toBeUndefined();

    expect(InventoryModel.updateOne).toHaveBeenCalledWith(
      { _id: linkedInventoryId, currentStock: { $gte: 1 } },
      { $inc: { currentStock: -1, totalRestocked: -1 } }
    );
  });
});
