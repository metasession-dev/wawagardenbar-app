/**
 * @requirement REQ-098 AC6 — "Written off (bad debt)" report section.
 *
 * Written-off orders are already excluded from `totalRevenue`/`orderCount`
 * with no query change (existing queries filter strictly on
 * `paymentStatus: 'paid'`); this covers the new explicit section that
 * makes that exclusion visible and explained.
 *
 * Uses a query-aware `OrderModel.find` mock (unlike the simpler shared
 * mock in `financial-report-service.tip.test.ts`) so the `paid` query and
 * the `written-off` query can return genuinely different fixtures.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

const mockOrderFindByStatus = vi.fn();
const tabFindMock = vi.fn().mockResolvedValue([]);
const expenseFindMock = vi.fn().mockResolvedValue([]);
const menuItemFindByIdMock = vi.fn().mockResolvedValue(null);

vi.mock('@/models/order-model', () => ({
  default: {
    find: (query: { paymentStatus?: string }) => ({
      lean: () => mockOrderFindByStatus(query),
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
      populate: () => ({ lean: () => expenseFindMock(...args) }),
      lean: () => expenseFindMock(...args),
    }),
  },
}));

vi.mock('@/models/menu-item-model', () => ({
  default: {
    findById: (id: unknown) => ({ lean: () => menuItemFindByIdMock(id) }),
  },
}));

vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getBusinessDayCutoff: vi.fn().mockResolvedValue('15:00'),
  },
}));

import { FinancialReportService } from '@/services/financial-report-service';

beforeEach(() => {
  mockOrderFindByStatus.mockReset();
  tabFindMock.mockReset();
  tabFindMock.mockResolvedValue([]);
  expenseFindMock.mockReset();
  expenseFindMock.mockResolvedValue([]);
  menuItemFindByIdMock.mockReset();
  menuItemFindByIdMock.mockResolvedValue(null);
});

describe('REQ-098 AC6: financial-report-service writtenOff section', () => {
  it('generateDailySummary — sums count/totalAmount from written-off orders, excluded from revenue', async () => {
    mockOrderFindByStatus.mockImplementation(
      (query: { paymentStatus?: string }) => {
        if (query.paymentStatus === 'written-off') {
          return Promise.resolve([
            { _id: 'wo1', total: 4000, items: [] },
            { _id: 'wo2', total: 8000, items: [] },
          ]);
        }
        return Promise.resolve([
          {
            _id: 'paid1',
            total: 5000,
            tipAmount: 0,
            paymentMethod: 'cash',
            items: [],
          },
        ]);
      }
    );

    const report = await FinancialReportService.generateDailySummary(
      new Date('2026-07-31T12:00:00Z')
    );

    expect(report.writtenOff).toEqual({
      count: 2,
      totalAmount: 12000,
      totalCost: 0,
    });
    // Revenue is unaffected — driven entirely by the 'paid' query, which
    // never includes the written-off rows.
    expect(report.revenue.totalRevenue).toBe(5000);
    expect(report.metrics.orderCount).toBe(1);
  });

  it('generateDailySummary — reports a zero state, not an omitted section, when nothing was written off', async () => {
    mockOrderFindByStatus.mockImplementation(
      (query: { paymentStatus?: string }) => {
        if (query.paymentStatus === 'written-off') return Promise.resolve([]);
        return Promise.resolve([]);
      }
    );

    const report = await FinancialReportService.generateDailySummary(
      new Date('2026-07-31T12:00:00Z')
    );

    expect(report.writtenOff).toEqual({
      count: 0,
      totalAmount: 0,
      totalCost: 0,
    });
  });

  it('generateDateRangeReport — sums written-off orders across the range', async () => {
    mockOrderFindByStatus.mockImplementation(
      (query: { paymentStatus?: string }) => {
        if (query.paymentStatus === 'written-off') {
          return Promise.resolve([{ _id: 'wo1', total: 12000, items: [] }]);
        }
        return Promise.resolve([]);
      }
    );

    const report = await FinancialReportService.generateDateRangeReport(
      new Date('2026-07-25T00:00:00Z'),
      new Date('2026-07-31T23:59:59Z')
    );

    expect(report.writtenOff).toEqual({
      count: 1,
      totalAmount: 12000,
      totalCost: 0,
    });
  });

  // wgb#644 — written-off orders' ingredient cost was already deducted from
  // inventory at kitchen fulfillment; it must be summed and surfaced, using
  // the same costPerUnit-snapshot-or-menuItem-fallback basis paid orders use.
  it('generateDailySummary — sums written-off order items using their own costPerUnit snapshot', async () => {
    mockOrderFindByStatus.mockImplementation(
      (query: { paymentStatus?: string }) => {
        if (query.paymentStatus === 'written-off') {
          return Promise.resolve([
            {
              _id: 'wo1',
              total: 4000,
              items: [
                { menuItemId: 'item-1', quantity: 2, costPerUnit: 300 },
                { menuItemId: 'item-2', quantity: 1, costPerUnit: 150 },
              ],
            },
          ]);
        }
        return Promise.resolve([]);
      }
    );

    const report = await FinancialReportService.generateDailySummary(
      new Date('2026-07-31T12:00:00Z')
    );

    // (2 * 300) + (1 * 150) = 750
    expect(report.writtenOff.totalCost).toBe(750);
    expect(menuItemFindByIdMock).not.toHaveBeenCalled();
  });

  it('generateDailySummary — falls back to the current menu item cost when an order item has no costPerUnit snapshot', async () => {
    mockOrderFindByStatus.mockImplementation(
      (query: { paymentStatus?: string }) => {
        if (query.paymentStatus === 'written-off') {
          return Promise.resolve([
            {
              _id: 'wo1',
              total: 4000,
              items: [{ menuItemId: 'item-legacy', quantity: 3 }],
            },
          ]);
        }
        return Promise.resolve([]);
      }
    );
    menuItemFindByIdMock.mockResolvedValue({ costPerUnit: 200 });

    const report = await FinancialReportService.generateDailySummary(
      new Date('2026-07-31T12:00:00Z')
    );

    expect(report.writtenOff.totalCost).toBe(600); // 3 * 200
    expect(menuItemFindByIdMock).toHaveBeenCalledWith('item-legacy');
  });

  it('generateDailySummary — nets written-off COGS against netProfit', async () => {
    mockOrderFindByStatus.mockImplementation(
      (query: { paymentStatus?: string }) => {
        if (query.paymentStatus === 'written-off') {
          return Promise.resolve([
            {
              _id: 'wo1',
              total: 4000,
              items: [{ menuItemId: 'item-1', quantity: 1, costPerUnit: 500 }],
            },
          ]);
        }
        return Promise.resolve([]);
      }
    );

    const report = await FinancialReportService.generateDailySummary(
      new Date('2026-07-31T12:00:00Z')
    );

    expect(report.writtenOff.totalCost).toBe(500);
    // grossProfit.total is 0 (no paid orders) and operatingExpenses are 0,
    // so netProfit should be entirely the written-off cost, negated.
    expect(report.netProfit).toBe(-500);
  });
});
