/**
 * @requirement REQ-051 — DFR aggregation queries by business day, not calendar day.
 *
 * Asserts that FinancialReportService.generateDailySummary(date) builds its
 * OrderModel.find filter with the business-day range containing `date` rather
 * than the calendar-day range. This pins down the exact bug from #196: at
 * 07:00 WAT, the report previously queried for the calendar day starting at
 * 00:00 WAT today, but orders placed before the 15:00 cutoff are attributed
 * to yesterday's business day — so the report returned ₦0.
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
    findById: (...args: unknown[]) => ({
      lean: () => menuItemFindByIdMock(...args),
    }),
  },
}));

const cutoffMock = vi.fn();
vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getBusinessDayCutoff: () => cutoffMock(),
  },
}));

// Import AFTER mocks are in place.
import { FinancialReportService } from '@/services/financial-report-service';

/**
 * Build a UTC Date from a WAT wall-clock time on a fixed date.
 * Mirrors the helper in __tests__/lib/business-date.test.ts.
 */
function watTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0
): Date {
  return new Date(Date.UTC(year, month - 1, day, hour - 1, minute, 0, 0));
}

/** Midnight WAT on a given calendar date, returned as UTC. */
function watMidnightUTC(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day - 1, 23, 0, 0, 0));
}

/**
 * Extract the businessDate `$gte` and `$lte` from the first OrderModel.find
 * call. The filter shape (per services/financial-report-service.ts:228+):
 *
 *   {
 *     paymentStatus: 'paid',
 *     $or: [
 *       { businessDate: { $gte, $lte } },
 *       { businessDate: { $exists: false }, paidAt: { $gte, $lte } },
 *       { businessDate: null, paidAt: { $gte, $lte } },
 *     ],
 *   }
 */
function extractBusinessDateRange(callArgs: unknown): {
  start: Date;
  end: Date;
} {
  const filter = callArgs as {
    $or: Array<{ businessDate?: { $gte: Date; $lte: Date } }>;
  };
  const branch = filter.$or.find((b) => b.businessDate?.$gte);
  if (!branch?.businessDate) {
    throw new Error(
      'OrderModel.find did not receive an $or branch with businessDate { $gte, $lte }'
    );
  }
  return { start: branch.businessDate.$gte, end: branch.businessDate.$lte };
}

describe('REQ-051: generateDailySummary uses business-day range', () => {
  beforeEach(() => {
    orderFindMock.mockReset();
    orderFindMock.mockResolvedValue([]);
    tabFindMock.mockReset();
    tabFindMock.mockResolvedValue([]);
    expenseFindMock.mockReset();
    expenseFindMock.mockResolvedValue([]);
    menuItemFindByIdMock.mockReset();
    menuItemFindByIdMock.mockResolvedValue(null);
    cutoffMock.mockReset();
    cutoffMock.mockResolvedValue('15:00');
  });

  it('AC1: at 07:00 WAT (before cutoff) → range covers the *previous* business day', async () => {
    const at07WAT = watTime(2026, 5, 30, 7, 0); // 07:00 WAT, May 30
    await FinancialReportService.generateDailySummary(at07WAT);
    const { start, end } = extractBusinessDateRange(
      orderFindMock.mock.calls[0][0]
    );
    // Previous business day = the one that started May 29 15:00 WAT and runs
    // until May 30 14:59 WAT. Its midnight-WAT-as-UTC is May 28 23:00 UTC.
    expect(start.toISOString()).toBe(watMidnightUTC(2026, 5, 29).toISOString());
    expect(end.toISOString()).toBe('2026-05-29T22:59:59.999Z');
  });

  it('AC2: at 16:00 WAT (after cutoff) → range covers the *current* business day', async () => {
    const at16WAT = watTime(2026, 5, 30, 16, 0);
    await FinancialReportService.generateDailySummary(at16WAT);
    const { start, end } = extractBusinessDateRange(
      orderFindMock.mock.calls[0][0]
    );
    expect(start.toISOString()).toBe(watMidnightUTC(2026, 5, 30).toISOString());
    expect(end.toISOString()).toBe('2026-05-30T22:59:59.999Z');
  });

  it('an order created at the same `now` falls inside the query range', async () => {
    // The whole point — a row created at 07:00 WAT will have its
    // businessDate set by deriveBusinessDate, and the report query built
    // with the same `now` must select that row. The "range" is keyed by
    // the businessDate value (midnight WAT of the business day), not by
    // the wall-clock span of the business day.
    const at07WAT = watTime(2026, 5, 30, 7, 0);
    await FinancialReportService.generateDailySummary(at07WAT);
    const { start, end } = extractBusinessDateRange(
      orderFindMock.mock.calls[0][0]
    );
    // 07:00 WAT on May 30 is before the 15:00 cutoff → businessDate = May 29
    // 00:00 WAT = May 28 23:00 UTC.
    const businessDateForOrder = watMidnightUTC(2026, 5, 29);
    expect(businessDateForOrder.getTime()).toBeGreaterThanOrEqual(
      start.getTime()
    );
    expect(businessDateForOrder.getTime()).toBeLessThanOrEqual(end.getTime());
  });

  it('honours a non-default cutoff (06:00 WAT)', async () => {
    cutoffMock.mockResolvedValue('06:00');
    const at07WAT = watTime(2026, 5, 30, 7, 0); // 07:00 WAT — after 06:00 cutoff
    await FinancialReportService.generateDailySummary(at07WAT);
    const { start } = extractBusinessDateRange(orderFindMock.mock.calls[0][0]);
    // After cutoff → current business day = today
    expect(start.toISOString()).toBe(watMidnightUTC(2026, 5, 30).toISOString());
  });

  it('falls back to 15:00 default when cutoff is invalid', async () => {
    cutoffMock.mockResolvedValue('bad-value');
    const at07WAT = watTime(2026, 5, 30, 7, 0);
    await FinancialReportService.generateDailySummary(at07WAT);
    const { start } = extractBusinessDateRange(orderFindMock.mock.calls[0][0]);
    // Invalid cutoff → falls back to 15:00 → 07:00 WAT is before cutoff →
    // previous business day.
    expect(start.toISOString()).toBe(watMidnightUTC(2026, 5, 29).toISOString());
  });
});
