/**
 * @requirement REQ-034 — AC8 / AC9
 *
 * RecipeService.create validation:
 *   - target menu item must be kind:'menu-item'
 *   - every ingredient inventory must be kind:'kitchen-ingredient'
 *   - no duplicate ingredient lines
 *   - yield > 0
 *   - ingredient unit shares dimension with inventory unit (mass / volume:
 *     same UoMCategory; count / other / time: strict id equality)
 *   - isActive defaults to true
 *
 * Mongo is fully mocked so the test runs under the node-environment
 * vitest config without a live database.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
import { DEFAULT_UNITS_OF_MEASUREMENT } from '@/interfaces/unit-of-measurement.interface';

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/models/recipe-model', () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock('@/models/inventory-model', () => ({
  default: {
    find: vi.fn(),
  },
}));

vi.mock('@/models/menu-item-model', () => ({
  default: {
    findById: vi.fn(),
  },
}));

vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getUnitsOfMeasurement: vi.fn(),
  },
}));

import RecipeModel from '@/models/recipe-model';
import InventoryModel from '@/models/inventory-model';
import MenuItemModel from '@/models/menu-item-model';
import { SystemSettingsService } from '@/services/system-settings-service';
import { RecipeService } from '@/services/recipe-service';

const createdBy = new Types.ObjectId().toString();

function mockMenuItem(
  kind: 'menu-item' | 'kitchen-ingredient',
  name = 'Pepper Soup'
) {
  const id = new Types.ObjectId();
  return { _id: id, kind, name, id: id.toString() };
}

function mockInventory(opts: {
  kind: 'menu-item' | 'kitchen-ingredient';
  unit: string;
  menuItemName?: string;
}) {
  const id = new Types.ObjectId();
  return {
    _id: id,
    kind: opts.kind,
    unit: opts.unit,
    menuItemId: { name: opts.menuItemName ?? 'Ingredient' },
  };
}

function setupFindByIdSelect(model: { findById: unknown }, result: unknown) {
  (model.findById as ReturnType<typeof vi.fn>).mockReturnValue({
    select: vi.fn().mockResolvedValue(result),
  });
}

function setupInventoryFind(rows: unknown[]) {
  (InventoryModel.find as ReturnType<typeof vi.fn>).mockReturnValue({
    select: vi.fn().mockReturnValue({
      populate: vi.fn().mockResolvedValue(rows),
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (
    SystemSettingsService.getUnitsOfMeasurement as ReturnType<typeof vi.fn>
  ).mockResolvedValue(DEFAULT_UNITS_OF_MEASUREMENT);
  (RecipeModel.create as ReturnType<typeof vi.fn>).mockImplementation(
    async (doc: Record<string, unknown>) => ({
      _id: new Types.ObjectId(),
      ...doc,
      toObject() {
        return this;
      },
    })
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('REQ-034 AC8 — RecipeService.create validation', () => {
  it('rejects if targetMenuItemId is not kind:menu-item', async () => {
    const target = mockMenuItem('kitchen-ingredient');
    const inv = mockInventory({ kind: 'kitchen-ingredient', unit: 'g' });
    setupFindByIdSelect(MenuItemModel, target);
    setupInventoryFind([inv]);

    await expect(
      RecipeService.createRecipe({
        targetMenuItemId: target._id.toString(),
        name: 'X',
        yieldPortions: 4,
        ingredients: [
          { inventoryId: inv._id.toString(), quantity: 100, unitId: 'g' },
        ],
        createdBy,
      })
    ).rejects.toThrow(/kind 'kitchen-ingredient'/);

    expect(RecipeModel.create).not.toHaveBeenCalled();
  });

  it('rejects if any ingredient inventoryId is not kind:kitchen-ingredient', async () => {
    const target = mockMenuItem('menu-item');
    const badInv = mockInventory({
      kind: 'menu-item',
      unit: 'portions',
      menuItemName: 'Soup',
    });
    setupFindByIdSelect(MenuItemModel, target);
    setupInventoryFind([badInv]);

    await expect(
      RecipeService.createRecipe({
        targetMenuItemId: target._id.toString(),
        name: 'X',
        yieldPortions: 4,
        ingredients: [
          {
            inventoryId: badInv._id.toString(),
            quantity: 1,
            unitId: 'portions',
          },
        ],
        createdBy,
      })
    ).rejects.toThrow(/expected 'kitchen-ingredient'/);
  });

  it('rejects duplicate ingredient lines', async () => {
    const target = mockMenuItem('menu-item');
    const inv = mockInventory({ kind: 'kitchen-ingredient', unit: 'g' });
    setupFindByIdSelect(MenuItemModel, target);
    setupInventoryFind([inv]);

    await expect(
      RecipeService.createRecipe({
        targetMenuItemId: target._id.toString(),
        name: 'X',
        yieldPortions: 4,
        ingredients: [
          { inventoryId: inv._id.toString(), quantity: 100, unitId: 'g' },
          { inventoryId: inv._id.toString(), quantity: 50, unitId: 'g' },
        ],
        createdBy,
      })
    ).rejects.toThrow(/Duplicate ingredient/);
  });

  it('rejects yield ≤ 0', async () => {
    const target = mockMenuItem('menu-item');
    const inv = mockInventory({ kind: 'kitchen-ingredient', unit: 'g' });
    setupFindByIdSelect(MenuItemModel, target);
    setupInventoryFind([inv]);

    await expect(
      RecipeService.createRecipe({
        targetMenuItemId: target._id.toString(),
        name: 'X',
        yieldPortions: 0,
        ingredients: [
          { inventoryId: inv._id.toString(), quantity: 100, unitId: 'g' },
        ],
        createdBy,
      })
    ).rejects.toThrow(/yieldPortions/);

    await expect(
      RecipeService.createRecipe({
        targetMenuItemId: target._id.toString(),
        name: 'X',
        yieldPortions: -1,
        ingredients: [
          { inventoryId: inv._id.toString(), quantity: 100, unitId: 'g' },
        ],
        createdBy,
      })
    ).rejects.toThrow(/yieldPortions/);
  });

  it('rejects cross-dimension ingredient unit (kg vs ml)', async () => {
    const target = mockMenuItem('menu-item');
    // inventory stored in ml (volume), recipe asks for kg (mass)
    const inv = mockInventory({ kind: 'kitchen-ingredient', unit: 'ml' });
    setupFindByIdSelect(MenuItemModel, target);
    setupInventoryFind([inv]);

    await expect(
      RecipeService.createRecipe({
        targetMenuItemId: target._id.toString(),
        name: 'X',
        yieldPortions: 4,
        ingredients: [
          { inventoryId: inv._id.toString(), quantity: 0.5, unitId: 'kg' },
        ],
        createdBy,
      })
    ).rejects.toThrow(/cross-dimension/);
  });

  it('accepts same-dimension ingredient unit (recipe in g, inventory in kg)', async () => {
    const target = mockMenuItem('menu-item');
    const inv = mockInventory({ kind: 'kitchen-ingredient', unit: 'kg' });
    setupFindByIdSelect(MenuItemModel, target);
    setupInventoryFind([inv]);

    await expect(
      RecipeService.createRecipe({
        targetMenuItemId: target._id.toString(),
        name: 'X',
        yieldPortions: 4,
        ingredients: [
          { inventoryId: inv._id.toString(), quantity: 200, unitId: 'g' },
        ],
        createdBy,
      })
    ).resolves.toBeDefined();

    expect(RecipeModel.create).toHaveBeenCalledTimes(1);
  });

  it('accepts strict-match count unit', async () => {
    const target = mockMenuItem('menu-item');
    const inv = mockInventory({ kind: 'kitchen-ingredient', unit: 'eggs' });
    setupFindByIdSelect(MenuItemModel, target);
    setupInventoryFind([inv]);

    await expect(
      RecipeService.createRecipe({
        targetMenuItemId: target._id.toString(),
        name: 'X',
        yieldPortions: 4,
        ingredients: [
          { inventoryId: inv._id.toString(), quantity: 2, unitId: 'eggs' },
        ],
        createdBy,
      })
    ).resolves.toBeDefined();
  });

  it('rejects mismatched count unit (eggs vs cartons)', async () => {
    const target = mockMenuItem('menu-item');
    const inv = mockInventory({ kind: 'kitchen-ingredient', unit: 'cartons' });
    setupFindByIdSelect(MenuItemModel, target);
    setupInventoryFind([inv]);

    await expect(
      RecipeService.createRecipe({
        targetMenuItemId: target._id.toString(),
        name: 'X',
        yieldPortions: 4,
        ingredients: [
          { inventoryId: inv._id.toString(), quantity: 2, unitId: 'eggs' },
        ],
        createdBy,
      })
    ).rejects.toThrow(/no fungible conversion|must match exactly/);
  });

  it('persists active=true by default', async () => {
    const target = mockMenuItem('menu-item');
    const inv = mockInventory({ kind: 'kitchen-ingredient', unit: 'g' });
    setupFindByIdSelect(MenuItemModel, target);
    setupInventoryFind([inv]);

    await RecipeService.createRecipe({
      targetMenuItemId: target._id.toString(),
      name: 'X',
      yieldPortions: 4,
      ingredients: [
        { inventoryId: inv._id.toString(), quantity: 100, unitId: 'g' },
      ],
      createdBy,
    });

    const arg = (RecipeModel.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(arg.isActive).toBe(true);
  });
});
