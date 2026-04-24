/**
 * @requirement REQ-030 - Multi-component inventory deduction via customization option links
 *
 * Unit tests for InventoryService.deductStockForOrder and restoreStockForOrder — the
 * linked-customization-option deduction and restore paths. Mocks all Mongoose models;
 * no database required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

const MENU_ITEM_POUNDO = '65b1b2c3d4e5f6a7b8c9d010';
const INV_POUNDO = '65b1b2c3d4e5f6a7b8c9d020';
const INV_OGBONO = '65b1b2c3d4e5f6a7b8c9d021';
const INV_EGUSI = '65b1b2c3d4e5f6a7b8c9d022';

type InventoryDoc = {
  _id: string;
  menuItemId?: string;
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  unit: string;
  costPerUnit: number;
  status: string;
  totalSales: number;
  lastSaleDate?: Date;
  preventOrdersWhenOutOfStock?: boolean;
  save: () => Promise<void>;
};

type OrderDoc = {
  _id: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
    portionSize?: 'full' | 'half' | 'quarter';
    portionMultiplier?: number;
    customizations?: Array<{ name: string; option: string; price: number }>;
  }>;
  inventoryDeducted?: boolean;
  inventoryDeductedAt?: Date;
  inventoryDeductedBy?: string;
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
      inventoryId?: string;
      inventoryDeduction?: number;
    }>;
  }>;
};

// Per-test in-memory state
const state: {
  order: OrderDoc | null;
  menuItem: MenuItemDoc | null;
  inventories: Map<string, InventoryDoc>;
  inventoryByMenuItemId: Map<string, InventoryDoc>;
  stockMovements: unknown[];
} = {
  order: null,
  menuItem: null,
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
    findById: vi.fn((id: string) =>
      state.menuItem && state.menuItem._id === id ? state.menuItem : null
    ),
  },
}));

vi.mock('@/models/inventory-model', () => ({
  default: {
    findById: vi.fn((id: string) => state.inventories.get(id) ?? null),
    findOne: vi.fn(async (query: Record<string, unknown>) => {
      // Base-path lookup uses { menuItemId }
      const menuItemId = query?.menuItemId;
      if (typeof menuItemId === 'string') {
        return state.inventoryByMenuItemId.get(menuItemId) ?? null;
      }
      // Object with toString() (ObjectId-style)
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

// Import AFTER mocks so the module picks them up
import InventoryService from '@/services/inventory-service';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeInventory(
  overrides: Partial<InventoryDoc> & { _id: string }
): InventoryDoc {
  const saved: InventoryDoc = {
    currentStock: 100,
    minimumStock: 10,
    maximumStock: 500,
    unit: 'units',
    costPerUnit: 0,
    status: 'in-stock',
    totalSales: 0,
    save: vi.fn(async () => {}),
    ...overrides,
  };
  return saved;
}

beforeEach(() => {
  state.order = null;
  state.menuItem = null;
  state.inventories = new Map();
  state.inventoryByMenuItemId = new Map();
  state.stockMovements = [];
  vi.clearAllMocks();
});

function seedPoundoWithOgbonoOrder(opts?: {
  quantity?: number;
  portionMultiplier?: number;
  portionSize?: 'full' | 'half' | 'quarter';
  optionInventoryDeduction?: number;
  baseTrackInventory?: boolean;
  customizations?: Array<{ name: string; option: string; price: number }>;
}) {
  const quantity = opts?.quantity ?? 1;
  const portionMultiplier = opts?.portionMultiplier ?? 1;
  const portionSize = opts?.portionSize ?? 'full';
  const optionInventoryDeduction = opts?.optionInventoryDeduction;
  const baseTrackInventory = opts?.baseTrackInventory ?? true;
  const customizations = opts?.customizations ?? [
    { name: 'Soup', option: 'Ogbono', price: 0 },
  ];

  state.menuItem = {
    _id: MENU_ITEM_POUNDO,
    trackInventory: baseTrackInventory,
    customizations: [
      {
        name: 'Soup',
        required: true,
        options: [
          {
            name: 'Ogbono',
            price: 0,
            available: true,
            inventoryId: INV_OGBONO,
            ...(optionInventoryDeduction !== undefined
              ? { inventoryDeduction: optionInventoryDeduction }
              : {}),
          },
          { name: 'Egusi', price: 0, available: true, inventoryId: INV_EGUSI },
          { name: 'None', price: 0, available: true }, // no link
        ],
      },
    ],
  };

  const poundoInv = makeInventory({
    _id: INV_POUNDO,
    menuItemId: MENU_ITEM_POUNDO,
    currentStock: 50,
  });
  const ogbonoInv = makeInventory({ _id: INV_OGBONO, currentStock: 30 });
  const egusiInv = makeInventory({ _id: INV_EGUSI, currentStock: 20 });

  state.inventories.set(INV_POUNDO, poundoInv);
  state.inventories.set(INV_OGBONO, ogbonoInv);
  state.inventories.set(INV_EGUSI, egusiInv);
  state.inventoryByMenuItemId.set(MENU_ITEM_POUNDO, poundoInv);

  state.order = {
    _id: 'order-1',
    inventoryDeducted: false,
    items: [
      {
        menuItemId: MENU_ITEM_POUNDO,
        quantity,
        portionSize,
        portionMultiplier,
        customizations,
      },
    ],
    save: vi.fn(async () => {}),
  };

  return { poundoInv, ogbonoInv, egusiInv };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('REQ-030: deductStockForOrder — linked customization options', () => {
  it('deducts base Poundo stock AND Ogbono stock for a Poundo-with-Ogbono order', async () => {
    const { poundoInv, ogbonoInv } = seedPoundoWithOgbonoOrder();

    await InventoryService.deductStockForOrder('order-1');

    expect(poundoInv.currentStock).toBe(49); // 50 - 1
    expect(ogbonoInv.currentStock).toBe(29); // 30 - 1
  });

  it('records one stock-movement row for base, one for each linked inventory', async () => {
    seedPoundoWithOgbonoOrder();

    await InventoryService.deductStockForOrder('order-1');

    expect(state.stockMovements).toHaveLength(2);

    const movements = state.stockMovements as Array<{
      inventoryId: string;
      quantity: number;
      type: string;
      category: string;
      reason: string;
      orderId?: unknown;
    }>;

    const byInventory = new Map(
      movements.map((m) => [String(m.inventoryId), m])
    );
    expect(byInventory.get(INV_POUNDO)).toBeDefined();
    expect(byInventory.get(INV_OGBONO)).toBeDefined();
  });

  it('scales linked deduction by item.quantity', async () => {
    const { poundoInv, ogbonoInv } = seedPoundoWithOgbonoOrder({ quantity: 3 });

    await InventoryService.deductStockForOrder('order-1');

    expect(poundoInv.currentStock).toBe(47); // 50 - 3
    expect(ogbonoInv.currentStock).toBe(27); // 30 - 3
  });

  it('scales linked deduction by item.portionMultiplier (half portion)', async () => {
    const { poundoInv, ogbonoInv } = seedPoundoWithOgbonoOrder({
      quantity: 1,
      portionMultiplier: 0.5,
      portionSize: 'half',
    });

    await InventoryService.deductStockForOrder('order-1');

    expect(poundoInv.currentStock).toBe(49.5); // 50 - 0.5
    expect(ogbonoInv.currentStock).toBe(29.5); // 30 - 0.5
  });

  it('applies inventoryDeduction multiplier (option says deduct 2)', async () => {
    const { poundoInv, ogbonoInv } = seedPoundoWithOgbonoOrder({
      quantity: 1,
      optionInventoryDeduction: 2,
    });

    await InventoryService.deductStockForOrder('order-1');

    expect(poundoInv.currentStock).toBe(49); // base unchanged by option multiplier: 50 - 1
    expect(ogbonoInv.currentStock).toBe(28); // 30 - (1 * 1 * 2)
  });

  it('is a no-op on linked stock when order item has no customizations', async () => {
    const { poundoInv, ogbonoInv } = seedPoundoWithOgbonoOrder({
      customizations: [],
    });

    await InventoryService.deductStockForOrder('order-1');

    expect(poundoInv.currentStock).toBe(49);
    expect(ogbonoInv.currentStock).toBe(30); // untouched
    expect(state.stockMovements).toHaveLength(1); // only base
  });

  it('is a no-op on linked stock when selected option has no inventoryId', async () => {
    const { poundoInv, ogbonoInv } = seedPoundoWithOgbonoOrder({
      customizations: [{ name: 'Soup', option: 'None', price: 0 }],
    });

    await InventoryService.deductStockForOrder('order-1');

    expect(poundoInv.currentStock).toBe(49);
    expect(ogbonoInv.currentStock).toBe(30);
    expect(state.stockMovements).toHaveLength(1);
  });

  it('silently skips linked deduction when the inventory record was deleted', async () => {
    const { poundoInv } = seedPoundoWithOgbonoOrder();
    // Simulate: the linked inventory record was deleted after the menu item was saved
    state.inventories.delete(INV_OGBONO);

    await expect(
      InventoryService.deductStockForOrder('order-1')
    ).resolves.toBeUndefined();

    expect(poundoInv.currentStock).toBe(49); // base still deducts
    expect(state.stockMovements).toHaveLength(1); // only base
  });

  it('still deducts linked stock when base menuItem.trackInventory is false', async () => {
    const { poundoInv, ogbonoInv } = seedPoundoWithOgbonoOrder({
      baseTrackInventory: false,
    });

    await InventoryService.deductStockForOrder('order-1');

    expect(poundoInv.currentStock).toBe(50); // base untouched — trackInventory false
    expect(ogbonoInv.currentStock).toBe(29); // linked still deducts
  });

  it('records stock-movement with category=sale and a recognisable linked reason', async () => {
    seedPoundoWithOgbonoOrder();

    await InventoryService.deductStockForOrder('order-1');

    const linked = (
      state.stockMovements as Array<{
        inventoryId: string;
        category: string;
        reason: string;
        type: string;
      }>
    ).find((m) => String(m.inventoryId) === INV_OGBONO);

    expect(linked).toBeDefined();
    expect(linked!.category).toBe('sale');
    expect(linked!.type).toBe('deduction');
    expect(linked!.reason).toMatch(/customization|linked/i);
  });
});

describe('REQ-030: restoreStockForOrder — linked customization options', () => {
  it('restores base AND linked stock for a cancelled Poundo-with-Ogbono order', async () => {
    const { poundoInv, ogbonoInv } = seedPoundoWithOgbonoOrder();
    // Order was previously deducted
    state.order!.inventoryDeducted = true;
    poundoInv.currentStock = 49;
    ogbonoInv.currentStock = 29;

    await InventoryService.restoreStockForOrder('order-1');

    expect(poundoInv.currentStock).toBe(50);
    expect(ogbonoInv.currentStock).toBe(30);
  });

  it('records addition-type stock movements for each linked inventory', async () => {
    seedPoundoWithOgbonoOrder();
    state.order!.inventoryDeducted = true;

    await InventoryService.restoreStockForOrder('order-1');

    const additions = (
      state.stockMovements as Array<{
        type: string;
        inventoryId: string;
      }>
    ).filter((m) => m.type === 'addition');

    const inventoryIds = additions.map((m) => String(m.inventoryId)).sort();
    expect(inventoryIds).toContain(INV_POUNDO);
    expect(inventoryIds).toContain(INV_OGBONO);
  });

  it('is a no-op when order was never inventory-deducted', async () => {
    const { poundoInv, ogbonoInv } = seedPoundoWithOgbonoOrder();
    state.order!.inventoryDeducted = false;

    await InventoryService.restoreStockForOrder('order-1');

    expect(poundoInv.currentStock).toBe(50);
    expect(ogbonoInv.currentStock).toBe(30);
    expect(state.stockMovements).toHaveLength(0);
  });
});
