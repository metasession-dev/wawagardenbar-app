/**
 * @requirement REQ-034 — AC11
 *
 * Production deducts ingredients via optimistic `$inc` with a
 * `currentStock: { $gte: required }` guard. On any failure mid-batch,
 * runs a reversal pass over already-deducted ingredients. Standalone
 * Mongo — no `withTransaction`. Production is only persisted on full
 * success; aborted batches leave no Production row.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
import { DEFAULT_UNITS_OF_MEASUREMENT } from '@/interfaces/unit-of-measurement.interface';

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/models/recipe-model', () => ({ default: { findById: vi.fn() } }));
vi.mock('@/models/inventory-model', () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    updateOne: vi.fn(),
  },
}));
vi.mock('@/models/menu-item-model', () => ({ default: { findById: vi.fn() } }));
vi.mock('@/models/stock-movement-model', () => ({
  default: { create: vi.fn() },
}));
vi.mock('@/models/production-model', () => ({
  default: { create: vi.fn(), findById: vi.fn(), find: vi.fn() },
}));
vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: { getUnitsOfMeasurement: vi.fn() },
}));

import RecipeModel from '@/models/recipe-model';
import InventoryModel from '@/models/inventory-model';
import StockMovementModel from '@/models/stock-movement-model';
import ProductionModel from '@/models/production-model';
import { SystemSettingsService } from '@/services/system-settings-service';
import { ProductionService } from '@/services/production-service';

const performedBy = new Types.ObjectId().toString();

function chainablePopulate(rows: unknown[]) {
  return { populate: vi.fn().mockResolvedValue(rows) };
}

function setupHappyPath() {
  const recipeId = new Types.ObjectId();
  const targetMenuItemId = new Types.ObjectId();
  const targetInvId = new Types.ObjectId();
  const goatId = new Types.ObjectId();
  const oilId = new Types.ObjectId();

  (RecipeModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
    _id: recipeId,
    name: 'Pepper Soup',
    isActive: true,
    targetMenuItemId,
    yieldPortions: 4,
    ingredients: [
      { inventoryId: goatId, quantity: 200, unitId: 'g' },
      { inventoryId: oilId, quantity: 30, unitId: 'ml' },
    ],
  });
  (InventoryModel.find as ReturnType<typeof vi.fn>).mockReturnValue(
    chainablePopulate([
      {
        _id: goatId,
        unit: 'g',
        currentStock: 1000,
        menuItemId: { name: 'Goat' },
      },
      {
        _id: oilId,
        unit: 'ml',
        currentStock: 500,
        menuItemId: { name: 'Palm Oil' },
      },
    ])
  );
  (InventoryModel.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({
    _id: targetInvId,
    currentStock: 0,
    kind: 'menu-item',
    menuItemId: targetMenuItemId,
  });
  (InventoryModel.updateOne as ReturnType<typeof vi.fn>).mockResolvedValue({
    acknowledged: true,
    modifiedCount: 1,
  });
  (StockMovementModel.create as ReturnType<typeof vi.fn>).mockImplementation(
    async (payload: Record<string, unknown>) => ({
      _id: new Types.ObjectId(),
      ...payload,
    })
  );
  (ProductionModel.create as ReturnType<typeof vi.fn>).mockImplementation(
    async (doc: Record<string, unknown>) => ({
      _id: doc._id ?? new Types.ObjectId(),
      ...doc,
      toObject() {
        return this;
      },
    })
  );

  return { recipeId, targetMenuItemId, targetInvId, goatId, oilId };
}

beforeEach(() => {
  vi.clearAllMocks();
  (
    SystemSettingsService.getUnitsOfMeasurement as ReturnType<typeof vi.fn>
  ).mockResolvedValue(DEFAULT_UNITS_OF_MEASUREMENT);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('REQ-034 AC11 — Production optimistic deduction — happy path', () => {
  it('deducts each ingredient via $inc with currentStock guard', async () => {
    const { recipeId, goatId, oilId } = setupHappyPath();

    await ProductionService.makeBatch({
      recipeId: recipeId.toString(),
      batchCount: 2,
      performedBy,
    });

    const calls = (InventoryModel.updateOne as ReturnType<typeof vi.fn>).mock
      .calls;
    // 2 deduction calls (goat, oil) + 1 yield-addition call
    const deductionCalls = calls.filter(
      ([filter]) => (filter as { currentStock?: unknown }).currentStock
    );
    expect(deductionCalls).toHaveLength(2);

    const goatFilter = deductionCalls.find(
      ([filter]) =>
        (filter as { _id: Types.ObjectId })._id.toString() === goatId.toString()
    )?.[0];
    expect(goatFilter).toEqual({
      _id: expect.any(Types.ObjectId),
      currentStock: { $gte: 400 }, // 2 batches × 200g
    });
    const oilFilter = deductionCalls.find(
      ([filter]) =>
        (filter as { _id: Types.ObjectId })._id.toString() === oilId.toString()
    )?.[0];
    expect(oilFilter).toEqual({
      _id: expect.any(Types.ObjectId),
      currentStock: { $gte: 60 }, // 2 batches × 30ml
    });
  });

  it('adds actualYield portions to MenuItem inventory at end', async () => {
    const { recipeId, targetInvId } = setupHappyPath();

    await ProductionService.makeBatch({
      recipeId: recipeId.toString(),
      batchCount: 2,
      // omit actualYield → defaults to expected (4 × 2 = 8)
      performedBy,
    });

    const calls = (InventoryModel.updateOne as ReturnType<typeof vi.fn>).mock
      .calls;
    const yieldCall = calls.find(
      ([filter]) =>
        (filter as { _id?: Types.ObjectId })._id?.toString() ===
        targetInvId.toString()
    );
    expect(yieldCall).toBeDefined();
    expect(yieldCall![1]).toEqual(
      expect.objectContaining({
        $inc: { currentStock: 8 },
      })
    );
  });

  it('emits N+1 StockMovement rows (N deductions + 1 yield addition) tagged with productionId', async () => {
    const { recipeId } = setupHappyPath();
    await ProductionService.makeBatch({
      recipeId: recipeId.toString(),
      batchCount: 2,
      performedBy,
    });
    const movements = (StockMovementModel.create as ReturnType<typeof vi.fn>)
      .mock.calls;
    expect(movements).toHaveLength(3); // 2 deductions + 1 yield
    for (const [payload] of movements) {
      expect(
        (payload as { productionId?: Types.ObjectId }).productionId
      ).toBeInstanceOf(Types.ObjectId);
      expect((payload as { category?: string }).category).toBe('production');
    }
    expect(
      movements.filter(([p]) => (p as { type: string }).type === 'deduction')
    ).toHaveLength(2);
    expect(
      movements.filter(([p]) => (p as { type: string }).type === 'addition')
    ).toHaveLength(1);
  });

  it('persists Production with ingredientsDeducted snapshot in inventory units', async () => {
    const { recipeId } = setupHappyPath();
    await ProductionService.makeBatch({
      recipeId: recipeId.toString(),
      batchCount: 2,
      actualYield: 7, // 1 portion burned
      performedBy,
    });
    expect(ProductionModel.create).toHaveBeenCalledTimes(1);
    const doc = (ProductionModel.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(doc.status).toBe('completed');
    expect(doc.batchCount).toBe(2);
    expect(doc.expectedYield).toBe(8);
    expect(doc.actualYield).toBe(7);
    expect(doc.yieldVariance).toBe(-1);
    expect(doc.ingredientsDeducted).toHaveLength(2);
    expect(doc.ingredientsDeducted[0]).toEqual(
      expect.objectContaining({
        quantityInInventoryUnit: 400,
        inventoryUnitId: 'g',
      })
    );
    expect(doc.ingredientsDeducted[1]).toEqual(
      expect.objectContaining({
        quantityInInventoryUnit: 60,
        inventoryUnitId: 'ml',
      })
    );
  });
});

describe('REQ-034 AC11 — race condition', () => {
  it('treats updateOne 0-modified as ingredient short → abort', async () => {
    const { recipeId } = setupHappyPath();
    // First deduction succeeds, second returns 0-modified (race).
    (InventoryModel.updateOne as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ acknowledged: true, modifiedCount: 1 })
      .mockResolvedValueOnce({ acknowledged: true, modifiedCount: 0 });

    await expect(
      ProductionService.makeBatch({
        recipeId: recipeId.toString(),
        batchCount: 1,
        performedBy,
      })
    ).rejects.toThrow(/short|race/i);
  });

  it('does not deduct subsequent ingredients after a short detected', async () => {
    const { recipeId } = setupHappyPath();
    (
      InventoryModel.updateOne as ReturnType<typeof vi.fn>
    ).mockResolvedValueOnce({ acknowledged: true, modifiedCount: 0 }); // first deduction fails

    await expect(
      ProductionService.makeBatch({
        recipeId: recipeId.toString(),
        batchCount: 1,
        performedBy,
      })
    ).rejects.toThrow();

    // updateOne called once (the failed deduction). Reversal pass may
    // emit additional updateOne calls for already-deducted ingredients,
    // but no further FORWARD deduction should have happened. Easiest
    // assertion: ProductionModel.create is never called.
    expect(ProductionModel.create).not.toHaveBeenCalled();
  });
});

describe('REQ-034 AC11 — reversal pass on partial failure', () => {
  it('reverses already-deducted ingredients with category:production type:addition StockMovements', async () => {
    const { recipeId } = setupHappyPath();
    // First deduction succeeds; second 0-modified.
    (InventoryModel.updateOne as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ acknowledged: true, modifiedCount: 1 })
      .mockResolvedValueOnce({ acknowledged: true, modifiedCount: 0 })
      // reversal pass: re-add the first deduction
      .mockResolvedValueOnce({ acknowledged: true, modifiedCount: 1 });

    await expect(
      ProductionService.makeBatch({
        recipeId: recipeId.toString(),
        batchCount: 1,
        performedBy,
      })
    ).rejects.toThrow();

    const movements = (StockMovementModel.create as ReturnType<typeof vi.fn>)
      .mock.calls;
    // Original forward deduction + compensating addition for it = 2
    expect(movements).toHaveLength(2);
    const reversal = movements[1][0] as Record<string, unknown>;
    expect(reversal.type).toBe('addition');
    expect(reversal.category).toBe('production');
    expect((reversal.reason as string).toLowerCase()).toContain('aborted');
  });

  it('rolls back the MenuItem yield addition if it landed', async () => {
    const { recipeId, targetInvId } = setupHappyPath();
    // Sequence: deduct goat ok (modified=1), deduct oil ok (modified=1),
    // yield addition lands (modified=1 — addition has no guard so still
    // returns 1), then ProductionModel.create throws (simulated post-yield
    // failure).
    (InventoryModel.updateOne as ReturnType<typeof vi.fn>).mockResolvedValue({
      acknowledged: true,
      modifiedCount: 1,
    });
    (ProductionModel.create as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('post-yield write failure')
    );

    await expect(
      ProductionService.makeBatch({
        recipeId: recipeId.toString(),
        batchCount: 1,
        performedBy,
      })
    ).rejects.toThrow(/post-yield write failure/);

    // After the failure the reversal pass must emit a compensating
    // deduction against the target inventory (cancelling the yield add).
    const movements = (StockMovementModel.create as ReturnType<typeof vi.fn>)
      .mock.calls;
    const yieldReversal = movements.find(
      ([p]) =>
        (p as { inventoryId?: Types.ObjectId }).inventoryId?.toString() ===
          targetInvId.toString() &&
        (p as { type?: string }).type === 'deduction'
    );
    expect(yieldReversal).toBeDefined();
  });

  it('Production status remains aborted (not stored as completed)', async () => {
    const { recipeId } = setupHappyPath();
    (InventoryModel.updateOne as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ acknowledged: true, modifiedCount: 1 })
      .mockResolvedValueOnce({ acknowledged: true, modifiedCount: 0 });

    await expect(
      ProductionService.makeBatch({
        recipeId: recipeId.toString(),
        batchCount: 1,
        performedBy,
      })
    ).rejects.toThrow();

    // ProductionModel.create is the only path that persists status
    // 'completed' — it must not have run.
    expect(ProductionModel.create).not.toHaveBeenCalled();
  });
});
