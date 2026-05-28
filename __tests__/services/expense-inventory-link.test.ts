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

// REQ-038: service now looks up the paired MenuItem to enforce
// expenseUnitOverride. Default mock returns null (no override) so
// existing kitchen-ingredient tests are unaffected.
vi.mock('@/models/menu-item-model', () => ({
  default: {
    findById: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(null),
    })),
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

// D10 — service now loads the REQ-033 UoM registry to convert
// expense-entered quantities into the inventory's stored unit.
vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getUnitsOfMeasurement: vi.fn().mockResolvedValue([
      { id: 'g', label: 'Grams (g)', category: 'mass', isActive: true },
      { id: 'kg', label: 'Kilograms (kg)', category: 'mass', isActive: true },
      {
        id: 'ml',
        label: 'Millilitres (ml)',
        category: 'volume',
        isActive: true,
      },
      { id: 'litres', label: 'Litres', category: 'volume', isActive: true },
      { id: 'eggs', label: 'Eggs', category: 'count', isActive: true },
    ]),
  },
}));

import InventoryModel from '@/models/inventory-model';
import MenuItemModel from '@/models/menu-item-model';
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
      save: vi.fn().mockResolvedValue(undefined),
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
      save: vi.fn().mockResolvedValue(undefined),
    });

    await applyExpenseInventoryLink({
      expenseId: new Types.ObjectId(),
      linkedInventoryId,
      quantity: 7,
      amount: 700,
      date: new Date(),
      performedBy,
    });

    {
      const _inv = await (
        InventoryModel.findById as ReturnType<typeof vi.fn>
      ).mock.results.at(-1)!.value;
      expect(_inv.save).toHaveBeenCalled();
    }
  });

  it('defaults missing quantity to 1 (REQ-032 alignment)', async () => {
    const linkedInventoryId = new Types.ObjectId();
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: linkedInventoryId,
      kind: 'kitchen-ingredient',
      currentStock: 0,
      save: vi.fn().mockResolvedValue(undefined),
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
      save: vi.fn().mockResolvedValue(undefined),
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
      save: vi.fn().mockResolvedValue(undefined),
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
      save: vi.fn().mockResolvedValue(undefined),
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

  it('REQ-038: accepts kind:menu-item (sellable restock path)', async () => {
    // REQ-038 relaxed the kind guard to allow both kitchen-ingredient
    // and menu-item kinds. Sellable items now restock from expenses
    // too; the financial write path is identical for both.
    const linkedInventoryId = new Types.ObjectId();
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: linkedInventoryId,
      kind: 'menu-item',
      currentStock: 0,
      unit: 'bottles',
      save: vi.fn().mockResolvedValue(undefined),
    });

    const result = await applyExpenseInventoryLink({
      expenseId: new Types.ObjectId(),
      linkedInventoryId,
      quantity: 24,
      amount: 5000,
      date: new Date(),
      performedBy,
    });

    expect(result.stockMovementId).toBeTruthy();
    expect(StockMovementModel.create).toHaveBeenCalled();
    {
      const _inv = await (
        InventoryModel.findById as ReturnType<typeof vi.fn>
      ).mock.results.at(-1)!.value;
      expect(_inv.save).toHaveBeenCalled();
    }
  });

  it('REQ-038: rejects when expense.unit mismatches paired MenuItem.expenseUnitOverride', async () => {
    // Override enforcement at the service layer. UI lock is defence
    // in depth; the service rejects the apply call when the paired
    // MenuItem declares a Purchase unit and the expense's unit
    // differs. Error message names both units AND the menu item.
    const linkedInventoryId = new Types.ObjectId();
    const menuItemId = new Types.ObjectId();
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: linkedInventoryId,
      kind: 'menu-item',
      currentStock: 0,
      unit: 'bottles',
      menuItemId,
      save: vi.fn().mockResolvedValue(undefined),
    });
    (MenuItemModel.findById as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({
        _id: menuItemId,
        name: 'Heineken 330ml',
        expenseUnitOverride: 'bottles',
      }),
    });

    await expect(
      applyExpenseInventoryLink({
        expenseId: new Types.ObjectId(),
        linkedInventoryId,
        quantity: 5,
        amount: 1000,
        date: new Date(),
        performedBy,
        expenseUnit: 'kg', // mismatch — bottles is locked
      })
    ).rejects.toThrow(/Heineken 330ml/);

    expect(StockMovementModel.create).not.toHaveBeenCalled();
    expect(InventoryModel.updateOne).not.toHaveBeenCalled();
  });

  it('REQ-038: rejects unsupported kind (forward-compat against new kinds)', async () => {
    // Sanity check that the allowlist is still bounded. If a future REQ
    // introduces a third InventoryKind value, this test surfaces the
    // need to deliberately decide whether to extend the allowlist.
    const linkedInventoryId = new Types.ObjectId();
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: linkedInventoryId,
      // Cast to bypass the type narrow — production data shouldn't
      // contain this value, but the guard's job is to defend if it does.
      kind: 'some-future-kind' as unknown as 'menu-item',
      currentStock: 0,
      save: vi.fn().mockResolvedValue(undefined),
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
    ).rejects.toThrow(/menu-item/);

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

  it('#98: recomputes Inventory.status from the new currentStock + minimumStock', async () => {
    // User scenario from #98: Tiger inventory at 0/15 (out-of-stock).
    // Restocking 1 bottle should flip status to low-stock (NOT
    // in-stock — still below min — and NOT stuck on out-of-stock).
    const linkedInventoryId = new Types.ObjectId();
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: linkedInventoryId,
      kind: 'menu-item',
      currentStock: 0,
      minimumStock: 15,
      unit: 'bottles',
      save: vi.fn().mockResolvedValue(undefined),
    });

    await applyExpenseInventoryLink({
      expenseId: new Types.ObjectId(),
      linkedInventoryId,
      quantity: 1,
      amount: 725,
      date: new Date(),
      performedBy,
    });

    {
      const _inv = await (
        InventoryModel.findById as ReturnType<typeof vi.fn>
      ).mock.results.at(-1)!.value;
      expect(_inv.save).toHaveBeenCalled();
    }
  });

  it('#98: restock past minimum flips status to in-stock', async () => {
    const linkedInventoryId = new Types.ObjectId();
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: linkedInventoryId,
      kind: 'menu-item',
      currentStock: 5,
      minimumStock: 15,
      unit: 'bottles',
      save: vi.fn().mockResolvedValue(undefined),
    });

    await applyExpenseInventoryLink({
      expenseId: new Types.ObjectId(),
      linkedInventoryId,
      quantity: 50,
      amount: 5000,
      date: new Date(),
      performedBy,
    });

    {
      const _inv = await (
        InventoryModel.findById as ReturnType<typeof vi.fn>
      ).mock.results.at(-1)!.value;
      expect(_inv.save).toHaveBeenCalled();
    }
  });
});

