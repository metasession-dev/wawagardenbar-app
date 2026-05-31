/**
 * @requirement REQ-052 — recordPartialPayment sets tab.businessDate on the
 *   first partial payment, so open tabs become visible to the DFR's
 *   aggregatePartialPayments query (all three $or branches key on
 *   tab.businessDate or tab.paidAt).
 *
 * Sibling fix to REQ-051: the DFR now uses the correct business-day range,
 * but `closeTab` / `completeTabPaymentManually` are the only paths that set
 * tab.businessDate. Open tabs accruing partial payments never matched any
 * branch of the DFR query — they silently rendered as ₦0.00 in the cash /
 * card / transfer card tiles regardless of how much had been paid.
 *
 * Fix: on the FIRST partial payment, lock tab.businessDate to
 * `deriveBusinessDate(new Date(), cutoff)`. Subsequent partials don't
 * overwrite (the tab's "business day" is the day of the first cash event).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

const TAB_ID = '65a1b2c3d4e5f6a7b8c9d0e1';
const PROCESSED_BY = '65a1b2c3d4e5f6a7b8c9d0e2';
const FIXED_BUSINESS_DATE = new Date('2026-05-31T00:00:00.000Z');
const EXISTING_BUSINESS_DATE = new Date('2026-04-01T00:00:00.000Z');

type PartialPaymentInput = {
  amount: number;
  paymentType: 'cash' | 'transfer' | 'card';
  tipAmount?: number;
  note: string;
};

const buildTab = (overrides: Record<string, unknown> = {}) => {
  const tab: Record<string, unknown> = {
    _id: TAB_ID,
    status: 'open',
    paymentStatus: 'pending',
    total: 5000,
    tipAmount: 0,
    businessDate: undefined,
    partialPayments: [] as PartialPaymentInput[],
    orders: [],
    customerEmail: '',
    userId: undefined,
    save: vi.fn().mockResolvedValue(undefined),
    toObject: vi.fn(function (this: Record<string, unknown>) {
      return { ...this };
    }),
    ...overrides,
  };
  return tab;
};

const mockTabFindById = vi.fn();

vi.mock('@/models/tab-model', () => {
  const findById = (...args: unknown[]) => mockTabFindById(...args);
  return { default: { findById } };
});

vi.mock('@/models/order-model', () => ({
  default: {
    updateMany: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
    findById: vi.fn().mockResolvedValue(null),
  },
}));

const mockGetBusinessDayCutoff = vi.fn().mockResolvedValue('15:00');
vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getBusinessDayCutoff: () => mockGetBusinessDayCutoff(),
  },
}));

const mockDeriveBusinessDate = vi.fn(
  (_now: Date, _cutoff: string) => FIXED_BUSINESS_DATE
);
vi.mock('@/lib/business-date', () => ({
  deriveBusinessDate: (now: Date, cutoff: string) =>
    mockDeriveBusinessDate(now, cutoff),
}));

vi.mock('@/services/audit-log-service', () => ({
  AuditLogService: {
    createLog: vi.fn().mockResolvedValue(undefined),
  },
}));

import { TabService } from '@/services/tab-service';

beforeEach(() => {
  mockTabFindById.mockReset();
  mockGetBusinessDayCutoff.mockClear();
  mockGetBusinessDayCutoff.mockResolvedValue('15:00');
  mockDeriveBusinessDate.mockClear();
  mockDeriveBusinessDate.mockReturnValue(FIXED_BUSINESS_DATE);
});

describe('REQ-052: recordPartialPayment sets tab.businessDate on first call', () => {
  it('AC1 — open tab with no businessDate: first partial sets businessDate via deriveBusinessDate(now, cutoff)', async () => {
    const tab = buildTab();
    expect(tab.businessDate).toBeUndefined();
    mockTabFindById.mockReturnValue(tab);

    await TabService.recordPartialPayment({
      tabId: TAB_ID,
      amount: 1000,
      note: 'first partial',
      paymentType: 'cash',
      processedBy: PROCESSED_BY,
    });

    expect(tab.businessDate).toBe(FIXED_BUSINESS_DATE);
    expect(mockGetBusinessDayCutoff).toHaveBeenCalled();
    expect(mockDeriveBusinessDate).toHaveBeenCalledTimes(1);
    // Cutoff is passed through to deriveBusinessDate.
    const [, cutoffArg] = mockDeriveBusinessDate.mock.calls[0] as unknown as [
      Date,
      string,
    ];
    expect(cutoffArg).toBe('15:00');
    // First arg is "now" — must be a Date.
    const [nowArg] = mockDeriveBusinessDate.mock.calls[0] as unknown as [
      Date,
      string,
    ];
    expect(nowArg).toBeInstanceOf(Date);
    // tab.save must run after businessDate is set.
    expect(tab.save).toHaveBeenCalledTimes(1);
  });

  it('AC2 — tab with existing businessDate: partial payment does NOT overwrite', async () => {
    const tab = buildTab({ businessDate: EXISTING_BUSINESS_DATE });
    mockTabFindById.mockReturnValue(tab);

    await TabService.recordPartialPayment({
      tabId: TAB_ID,
      amount: 1000,
      note: 'subsequent partial',
      paymentType: 'cash',
      processedBy: PROCESSED_BY,
    });

    expect(tab.businessDate).toBe(EXISTING_BUSINESS_DATE);
    // No cutoff/derive calls when businessDate already set.
    expect(mockDeriveBusinessDate).not.toHaveBeenCalled();
  });

  it('Multi-partial — businessDate set on first call, unchanged on subsequent', async () => {
    const tab = buildTab();
    mockTabFindById.mockReturnValue(tab);

    // First partial: businessDate becomes FIXED_BUSINESS_DATE.
    await TabService.recordPartialPayment({
      tabId: TAB_ID,
      amount: 1000,
      note: 'first',
      paymentType: 'cash',
      processedBy: PROCESSED_BY,
    });
    expect(tab.businessDate).toBe(FIXED_BUSINESS_DATE);

    // If the production code were re-running deriveBusinessDate, it could
    // overwrite businessDate on the next call — even with the same mock value.
    // Swap the mock to a sentinel that would be visibly wrong if used.
    const WRONG_DATE = new Date('2099-01-01T00:00:00.000Z');
    mockDeriveBusinessDate.mockReturnValue(WRONG_DATE);

    await TabService.recordPartialPayment({
      tabId: TAB_ID,
      amount: 1000,
      note: 'second',
      paymentType: 'cash',
      processedBy: PROCESSED_BY,
    });
    expect(tab.businessDate).toBe(FIXED_BUSINESS_DATE);

    await TabService.recordPartialPayment({
      tabId: TAB_ID,
      amount: 1000,
      note: 'third',
      paymentType: 'cash',
      processedBy: PROCESSED_BY,
    });
    expect(tab.businessDate).toBe(FIXED_BUSINESS_DATE);

    // deriveBusinessDate called exactly once across the three calls.
    expect(mockDeriveBusinessDate).toHaveBeenCalledTimes(1);
  });

  it('Cutoff plumbing — non-default cutoff (06:00) is forwarded to deriveBusinessDate', async () => {
    mockGetBusinessDayCutoff.mockResolvedValue('06:00');
    const tab = buildTab();
    mockTabFindById.mockReturnValue(tab);

    await TabService.recordPartialPayment({
      tabId: TAB_ID,
      amount: 1000,
      note: 'early-cutoff partial',
      paymentType: 'transfer',
      processedBy: PROCESSED_BY,
    });

    const [, cutoffArg] = mockDeriveBusinessDate.mock.calls[0] as unknown as [
      Date,
      string,
    ];
    expect(cutoffArg).toBe('06:00');
  });
});
