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
            { _id: 'wo1', total: 4000 },
            { _id: 'wo2', total: 8000 },
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

    expect(report.writtenOff).toEqual({ count: 2, totalAmount: 12000 });
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

    expect(report.writtenOff).toEqual({ count: 0, totalAmount: 0 });
  });

  it('generateDateRangeReport — sums written-off orders across the range', async () => {
    mockOrderFindByStatus.mockImplementation(
      (query: { paymentStatus?: string }) => {
        if (query.paymentStatus === 'written-off') {
          return Promise.resolve([{ _id: 'wo1', total: 12000 }]);
        }
        return Promise.resolve([]);
      }
    );

    const report = await FinancialReportService.generateDateRangeReport(
      new Date('2026-07-25T00:00:00Z'),
      new Date('2026-07-31T23:59:59Z')
    );

    expect(report.writtenOff).toEqual({ count: 1, totalAmount: 12000 });
  });
});