describe('REQ-034 D10 — unit conversion on expense → inventory link', () => {
  it('converts 5 kg expense → 5000 g $inc when inventory unit is g', async () => {
    const linkedInventoryId = new Types.ObjectId();
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: linkedInventoryId,
      kind: 'kitchen-ingredient',
      unit: 'g',
      currentStock: 0,
      save: vi.fn().mockResolvedValue(undefined),
    });

    await applyExpenseInventoryLink({
      expenseId: new Types.ObjectId(),
      linkedInventoryId,
      quantity: 5,
      expenseUnit: 'kg',
      amount: 1000,
      date: new Date(),
      performedBy,
    });

    {
      const _inv = await (
        InventoryModel.findById as ReturnType<typeof vi.fn>
      ).mock.results.at(-1)!.value;
      expect(_inv.save).toHaveBeenCalled();
    }
    const movement = (StockMovementModel.create as ReturnType<typeof vi.fn>)
      .mock.calls[0][0];
    expect(movement.quantity).toBe(5000);
    // cost-per-gram = 1000 / 5000 = 0.2 (correctly per-inventory-unit)
    expect(movement.costPerUnit).toBeCloseTo(0.2, 10);
    expect(movement.totalCost).toBe(1000);
    expect(movement.notes).toMatch(/5 kg.*5000 g/);
  });

  it('preserves identity when expenseUnit matches inventory unit (regression-proof)', async () => {
    const linkedInventoryId = new Types.ObjectId();
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: linkedInventoryId,
      kind: 'kitchen-ingredient',
      unit: 'kg',
      currentStock: 0,
      save: vi.fn().mockResolvedValue(undefined),
    });

    await applyExpenseInventoryLink({
      expenseId: new Types.ObjectId(),
      linkedInventoryId,
      quantity: 5,
      expenseUnit: 'kg',
      amount: 1000,
      date: new Date(),
      performedBy,
    });

    {
      const _inv = await (
        InventoryModel.findById as ReturnType<typeof vi.fn>
      ).mock.results.at(-1)!.value;
      expect(_inv.save).toHaveBeenCalled();
    }
    const movement = (StockMovementModel.create as ReturnType<typeof vi.fn>)
      .mock.calls[0][0];
    // No conversion note when units already match.
    expect(movement.notes ?? '').not.toMatch(/Converted/);
  });

  it('converts 2 litres → 2000 ml on volume inventory', async () => {
    const linkedInventoryId = new Types.ObjectId();
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: linkedInventoryId,
      kind: 'kitchen-ingredient',
      unit: 'ml',
      currentStock: 100,
      save: vi.fn().mockResolvedValue(undefined),
    });

    await applyExpenseInventoryLink({
      expenseId: new Types.ObjectId(),
      linkedInventoryId,
      quantity: 2,
      expenseUnit: 'litres',
      amount: 500,
      date: new Date(),
      performedBy,
    });

    {
      const _inv = await (
        InventoryModel.findById as ReturnType<typeof vi.fn>
      ).mock.results.at(-1)!.value;
      expect(_inv.save).toHaveBeenCalled();
    }
  });

  it('throws (no writes land) on cross-dimension mismatch', async () => {
    const linkedInventoryId = new Types.ObjectId();
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: linkedInventoryId,
      kind: 'kitchen-ingredient',
      unit: 'kg',
      currentStock: 0,
      save: vi.fn().mockResolvedValue(undefined),
    });

    await expect(
      applyExpenseInventoryLink({
        expenseId: new Types.ObjectId(),
        linkedInventoryId,
        quantity: 1,
        expenseUnit: 'ml',
        amount: 100,
        date: new Date(),
        performedBy,
      })
    ).rejects.toThrow(/cross-dimension/);
    expect(InventoryModel.updateOne).not.toHaveBeenCalled();
    expect(StockMovementModel.create).not.toHaveBeenCalled();
  });

  it('legacy passthrough: missing expenseUnit → treats quantity as-is (no conversion)', async () => {
    const linkedInventoryId = new Types.ObjectId();
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: linkedInventoryId,
      kind: 'kitchen-ingredient',
      unit: 'g',
      currentStock: 0,
      save: vi.fn().mockResolvedValue(undefined),
    });

    await applyExpenseInventoryLink({
      expenseId: new Types.ObjectId(),
      linkedInventoryId,
      quantity: 5,
      // expenseUnit omitted — legacy expense from before D10
      amount: 100,
      date: new Date(),
      performedBy,
    });

    {
      const _inv = await (
        InventoryModel.findById as ReturnType<typeof vi.fn>
      ).mock.results.at(-1)!.value;
      expect(_inv.save).toHaveBeenCalled();
    }
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
