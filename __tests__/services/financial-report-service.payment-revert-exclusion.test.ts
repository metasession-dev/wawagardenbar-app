/**
 * @requirement REQ-096 — AC4/AC6: confirms that flipping an order's
 * `paymentStatus` to `'refunded'` (via `deleteOrder`'s or `deleteTab`'s
 * payment-revert choice) is sufficient, on its own, to exclude that
 * order from `financial-report-service.ts`'s revenue output — with
 * zero changes needed to the report query itself (plan §2).
 *
 * The mock simulates Mongo's own filtering behaviour: it only returns
 * candidates whose `paymentStatus` matches the query's `paymentStatus`
 * filter, so a refunded order among the candidates proves it would
 * never reach the report.
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

const CANDIDATES = [
  {
    _id: 'still-paid',
    total: 1000,
    orderType: 'pay-now',
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    items: [],
  },
  {
    _id: 'reverted-via-delete',
    total: 5000,
    orderType: 'pay-now',
    paymentMethod: 'cash',
    paymentStatus: 'refunded',
    items: [],
  },
];

vi.mock('@/models/order-model', () => ({
  default: {
    find: (query: Record<string, unknown>) => ({
      lean: () =>
        Promise.resolve(
          CANDIDATES.filter((c) => c.paymentStatus === query.paymentStatus)
        ),
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
  orderFindMock.mockReset();
  tabFindMock.mockReset();
  expenseFindMock.mockReset();
  menuItemFindByIdMock.mockReset();
  expenseFindMock.mockResolvedValue([]);
  tabFindMock.mockResolvedValue([]);
  menuItemFindByIdMock.mockResolvedValue(null);
});

describe('REQ-096: payment-revert exclusion from financial reports', () => {
  it('excludes a reverted (refunded) order from Daily Summary revenue with no query changes', async () => {
    const report = await FinancialReportService.generateDailySummary(
      new Date('2026-05-23')
    );

    // Only the still-paid ₦1000 order counts; the ₦5000 reverted order
    // is structurally excluded by the pre-existing paymentStatus:'paid'
    // filter — this test would fail if a code change ever widened it.
    expect(report.revenue.totalRevenue).toBe(1000);
    expect(report.revenue.byOrderType['pay-now'].revenue).toBe(1000);
    expect(report.revenue.byOrderType['pay-now'].orderCount).toBe(1);
  });
});
