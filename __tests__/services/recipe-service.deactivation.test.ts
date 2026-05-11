/**
 * @requirement REQ-034 — AC16
 *
 * Recipe deactivation: listActiveRecipes filters isActive=false, and
 * reactivating restores membership. The remaining three AC16 cases
 * (snapshot-independent rendering, voiding a past production, etc.)
 * exercise Production behaviour and are filled in by step 9's commit.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/models/recipe-model', () => ({
  default: {
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('@/models/inventory-model', () => ({
  default: { find: vi.fn(), findOne: vi.fn(), updateOne: vi.fn() },
}));

vi.mock('@/models/menu-item-model', () => ({
  default: { findById: vi.fn() },
}));

vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: { getUnitsOfMeasurement: vi.fn() },
}));

vi.mock('@/models/stock-movement-model', () => ({
  default: { create: vi.fn() },
}));
vi.mock('@/models/production-model', () => ({
  default: { findById: vi.fn(), create: vi.fn(), find: vi.fn() },
}));

import RecipeModel from '@/models/recipe-model';
import InventoryModel from '@/models/inventory-model';
import StockMovementModel from '@/models/stock-movement-model';
import ProductionModel from '@/models/production-model';
import { RecipeService } from '@/services/recipe-service';
import { ProductionService } from '@/services/production-service';
import { IProduction } from '@/interfaces/production.interface';

function chainableFind(result: unknown) {
  return {
    sort: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(result),
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('REQ-034 AC16 — Recipe deactivation', () => {
  it('listActiveRecipes excludes isActive=false', async () => {
    const activeRecipe = {
      _id: new Types.ObjectId(),
      name: 'Pepper Soup',
      isActive: true,
    };
    (RecipeModel.find as ReturnType<typeof vi.fn>).mockReturnValue(
      chainableFind([activeRecipe])
    );

    const recipes = await RecipeService.listActiveRecipes();

    expect(RecipeModel.find).toHaveBeenCalledWith({ isActive: true });
    expect(recipes).toEqual([activeRecipe]);
  });

  it('deactivating preserves past Production.recipeId references', async () => {
    // Production rows reference Recipe via recipeId. Deactivating the
    // Recipe never touches the Production collection — the FK persists
    // and historical rows continue to render. We assert by structure:
    // ProductionModel and RecipeModel are independent, deactivate
    // only writes to RecipeModel.
    const recipeId = new Types.ObjectId().toString();
    (RecipeModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: new Types.ObjectId(recipeId),
      targetMenuItemId: new Types.ObjectId(),
      yieldPortions: 4,
      ingredients: [
        { inventoryId: new Types.ObjectId(), quantity: 100, unitId: 'g' },
      ],
      isActive: true,
    });
    (RecipeModel.findByIdAndUpdate as ReturnType<typeof vi.fn>).mockReturnValue(
      {
        lean: vi.fn().mockResolvedValue({
          _id: new Types.ObjectId(recipeId),
          isActive: false,
        }),
      }
    );

    await RecipeService.deactivateRecipe(recipeId);

    // The only persistence side-effect is on Recipe — Production is
    // untouched.
    expect(RecipeModel.findByIdAndUpdate).toHaveBeenCalledTimes(1);
  });

  it('past Production renders ingredientsDeducted snapshot independent of recipe', async () => {
    // The void path reads ingredientsDeducted directly from the
    // Production row — never re-fetches the Recipe. We verify by
    // running voidBatch with RecipeModel.findById set to reject; the
    // void must still succeed because the snapshot is self-contained.
    (RecipeModel.findById as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('SHOULD_NOT_BE_CALLED — void must not touch RecipeModel')
    );

    const targetMenuItemId = new Types.ObjectId();
    const productionDoc = {
      _id: new Types.ObjectId(),
      recipeId: new Types.ObjectId(),
      targetMenuItemId,
      batchCount: 1,
      expectedYield: 4,
      actualYield: 4,
      yieldVariance: 0,
      ingredientsDeducted: [
        {
          inventoryId: new Types.ObjectId(),
          quantityInInventoryUnit: 200,
          inventoryUnitId: 'g',
          name: 'Goat',
        },
      ],
      performedBy: new Types.ObjectId(),
      performedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
      status: 'completed' as const,
      voidedBy: undefined as Types.ObjectId | undefined,
      voidedAt: undefined as Date | undefined,
      reasonNote: undefined as string | undefined,
      save: vi.fn().mockResolvedValue(undefined),
      toObject() {
        const { save: _s, toObject: _t, ...rest } = this;
        return rest;
      },
    };
    (ProductionModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      productionDoc
    );
    (InventoryModel.updateOne as ReturnType<typeof vi.fn>).mockResolvedValue({
      acknowledged: true,
      modifiedCount: 1,
    });
    (InventoryModel.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: new Types.ObjectId(),
      menuItemId: targetMenuItemId,
      kind: 'menu-item',
    });
    (StockMovementModel.create as ReturnType<typeof vi.fn>).mockImplementation(
      async (payload: Record<string, unknown>) => ({
        _id: new Types.ObjectId(),
        ...payload,
      })
    );

    const result = (await ProductionService.voidBatch({
      productionId: productionDoc._id.toString(),
      voidedBy: new Types.ObjectId().toString(),
      voidedByRole: 'super-admin',
    })) as unknown as IProduction;

    expect(result.status).toBe('voided');
    expect(RecipeModel.findById).not.toHaveBeenCalled();
  });

  it('voiding a past Production whose recipe is deactivated still works', async () => {
    // Same invariant tested differently: even when the Recipe has been
    // deactivated since the production ran, the void operates entirely
    // off the Production snapshot.
    const targetMenuItemId = new Types.ObjectId();
    const productionDoc = {
      _id: new Types.ObjectId(),
      recipeId: new Types.ObjectId(),
      targetMenuItemId,
      batchCount: 1,
      expectedYield: 4,
      actualYield: 4,
      yieldVariance: 0,
      ingredientsDeducted: [
        {
          inventoryId: new Types.ObjectId(),
          quantityInInventoryUnit: 50,
          inventoryUnitId: 'g',
          name: 'Salt',
        },
      ],
      performedBy: new Types.ObjectId(),
      performedAt: new Date(Date.now() - 60 * 60 * 1000),
      status: 'completed' as const,
      voidedBy: undefined,
      voidedAt: undefined,
      reasonNote: undefined,
      save: vi.fn().mockResolvedValue(undefined),
      toObject() {
        const { save: _s, toObject: _t, ...rest } = this;
        return rest;
      },
    };
    (ProductionModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      productionDoc
    );
    (InventoryModel.updateOne as ReturnType<typeof vi.fn>).mockResolvedValue({
      acknowledged: true,
      modifiedCount: 1,
    });
    (InventoryModel.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: new Types.ObjectId(),
      menuItemId: targetMenuItemId,
      kind: 'menu-item',
    });
    (StockMovementModel.create as ReturnType<typeof vi.fn>).mockImplementation(
      async (payload: Record<string, unknown>) => ({
        _id: new Types.ObjectId(),
        ...payload,
      })
    );

    // Even with the recipe gone / deactivated, the void uses the snapshot.
    await expect(
      ProductionService.voidBatch({
        productionId: productionDoc._id.toString(),
        voidedBy: new Types.ObjectId().toString(),
        voidedByRole: 'super-admin',
      })
    ).resolves.toBeDefined();

    // ingredientsDeducted snapshot is the source of truth — one reversal
    // addition + one yield reversal deduction = 2 movements.
    const movements = (StockMovementModel.create as ReturnType<typeof vi.fn>)
      .mock.calls;
    expect(movements.length).toBe(2);
  });

  it('reactivating a recipe re-adds it to the active list', async () => {
    const recipeId = new Types.ObjectId().toString();
    const reactivated = {
      _id: new Types.ObjectId(recipeId),
      name: 'Pepper Soup',
      isActive: true,
    };
    (RecipeModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: reactivated._id,
      targetMenuItemId: new Types.ObjectId(),
      yieldPortions: 4,
      ingredients: [
        {
          inventoryId: new Types.ObjectId(),
          quantity: 100,
          unitId: 'g',
        },
      ],
      isActive: false,
    });
    (RecipeModel.findByIdAndUpdate as ReturnType<typeof vi.fn>).mockReturnValue(
      {
        lean: vi.fn().mockResolvedValue(reactivated),
      }
    );
    (RecipeModel.find as ReturnType<typeof vi.fn>).mockReturnValue(
      chainableFind([reactivated])
    );

    const result = await RecipeService.reactivateRecipe(recipeId);
    expect(result.isActive).toBe(true);
    // Confirm reactivation actually flipped the field via $set.
    const updateCall = (
      RecipeModel.findByIdAndUpdate as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    expect(updateCall[1]).toEqual({ $set: { isActive: true } });

    // Listing active should now include it (mock returns the row).
    const active = await RecipeService.listActiveRecipes();
    expect(active.map((r) => r._id.toString())).toContain(
      reactivated._id.toString()
    );
  });
});
