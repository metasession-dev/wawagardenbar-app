/**
 * @requirement REQ-037 — AC4 (archived-filter regression)
 *
 * `InventoryService.listByKind` is the single source of truth for the
 * "show kitchen ingredients" query. The Inventory dashboard's Kitchen
 * tab, the Recipe builder's ingredient dropdown, and any other surface
 * that funnels through this method must NOT return soft-archived rows.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/models/inventory-model', () => ({
  default: {
    find: vi.fn(),
  },
}));

import InventoryModel from '@/models/inventory-model';
import InventoryService from '@/services/inventory-service';

function chainableFind(result: unknown) {
  return {
    populate: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(result),
      }),
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('REQ-037 AC4 — InventoryService.listByKind excludes archived', () => {
  it('passes `archivedAt: { $exists: false }` in the filter for kitchen-ingredient queries', async () => {
    (InventoryModel.find as ReturnType<typeof vi.fn>).mockReturnValue(
      chainableFind([])
    );

    await InventoryService.listByKind('kitchen-ingredient');

    expect(InventoryModel.find).toHaveBeenCalledWith({
      kind: 'kitchen-ingredient',
      archivedAt: { $exists: false },
    });
  });

  it('passes the same filter for menu-item queries (so future archived-sellable work is consistent)', async () => {
    (InventoryModel.find as ReturnType<typeof vi.fn>).mockReturnValue(
      chainableFind([])
    );

    await InventoryService.listByKind('menu-item');

    expect(InventoryModel.find).toHaveBeenCalledWith({
      kind: 'menu-item',
      archivedAt: { $exists: false },
    });
  });
});

describe('REQ-037 AC7 — InventoryService.listArchivedByKind', () => {
  it('passes `archivedAt: { $exists: true }` for kitchen-ingredient queries', async () => {
    (InventoryModel.find as ReturnType<typeof vi.fn>).mockReturnValue(
      chainableFind([])
    );

    await InventoryService.listArchivedByKind('kitchen-ingredient');

    expect(InventoryModel.find).toHaveBeenCalledWith({
      kind: 'kitchen-ingredient',
      archivedAt: { $exists: true },
    });
  });
});
