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
  },
}));

vi.mock('@/models/inventory-model', () => ({
  default: {
    create: vi.fn(),
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
import {
  createKitchenIngredientAction,
  getKitchenIngredientFormOptionsAction,
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
