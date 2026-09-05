/**
 * @requirement REQ-102 — generalise PriceHistoryService.updatePrice to
 * snapshot all three selling prices (default, show, happy-hour) plus cost
 * in one history row, per the existing single-row-per-change convention.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

const mockUpdateMany = vi.fn();
const mockCreate = vi.fn();

vi.mock('@/models/menu-item-price-history-model', () => ({
  default: {
    updateMany: (...a: unknown[]) => mockUpdateMany(...a),
    create: (...a: unknown[]) => mockCreate(...a),
  },
}));

const mockFindByIdAndUpdate = vi.fn();

vi.mock('@/models/menu-item-model', () => ({
  default: {
    findByIdAndUpdate: (...a: unknown[]) => mockFindByIdAndUpdate(...a),
  },
}));

const mockInventoryFindOneAndUpdate = vi.fn();

vi.mock('@/models/inventory-model', () => ({
  default: {
    findOneAndUpdate: (...a: unknown[]) => mockInventoryFindOneAndUpdate(...a),
  },
}));

import { PriceHistoryService } from '@/services/price-history-service';

const MENU_ITEM_ID = '65a1b2c3d4e5f6a7b8c9d0e1';
const USER_ID = '65a1b2c3d4e5f6a7b8c9d0e2';

beforeEach(() => {
  mockUpdateMany.mockReset().mockResolvedValue({});
  mockCreate.mockReset().mockResolvedValue({});
  mockFindByIdAndUpdate.mockReset().mockResolvedValue({});
  mockInventoryFindOneAndUpdate.mockReset().mockResolvedValue({});
});

describe('REQ-102 PriceHistoryService.updatePrice — full pricing snapshot', () => {
  it('creates one history row carrying all four price/cost fields', async () => {
    await PriceHistoryService.updatePrice(
      MENU_ITEM_ID,
      1200,
      400,
      'manual_adjustment',
      USER_ID,
      1000,
      800
    );

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const createArg = mockCreate.mock.calls[0][0];
    expect(createArg.price).toBe(1200);
    expect(createArg.costPerUnit).toBe(400);
    expect(createArg.showPrice).toBe(1000);
    expect(createArg.happyHourPrice).toBe(800);
    expect(createArg.effectiveTo).toBeNull();
  });

  it('closes the previous open history row before creating the new one', async () => {
    await PriceHistoryService.updatePrice(
      MENU_ITEM_ID,
      1200,
      400,
      'manual_adjustment',
      USER_ID,
      1000,
      800
    );

    expect(mockUpdateMany).toHaveBeenCalledTimes(1);
    const [filter, update] = mockUpdateMany.mock.calls[0];
    expect(filter.effectiveTo).toBeNull();
    expect(update.$set.effectiveTo).toBeInstanceOf(Date);
  });

  it('updates the MenuItem document with all four current values', async () => {
    await PriceHistoryService.updatePrice(
      MENU_ITEM_ID,
      1200,
      400,
      'manual_adjustment',
      USER_ID,
      1000,
      800
    );

    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(MENU_ITEM_ID, {
      price: 1200,
      showPrice: 1000,
      happyHourPrice: 800,
      costPerUnit: 400,
    });
  });

  it('still syncs inventory cost per unit (unchanged pre-existing behaviour)', async () => {
    await PriceHistoryService.updatePrice(
      MENU_ITEM_ID,
      1200,
      400,
      'manual_adjustment',
      USER_ID,
      1000,
      800
    );

    expect(mockInventoryFindOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({}),
      { costPerUnit: 400 }
    );
  });
});
