/**
 * @requirement REQ-036 — aggregator prefers pp.tipPaymentMethod over pp.paymentType
 *
 * The realistic case: a partial-payment row has paymentType='card' (the
 * customer paid the bill on POS) and tipPaymentMethod='cash' (the tip
 * was handed over in cash). The Daily Report's tipsBreakdown should
 * attribute the tip to the cash bucket, not the card bucket.
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
    find: (...args: unknown[]) => ({ lean: () => orderFindMock(...args) }),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('@/models/tab-model', () => ({
  default: {
    find: (...args: unknown[]) => ({ lean: () => tabFindMock(...args) }),
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
  menuItemFindByIdMock.mockResolvedValue(null);
});

describe('REQ-036: aggregator prefers pp.tipPaymentMethod', () => {
  it('AC8: card bill + cash tip on the same row → tip in cash bucket', async () => {
    orderFindMock.mockResolvedValue([]);
    tabFindMock.mockResolvedValue([
      {
        _id: 'tab1',
        partialPayments: [
          {
            amount: 5000,
            paymentType: 'card', // bill paid on POS
            tipAmount: 500,
            tipPaymentMethod: 'cash', // tip handed over in cash
          },
        ],
      },
    ]);
    const report = await FinancialReportService.generateDailySummary(
      new Date('2026-05-07T12:00:00Z')
    );
    // Bill rolls into card revenue
    expect(report.paymentBreakdown.card).toBe(5000);
    expect(report.paymentBreakdown.cash).toBe(0);
    // Tip rolls into CASH bucket (the explicit override) — not card
    expect(report.tipsBreakdown.cash).toBe(500);
    expect(report.tipsBreakdown.card).toBe(0);
    expect(report.tipsBreakdown.total).toBe(500);
  });

  it('falls back to paymentType when tipPaymentMethod is unset', async () => {
    orderFindMock.mockResolvedValue([]);
    tabFindMock.mockResolvedValue([
      {
        _id: 'tab1',
        partialPayments: [
          {
            amount: 5000,
            paymentType: 'transfer',
            tipAmount: 200,
            // tipPaymentMethod intentionally omitted — legacy data
          },
        ],
      },
    ]);
    const report = await FinancialReportService.generateDailySummary(
      new Date('2026-05-07T12:00:00Z')
    );
    expect(report.tipsBreakdown.transfer).toBe(200);
    expect(report.tipsBreakdown.total).toBe(200);
  });
});
