/**
 * @requirement REQ-106 - Current Cash Position tracking
 *
 * Pins the contract of `CashPositionService`:
 *   - seed-only, seed+corrections aggregation
 *   - cash-in delegates to FinancialReportService.paymentBreakdown.cash
 *   - cash-out sums transferred cash-method expenses / deposits
 *   - pre-seed dates return seeded:false
 *   - recordAdjustment rejects a zero amount
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn(),
}));

const mockAdjustmentFindOne = vi.fn();
const mockAdjustmentAggregate = vi.fn();
const mockAdjustmentCreate = vi.fn();
const mockAdjustmentFind = vi.fn();
vi.mock('@/models/cash-position-adjustment-model', () => ({
  CashPositionAdjustmentModel: {
    findOne: (...args: unknown[]) => mockAdjustmentFindOne(...args),
    aggregate: (...args: unknown[]) => mockAdjustmentAggregate(...args),
    create: (...args: unknown[]) => mockAdjustmentCreate(...args),
    find: (...args: unknown[]) => mockAdjustmentFind(...args),
  },
}));

const mockGroupAggregate = vi.fn();
const mockGroupFind = vi.fn();
vi.mock('@/models/pending-expense-group-model', () => ({
  PendingExpenseGroupModel: {
    aggregate: (...args: unknown[]) => mockGroupAggregate(...args),
    find: (...args: unknown[]) => mockGroupFind(...args),
  },
}));

const mockDepositAggregate = vi.fn();
const mockDepositFind = vi.fn();
vi.mock('@/models/cash-deposit-model', () => ({
  CashDepositModel: {
    aggregate: (...args: unknown[]) => mockDepositAggregate(...args),
    find: (...args: unknown[]) => mockDepositFind(...args),
  },
}));

const mockGenerateDateRangeReport = vi.fn();
vi.mock('@/services/financial-report-service', () => ({
  FinancialReportService: {
    generateDateRangeReport: (...args: unknown[]) =>
      mockGenerateDateRangeReport(...args),
  },
}));

const mockGetBusinessDayCutoff = vi.fn().mockResolvedValue('15:00');
vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getBusinessDayCutoff: () => mockGetBusinessDayCutoff(),
  },
}));

import { CashPositionService } from '@/services/cash-position-service';

beforeEach(() => {
  vi.clearAllMocks();
  mockGetBusinessDayCutoff.mockResolvedValue('15:00');
});

describe('REQ-106: CashPositionService.getSeedAndAdjustmentTotal', () => {
  it('sums all adjustments with effectiveDate <= asOfDate', async () => {
    mockAdjustmentAggregate.mockResolvedValue([{ total: 45000 }]);
    const total = await CashPositionService.getSeedAndAdjustmentTotal(
      new Date('2026-06-01')
    );
    expect(total).toBe(45000);
  });

  it('returns 0 when no adjustments exist', async () => {
    mockAdjustmentAggregate.mockResolvedValue([]);
    const total = await CashPositionService.getSeedAndAdjustmentTotal(
      new Date()
    );
    expect(total).toBe(0);
  });
});

describe('REQ-106: CashPositionService.getCashInForRange', () => {
  it('delegates to FinancialReportService.paymentBreakdown.cash', async () => {
    mockGenerateDateRangeReport.mockResolvedValue({
      paymentBreakdown: { cash: 12000, card: 5000, total: 17000 },
    });
    const cashIn = await CashPositionService.getCashInForRange(
      new Date('2026-06-01'),
      new Date('2026-06-01')
    );
    expect(cashIn).toBe(12000);
  });

  it('returns 0 when paymentBreakdown is missing', async () => {
    mockGenerateDateRangeReport.mockResolvedValue({});
    const cashIn = await CashPositionService.getCashInForRange(
      new Date(),
      new Date()
    );
    expect(cashIn).toBe(0);
  });
});

describe('REQ-106: CashPositionService.getCashOutExpensesForRange / getCashOutDepositsForRange', () => {
  it('sums transferred cash-method group totals', async () => {
    mockGroupAggregate.mockResolvedValue([{ total: 8000 }]);
    const total = await CashPositionService.getCashOutExpensesForRange(
      new Date(),
      new Date()
    );
    expect(total).toBe(8000);
    expect(mockGroupAggregate).toHaveBeenCalledWith([
      expect.objectContaining({
        $match: expect.objectContaining({
          status: 'transferred',
          paymentMethod: 'cash',
        }),
      }),
      expect.anything(),
    ]);
  });

  it('sums transferred deposit amounts', async () => {
    mockDepositAggregate.mockResolvedValue([{ total: 3000 }]);
    const total = await CashPositionService.getCashOutDepositsForRange(
      new Date(),
      new Date()
    );
    expect(total).toBe(3000);
  });
});

describe('REQ-106: CashPositionService.getCashPositionForDate', () => {
  it('returns seeded:false when no adjustment exists at all', async () => {
    mockAdjustmentFindOne.mockReturnValue({
      sort: () => ({ lean: () => Promise.resolve(null) }),
    });
    const summary = await CashPositionService.getCashPositionForDate(
      new Date('2026-06-01')
    );
    expect(summary.seeded).toBe(false);
    expect(summary.closingPosition).toBe(0);
  });

  it('returns seeded:false for a date before the earliest seed', async () => {
    mockAdjustmentFindOne.mockReturnValue({
      sort: () => ({
        lean: () => Promise.resolve({ effectiveDate: new Date('2026-06-10') }),
      }),
    });
    const summary = await CashPositionService.getCashPositionForDate(
      new Date('2026-06-01')
    );
    expect(summary.seeded).toBe(false);
  });

  it('regression: a seed recorded later THE SAME business day still counts as seeded for that date (not just dates after it)', async () => {
    // The seed's precise effectiveDate instant (e.g. 2pm) is LATER than
    // that business day's start (e.g. 3am cutoff) — querying that same
    // date must not compare against day-start and wrongly conclude the
    // date precedes the seed.
    mockAdjustmentFindOne.mockReturnValue({
      sort: () => ({
        lean: () =>
          Promise.resolve({ effectiveDate: new Date('2026-06-15T14:00:00Z') }),
      }),
    });
    mockAdjustmentAggregate.mockResolvedValue([{ total: 50000 }]);
    mockGenerateDateRangeReport.mockResolvedValue({
      paymentBreakdown: { cash: 0 },
    });
    mockGroupAggregate.mockResolvedValue([]);
    mockDepositAggregate.mockResolvedValue([]);

    const summary = await CashPositionService.getCashPositionForDate(
      new Date('2026-06-15T20:00:00Z')
    );
    expect(summary.seeded).toBe(true);
  });

  it('computes opening + cashIn - cashOutExpenses - cashOutDeposits + adjustments for a seeded date', async () => {
    mockAdjustmentFindOne.mockReturnValue({
      sort: () => ({
        lean: () => Promise.resolve({ effectiveDate: new Date('2026-01-01') }),
      }),
    });
    // seedTotal (opening as-of) and today's in-range adjustments both read
    // from the same aggregate mock — fixed at 50000 for both calls.
    mockAdjustmentAggregate.mockResolvedValue([{ total: 50000 }]);
    mockGenerateDateRangeReport.mockResolvedValue({
      paymentBreakdown: { cash: 10000 },
    });
    mockGroupAggregate.mockResolvedValue([{ total: 2000 }]);
    mockDepositAggregate.mockResolvedValue([{ total: 1000 }]);

    const summary = await CashPositionService.getCashPositionForDate(
      new Date('2026-06-15')
    );

    expect(summary.seeded).toBe(true);
    // openingPosition itself is computed the same way (seedTotal + cashIn - outs)
    // — with all mocks returning fixed values regardless of range, opening
    // and today's movements collapse to the same numbers here; assert the
    // closing formula is internally consistent instead of a magic number.
    expect(summary.closingPosition).toBe(
      summary.openingPosition +
        summary.cashIn -
        summary.cashOutExpenses -
        summary.cashOutDeposits +
        summary.adjustments
    );
    expect(summary.cashIn).toBe(10000);
    expect(summary.cashOutExpenses).toBe(2000);
    expect(summary.cashOutDeposits).toBe(1000);
    expect(summary.adjustments).toBe(50000);
  });

  it("regression: a correction recorded THIS business day is reflected in TODAY's closing position, not just tomorrow's opening", async () => {
    // This pins the UAT-reported bug: a super-admin adjustment made
    // "right now" (effectiveDate within today's business day) must move
    // today's displayed closing position immediately — not only appear
    // once folded into a later day's opening balance.
    mockAdjustmentFindOne.mockReturnValue({
      sort: () => ({
        lean: () => Promise.resolve({ effectiveDate: new Date('2026-01-01') }),
      }),
    });
    // First aggregate call = opening-as-of (before today, so 0 corrections
    // yet); second call = today's in-range adjustments (the correction
    // just recorded). Distinguish by call order.
    mockAdjustmentAggregate
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([{ total: 75000 }]);
    mockGenerateDateRangeReport.mockResolvedValue({
      paymentBreakdown: { cash: 0 },
    });
    mockGroupAggregate.mockResolvedValue([]);
    mockDepositAggregate.mockResolvedValue([]);

    const summary = await CashPositionService.getCashPositionForDate(
      new Date('2026-06-15')
    );

    expect(summary.openingPosition).toBe(0);
    expect(summary.adjustments).toBe(75000);
    expect(summary.closingPosition).toBe(75000);
  });
});

describe('REQ-106: CashPositionService.recordAdjustment', () => {
  it('rejects a zero amount', async () => {
    await expect(
      CashPositionService.recordAdjustment({
        type: 'correction',
        amount: 0,
        effectiveDate: new Date(),
        createdBy: 'user-1',
      })
    ).rejects.toThrow('Adjustment amount cannot be zero');
  });

  it('creates an adjustment with the given type/amount/effectiveDate', async () => {
    const created = { toObject: () => ({ type: 'seed', amount: 50000 }) };
    mockAdjustmentCreate.mockResolvedValue(created);
    const result = await CashPositionService.recordAdjustment({
      type: 'seed',
      amount: 50000,
      effectiveDate: new Date('2026-01-01'),
      createdBy: '507f1f77bcf86cd799439011',
    });
    expect(mockAdjustmentCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'seed', amount: 50000 })
    );
    expect(result).toEqual({ type: 'seed', amount: 50000 });
  });
});

describe('REQ-106 (amended — AC9): CashPositionService.getCurrentPosition', () => {
  it('delegates to getCashPositionForDate(now) — always live, never period-scoped', async () => {
    mockAdjustmentFindOne.mockReturnValue({
      sort: () => ({ lean: () => Promise.resolve(null) }),
    });
    const result = await CashPositionService.getCurrentPosition();
    expect(result.seeded).toBe(false);
  });
});

describe('REQ-106 (amended — AC10): CashPositionService.getLedger', () => {
  it('returns seeded:false with an empty ledger when no opening balance exists', async () => {
    mockAdjustmentFindOne.mockReturnValue({
      sort: () => ({ lean: () => Promise.resolve(null) }),
    });
    const ledger = await CashPositionService.getLedger();
    expect(ledger).toEqual({
      seeded: false,
      current: 0,
      totalCashIn: 0,
      entries: [],
      totalEntries: 0,
      page: 1,
      pageSize: 20,
    });
  });

  it('composes entries from adjustments, transferred cash expenses, and transferred cash deposits, sorted newest first', async () => {
    mockAdjustmentFindOne.mockReturnValue({
      sort: () => ({
        lean: () => Promise.resolve({ effectiveDate: new Date('2026-01-01') }),
      }),
    });
    // getCashPositionForDate(now) internals — opening as-of, then today's
    // in-range adjustments.
    mockAdjustmentAggregate
      .mockResolvedValueOnce([{ total: 50000 }])
      .mockResolvedValueOnce([{ total: 0 }]);
    mockGenerateDateRangeReport.mockResolvedValue({
      paymentBreakdown: { cash: 20000 },
    });
    mockGroupAggregate.mockResolvedValue([{ total: 3000 }]);
    mockDepositAggregate.mockResolvedValue([{ total: 1000 }]);

    mockAdjustmentFind.mockReturnValue({
      sort: () => ({
        lean: () =>
          Promise.resolve([
            {
              type: 'seed',
              amount: 50000,
              effectiveDate: new Date('2026-01-01'),
              note: undefined,
            },
          ]),
      }),
    });
    mockGroupFind.mockReturnValue({
      sort: () => ({
        lean: () =>
          Promise.resolve([
            {
              totalAmount: 3000,
              transferredAt: new Date('2026-06-14'),
              items: [{ description: 'Generator fuel' }],
            },
          ]),
      }),
    });
    mockDepositFind.mockReturnValue({
      sort: () => ({
        lean: () =>
          Promise.resolve([
            {
              amount: 1000,
              transferredAt: new Date('2026-06-15'),
              reference: 'DEP-1',
            },
          ]),
      }),
    });

    const ledger = await CashPositionService.getLedger();

    expect(ledger.seeded).toBe(true);
    // `current` delegates to getCashPositionForDate(now).closingPosition,
    // whose openingPosition itself sums cashIn/cashOutExpenses/
    // cashOutDeposits for the opening period via computePositionAsOf —
    // with these mocks returning a fixed value regardless of the date
    // range passed, that math is counted once for "opening" and once
    // more for "today", same mock-arithmetic artifact the pre-existing
    // getCashPositionForDate test documents; not a getLedger-specific bug.
    expect(ledger.current).toBe(50000 + 2 * (20000 - 3000 - 1000));
    expect(ledger.totalCashIn).toBe(20000);
    expect(ledger.entries).toEqual([
      // Newest first: deposit (06-15) before expense (06-14) before seed (01-01).
      {
        type: 'cash-out-deposit',
        date: new Date('2026-06-15'),
        amount: -1000,
        description: 'Deposit — DEP-1',
      },
      {
        type: 'cash-out-expense',
        date: new Date('2026-06-14'),
        amount: -3000,
        description: 'Generator fuel',
      },
      {
        type: 'seed',
        amount: 50000,
        date: new Date('2026-01-01'),
        description: 'Opening balance set',
      },
    ]);
    expect(ledger.totalEntries).toBe(3);
    expect(ledger.page).toBe(1);
    expect(ledger.pageSize).toBe(20);
  });

  it('REQ-106 iteration 3: paginates the merged entry list', async () => {
    mockAdjustmentFindOne.mockReturnValue({
      sort: () => ({
        lean: () => Promise.resolve({ effectiveDate: new Date('2026-01-01') }),
      }),
    });
    mockAdjustmentAggregate
      .mockResolvedValueOnce([{ total: 0 }])
      .mockResolvedValueOnce([{ total: 0 }]);
    mockGenerateDateRangeReport.mockResolvedValue({
      paymentBreakdown: { cash: 0 },
    });
    mockGroupAggregate.mockResolvedValue([]);
    mockDepositAggregate.mockResolvedValue([]);

    // 5 adjustment entries, dated 2026-06-01 through 2026-06-05.
    mockAdjustmentFind.mockReturnValue({
      sort: () => ({
        lean: () =>
          Promise.resolve(
            Array.from({ length: 5 }, (_, i) => ({
              type: 'correction',
              amount: 100 * (i + 1),
              effectiveDate: new Date(`2026-06-0${i + 1}`),
              note: `Correction ${i + 1}`,
            }))
          ),
      }),
    });
    mockGroupFind.mockReturnValue({
      sort: () => ({ lean: () => Promise.resolve([]) }),
    });
    mockDepositFind.mockReturnValue({
      sort: () => ({ lean: () => Promise.resolve([]) }),
    });

    const pageOne = await CashPositionService.getLedger(1, 2);
    expect(pageOne.totalEntries).toBe(5);
    expect(pageOne.page).toBe(1);
    expect(pageOne.pageSize).toBe(2);
    expect(pageOne.entries).toHaveLength(2);
    // Newest first: 06-05, 06-04.
    expect(pageOne.entries[0].description).toBe('Correction 5');
    expect(pageOne.entries[1].description).toBe('Correction 4');

    const pageThree = await CashPositionService.getLedger(3, 2);
    expect(pageThree.entries).toHaveLength(1);
    expect(pageThree.entries[0].description).toBe('Correction 1');
  });
});
