/**
 * @requirement REQ-035 — Daily-report tipsBreakdown aggregation
 *
 * Asserts:
 *  1. Order tips (express pay-now) sum into tipsBreakdown by tipPaymentMethod.
 *  2. Legacy orders without tipPaymentMethod fall back to paymentMethod.
 *  3. Tab partial-payment tips sum into tipsBreakdown by paymentType.
 *  4. AC6 regression — paymentBreakdown.total is unchanged when tips are
 *     present (revenue figures stay revenue-only; tipsBreakdown is parallel).
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

import { FinancialReportService } from '@/services/financial-report-service';

beforeEach(() => {
  orderFindMock.mockReset();
  tabFindMock.mockReset();
  expenseFindMock.mockReset();
  menuItemFindByIdMock.mockReset();
  // Default: no expenses, no tabs.
  expenseFindMock.mockResolvedValue([]);
  tabFindMock.mockResolvedValue([]);
  menuItemFindByIdMock.mockResolvedValue(null);
});

describe('REQ-035: financial-report tipsBreakdown', () => {
  it('aggregates Order tips by tipPaymentMethod', async () => {
    orderFindMock.mockResolvedValue([
      {
        _id: 'order1',
        total: 5000,
        tipAmount: 500,
        tipPaymentMethod: 'cash',
        paymentMethod: 'card',
        items: [],
      },
      {
        _id: 'order2',
        total: 3000,
        tipAmount: 200,
        tipPaymentMethod: 'cash',
        paymentMethod: 'cash',
        items: [],
      },
    ]);
    const report = await FinancialReportService.generateDailySummary(
      new Date('2026-05-07T12:00:00Z')
    );
    expect(report.tipsBreakdown.cash).toBe(700);
    expect(report.tipsBreakdown.card).toBe(0);
    expect(report.tipsBreakdown.total).toBe(700);
  });

  it('falls back to paymentMethod when tipPaymentMethod is missing', async () => {
    orderFindMock.mockResolvedValue([
      {
        _id: 'order1',
        total: 5000,
        tipAmount: 250,
        // tipPaymentMethod intentionally omitted (legacy backfill miss)
        paymentMethod: 'transfer',
        items: [],
      },
    ]);
    const report = await FinancialReportService.generateDailySummary(
      new Date('2026-05-07T12:00:00Z')
    );
    expect(report.tipsBreakdown.transfer).toBe(250);
    expect(report.tipsBreakdown.total).toBe(250);
  });

  it('sums partial-payment tips into tipsBreakdown by paymentType', async () => {
    orderFindMock.mockResolvedValue([]);
    tabFindMock.mockResolvedValue([
      {
        _id: 'tab1',
        partialPayments: [
          { amount: 2000, paymentType: 'card', tipAmount: 200 },
          { amount: 1000, paymentType: 'cash', tipAmount: 100 },
        ],
      },
    ]);
    const report = await FinancialReportService.generateDailySummary(
      new Date('2026-05-07T12:00:00Z')
    );
    expect(report.tipsBreakdown.card).toBe(200);
    expect(report.tipsBreakdown.cash).toBe(100);
    expect(report.tipsBreakdown.total).toBe(300);
  });

  it('AC6 — paymentBreakdown.total is unchanged when tips are present', async () => {
    // Order 1: total 5000, no tip. Order 2: total 3000, tipAmount 500.
    // paymentBreakdown.total must be 5000 + 3000 = 8000, NOT 8500.
    orderFindMock.mockResolvedValue([
      {
        _id: 'order1',
        total: 5000,
        tipAmount: 0,
        paymentMethod: 'cash',
        items: [],
      },
      {
        _id: 'order2',
        total: 3000,
        tipAmount: 500,
        tipPaymentMethod: 'cash',
        paymentMethod: 'card',
        items: [],
      },
    ]);
    const report = await FinancialReportService.generateDailySummary(
      new Date('2026-05-07T12:00:00Z')
    );
    expect(report.paymentBreakdown.total).toBe(8000);
    expect(report.paymentBreakdown.cash).toBe(5000);
    expect(report.paymentBreakdown.card).toBe(3000);
    expect(report.tipsBreakdown.total).toBe(500);
  });
});
