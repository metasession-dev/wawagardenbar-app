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
  default: { find: vi.fn() },
}));

vi.mock('@/models/menu-item-model', () => ({
  default: { findById: vi.fn() },
}));

vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: { getUnitsOfMeasurement: vi.fn() },
}));

import RecipeModel from '@/models/recipe-model';
import { RecipeService } from '@/services/recipe-service';

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

  it.skip('deactivating preserves past Production.recipeId references', () => {
    // AC16 — exercised in step 9's production-service commit.
  });

  it.skip('past Production renders ingredientsDeducted snapshot independent of recipe', () => {
    // AC16 — exercised in step 9's production-service commit.
  });

  it.skip('voiding a past Production whose recipe is deactivated still works', () => {
    // AC16 — exercised in step 9's production-service.void commit.
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
