/**
 * @requirement REQ-030 - Multi-component inventory deduction via customization option links
 *
 * Validation tests for updateMenuItemAction — customization option inventory links.
 * Mocks the Mongoose models, session, cache; drives the action with FormData and
 * asserts accept/reject semantics for the new optional fields.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: vi.fn(),
  })),
}));

vi.mock('iron-session', () => ({
  getIronSession: vi.fn(async () => ({
    userId: '65a1b2c3d4e5f6a7b8c9d000',
    role: 'super-admin',
    email: 'admin@test.local',
  })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/services/audit-log-service', () => ({
  AuditLogService: { createLog: vi.fn() },
}));

vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getInventoryLocations: vi.fn(async () => ({ locations: [] })),
  },
}));

// Capture the final customizations array set on the menu item
let savedCustomizations: unknown = null;

const savedMenuItem = {
  _id: '65a1b2c3d4e5f6a7b8c9d100',
  name: 'Poundo',
  trackInventory: false,
  customizations: [],
  nutritionalInfo: {},
  portionOptions: {},
  allowManualPriceOverride: false,
  isAvailable: true,
  pointsRedeemable: false,
  pointsValue: undefined,
  tags: [],
  allergens: [],
  save: vi.fn(async function save() {
    // capture a deep snapshot of customizations at save time
    savedCustomizations = JSON.parse(
      JSON.stringify(
        (savedMenuItem as { customizations: unknown }).customizations
      )
    );
  }),
};

vi.mock('@/models/menu-item-model', () => ({
  default: {
    findById: vi.fn(async () => savedMenuItem),
  },
}));

vi.mock('@/models/inventory-model', () => ({
  default: {
    findOne: vi.fn(async () => null),
    create: vi.fn(async () => ({ _id: 'inv' })),
  },
}));

vi.mock('@/models/stock-movement-model', () => ({
  default: { create: vi.fn() },
}));

vi.mock('mongoose', async () => {
  const actual = await vi.importActual<typeof import('mongoose')>('mongoose');
  return {
    ...actual,
    default: actual.default,
    Types: {
      ...actual.Types,
      ObjectId: {
        ...actual.Types.ObjectId,
        isValid: (s: string) => /^[0-9a-fA-F]{24}$/.test(s),
      },
    },
  };
});

import { updateMenuItemAction } from '@/app/actions/admin/menu-actions';

const MENU_ITEM_ID = '65a1b2c3d4e5f6a7b8c9d100';
const VALID_INVENTORY_ID = '65a1b2c3d4e5f6a7b8c9d200';

function makeFormData(customizations: unknown): FormData {
  const fd = new FormData();
  fd.set('name', 'Poundo');
  fd.set('description', 'Swallow');
  fd.set('mainCategory', 'food');
  fd.set('category', 'swallow');
  fd.set('price', '1000');
  fd.set('preparationTime', '15');
  fd.set('isAvailable', 'true');
  fd.set('halfPortionEnabled', 'false');
  fd.set('halfPortionSurcharge', '0');
  fd.set('quarterPortionEnabled', 'false');
  fd.set('quarterPortionSurcharge', '0');
  fd.set('allowManualPriceOverride', 'false');
  fd.set('customizations', JSON.stringify(customizations));
  fd.set('allergens', JSON.stringify([]));
  fd.set('trackInventory', 'false');
  fd.set('pointsRedeemable', 'false');
  return fd;
}

beforeEach(() => {
  savedCustomizations = null;
  (savedMenuItem as { customizations: unknown[] }).customizations = [];
  vi.clearAllMocks();
});

describe('REQ-030: updateMenuItemAction — customization inventory links', () => {
  it('accepts valid 24-hex inventoryId + numeric inventoryDeduction and persists both', async () => {
    const fd = makeFormData([
      {
        name: 'Soup',
        required: true,
        options: [
          {
            name: 'Ogbono',
            price: 0,
            available: true,
            inventoryId: VALID_INVENTORY_ID,
            inventoryDeduction: 1,
          },
        ],
      },
    ]);

    const res = await updateMenuItemAction(MENU_ITEM_ID, fd);

    expect(res.success).toBe(true);
    expect(savedCustomizations).toEqual([
      {
        name: 'Soup',
        required: true,
        options: [
          {
            name: 'Ogbono',
            price: 0,
            available: true,
            inventoryId: VALID_INVENTORY_ID,
            inventoryDeduction: 1,
          },
        ],
      },
    ]);
  });

  it('accepts customizations with no inventoryId at all (legacy shape preserved)', async () => {
    const fd = makeFormData([
      {
        name: 'Size',
        required: true,
        options: [{ name: 'Large', price: 0, available: true }],
      },
    ]);

    const res = await updateMenuItemAction(MENU_ITEM_ID, fd);

    expect(res.success).toBe(true);
    expect(savedCustomizations).toEqual([
      {
        name: 'Size',
        required: true,
        options: [{ name: 'Large', price: 0, available: true }],
      },
    ]);
  });

  it('strips empty-string inventoryId so the field is not persisted', async () => {
    const fd = makeFormData([
      {
        name: 'Soup',
        required: true,
        options: [
          {
            name: 'Ogbono',
            price: 0,
            available: true,
            inventoryId: '',
          },
        ],
      },
    ]);

    const res = await updateMenuItemAction(MENU_ITEM_ID, fd);

    expect(res.success).toBe(true);
    const saved = savedCustomizations as Array<{
      options: Array<Record<string, unknown>>;
    }>;
    expect(saved[0].options[0]).not.toHaveProperty('inventoryId');
  });

  it('rejects inventoryId that is not 24 hex chars', async () => {
    const fd = makeFormData([
      {
        name: 'Soup',
        required: true,
        options: [
          { name: 'Ogbono', price: 0, available: true, inventoryId: 'abc' },
        ],
      },
    ]);

    const res = await updateMenuItemAction(MENU_ITEM_ID, fd);

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/inventoryId/i);
  });

  it('rejects inventoryId with non-hex characters', async () => {
    const fd = makeFormData([
      {
        name: 'Soup',
        required: true,
        options: [
          {
            name: 'Ogbono',
            price: 0,
            available: true,
            inventoryId: 'zzzzzzzzzzzzzzzzzzzzzzzz',
          },
        ],
      },
    ]);

    const res = await updateMenuItemAction(MENU_ITEM_ID, fd);

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/inventoryId/i);
  });

  it('rejects inventoryDeduction of 0', async () => {
    const fd = makeFormData([
      {
        name: 'Soup',
        required: true,
        options: [
          {
            name: 'Ogbono',
            price: 0,
            available: true,
            inventoryId: VALID_INVENTORY_ID,
            inventoryDeduction: 0,
          },
        ],
      },
    ]);

    const res = await updateMenuItemAction(MENU_ITEM_ID, fd);

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/inventoryDeduction/i);
  });

  it('rejects negative inventoryDeduction', async () => {
    const fd = makeFormData([
      {
        name: 'Soup',
        required: true,
        options: [
          {
            name: 'Ogbono',
            price: 0,
            available: true,
            inventoryId: VALID_INVENTORY_ID,
            inventoryDeduction: -1,
          },
        ],
      },
    ]);

    const res = await updateMenuItemAction(MENU_ITEM_ID, fd);

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/inventoryDeduction/i);
  });

  it('accepts fractional inventoryDeduction (2.5)', async () => {
    const fd = makeFormData([
      {
        name: 'Soup',
        required: true,
        options: [
          {
            name: 'Ogbono',
            price: 0,
            available: true,
            inventoryId: VALID_INVENTORY_ID,
            inventoryDeduction: 2.5,
          },
        ],
      },
    ]);

    const res = await updateMenuItemAction(MENU_ITEM_ID, fd);

    expect(res.success).toBe(true);
    const saved = savedCustomizations as Array<{
      options: Array<{ inventoryDeduction?: number }>;
    }>;
    expect(saved[0].options[0].inventoryDeduction).toBe(2.5);
  });

  it('rejects inventoryDeduction that is NaN or Infinity', async () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      const fd = makeFormData([
        {
          name: 'Soup',
          required: true,
          options: [
            {
              name: 'Ogbono',
              price: 0,
              available: true,
              inventoryId: VALID_INVENTORY_ID,
              inventoryDeduction: bad,
            },
          ],
        },
      ]);

      const res = await updateMenuItemAction(MENU_ITEM_ID, fd);

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/inventoryDeduction/i);
    }
  });
});
