/**
 * @requirement REQ-108 — `TabService.addOrderToTab` must reliably set
 *   `Order.tabId` on every attach, so `updateOrderStatusAction`'s auto-mark-
 *   cash exclusion guard (`!order.tabId`) can never fail open for a tab
 *   order because some caller forgot to set `tabId` at order-creation time.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

const TAB_ID = '65a1b2c3d4e5f6a7b8c9d0e1';
const ORDER_ID = '65a1b2c3d4e5f6a7b8c9d0a1';

const buildTab = (overrides: Record<string, unknown> = {}) => {
  const tab: Record<string, unknown> = {
    _id: TAB_ID,
    status: 'open',
    orders: [] as Types.ObjectId[],
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return tab;
};

const mockTabFindById = vi.fn();
const mockOrderUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });

vi.mock('@/models/tab-model', () => {
  // `addOrderToTab` calls `TabModel.findById(tabId)` directly (awaited as
  // a plain object — fine, since awaiting a non-thenable just resolves to
  // itself) and later `TabModel.findById(tabId).lean()`. Returning an
  // object with `.lean()` attached satisfies both call shapes.
  return {
    default: {
      findById: (...args: unknown[]) => {
        const tab = mockTabFindById(...args);
        if (!tab) return null;
        return { ...tab, lean: () => Promise.resolve(tab) };
      },
    },
  };
});

vi.mock('@/models/order-model', () => ({
  default: {
    updateOne: (...args: unknown[]) => mockOrderUpdateOne(...args),
  },
}));

vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {},
}));

import { TabService } from '@/services/tab-service';

beforeEach(() => {
  mockTabFindById.mockReset();
  mockOrderUpdateOne.mockReset();
  mockOrderUpdateOne.mockResolvedValue({ modifiedCount: 1 });
  vi.spyOn(TabService, 'recalculateTabTotals').mockResolvedValue(
    undefined as never
  );
});

describe('REQ-108: TabService.addOrderToTab sets Order.tabId', () => {
  it('sets Order.tabId to the tab id when attaching a new order', async () => {
    const tab = buildTab();
    mockTabFindById.mockReturnValue(tab);

    await TabService.addOrderToTab(TAB_ID, ORDER_ID);

    expect(mockOrderUpdateOne).toHaveBeenCalledTimes(1);
    const [filter, update] = mockOrderUpdateOne.mock.calls[0] as [
      { _id: Types.ObjectId },
      { $set: { tabId: unknown } },
    ];
    expect(filter._id.toString()).toBe(ORDER_ID);
    expect(update.$set.tabId).toBe(TAB_ID);
  });

  it('still sets Order.tabId even if the order is already present in tab.orders (idempotent)', async () => {
    const tab = buildTab({ orders: [new Types.ObjectId(ORDER_ID)] });
    mockTabFindById.mockReturnValue(tab);

    await TabService.addOrderToTab(TAB_ID, ORDER_ID);

    expect(mockOrderUpdateOne).toHaveBeenCalledTimes(1);
    const [, update] = mockOrderUpdateOne.mock.calls[0] as [
      unknown,
      { $set: { tabId: unknown } },
    ];
    expect(update.$set.tabId).toBe(TAB_ID);
  });

  it('throws and does not set tabId when the tab is not open', async () => {
    const tab = buildTab({ status: 'closed' });
    mockTabFindById.mockReturnValue(tab);

    await expect(TabService.addOrderToTab(TAB_ID, ORDER_ID)).rejects.toThrow(
      'Cannot add orders to a closed tab'
    );
    expect(mockOrderUpdateOne).not.toHaveBeenCalled();
  });

  it('throws and does not set tabId when the tab does not exist', async () => {
    mockTabFindById.mockReturnValue(null);

    await expect(TabService.addOrderToTab(TAB_ID, ORDER_ID)).rejects.toThrow(
      'Tab not found'
    );
    expect(mockOrderUpdateOne).not.toHaveBeenCalled();
  });
});
