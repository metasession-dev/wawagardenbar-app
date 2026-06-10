/**
 * @requirement REQ-013 — Daily Report partial-payment + close-tab no double-counting
 *
 * Pins the contract that the canonical close-tab flow — partial cash
 * payment → final card closing — produces a daily-report
 * paymentBreakdown with NO double-counting. The E2E spec
 * `daily-report-payments.spec.ts:249` ("daily report reflects both
 * payment methods with no double-counting") asserts the same contract
 * at integration level; this unit test isolates the aggregation logic
 * so any future regression in `FinancialReportService.generateDailySummary`
 * surfaces locally, in milliseconds, instead of via a 25-minute CI E2E
 * run.
 *
 * What the test pins:
 *
 *   Scenario:
 *     - 1 Tab with partialPayments = [
 *         { amount: 612, paymentType: 'cash' },   // partial mid-stream
 *         { amount: 918, paymentType: 'card' },   // closing payment
 *       ]
 *     - 1 Order on the tab: total = 1530, paymentMethod = 'card'
 *
 *   Asserts:
 *     - paymentBreakdown.cash  === 612   (from partial only)
 *     - paymentBreakdown.card  === 918   (from closing row in tab.partialPayments)
 *     - paymentBreakdown.total === 1530  (= partial + closing, NOT 3060)
 *     - The order loop subtracts the full tab-partial total
 *       (612 + 918 = 1530) from the order's amount and adds 0,
 *       so the order does NOT contribute a second time.
 *     - metrics.orderCount === 1
 *
 * Surfaces tip-side correctness too: tab.partialPayments[].tipAmount
 * absent in this scenario → tipsBreakdown stays at 0.
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

describe('REQ-013: partial-payment + close-tab — no double-counting', () => {
  const TAB_ID = 'tabA';
  const ORDER_ID = 'orderA';
  const PARTIAL = 612;
  const CLOSING = 918;
  const TAB_TOTAL = PARTIAL + CLOSING; // 1530

  it('canonical close-tab flow: 612 cash partial + 918 card closing → cash=612, card=918, total=1530', async () => {
    orderFindMock.mockResolvedValue([
      {
        _id: ORDER_ID,
        tabId: TAB_ID,
        total: TAB_TOTAL,
        paymentMethod: 'card',
        paymentStatus: 'paid',
        items: [],
      },
    ]);
    // `tabFindMock` resolves both calls:
    //   1. aggregatePartialPayments — tabs-with-partials in date range
    //   2. all-time-partials map — tabs whose _id is in the order's tab set
    // Same shape works for both since each iterates partialPayments[].
    tabFindMock.mockResolvedValue([
      {
        _id: TAB_ID,
        partialPayments: [
          { amount: PARTIAL, paymentType: 'cash' },
          { amount: CLOSING, paymentType: 'card' },
        ],
      },
    ]);

    const report = await FinancialReportService.generateDailySummary(
      new Date('2026-05-07T12:00:00Z')
    );

    expect(report.paymentBreakdown.cash).toBe(PARTIAL);
    expect(report.paymentBreakdown.card).toBe(CLOSING);
    expect(report.paymentBreakdown.total).toBe(TAB_TOTAL);
    // No accidental contribution to other buckets.
    expect(report.paymentBreakdown.transfer).toBe(0);
    expect(report.paymentBreakdown.unspecified).toBe(0);
    // Tips are absent in this scenario.
    expect(report.tipsBreakdown.total).toBe(0);
    // Exactly one order on the tab.
    expect(report.metrics.orderCount).toBe(1);
  });

  it('reproduces the E2E scenario shape: cashDelta=612 + cardDelta=918 + totalDelta=1530, NOT doubled', async () => {
    // Same input as above; pins the E2E spec's exact assertion shape
    // (cashDelta = partial, cardDelta = final, totalDelta = tabTotal,
    //  partial + final = tabTotal — no double-counting).
    orderFindMock.mockResolvedValue([
      {
        _id: ORDER_ID,
        tabId: TAB_ID,
        total: TAB_TOTAL,
        paymentMethod: 'card',
        paymentStatus: 'paid',
        items: [],
      },
    ]);
    tabFindMock.mockResolvedValue([
      {
        _id: TAB_ID,
        partialPayments: [
          { amount: PARTIAL, paymentType: 'cash' },
          { amount: CLOSING, paymentType: 'card' },
        ],
      },
    ]);

    const report = await FinancialReportService.generateDailySummary(
      new Date('2026-05-07T12:00:00Z')
    );

    // Mirror the E2E spec assertions exactly (baseline = 0 in unit
    // context; mock yields only this one scenario).
    const cashDelta = report.paymentBreakdown.cash;
    const cardDelta = report.paymentBreakdown.card;
    const totalDelta = report.paymentBreakdown.total;
    expect(cashDelta).toBe(PARTIAL);
    expect(cardDelta).toBe(CLOSING);
    expect(totalDelta).toBe(TAB_TOTAL);
    expect(PARTIAL + CLOSING).toBe(TAB_TOTAL);

    // Anti-double-count witness: each of cash + card + total must
    // NOT be 2× the canonical value.
    expect(cashDelta).not.toBe(PARTIAL * 2);
    expect(cardDelta).not.toBe(CLOSING * 2);
    expect(totalDelta).not.toBe(TAB_TOTAL * 2);
  });
});
