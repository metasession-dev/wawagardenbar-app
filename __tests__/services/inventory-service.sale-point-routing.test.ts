/**
 * @requirement REQ-066 — Sales deductions route to `defaultSalesLocation`
 *
 * AC8: For trackByLocation inventories, sales deductions must land on the
 * `defaultSalesLocation` location — the front-of-house bucket physically
 * served from (e.g. `chiller1` for drinks). When that location runs out,
 * the chokepoint catches the throw, writes an `inventory_deduction_failed`
 * IncidentEvent, and the kitchen workflow continues. Refills / restorations
 * keep landing on `locations[0]` (the storeroom) — operators move stock
 * forward to the sale point via the existing transfer UI.
 *
 * Legacy data with no `defaultSalesLocation` set falls back to "first non-empty
 * location wins" so the old per-bug bullet of "deduction silently absorbed
 * when locations[0] is empty" can never recur, even before the backfill runs.
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
  default: { findById: (...a: unknown[]) => mockOrderFindById(...a) },
}));
vi.mock('@/models/menu-item-model', () => ({
  default: { findById: (...a: unknown[]) => mockMenuItemFindById(...a) },
}));
vi.mock('@/models/inventory-model', () => ({
  default: {
    findOne: (...a: unknown[]) => mockInventoryFindOne(...a),
    findById: (...a: unknown[]) => mockInventoryFindById(...a),
  },
}));
vi.mock('@/models/stock-movement-model', () => ({
  default: { create: (...a: unknown[]) => mockStockMovementCreate(...a) },
}));
vi.mock('@/lib/email', () => ({ sendLowStockAlertEmail: vi.fn() }));
vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: { getBusinessDayCutoff: vi.fn().mockResolvedValue(0) },
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
    defaultSalesLocation: undefined,
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

describe('deductStockForOrder — defaultSalesLocation routing', () => {
  it('defaultSalesLocation set + sufficient stock there: deducts from that location', async () => {
    const inv = buildInventory({
      trackByLocation: true,
      currentStock: 11,
      locations: [
        { location: 'store', currentStock: 10 },
        { location: 'chiller1', currentStock: 1 },
      ],
      defaultSalesLocation: 'chiller1',
    });
    mockInventoryFindOne.mockResolvedValue(inv);

    await InventoryService.deductStockForOrder(ORDER_ID);

    const locs = inv.locations as LocationDoc[];
    expect(locs[0].currentStock).toBe(10); // store untouched
    expect(locs[1].currentStock).toBe(0); // chiller1 took the hit
    expect(locs[1].updatedByName).toBe('System');
    expect(inv.currentStock).toBe(10); // post-save hook sum
  });

  it('defaultSalesLocation set + insufficient stock there: throws (chokepoint catches)', async () => {
    const inv = buildInventory({
      trackByLocation: true,
      currentStock: 50,
      locations: [
        { location: 'store', currentStock: 50 }, // lots in back
        { location: 'chiller1', currentStock: 0 }, // empty at sale point
      ],
      defaultSalesLocation: 'chiller1',
    });
    mockInventoryFindOne.mockResolvedValue(inv);

    const result = await InventoryService.deductStockForOrder(ORDER_ID);

    expect(result.allSucceeded).toBe(false);
    expect(result.results[0].status).toBe('failed');
    expect(result.results[0].error).toMatch(/insufficient stock/i);

    const locs = inv.locations as LocationDoc[];
    // Store stays full — the manager must move stock forward, not the system.
    expect(locs[0].currentStock).toBe(50);
    expect(locs[1].currentStock).toBe(0);
    expect(inv.save).not.toHaveBeenCalled();
    expect(mockStockMovementCreate).not.toHaveBeenCalled();
  });

  it('defaultSalesLocation set but references a missing location code: falls back to first-non-empty', async () => {
    const inv = buildInventory({
      trackByLocation: true,
      currentStock: 11,
      locations: [
        { location: 'store', currentStock: 10 },
        { location: 'chiller1', currentStock: 1 },
      ],
      defaultSalesLocation: 'nonexistent-location-code', // data anomaly
    });
    mockInventoryFindOne.mockResolvedValue(inv);

    await InventoryService.deductStockForOrder(ORDER_ID);

    const locs = inv.locations as LocationDoc[];
    expect(locs[0].currentStock).toBe(9); // first non-empty
    expect(locs[1].currentStock).toBe(1);
    expect(inv.currentStock).toBe(10);
  });

  it('defaultSalesLocation unset (legacy) + locations[0] empty: fallback deducts from first non-empty location', async () => {
    // This is the Desperados shape that caused #277.
    const inv = buildInventory({
      trackByLocation: true,
      currentStock: 1,
      locations: [
        { location: 'store', currentStock: 0 },
        { location: 'chiller1', currentStock: 1 },
      ],
      defaultSalesLocation: undefined,
    });
    mockInventoryFindOne.mockResolvedValue(inv);

    await InventoryService.deductStockForOrder(ORDER_ID);

    const locs = inv.locations as LocationDoc[];
    expect(locs[0].currentStock).toBe(0); // empty store stays empty
    expect(locs[1].currentStock).toBe(0); // chiller1 drained
    expect(inv.currentStock).toBe(0);
  });

  it('defaultSalesLocation unset (legacy) + locations[0] has stock: fallback deducts from locations[0]', async () => {
    // The Gulder shape — works under both old and new code.
    const inv = buildInventory({
      trackByLocation: true,
      currentStock: 23,
      locations: [
        { location: 'store', currentStock: 13 },
        { location: 'chiller1', currentStock: 10 },
      ],
      defaultSalesLocation: undefined,
    });
    mockInventoryFindOne.mockResolvedValue(inv);

    await InventoryService.deductStockForOrder(ORDER_ID);

    const locs = inv.locations as LocationDoc[];
    expect(locs[0].currentStock).toBe(12);
    expect(locs[1].currentStock).toBe(10);
    expect(inv.currentStock).toBe(22);
  });

  it('total stock insufficient across all locations: throws (chokepoint catches)', async () => {
    mockOrderFindById.mockResolvedValueOnce({
      _id: ORDER_ID,
      items: [
        {
          menuItemId: MENU_ITEM_ID,
          quantity: 5, // need 5
          portionMultiplier: 1,
          portionSize: 'full',
          customizations: [],
        },
      ],
      inventoryDeducted: true,
      save: vi.fn(),
    });
    const inv = buildInventory({
      trackByLocation: true,
      currentStock: 3,
      locations: [
        { location: 'store', currentStock: 1 },
        { location: 'chiller1', currentStock: 2 }, // 3 total < 5 needed
      ],
      defaultSalesLocation: undefined,
    });
    mockInventoryFindOne.mockResolvedValue(inv);

    const result = await InventoryService.deductStockForOrder(ORDER_ID);

    expect(result.allSucceeded).toBe(false);
    expect(result.results[0].status).toBe('failed');
    expect(result.results[0].error).toMatch(/insufficient stock/i);
    expect(inv.save).not.toHaveBeenCalled();
  });

  it('refill / restoration always lands on locations[0] (storeroom), unaffected by defaultSalesLocation', async () => {
    const inv = buildInventory({
      trackByLocation: true,
      currentStock: 11,
      locations: [
        { location: 'store', currentStock: 10 },
        { location: 'chiller1', currentStock: 1 },
      ],
      defaultSalesLocation: 'chiller1', // sale-point is chiller1, but refill still hits store
    });
    mockInventoryFindOne.mockResolvedValue(inv);

    await InventoryService.restoreStockForOrder(ORDER_ID);

    const locs = inv.locations as LocationDoc[];
    expect(locs[0].currentStock).toBe(11); // store incremented (new stock arrives in back)
    expect(locs[1].currentStock).toBe(1); // chiller1 untouched
    expect(inv.currentStock).toBe(12);
  });

  it('non-location-tracked inventory: unchanged behavior (aggregate currentStock mutated)', async () => {
    const inv = buildInventory({
      trackByLocation: false,
      currentStock: 50,
      locations: [],
      defaultSalesLocation: undefined,
    });
    mockInventoryFindOne.mockResolvedValue(inv);

    await InventoryService.deductStockForOrder(ORDER_ID);

    expect(inv.currentStock).toBe(49);
  });
});
