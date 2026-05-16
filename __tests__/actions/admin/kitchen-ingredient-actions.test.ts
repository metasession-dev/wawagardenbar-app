/**
 * @requirement REQ-034 / D7 — Kitchen ingredient creation
 *
 * Asserts that createKitchenIngredientAction:
 *   - rejects when the caller has no kitchenInventory permission
 *   - validates the payload (name, category, unit, non-negative stocks,
 *     max ≥ min)
 *   - super-admin bypass works
 *   - permission-driven path works for admin role with inventoryManagement
 *
 * The MenuItem + Inventory writes are mocked out so the test stays in
 * `environment:'node'`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({}),
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));
vi.mock('iron-session', () => ({
  getIronSession: vi.fn(),
}));

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/models/menu-item-model', () => ({
  default: {
    create: vi.fn(),
    findByIdAndDelete: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock('@/models/inventory-model', () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock('@/services/recipe-service', () => ({
  RecipeService: {
    findActiveRecipesReferencingInventory: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getUnitsOfMeasurement: vi.fn().mockResolvedValue([
      { id: 'kg', label: 'Kilograms (kg)', category: 'mass', isActive: true },
      { id: 'g', label: 'Grams (g)', category: 'mass', isActive: true },
    ]),
    getExpenseCategories: vi.fn().mockResolvedValue({
      directCostCategories: ['Meat/Protein', 'Cooking Oil', 'Custom Spices'],
      operatingExpenseCategories: [],
      directCostGroups: [{ name: 'Proteins', categoryNames: ['Meat/Protein'] }],
      operatingExpenseGroups: [],
    }),
  },
}));

import { getIronSession } from 'iron-session';
import MenuItemModel from '@/models/menu-item-model';
import InventoryModel from '@/models/inventory-model';
import { RecipeService } from '@/services/recipe-service';
import {
  createKitchenIngredientAction,
  getKitchenIngredientFormOptionsAction,
  updateKitchenIngredientAction,
  archiveKitchenIngredientAction,
  restoreKitchenIngredientAction,
} from '@/app/actions/admin/kitchen-ingredient-actions';

const userId = new Types.ObjectId().toString();

function mockSession(opts: {
  role?: 'csr' | 'admin' | 'super-admin';
  permissions?: { inventoryManagement?: boolean };
  isLoggedIn?: boolean;
}) {
  (getIronSession as ReturnType<typeof vi.fn>).mockResolvedValue({
    isLoggedIn: opts.isLoggedIn ?? true,
    userId,
    role: opts.role,
    permissions: opts.permissions,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (MenuItemModel.create as ReturnType<typeof vi.fn>).mockImplementation(
    async (doc: Record<string, unknown>) => ({
      _id: new Types.ObjectId(),
      ...doc,
    })
  );
  (InventoryModel.create as ReturnType<typeof vi.fn>).mockImplementation(
    async (doc: Record<string, unknown>) => ({
      _id: new Types.ObjectId(),
      ...doc,
    })
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('REQ-034 D7 — createKitchenIngredientAction permission gate', () => {
  it('rejects an unauthenticated caller', async () => {
    mockSession({ isLoggedIn: false, role: undefined });
    const r = await createKitchenIngredientAction({
      name: 'Goat',
      category: 'Meat/Protein',
      unit: 'kg',
    });
    expect(r.success).toBe(false);
    expect(MenuItemModel.create).not.toHaveBeenCalled();
  });

  it('rejects csr without inventoryManagement', async () => {
    mockSession({ role: 'csr', permissions: { inventoryManagement: false } });
    const r = await createKitchenIngredientAction({
      name: 'Goat',
      category: 'Meat/Protein',
      unit: 'kg',
    });
    expect(r.success).toBe(false);
  });

  it('accepts super-admin unconditionally (bypass)', async () => {
    mockSession({ role: 'super-admin' });
    const r = await createKitchenIngredientAction({
      name: 'Goat',
      category: 'Meat/Protein',
      unit: 'kg',
    });
    expect(r.success).toBe(true);
    expect(MenuItemModel.create).toHaveBeenCalledTimes(1);
    expect(InventoryModel.create).toHaveBeenCalledTimes(1);
  });

  it('accepts admin with inventoryManagement', async () => {
    mockSession({ role: 'admin', permissions: { inventoryManagement: true } });
    const r = await createKitchenIngredientAction({
      name: 'Palm oil',
      category: 'Cooking Oil',
      unit: 'litres',
    });
    expect(r.success).toBe(true);
  });
});

describe('REQ-034 D7 — payload validation', () => {
  beforeEach(() => {
    mockSession({ role: 'super-admin' });
  });

  it('rejects missing name', async () => {
    const r = await createKitchenIngredientAction({
      name: '   ',
      category: 'Meat/Protein',
      unit: 'kg',
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/name/i);
  });

  it('rejects missing category', async () => {
    const r = await createKitchenIngredientAction({
      name: 'Goat',
      category: '',
      unit: 'kg',
    });
    expect(r.success).toBe(false);
  });

  it('rejects missing unit', async () => {
    const r = await createKitchenIngredientAction({
      name: 'Goat',
      category: 'Meat/Protein',
      unit: '',
    });
    expect(r.success).toBe(false);
  });

  it('rejects negative stocks', async () => {
    const r = await createKitchenIngredientAction({
      name: 'Goat',
      category: 'Meat/Protein',
      unit: 'kg',
      currentStock: -1,
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/non-negative/i);
  });

  it('rejects maximumStock < minimumStock', async () => {
    const r = await createKitchenIngredientAction({
      name: 'Goat',
      category: 'Meat/Protein',
      unit: 'kg',
      minimumStock: 10,
      maximumStock: 5,
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/maximum/i);
  });
});

describe('REQ-034 D7 — pair invariant: reap MenuItem on Inventory failure', () => {
  it('deletes the MenuItem if Inventory.create throws', async () => {
    mockSession({ role: 'super-admin' });
    (InventoryModel.create as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('mock inventory write failure')
    );
    const r = await createKitchenIngredientAction({
      name: 'Goat',
      category: 'Meat/Protein',
      unit: 'kg',
    });
    expect(r.success).toBe(false);
    expect(MenuItemModel.findByIdAndDelete).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// REQ-037 — Edit kitchen ingredient (updateKitchenIngredientAction)
// ---------------------------------------------------------------------------

function mockFoundInventory(opts: {
  id: string;
  menuItemId: string;
  archived?: boolean;
  kind?: 'kitchen-ingredient' | 'menu-item';
}) {
  (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
    _id: new Types.ObjectId(opts.id),
    menuItemId: new Types.ObjectId(opts.menuItemId),
    kind: opts.kind ?? 'kitchen-ingredient',
    archivedAt: opts.archived ? new Date() : undefined,
  });
}

describe('REQ-037 AC2 — updateKitchenIngredientAction permission gate', () => {
  it('rejects unauthenticated callers', async () => {
    mockSession({ isLoggedIn: false, role: undefined });
    const r = await updateKitchenIngredientAction({
      inventoryId: new Types.ObjectId().toString(),
      name: 'Goat',
      category: 'Meat/Protein',
    });
    expect(r.success).toBe(false);
    expect(InventoryModel.findById).not.toHaveBeenCalled();
  });

  it('rejects csr without inventoryManagement', async () => {
    mockSession({ role: 'csr', permissions: { inventoryManagement: false } });
    const r = await updateKitchenIngredientAction({
      inventoryId: new Types.ObjectId().toString(),
      name: 'Goat',
      category: 'Meat/Protein',
    });
    expect(r.success).toBe(false);
  });

  it('accepts super-admin unconditionally', async () => {
    const invId = new Types.ObjectId().toString();
    const menuItemId = new Types.ObjectId().toString();
    mockFoundInventory({ id: invId, menuItemId });
    (
      MenuItemModel.findByIdAndUpdate as ReturnType<typeof vi.fn>
    ).mockResolvedValue({});
    (
      InventoryModel.findByIdAndUpdate as ReturnType<typeof vi.fn>
    ).mockResolvedValue({});
    mockSession({ role: 'super-admin' });

    const r = await updateKitchenIngredientAction({
      inventoryId: invId,
      name: 'Goat meat',
      category: 'Meat/Protein',
    });
    expect(r.success).toBe(true);
  });

  it('accepts admin with inventoryManagement', async () => {
    const invId = new Types.ObjectId().toString();
    const menuItemId = new Types.ObjectId().toString();
    mockFoundInventory({ id: invId, menuItemId });
    (
      MenuItemModel.findByIdAndUpdate as ReturnType<typeof vi.fn>
    ).mockResolvedValue({});
    (
      InventoryModel.findByIdAndUpdate as ReturnType<typeof vi.fn>
    ).mockResolvedValue({});
    mockSession({ role: 'admin', permissions: { inventoryManagement: true } });

    const r = await updateKitchenIngredientAction({
      inventoryId: invId,
      name: 'Goat meat',
      category: 'Meat/Protein',
    });
    expect(r.success).toBe(true);
  });
});

describe('REQ-037 AC2 — updateKitchenIngredientAction validation + writes', () => {
  beforeEach(() => {
    mockSession({ role: 'super-admin' });
  });

  it('rejects empty name', async () => {
    const r = await updateKitchenIngredientAction({
      inventoryId: new Types.ObjectId().toString(),
      name: '   ',
      category: 'Meat/Protein',
    });
    expect(r.success).toBe(false);
    expect(InventoryModel.findById).not.toHaveBeenCalled();
  });

  it('rejects empty category', async () => {
    const r = await updateKitchenIngredientAction({
      inventoryId: new Types.ObjectId().toString(),
      name: 'Goat',
      category: '',
    });
    expect(r.success).toBe(false);
  });

  it('rejects negative stock thresholds', async () => {
    const r = await updateKitchenIngredientAction({
      inventoryId: new Types.ObjectId().toString(),
      name: 'Goat',
      category: 'Meat/Protein',
      minimumStock: -1,
    });
    expect(r.success).toBe(false);
  });

  it('rejects max < min', async () => {
    const r = await updateKitchenIngredientAction({
      inventoryId: new Types.ObjectId().toString(),
      name: 'Goat',
      category: 'Meat/Protein',
      minimumStock: 10,
      maximumStock: 5,
    });
    expect(r.success).toBe(false);
  });

  it('rejects when inventory row is not found', async () => {
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      null
    );
    const r = await updateKitchenIngredientAction({
      inventoryId: new Types.ObjectId().toString(),
      name: 'Goat',
      category: 'Meat/Protein',
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/not found/i);
  });

  it('rejects when inventory row is not a kitchen-ingredient', async () => {
    const invId = new Types.ObjectId().toString();
    mockFoundInventory({
      id: invId,
      menuItemId: new Types.ObjectId().toString(),
      kind: 'menu-item',
    });
    const r = await updateKitchenIngredientAction({
      inventoryId: invId,
      name: 'X',
      category: 'Y',
    });
    expect(r.success).toBe(false);
  });

  it('rejects when inventory row is archived', async () => {
    const invId = new Types.ObjectId().toString();
    mockFoundInventory({
      id: invId,
      menuItemId: new Types.ObjectId().toString(),
      archived: true,
    });
    const r = await updateKitchenIngredientAction({
      inventoryId: invId,
      name: 'X',
      category: 'Y',
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/archived/i);
  });

  it('happy-path: updates BOTH paired MenuItem and Inventory rows', async () => {
    const invId = new Types.ObjectId().toString();
    const menuItemId = new Types.ObjectId().toString();
    mockFoundInventory({ id: invId, menuItemId });
    (
      MenuItemModel.findByIdAndUpdate as ReturnType<typeof vi.fn>
    ).mockResolvedValue({});
    (
      InventoryModel.findByIdAndUpdate as ReturnType<typeof vi.fn>
    ).mockResolvedValue({});

    const r = await updateKitchenIngredientAction({
      inventoryId: invId,
      name: '  Goat meat  ',
      category: '  Meat/Protein  ',
      minimumStock: 100,
      maximumStock: 1000,
    });

    expect(r.success).toBe(true);
    expect(MenuItemModel.findByIdAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      { name: 'Goat meat', category: 'Meat/Protein' }
    );
    expect(InventoryModel.findByIdAndUpdate).toHaveBeenCalledWith(invId, {
      minimumStock: 100,
      maximumStock: 1000,
    });
  });

  it('partial-write: MenuItem succeeds, Inventory fails → surfaces partial state clearly', async () => {
    const invId = new Types.ObjectId().toString();
    const menuItemId = new Types.ObjectId().toString();
    mockFoundInventory({ id: invId, menuItemId });
    (
      MenuItemModel.findByIdAndUpdate as ReturnType<typeof vi.fn>
    ).mockResolvedValue({});
    (
      InventoryModel.findByIdAndUpdate as ReturnType<typeof vi.fn>
    ).mockRejectedValue(new Error('mongo write timed out'));

    const r = await updateKitchenIngredientAction({
      inventoryId: invId,
      name: 'Goat',
      category: 'Meat/Protein',
      minimumStock: 50,
      maximumStock: 500,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error).toMatch(/inventory thresholds/);
      // Operator must be told the menu-item change already persisted.
      expect(r.error).toMatch(/already persisted/i);
    }
  });
});

// ---------------------------------------------------------------------------
// REQ-037 — Archive kitchen ingredient (archiveKitchenIngredientAction)
// ---------------------------------------------------------------------------

describe('REQ-037 AC3 + AC4 — archiveKitchenIngredientAction', () => {
  beforeEach(() => {
    mockSession({ role: 'super-admin' });
    (
      RecipeService.findActiveRecipesReferencingInventory as ReturnType<
        typeof vi.fn
      >
    ).mockResolvedValue([]);
  });

  it('rejects unauthenticated callers', async () => {
    mockSession({ isLoggedIn: false, role: undefined });
    const r = await archiveKitchenIngredientAction(
      new Types.ObjectId().toString()
    );
    expect(r.success).toBe(false);
    expect(InventoryModel.findById).not.toHaveBeenCalled();
  });

  it('rejects csr without inventoryManagement', async () => {
    mockSession({ role: 'csr', permissions: { inventoryManagement: false } });
    const r = await archiveKitchenIngredientAction(
      new Types.ObjectId().toString()
    );
    expect(r.success).toBe(false);
  });

  it('rejects when inventory row is not found', async () => {
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      null
    );
    const r = await archiveKitchenIngredientAction(
      new Types.ObjectId().toString()
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/not found/i);
  });

  it('rejects already-archived rows (idempotency surface)', async () => {
    const invId = new Types.ObjectId().toString();
    mockFoundInventory({
      id: invId,
      menuItemId: new Types.ObjectId().toString(),
      archived: true,
    });
    const r = await archiveKitchenIngredientAction(invId);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/already archived/i);
  });

  it('rejects non-kitchen-ingredient kind', async () => {
    const invId = new Types.ObjectId().toString();
    mockFoundInventory({
      id: invId,
      menuItemId: new Types.ObjectId().toString(),
      kind: 'menu-item',
    });
    const r = await archiveKitchenIngredientAction(invId);
    expect(r.success).toBe(false);
  });

  it('BLOCKED by active recipes; error names every blocking recipe', async () => {
    const invId = new Types.ObjectId().toString();
    const menuItemId = new Types.ObjectId().toString();
    mockFoundInventory({ id: invId, menuItemId });
    (
      RecipeService.findActiveRecipesReferencingInventory as ReturnType<
        typeof vi.fn
      >
    ).mockResolvedValue([
      { _id: new Types.ObjectId(), name: 'Pepper Soup' },
      { _id: new Types.ObjectId(), name: 'Goat Stew' },
    ]);
    (MenuItemModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      name: 'Goat meat',
    });

    const r = await archiveKitchenIngredientAction(invId);
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error).toMatch(/Goat meat/);
      expect(r.error).toMatch(/Pepper Soup/);
      expect(r.error).toMatch(/Goat Stew/);
      expect(r.error).toMatch(/Deactivate/i);
    }
    expect(InventoryModel.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(MenuItemModel.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('ALLOWED when only deactivated recipes reference (active list comes back empty)', async () => {
    const invId = new Types.ObjectId().toString();
    const menuItemId = new Types.ObjectId().toString();
    mockFoundInventory({ id: invId, menuItemId });
    (
      RecipeService.findActiveRecipesReferencingInventory as ReturnType<
        typeof vi.fn
      >
    ).mockResolvedValue([]);
    (
      MenuItemModel.findByIdAndUpdate as ReturnType<typeof vi.fn>
    ).mockResolvedValue({});
    (
      InventoryModel.findByIdAndUpdate as ReturnType<typeof vi.fn>
    ).mockResolvedValue({});

    const r = await archiveKitchenIngredientAction(invId);
    expect(r.success).toBe(true);
  });

  it('soft-deletes BOTH paired MenuItem and Inventory rows with archivedAt', async () => {
    const invId = new Types.ObjectId().toString();
    const menuItemId = new Types.ObjectId().toString();
    mockFoundInventory({ id: invId, menuItemId });
    const before = Date.now();
    (
      MenuItemModel.findByIdAndUpdate as ReturnType<typeof vi.fn>
    ).mockResolvedValue({});
    (
      InventoryModel.findByIdAndUpdate as ReturnType<typeof vi.fn>
    ).mockResolvedValue({});

    const r = await archiveKitchenIngredientAction(invId);
    expect(r.success).toBe(true);

    const menuItemCall = (
      MenuItemModel.findByIdAndUpdate as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    const invCall = (
      InventoryModel.findByIdAndUpdate as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    expect(menuItemCall[1]).toHaveProperty('archivedAt');
    expect(invCall[1]).toHaveProperty('archivedAt');
    expect(
      (menuItemCall[1] as { archivedAt: Date }).archivedAt.getTime()
    ).toBeGreaterThanOrEqual(before);
  });

  it('on Inventory write failure, reverts the MenuItem archive to keep the pair consistent', async () => {
    const invId = new Types.ObjectId().toString();
    const menuItemId = new Types.ObjectId().toString();
    mockFoundInventory({ id: invId, menuItemId });
    (MenuItemModel.findByIdAndUpdate as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({}) // initial archive call
      .mockResolvedValueOnce({}); // compensating unset call
    (
      InventoryModel.findByIdAndUpdate as ReturnType<typeof vi.fn>
    ).mockRejectedValue(new Error('mongo timeout'));

    const r = await archiveKitchenIngredientAction(invId);
    expect(r.success).toBe(false);

    // Second findByIdAndUpdate on MenuItem unsets archivedAt to revert.
    expect(MenuItemModel.findByIdAndUpdate).toHaveBeenCalledTimes(2);
    const compensatingCall = (
      MenuItemModel.findByIdAndUpdate as ReturnType<typeof vi.fn>
    ).mock.calls[1];
    expect(compensatingCall[1]).toEqual({ $unset: { archivedAt: '' } });
  });
});

// ---------------------------------------------------------------------------
// REQ-037 — Restore kitchen ingredient (restoreKitchenIngredientAction)
// ---------------------------------------------------------------------------

describe('REQ-037 AC7 — restoreKitchenIngredientAction', () => {
  beforeEach(() => {
    mockSession({ role: 'super-admin' });
  });

  it('rejects unauthenticated callers', async () => {
    mockSession({ isLoggedIn: false, role: undefined });
    const r = await restoreKitchenIngredientAction(
      new Types.ObjectId().toString()
    );
    expect(r.success).toBe(false);
    expect(InventoryModel.findById).not.toHaveBeenCalled();
  });

  it('rejects csr without inventoryManagement', async () => {
    mockSession({ role: 'csr', permissions: { inventoryManagement: false } });
    const r = await restoreKitchenIngredientAction(
      new Types.ObjectId().toString()
    );
    expect(r.success).toBe(false);
  });

  it('rejects when inventory row is not found', async () => {
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      null
    );
    const r = await restoreKitchenIngredientAction(
      new Types.ObjectId().toString()
    );
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/not found/i);
  });

  it('rejects rows that are NOT archived (clear-intent surface)', async () => {
    const invId = new Types.ObjectId().toString();
    mockFoundInventory({
      id: invId,
      menuItemId: new Types.ObjectId().toString(),
      archived: false,
    });
    const r = await restoreKitchenIngredientAction(invId);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/not archived/i);
  });

  it('rejects non-kitchen-ingredient kind', async () => {
    const invId = new Types.ObjectId().toString();
    mockFoundInventory({
      id: invId,
      menuItemId: new Types.ObjectId().toString(),
      archived: true,
      kind: 'menu-item',
    });
    const r = await restoreKitchenIngredientAction(invId);
    expect(r.success).toBe(false);
  });

  it('happy-path: $unset archivedAt on BOTH paired MenuItem and Inventory rows', async () => {
    const invId = new Types.ObjectId().toString();
    const menuItemId = new Types.ObjectId().toString();
    mockFoundInventory({ id: invId, menuItemId, archived: true });
    (
      MenuItemModel.findByIdAndUpdate as ReturnType<typeof vi.fn>
    ).mockResolvedValue({});
    (
      InventoryModel.findByIdAndUpdate as ReturnType<typeof vi.fn>
    ).mockResolvedValue({});

    const r = await restoreKitchenIngredientAction(invId);
    expect(r.success).toBe(true);

    const menuItemCall = (
      MenuItemModel.findByIdAndUpdate as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    const invCall = (
      InventoryModel.findByIdAndUpdate as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    expect(menuItemCall[1]).toEqual({ $unset: { archivedAt: '' } });
    expect(invCall[1]).toEqual({ $unset: { archivedAt: '' } });
  });

  it('on Inventory write failure, re-archives the MenuItem to keep the pair consistent', async () => {
    const invId = new Types.ObjectId().toString();
    const menuItemId = new Types.ObjectId().toString();
    mockFoundInventory({ id: invId, menuItemId, archived: true });
    (MenuItemModel.findByIdAndUpdate as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({}) // initial unset
      .mockResolvedValueOnce({}); // compensating re-archive
    (
      InventoryModel.findByIdAndUpdate as ReturnType<typeof vi.fn>
    ).mockRejectedValue(new Error('mongo timeout'));

    const r = await restoreKitchenIngredientAction(invId);
    expect(r.success).toBe(false);

    // The second call re-sets archivedAt on the MenuItem.
    expect(MenuItemModel.findByIdAndUpdate).toHaveBeenCalledTimes(2);
    const compensatingCall = (
      MenuItemModel.findByIdAndUpdate as ReturnType<typeof vi.fn>
    ).mock.calls[1];
    expect(compensatingCall[1]).toHaveProperty('archivedAt');
  });
});

describe('REQ-034 D7 — getKitchenIngredientFormOptionsAction', () => {
  it('returns expense-categories list + groups + active units', async () => {
    mockSession({ role: 'super-admin' });
    const r = await getKitchenIngredientFormOptionsAction();
    expect(r.success).toBe(true);
    if (r.success) {
      // Custom category from system-settings flows through.
      expect(r.categories).toContain('Custom Spices');
      expect(r.categories).toContain('Meat/Protein');
      // Groups also surfaced for grouped-dropdown rendering.
      expect(r.categoryGroups).toEqual([
        { name: 'Proteins', categoryNames: ['Meat/Protein'] },
      ]);
      expect(r.units.map((u) => u.id)).toEqual(
        expect.arrayContaining(['kg', 'g'])
      );
    }
  });

  it('rejects callers without inventoryManagement', async () => {
    mockSession({ role: 'csr', permissions: { inventoryManagement: false } });
    const r = await getKitchenIngredientFormOptionsAction();
    expect(r.success).toBe(false);
  });
});
