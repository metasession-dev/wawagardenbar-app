/**
 * @requirement REQ-087 — Per-item inventory deduction with skip-on-retry
 *
 * Unit tests for the refactored InventoryService.deductStockForOrder:
 * - AC1: partial failure — items 1 and 3 deducted, item 2 failed
 * - AC2: skip-on-retry — already-deducted items are skipped
 * - AC4: all items succeed → allSucceeded true
 * - Linked customization deductions continue independently per item
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

const MENU_ITEM_A = '65b1b2c3d4e5f6a7b8c9d001';
const MENU_ITEM_B = '65b1b2c3d4e5f6a7b8c9d002';
const MENU_ITEM_C = '65b1b2c3d4e5f6a7b8c9d003';
const INV_A = '65b1b2c3d4e5f6a7b8c9d011';
const INV_B = '65b1b2c3d4e5f6a7b8c9d012';
const INV_C = '65b1b2c3d4e5f6a7b8c9d013';
const ORDER_ID = '65b1b2c3d4e5f6a7b8c9d099';

type InventoryDoc = {
  _id: string;
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  unit: string;
  costPerUnit: number;
  status: string;
  totalSales: number;
  lastSaleDate?: Date;
  trackByLocation: boolean;
  locations: Array<{ location: string; currentStock: number }>;
  defaultSalesLocation?: string;
  save: () => Promise<void>;
};

type OrderDoc = {
  _id: string;
  items: Array<{
    menuItemId: string;
    name: string;
    quantity: number;
    portionSize?: 'full' | 'half' | 'quarter';
    portionMultiplier?: number;
    customizations?: Array<{ name: string; option: string; price: number }>;
  }>;
  inventoryDeducted?: boolean;
  inventoryDeductionDetails?: Array<{
    menuItemId: string;
    status: string;
  }>;
  save: () => Promise<void>;
};

type MenuItemDoc = {
  _id: string;
  trackInventory: boolean;
  customizations: Array<{
    name: string;
    required: boolean;
    options: Array<{
      name: string;
      price: number;
      available: boolean;
    }>;
  }>;
};

const state: {
  order: OrderDoc | null;
  menuItems: Map<string, MenuItemDoc>;
  inventories: Map<string, InventoryDoc>;
  inventoryByMenuItemId: Map<string, InventoryDoc>;
  stockMovements: unknown[];
} = {
  order: null,
  menuItems: new Map(),
  inventories: new Map(),
  inventoryByMenuItemId: new Map(),
  stockMovements: [],
};

vi.mock('@/models/order-model', () => ({
  default: {
    findById: vi.fn((id: string) =>
      state.order && state.order._id === id ? state.order : null
    ),
  },
}));

vi.mock('@/models/menu-item-model', () => ({
  default: {
    findById: vi.fn((id: string) => state.menuItems.get(id) ?? null),
  },
}));

vi.mock('@/models/inventory-model', () => ({
  default: {
    findById: vi.fn((id: string) => state.inventories.get(id) ?? null),
    findOne: vi.fn(async (query: Record<string, unknown>) => {
      const menuItemId = query?.menuItemId;
      if (typeof menuItemId === 'string') {
        return state.inventoryByMenuItemId.get(menuItemId) ?? null;
      }
      if (
        menuItemId &&
        typeof menuItemId === 'object' &&
        'toString' in menuItemId
      ) {
        return state.inventoryByMenuItemId.get(String(menuItemId)) ?? null;
      }
      return null;
    }),
    find: vi.fn(),
  },
}));

vi.mock('@/models/stock-movement-model', () => ({
  default: {
    create: vi.fn(async (doc: unknown) => {
      state.stockMovements.push(doc);
      return doc;
    }),
  },
}));

vi.mock('@/lib/email', () => ({
  sendLowStockAlertEmail: vi.fn(),
}));

vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getInventoryLocations: vi.fn(async () => ({ locations: [] })),
  },
}));

import InventoryService from '@/services/inventory-service';

function makeInventory(
  overrides: Partial<InventoryDoc> & { _id: string }
): InventoryDoc {
  return {
    currentStock: 100,
    minimumStock: 10,
    maximumStock: 500,
    unit: 'units',
    costPerUnit: 0,
    status: 'in-stock',
    totalSales: 0,
    trackByLocation: false,
    locations: [],
    save: vi.fn(async () => {}),
    ...overrides,
  };
}

function makeMenuItem(
  overrides: Partial<MenuItemDoc> & { _id: string }
): MenuItemDoc {
  return {
    trackInventory: true,
    customizations: [],
    ...overrides,
  };
}

beforeEach(() => {
  state.order = null;
  state.menuItems = new Map();
  state.inventories = new Map();
  state.inventoryByMenuItemId = new Map();
  state.stockMovements = [];
  vi.clearAllMocks();
});

describe('REQ-087 InventoryService.deductStockForOrder — per-item deduction', () => {
  it('AC1 — partial failure: items 1 and 3 deducted, item 2 failed', async () => {
    state.order = {
      _id: ORDER_ID,
      items: [
        {
          menuItemId: MENU_ITEM_A,
          name: 'Item A',
          quantity: 3,
          portionSize: 'full',
          portionMultiplier: 1.0,
          customizations: [],
        },
        {
          menuItemId: MENU_ITEM_B,
          name: 'Item B',
          quantity: 2,
          portionSize: 'full',
          portionMultiplier: 1.0,
          customizations: [],
        },
        {
          menuItemId: MENU_ITEM_C,
          name: 'Item C',
          quantity: 1,
          portionSize: 'full',
          portionMultiplier: 1.0,
          customizations: [],
        },
      ],
      save: vi.fn(async () => {}),
    };

    state.menuItems.set(MENU_ITEM_A, makeMenuItem({ _id: MENU_ITEM_A }));
    state.menuItems.set(MENU_ITEM_B, makeMenuItem({ _id: MENU_ITEM_B }));
    state.menuItems.set(MENU_ITEM_C, makeMenuItem({ _id: MENU_ITEM_C }));

    const invA = makeInventory({ _id: INV_A, currentStock: 10 });
    const invB = makeInventory({
      _id: INV_B,
      currentStock: 0,
      trackByLocation: true,
      locations: [
        { location: 'store', currentStock: 0 },
        { location: 'chiller1', currentStock: 0 },
      ],
      defaultSalesLocation: 'chiller1',
    });
    const invC = makeInventory({ _id: INV_C, currentStock: 5 });

    state.inventories.set(INV_A, invA);
    state.inventories.set(INV_B, invB);
    state.inventories.set(INV_C, invC);
    state.inventoryByMenuItemId.set(MENU_ITEM_A, invA);
    state.inventoryByMenuItemId.set(MENU_ITEM_B, invB);
    state.inventoryByMenuItemId.set(MENU_ITEM_C, invC);

    const result = await InventoryService.deductStockForOrder(ORDER_ID);

    expect(result.allSucceeded).toBe(false);
    expect(result.results).toHaveLength(3);

    expect(result.results[0].status).toBe('deducted');
    expect(result.results[0].menuItemId).toBe(MENU_ITEM_A);
    expect(invA.currentStock).toBe(7);

    expect(result.results[1].status).toBe('failed');
    expect(result.results[1].menuItemId).toBe(MENU_ITEM_B);
    expect(result.results[1].error).toBeDefined();

    expect(result.results[2].status).toBe('deducted');
    expect(result.results[2].menuItemId).toBe(MENU_ITEM_C);
    expect(invC.currentStock).toBe(4);
  });

  it('AC2 — skip-on-retry: already-deducted items are skipped', async () => {
    state.order = {
      _id: ORDER_ID,
      items: [
        {
          menuItemId: MENU_ITEM_A,
          name: 'Item A',
          quantity: 3,
          portionSize: 'full',
          portionMultiplier: 1.0,
          customizations: [],
        },
        {
          menuItemId: MENU_ITEM_B,
          name: 'Item B',
          quantity: 2,
          portionSize: 'full',
          portionMultiplier: 1.0,
          customizations: [],
        },
      ],
      inventoryDeductionDetails: [
        { menuItemId: MENU_ITEM_A, status: 'deducted' },
      ],
      save: vi.fn(async () => {}),
    };

    state.menuItems.set(MENU_ITEM_A, makeMenuItem({ _id: MENU_ITEM_A }));
    state.menuItems.set(MENU_ITEM_B, makeMenuItem({ _id: MENU_ITEM_B }));

    const invA = makeInventory({ _id: INV_A, currentStock: 7 });
    const invB = makeInventory({ _id: INV_B, currentStock: 10 });

    state.inventories.set(INV_A, invA);
    state.inventories.set(INV_B, invB);
    state.inventoryByMenuItemId.set(MENU_ITEM_A, invA);
    state.inventoryByMenuItemId.set(MENU_ITEM_B, invB);

    const result = await InventoryService.deductStockForOrder(ORDER_ID);

    expect(result.results).toHaveLength(2);
    expect(result.results[0].status).toBe('skipped');
    expect(result.results[0].menuItemId).toBe(MENU_ITEM_A);
    expect(invA.currentStock).toBe(7);

    expect(result.results[1].status).toBe('deducted');
    expect(result.results[1].menuItemId).toBe(MENU_ITEM_B);
    expect(invB.currentStock).toBe(8);
  });

  it('AC4 — all items succeed → allSucceeded true', async () => {
    state.order = {
      _id: ORDER_ID,
      items: [
        {
          menuItemId: MENU_ITEM_A,
          name: 'Item A',
          quantity: 2,
          portionSize: 'full',
          portionMultiplier: 1.0,
          customizations: [],
        },
        {
          menuItemId: MENU_ITEM_C,
          name: 'Item C',
          quantity: 1,
          portionSize: 'full',
          portionMultiplier: 1.0,
          customizations: [],
        },
      ],
      save: vi.fn(async () => {}),
    };

    state.menuItems.set(MENU_ITEM_A, makeMenuItem({ _id: MENU_ITEM_A }));
    state.menuItems.set(MENU_ITEM_C, makeMenuItem({ _id: MENU_ITEM_C }));

    const invA = makeInventory({ _id: INV_A, currentStock: 10 });
    const invC = makeInventory({ _id: INV_C, currentStock: 5 });

    state.inventories.set(INV_A, invA);
    state.inventories.set(INV_C, invC);
    state.inventoryByMenuItemId.set(MENU_ITEM_A, invA);
    state.inventoryByMenuItemId.set(MENU_ITEM_C, invC);

    const result = await InventoryService.deductStockForOrder(ORDER_ID);

    expect(result.allSucceeded).toBe(true);
    expect(result.results).toHaveLength(2);
    expect(result.results.every((r) => r.status === 'deducted')).toBe(true);
  });

  it('returns failed when menuItem not found', async () => {
    state.order = {
      _id: ORDER_ID,
      items: [
        {
          menuItemId: MENU_ITEM_A,
          name: 'Item A',
          quantity: 1,
          portionSize: 'full',
          portionMultiplier: 1.0,
          customizations: [],
        },
      ],
      save: vi.fn(async () => {}),
    };

    const result = await InventoryService.deductStockForOrder(ORDER_ID);

    expect(result.allSucceeded).toBe(false);
    expect(result.results[0].status).toBe('failed');
    expect(result.results[0].error).toContain('MenuItem not found');
  });

  it('throws when order not found', async () => {
    await expect(
      InventoryService.deductStockForOrder('nonexistent-id')
    ).rejects.toThrow('Order not found');
  });

  it('creates StockMovement for deducted items but not for failed', async () => {
    state.order = {
      _id: ORDER_ID,
      items: [
        {
          menuItemId: MENU_ITEM_A,
          name: 'Item A',
          quantity: 2,
          portionSize: 'full',
          portionMultiplier: 1.0,
          customizations: [],
        },
        {
          menuItemId: MENU_ITEM_B,
          name: 'Item B',
          quantity: 1,
          portionSize: 'full',
          portionMultiplier: 1.0,
          customizations: [],
        },
      ],
      save: vi.fn(async () => {}),
    };

    state.menuItems.set(MENU_ITEM_A, makeMenuItem({ _id: MENU_ITEM_A }));
    state.menuItems.set(MENU_ITEM_B, makeMenuItem({ _id: MENU_ITEM_B }));

    const invA = makeInventory({ _id: INV_A, currentStock: 10 });
    const invB = makeInventory({
      _id: INV_B,
      currentStock: 0,
      trackByLocation: true,
      locations: [
        { location: 'store', currentStock: 0 },
        { location: 'chiller1', currentStock: 0 },
      ],
      defaultSalesLocation: 'chiller1',
    });

    state.inventories.set(INV_A, invA);
    state.inventories.set(INV_B, invB);
    state.inventoryByMenuItemId.set(MENU_ITEM_A, invA);
    state.inventoryByMenuItemId.set(MENU_ITEM_B, invB);

    await InventoryService.deductStockForOrder(ORDER_ID);

    expect(state.stockMovements).toHaveLength(1);
    expect((state.stockMovements[0] as { quantity: number }).quantity).toBe(-2);
  });
});
