/**
 * Coverage for the per-OrderType revenue breakdown on the Daily Summary
 * report (and the date-range variant that mirrors it).
 *
 * Asserts:
 *  1. Four orders, one of each type → byOrderType has revenue + 1 count
 *     for each, and the bucket totals sum to the orders' raw total.
 *  2. Order missing orderType (defensive — shouldn't happen on prod) is
 *     treated as 'pay-now' so the row count still balances.
 *  3. Tab-partial subtraction in `paymentBreakdown` does NOT affect the
 *     byOrderType bucket — the type breakdown uses each order's full
 *     `total`, not the cash-flow-adjusted amount.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

const orderFindMock = vi.fn();
const tabFindMock = vi.fn();
const expenseFindMock = vi.fn();
const menuItemFindByIdMock = vi.fn();

vi.mock('@/models/order-model', () => ({
  default: {
    find: (...args: unknown[]) => ({
      lean: () => orderFindMock(...args),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('@/models/tab-model', () => ({
  default: {
    find: (...args: unknown[]) => ({
      lean: () => tabFindMock(...args),
    }),
  },
}));

vi.mock('@/models/expense-model', () => ({
  ExpenseModel: {
    find: (...args: unknown[]) => ({
      populate: () => ({
        lean: () => expenseFindMock(...args),
      }),
      lean: () => expenseFindMock(...args),
    }),
  },
}));

vi.mock('@/models/menu-item-model', () => ({
  default: {
    findById: (id: unknown) => ({
      lean: () => menuItemFindByIdMock(id),
    }),
  },
}));

// REQ-051 — generateDailySummary now awaits the business-day-cutoff setting.
// Stub to '15:00' (the production default) so existing tests behave as before.
vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getBusinessDayCutoff: vi.fn().mockResolvedValue('15:00'),
  },
}));

import { FinancialReportService } from '@/services/financial-report-service';

beforeEach(() => {
  orderFindMock.mockReset();
  tabFindMock.mockReset();
  expenseFindMock.mockReset();
  menuItemFindByIdMock.mockReset();
  expenseFindMock.mockResolvedValue([]);
  tabFindMock.mockResolvedValue([]);
  menuItemFindByIdMock.mockResolvedValue(null);
});

describe('financial-report — revenue.byOrderType', () => {
  it('buckets four orders (one of each type) into separate rows', async () => {
    orderFindMock.mockResolvedValue([
      {
        _id: 'o1',
        total: 1000,
        orderType: 'dine-in',
        paymentMethod: 'cash',
        items: [],
      },
      {
        _id: 'o2',
        total: 2000,
        orderType: 'delivery',
        paymentMethod: 'cash',
        items: [],
      },
      {
        _id: 'o3',
        total: 3000,
        orderType: 'pickup',
        paymentMethod: 'cash',
        items: [],
      },
      {
        _id: 'o4',
        total: 4000,
        orderType: 'pay-now',
        paymentMethod: 'cash',
        items: [],
      },
    ]);

    const report = await FinancialReportService.generateDailySummary(
      new Date('2026-05-23')
    );

    expect(report.revenue.byOrderType['dine-in']).toEqual({
      revenue: 1000,
      orderCount: 1,
    });
    expect(report.revenue.byOrderType['delivery']).toEqual({
      revenue: 2000,
      orderCount: 1,
    });
    expect(report.revenue.byOrderType['pickup']).toEqual({
      revenue: 3000,
      orderCount: 1,
    });
    expect(report.revenue.byOrderType['pay-now']).toEqual({
      revenue: 4000,
      orderCount: 1,
    });

    const bucketSum =
      report.revenue.byOrderType['dine-in'].revenue +
      report.revenue.byOrderType['delivery'].revenue +
      report.revenue.byOrderType['pickup'].revenue +
      report.revenue.byOrderType['pay-now'].revenue;
    expect(bucketSum).toBe(10000);
  });

  it('treats an order missing orderType as pay-now (defensive)', async () => {
    orderFindMock.mockResolvedValue([
      { _id: 'o1', total: 500, paymentMethod: 'cash', items: [] }, // no orderType
    ]);

    const report = await FinancialReportService.generateDailySummary(
      new Date('2026-05-23')
    );

    expect(report.revenue.byOrderType['pay-now']).toEqual({
      revenue: 500,
      orderCount: 1,
    });
    expect(report.revenue.byOrderType['dine-in']).toEqual({
      revenue: 0,
      orderCount: 0,
    });
  });

  it('byOrderType uses each order full total, NOT the tab-partial-adjusted amount', async () => {
    // Tab-partial payment of 600 means paymentBreakdown.cash will see
    // only the remaining 400, but the order's full 1000 should still
    // count toward the dine-in bucket (byOrderType is sales-by-type,
    // not cash-flow-by-channel).
    orderFindMock.mockResolvedValue([
      {
        _id: 'o1',
        total: 1000,
        orderType: 'dine-in',
        paymentMethod: 'cash',
        tabId: 'tab1',
        items: [],
      },
    ]);
    tabFindMock.mockResolvedValue([
      {
        _id: 'tab1',
        partialPayments: [
          { amount: 600, paymentType: 'cash', paidAt: new Date() },
        ],
      },
    ]);

    const report = await FinancialReportService.generateDailySummary(
      new Date('2026-05-23')
    );

    expect(report.revenue.byOrderType['dine-in'].revenue).toBe(1000);
    expect(report.revenue.byOrderType['dine-in'].orderCount).toBe(1);
  });
});
