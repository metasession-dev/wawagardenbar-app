/**
 * @requirement REQ-034 — AC10
 *
 * Production pre-flight blocks if any ingredient is short (after unit
 * conversion). No deductions are written when blocked.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
import { DEFAULT_UNITS_OF_MEASUREMENT } from '@/interfaces/unit-of-measurement.interface';

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/models/recipe-model', () => ({
  default: { findById: vi.fn() },
}));

vi.mock('@/models/inventory-model', () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock('@/models/menu-item-model', () => ({
  default: { findById: vi.fn() },
}));

vi.mock('@/models/stock-movement-model', () => ({
  default: { create: vi.fn() },
}));

vi.mock('@/models/production-model', () => ({
  default: { create: vi.fn(), findById: vi.fn(), find: vi.fn() },
}));

vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getUnitsOfMeasurement: vi.fn(),
  },
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

beforeEach(() => {
  vi.clearAllMocks();
  (
    SystemSettingsService.getUnitsOfMeasurement as ReturnType<typeof vi.fn>
  ).mockResolvedValue(DEFAULT_UNITS_OF_MEASUREMENT);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('REQ-034 AC10 — Production pre-flight', () => {
  it('passes when every ingredient has currentStock ≥ required', async () => {
    const recipeId = new Types.ObjectId();
    const targetId = new Types.ObjectId();
    const goatId = new Types.ObjectId();
    const targetInvId = new Types.ObjectId();
    (RecipeModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: recipeId,
      name: 'Pepper Soup',
      isActive: true,
      targetMenuItemId: targetId,
      yieldPortions: 4,
      ingredients: [{ inventoryId: goatId, quantity: 200, unitId: 'g' }],
    });
    (InventoryModel.find as ReturnType<typeof vi.fn>).mockReturnValue(
      chainablePopulate([
        {
          _id: goatId,
          unit: 'g',
          currentStock: 5000,
          menuItemId: { name: 'Goat' },
        },
      ])
    );
    (InventoryModel.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: targetInvId,
      currentStock: 0,
      kind: 'menu-item',
      menuItemId: targetId,
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

    await expect(
      ProductionService.makeBatch({
        recipeId: recipeId.toString(),
        batchCount: 1,
        performedBy,
      })
    ).resolves.toBeDefined();
  });

  it('blocks when any ingredient short — error includes ingredient names + needed/available', async () => {
    const recipeId = new Types.ObjectId();
    const targetId = new Types.ObjectId();
    const goatId = new Types.ObjectId();
    (RecipeModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: recipeId,
      name: 'Pepper Soup',
      isActive: true,
      targetMenuItemId: targetId,
      yieldPortions: 4,
      ingredients: [{ inventoryId: goatId, quantity: 200, unitId: 'g' }],
    });
    (InventoryModel.find as ReturnType<typeof vi.fn>).mockReturnValue(
      chainablePopulate([
        {
          _id: goatId,
          unit: 'g',
          currentStock: 50, // short
          menuItemId: { name: 'Goat' },
        },
      ])
    );

    await expect(
      ProductionService.makeBatch({
        recipeId: recipeId.toString(),
        batchCount: 2,
        performedBy,
      })
    ).rejects.toThrow(/Goat[\s\S]*need 400 g[\s\S]*have 50 g/);
  });

  it('applies unit conversion before comparing (recipe g vs inventory kg)', async () => {
    const recipeId = new Types.ObjectId();
    const targetId = new Types.ObjectId();
    const goatId = new Types.ObjectId();
    const targetInvId = new Types.ObjectId();
    (RecipeModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: recipeId,
      name: 'Pepper Soup',
      isActive: true,
      targetMenuItemId: targetId,
      yieldPortions: 4,
      ingredients: [{ inventoryId: goatId, quantity: 200, unitId: 'g' }],
    });
    (InventoryModel.find as ReturnType<typeof vi.fn>).mockReturnValue(
      chainablePopulate([
        {
          _id: goatId,
          unit: 'kg', // inventory stored in kg
          currentStock: 0.4, // 0.4 kg = 400 g — enough for 2 batches
          menuItemId: { name: 'Goat' },
        },
      ])
    );
    (InventoryModel.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: targetInvId,
      currentStock: 0,
      kind: 'menu-item',
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

    // 2 batches × 200 g = 400 g = 0.4 kg → exactly enough.
    await expect(
      ProductionService.makeBatch({
        recipeId: recipeId.toString(),
        batchCount: 2,
        performedBy,
      })
    ).resolves.toBeDefined();
  });

  it('does not write any deductions when blocked', async () => {
    const recipeId = new Types.ObjectId();
    const goatId = new Types.ObjectId();
    (RecipeModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: recipeId,
      name: 'Pepper Soup',
      isActive: true,
      targetMenuItemId: new Types.ObjectId(),
      yieldPortions: 4,
      ingredients: [{ inventoryId: goatId, quantity: 200, unitId: 'g' }],
    });
    (InventoryModel.find as ReturnType<typeof vi.fn>).mockReturnValue(
      chainablePopulate([
        {
          _id: goatId,
          unit: 'g',
          currentStock: 0,
          menuItemId: { name: 'Goat' },
        },
      ])
    );

    await expect(
      ProductionService.makeBatch({
        recipeId: recipeId.toString(),
        batchCount: 1,
        performedBy,
      })
    ).rejects.toThrow();

    expect(InventoryModel.updateOne).not.toHaveBeenCalled();
    expect(StockMovementModel.create).not.toHaveBeenCalled();
    expect(ProductionModel.create).not.toHaveBeenCalled();
  });
});
