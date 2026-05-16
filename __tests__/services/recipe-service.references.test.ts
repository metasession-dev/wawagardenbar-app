/**
 * @requirement REQ-037 — AC3
 *
 * `RecipeService.findActiveRecipesReferencingInventory` is the load-bearing
 * guard for the kitchen-ingredient delete flow. It must:
 *  - return every ACTIVE recipe that references the given inventoryId
 *  - exclude deactivated recipes (so the operator can delete an ingredient
 *    that only legacy/deactivated recipes refer to)
 *  - return an empty array for an unreferenced inventoryId
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/models/recipe-model', () => ({
  default: {
    find: vi.fn(),
  },
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

describe('REQ-037 AC3 — findActiveRecipesReferencingInventory', () => {
  it('returns every active recipe that references the inventoryId', async () => {
    const inventoryId = new Types.ObjectId();
    const expected = [
      { _id: new Types.ObjectId(), name: 'Pepper Soup' },
      { _id: new Types.ObjectId(), name: 'Goat Stew' },
    ];
    (RecipeModel.find as ReturnType<typeof vi.fn>).mockReturnValue(
      chainableFind(expected)
    );

    const result =
      await RecipeService.findActiveRecipesReferencingInventory(inventoryId);

    expect(result).toEqual(expected);
    expect(RecipeModel.find).toHaveBeenCalledWith(
      {
        isActive: true,
        'ingredients.inventoryId': inventoryId,
      },
      { _id: 1, name: 1 }
    );
  });

  it('coerces a string id to ObjectId before querying', async () => {
    const inventoryId = new Types.ObjectId();
    (RecipeModel.find as ReturnType<typeof vi.fn>).mockReturnValue(
      chainableFind([])
    );

    await RecipeService.findActiveRecipesReferencingInventory(
      inventoryId.toString()
    );

    const callArgs = (RecipeModel.find as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(callArgs['ingredients.inventoryId']).toBeInstanceOf(Types.ObjectId);
    expect(callArgs['ingredients.inventoryId'].toString()).toBe(
      inventoryId.toString()
    );
  });

  it('only matches ACTIVE recipes (isActive:true is part of the filter)', async () => {
    const inventoryId = new Types.ObjectId();
    (RecipeModel.find as ReturnType<typeof vi.fn>).mockReturnValue(
      chainableFind([])
    );

    await RecipeService.findActiveRecipesReferencingInventory(inventoryId);

    const callArgs = (RecipeModel.find as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(callArgs.isActive).toBe(true);
  });

  it('returns an empty array for an unreferenced inventoryId', async () => {
    const inventoryId = new Types.ObjectId();
    (RecipeModel.find as ReturnType<typeof vi.fn>).mockReturnValue(
      chainableFind([])
    );

    const result =
      await RecipeService.findActiveRecipesReferencingInventory(inventoryId);

    expect(result).toEqual([]);
  });

  it('returns results sorted by name (so the delete error lists them alphabetically)', async () => {
    const inventoryId = new Types.ObjectId();
    const sortSpy = vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    });
    (RecipeModel.find as ReturnType<typeof vi.fn>).mockReturnValue({
      sort: sortSpy,
    });

    await RecipeService.findActiveRecipesReferencingInventory(inventoryId);

    expect(sortSpy).toHaveBeenCalledWith({ name: 1 });
  });
});
