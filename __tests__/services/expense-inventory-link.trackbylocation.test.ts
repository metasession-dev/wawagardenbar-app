/**
 * @requirement REQ-050 — Expense-restock stock-leak fix for trackByLocation
 *
 * Targeted coverage of the REQ-050 change: `applyExpenseInventoryLink` +
 * `reverseExpenseInventoryLink` now mutate the receiving location's
 * `currentStock` (not just the top-level) and rely on the pre-save hook
 * to keep `currentStock === sum(locations)` for `trackByLocation` items.
 * The invariant a subsequent `inventory.save()` does NOT clobber the
 * restock is the load-bearing assertion.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/models/inventory-model', () => ({
  default: {
    findById: vi.fn(),
  },
}));

vi.mock('@/models/stock-movement-model', () => ({
  default: {
    create: vi.fn(),
  },
}));

vi.mock('@/models/inventory-item-cost-history-model', () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
    deleteOne: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock('@/models', () => ({
  ExpenseModel: {
    updateOne: vi
      .fn()
      .mockResolvedValue({ acknowledged: true, modifiedCount: 1 }),
  },
}));

vi.mock('@/models/menu-item-model', () => ({
  default: { findById: vi.fn() },
}));

vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getUnitsOfMeasurement: vi
      .fn()
      .mockResolvedValue([
        { id: 'bottle', label: 'Bottles', category: 'count', isActive: true },
      ]),
  },
}));

import InventoryModel from '@/models/inventory-model';
import StockMovementModel from '@/models/stock-movement-model';
import InventoryItemCostHistory from '@/models/inventory-item-cost-history-model';
import {
  applyExpenseInventoryLink,
  reverseExpenseInventoryLink,
} from '@/services/expense-inventory-link-service';

const chainableFindOne = (result: unknown) => ({
  sort: vi.fn().mockResolvedValue(result),
});

interface MockLocation {
  location: string;
  locationName?: string;
  currentStock: number;
  lastUpdated?: Date;
  updatedBy?: Types.ObjectId;
  updatedByName?: string;
}

interface MockInventory {
  _id: Types.ObjectId;
  kind: string;
  unit: string;
  currentStock: number;
  totalRestocked: number;
  minimumStock: number;
  trackByLocation: boolean;
  locations: MockLocation[];
  defaultReceivingLocation?: string;
  save: ReturnType<typeof vi.fn>;
}

const buildTrackByLocationInventory = (
  overrides: Partial<MockInventory> = {}
): MockInventory => ({
  _id: new Types.ObjectId(),
  kind: 'menu-item',
  unit: 'bottle',
  currentStock: 0,
  totalRestocked: 0,
  minimumStock: 0,
  trackByLocation: true,
  locations: [
    { location: 'store', locationName: 'Main Store', currentStock: 0 },
    {
      location: 'chiller1',
      locationName: 'Bar Chiller and freezer',
      currentStock: 0,
    },
  ],
  defaultReceivingLocation: 'store',
  save: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const performedBy = new Types.ObjectId().toString();

beforeEach(() => {
  vi.clearAllMocks();
  (StockMovementModel.create as ReturnType<typeof vi.fn>).mockResolvedValue({
    _id: new Types.ObjectId(),
  });
  (
    InventoryItemCostHistory.findOne as ReturnType<typeof vi.fn>
  ).mockReturnValue(chainableFindOne(null));
  (
    InventoryItemCostHistory.create as ReturnType<typeof vi.fn>
  ).mockResolvedValue({ _id: new Types.ObjectId() });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('REQ-050: applyExpenseInventoryLink, trackByLocation', () => {
  it('routes restock to the defaultReceivingLocation, leaves other locations alone', async () => {
    const inv = buildTrackByLocationInventory();
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      inv
    );

    await applyExpenseInventoryLink({
      expenseId: new Types.ObjectId(),
      linkedInventoryId: inv._id,
      quantity: 48,
      amount: 4800,
      date: new Date(),
      performedBy,
    });

    expect(inv.save).toHaveBeenCalledTimes(1);
    expect(inv.locations[0]).toMatchObject({
      location: 'store',
      currentStock: 48,
    });
    expect(inv.locations[1].currentStock).toBe(0);
    expect(inv.totalRestocked).toBe(48);
  });

  it('falls back to locations[0] when defaultReceivingLocation is unset', async () => {
    const inv = buildTrackByLocationInventory({
      defaultReceivingLocation: undefined,
    });
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      inv
    );

    await applyExpenseInventoryLink({
      expenseId: new Types.ObjectId(),
      linkedInventoryId: inv._id,
      quantity: 10,
      amount: 1000,
      date: new Date(),
      performedBy,
    });

    expect(inv.locations[0].currentStock).toBe(10);
    expect(inv.locations[1].currentStock).toBe(0);
  });

  it('the invariant: a downstream save() would NOT clobber the restock (sum === top-level after save)', async () => {
    // We can't fire the real pre-save hook in a unit (mocked) test, but we
    // CAN assert the precondition the hook relies on: after the apply, the
    // receiving location's currentStock holds the new total such that
    // sum(locations) reflects the restock. The hook will then naturally
    // recompute currentStock = sum(locations) — preserving the value
    // instead of clobbering to whatever locations were before.
    const inv = buildTrackByLocationInventory({ currentStock: 5 });
    inv.locations[0].currentStock = 5;
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      inv
    );

    await applyExpenseInventoryLink({
      expenseId: new Types.ObjectId(),
      linkedInventoryId: inv._id,
      quantity: 48,
      amount: 4800,
      date: new Date(),
      performedBy,
    });

    const sumOfLocations = inv.locations.reduce(
      (s, l) => s + l.currentStock,
      0
    );
    expect(sumOfLocations).toBe(53); // 5 (existing) + 48 (restock) + 0 (other location)
    // The pre-save hook would set currentStock = 53 — matches the receiving
    // location's new value, restock is preserved.
  });
});

describe('REQ-050: reverseExpenseInventoryLink, trackByLocation', () => {
  it('decrements the receiving location, leaves others alone', async () => {
    const inv = buildTrackByLocationInventory({ currentStock: 48 });
    inv.locations[0].currentStock = 48;
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      inv
    );

    await reverseExpenseInventoryLink({
      expenseId: new Types.ObjectId(),
      linkedInventoryId: inv._id,
      quantity: 48,
      performedBy,
      reason: 'edit',
    });

    expect(inv.save).toHaveBeenCalledTimes(1);
    expect(inv.locations[0].currentStock).toBe(0);
    expect(inv.locations[1].currentStock).toBe(0);
    // The reversal compensating StockMovement is still recorded.
    expect(StockMovementModel.create).toHaveBeenCalledTimes(1);
  });

  it('AC7 — blocks reversal that would drive the RECEIVING location below 0 (location-aware)', async () => {
    // Top-level sum is plenty (50 + 30 = 80), but the receiving location
    // (`store`) has only 10. Reversing 40 must throw — the previous
    // top-level-only check would have passed and orphaned the StockMovement.
    const inv = buildTrackByLocationInventory();
    inv.currentStock = 80;
    inv.locations[0].currentStock = 10;
    inv.locations[1].currentStock = 70;
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      inv
    );

    await expect(
      reverseExpenseInventoryLink({
        expenseId: new Types.ObjectId(),
        linkedInventoryId: inv._id,
        quantity: 40,
        performedBy,
        reason: 'edit',
      })
    ).rejects.toThrow();

    // No writes should have happened.
    expect(StockMovementModel.create).not.toHaveBeenCalled();
    expect(inv.save).not.toHaveBeenCalled();
  });
});

describe('REQ-050: regression — non-trackByLocation items unchanged', () => {
  it('non-tracked restock still increments top-level currentStock + saves', async () => {
    const inv = {
      _id: new Types.ObjectId(),
      kind: 'kitchen-ingredient',
      unit: 'kg',
      currentStock: 5,
      totalRestocked: 0,
      minimumStock: 0,
      trackByLocation: false,
      locations: [],
      save: vi.fn().mockResolvedValue(undefined),
    };
    (InventoryModel.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      inv
    );

    await applyExpenseInventoryLink({
      expenseId: new Types.ObjectId(),
      linkedInventoryId: inv._id,
      quantity: 3,
      amount: 300,
      date: new Date(),
      performedBy,
    });

    expect(inv.currentStock).toBe(8);
    expect(inv.save).toHaveBeenCalled();
  });
});
