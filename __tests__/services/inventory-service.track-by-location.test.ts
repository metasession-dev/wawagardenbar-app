/**
 * Coverage for the trackByLocation routing in deductStockForOrder and
 * restoreStockForOrder.
 *
 * Before the fix, direct assignments to `inventory.currentStock` were
 * silently overwritten by the Inventory pre-save hook for any row with
 * trackByLocation=true — so sales and restocks left location-tracked
 * stock frozen. The service now mutates `locations[0]` so the hook's
 * recompute (currentStock = sum(locations[].currentStock)) reflects the
 * change.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

const ORDER_ID = '65a1b2c3d4e5f6a7b8c9d0e1';
const MENU_ITEM_ID = '65a1b2c3d4e5f6a7b8c9d0e2';
const INVENTORY_ID = '65a1b2c3d4e5f6a7b8c9d0e3';

const mockOrderFindById = vi.fn();
const mockMenuItemFindById = vi.fn();
const mockInventoryFindOne = vi.fn();
const mockInventoryFindById = vi.fn();
const mockStockMovementCreate = vi.fn().mockResolvedValue({ _id: 'sm-id' });

vi.mock('@/models/order-model', () => ({
  default: {
    findById: (...args: unknown[]) => mockOrderFindById(...args),
  },
}));

vi.mock('@/models/menu-item-model', () => ({
  default: {
    findById: (...args: unknown[]) => mockMenuItemFindById(...args),
  },
}));

vi.mock('@/models/inventory-model', () => ({
  default: {
    findOne: (...args: unknown[]) => mockInventoryFindOne(...args),
    findById: (...args: unknown[]) => mockInventoryFindById(...args),
  },
}));

vi.mock('@/models/stock-movement-model', () => ({
  default: {
    create: (...args: unknown[]) => mockStockMovementCreate(...args),
  },
}));

vi.mock('@/lib/email', () => ({
  sendLowStockAlertEmail: vi.fn(),
}));

vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getBusinessDayCutoff: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('@/lib/customization-inventory', () => ({
  resolveLinkedInventoryFor: vi.fn().mockReturnValue([]),
}));

import InventoryService from '@/services/inventory-service';

type LocationDoc = {
  location: string;
  locationName?: string;
  currentStock: number;
  lastUpdated?: Date;
  updatedBy?: mongoose.Types.ObjectId;
  updatedByName?: string;
};

const buildInventory = (overrides: Record<string, unknown>) => {
  const inv: Record<string, unknown> = {
    _id: INVENTORY_ID,
    menuItemId: MENU_ITEM_ID,
    currentStock: 100,
    minimumStock: 10,
    totalSales: 0,
    totalRestocked: 0,
    lastSaleDate: null,
    status: 'in-stock',
    trackByLocation: false,
    locations: [] as LocationDoc[],
    save: vi.fn().mockImplementation(async function (this: typeof inv) {
      // Mirror the pre-save hook: when trackByLocation, recompute
      // currentStock from locations[].currentStock.
      if (
        this.trackByLocation &&
        (this.locations as LocationDoc[]).length > 0
      ) {
        this.currentStock = (this.locations as LocationDoc[]).reduce(
          (sum, loc) => sum + loc.currentStock,
          0
        );
      }
      // And status reflects the (post-recompute) currentStock.
      const c = this.currentStock as number;
      const min = this.minimumStock as number;
      this.status =
        c <= 0 ? 'out-of-stock' : c <= min ? 'low-stock' : 'in-stock';
    }),
    ...overrides,
  };
  return inv;
};

beforeEach(() => {
  mockOrderFindById.mockReset();
  mockMenuItemFindById.mockReset();
  mockInventoryFindOne.mockReset();
  mockInventoryFindById.mockReset();
  mockStockMovementCreate.mockReset();
  mockStockMovementCreate.mockResolvedValue({ _id: 'sm-id' });

  mockOrderFindById.mockResolvedValue({
    _id: ORDER_ID,
    items: [
      {
        menuItemId: MENU_ITEM_ID,
        quantity: 1,
        portionMultiplier: 1,
        portionSize: 'full',
        customizations: [],
      },
    ],
    inventoryDeducted: true,
    save: vi.fn().mockResolvedValue(undefined),
  });
  mockMenuItemFindById.mockResolvedValue({
    _id: MENU_ITEM_ID,
    trackInventory: true,
  });
});

describe('deductStockForOrder — trackByLocation routing', () => {
  it('trackByLocation=false: decrements currentStock directly', async () => {
    const inv = buildInventory({ trackByLocation: false, currentStock: 50 });
    mockInventoryFindOne.mockResolvedValue(inv);

    await InventoryService.deductStockForOrder(ORDER_ID);

    expect(inv.currentStock).toBe(49);
    expect((inv.locations as LocationDoc[]).length).toBe(0);
    expect(inv.save).toHaveBeenCalledOnce();
  });

  it('trackByLocation=true: decrements locations[0], pre-save hook recomputes currentStock', async () => {
    const inv = buildInventory({
      trackByLocation: true,
      currentStock: 198,
      locations: [
        { location: 'store', currentStock: 96 },
        { location: 'chiller1', currentStock: 102 },
      ],
    });
    mockInventoryFindOne.mockResolvedValue(inv);

    await InventoryService.deductStockForOrder(ORDER_ID);

    const locs = inv.locations as LocationDoc[];
    expect(locs[0].currentStock).toBe(95);
    expect(locs[1].currentStock).toBe(102);
    expect(locs[0].updatedByName).toBe('System');
    expect(locs[0].lastUpdated).toBeInstanceOf(Date);
    // The simulated pre-save hook sums locations back into currentStock.
    expect(inv.currentStock).toBe(197);
  });

  it('trackByLocation=true but locations empty: falls back to currentStock', async () => {
    const inv = buildInventory({
      trackByLocation: true,
      currentStock: 10,
      locations: [],
    });
    mockInventoryFindOne.mockResolvedValue(inv);

    await InventoryService.deductStockForOrder(ORDER_ID);

    expect(inv.currentStock).toBe(9);
  });

  it('trackByLocation=true + locations[0] empty: deduction falls through to first non-empty location', async () => {
    // REQ-066 AC8: this is the Desperados-shape regression from #277. The
    // previous behavior clamped at zero on locations[0] and silently
    // absorbed the deduction. Now the deduction walks the array and lands
    // on the first non-empty bucket.
    const inv = buildInventory({
      trackByLocation: true,
      currentStock: 1,
      locations: [
        { location: 'store', currentStock: 0 },
        { location: 'chiller1', currentStock: 1 },
      ],
    });
    mockInventoryFindOne.mockResolvedValue(inv);

    await InventoryService.deductStockForOrder(ORDER_ID);

    const locs = inv.locations as LocationDoc[];
    expect(locs[0].currentStock).toBe(0); // store stays empty
    expect(locs[1].currentStock).toBe(0); // chiller1 took the hit
    expect(inv.currentStock).toBe(0); // aggregate post-save sum reflects the deduction
  });
});

describe('restoreStockForOrder — trackByLocation routing', () => {
  it('trackByLocation=false: increments currentStock directly', async () => {
    const inv = buildInventory({ trackByLocation: false, currentStock: 50 });
    mockInventoryFindOne.mockResolvedValue(inv);

    await InventoryService.restoreStockForOrder(ORDER_ID);

    expect(inv.currentStock).toBe(51);
  });

  it('trackByLocation=true: increments locations[0], pre-save hook recomputes currentStock', async () => {
    const inv = buildInventory({
      trackByLocation: true,
      currentStock: 198,
      locations: [
        { location: 'store', currentStock: 96 },
        { location: 'chiller1', currentStock: 102 },
      ],
    });
    mockInventoryFindOne.mockResolvedValue(inv);

    await InventoryService.restoreStockForOrder(ORDER_ID);

    const locs = inv.locations as LocationDoc[];
    expect(locs[0].currentStock).toBe(97);
    expect(locs[1].currentStock).toBe(102);
    expect(locs[0].updatedByName).toBe('System');
    expect(inv.currentStock).toBe(199);
  });

  it('trackByLocation=true but locations empty: falls back to currentStock', async () => {
    const inv = buildInventory({
      trackByLocation: true,
      currentStock: 10,
      locations: [],
    });
    mockInventoryFindOne.mockResolvedValue(inv);

    await InventoryService.restoreStockForOrder(ORDER_ID);

    expect(inv.currentStock).toBe(11);
  });
});
