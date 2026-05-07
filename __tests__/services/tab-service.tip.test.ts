/**
 * @requirement REQ-035 — Tip recording at express checkout
 *
 * Service-level tests for TabService.completeTabPaymentManually +
 * recordPartialPayment with the new optional tipAmount parameter.
 *
 * Per the locked design decision ("one tip per partial payment"), the
 * closing payment in `completeTabPaymentManually` is now persisted as a
 * partial-payment row carrying its own tip. Multi-payment tabs already
 * push rows via `recordPartialPayment`, which now accepts a tipAmount.
 *
 * The tab-level `tipAmount` is recomputed by TabModel.pre('save') as the
 * sum of all partial-payment subdocs' tipAmount fields.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

const TAB_ID = '65a1b2c3d4e5f6a7b8c9d0e1';
const PROCESSED_BY = '65a1b2c3d4e5f6a7b8c9d0e2';

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
    partialPayments: [] as PartialPaymentInput[],
    orders: [],
    customerEmail: '',
    userId: undefined,
    save: vi.fn().mockImplementation(async function (this: typeof tab) {
      // Mirror the pre('save') hook: recompute tab-level tipAmount.
      const partials =
        (this.partialPayments as PartialPaymentInput[] | undefined) ?? [];
      this.tipAmount = partials.reduce(
        (sum: number, pp) => sum + (pp.tipAmount ?? 0),
        0
      );
    }),
    toObject: vi.fn(function (this: Record<string, unknown>) {
      return { ...this };
    }),
    ...overrides,
  };
  return tab;
};

const mockTabFindById = vi.fn();

vi.mock('@/models/tab-model', () => {
  const findById = (...args: unknown[]) => {
    const result = mockTabFindById(...args);
    // Mimic the chainable .populate() the production code uses
    return {
      populate: () => result,
      then: (onF: (v: unknown) => unknown) => Promise.resolve(result).then(onF),
    };
  };
  return { default: { findById } };
});

vi.mock('@/models/order-model', () => ({
  default: {
    updateMany: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
    findById: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getBusinessDayCutoff: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('@/lib/business-date', () => ({
  deriveBusinessDate: vi.fn(() => new Date('2026-05-07T00:00:00Z')),
}));

vi.mock('@/services/audit-log-service', () => ({
  AuditLogService: {
    createLog: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/services/inventory-service', () => ({
  default: {
    deductStockForOrder: vi.fn().mockResolvedValue(undefined),
  },
}));

import { TabService } from '@/services/tab-service';

beforeEach(() => {
  mockTabFindById.mockReset();
});

describe('REQ-035: completeTabPaymentManually persists tip on closing partial-payment row', () => {
  it('pushes a closing partial-payment row carrying the tip', async () => {
    const tab = buildTab({ total: 5000 });
    mockTabFindById.mockReturnValue(tab);
    await TabService.completeTabPaymentManually({
      tabId: TAB_ID,
      paymentType: 'card',
      paymentReference: 'POS-001',
      processedBy: PROCESSED_BY,
      tipAmount: 500,
    });
    const partials = tab.partialPayments as PartialPaymentInput[];
    expect(partials).toHaveLength(1);
    expect(partials[0].amount).toBe(5000); // outstanding balance
    expect(partials[0].paymentType).toBe('card');
    expect(partials[0].tipAmount).toBe(500);
  });

  it('recomputes tab-level tipAmount as sum of partials', async () => {
    const tab = buildTab({
      total: 5000,
      partialPayments: [
        {
          amount: 2000,
          paymentType: 'cash',
          tipAmount: 100,
          note: 'first round',
        },
      ],
    });
    mockTabFindById.mockReturnValue(tab);
    await TabService.completeTabPaymentManually({
      tabId: TAB_ID,
      paymentType: 'card',
      paymentReference: 'POS-001',
      processedBy: PROCESSED_BY,
      tipAmount: 200,
    });
    expect(tab.tipAmount).toBe(300); // 100 (existing partial) + 200 (closing)
  });

  it('legacy callers omitting tipAmount push a row with tipAmount = 0', async () => {
    const tab = buildTab({ total: 3000 });
    mockTabFindById.mockReturnValue(tab);
    await TabService.completeTabPaymentManually({
      tabId: TAB_ID,
      paymentType: 'cash',
      paymentReference: 'CASH-001',
      processedBy: PROCESSED_BY,
    });
    const partials = tab.partialPayments as PartialPaymentInput[];
    expect(partials).toHaveLength(1);
    expect(partials[0].tipAmount).toBe(0);
    expect(tab.tipAmount).toBe(0);
  });

  it('rejects negative tipAmount', async () => {
    mockTabFindById.mockReturnValue(buildTab());
    await expect(
      TabService.completeTabPaymentManually({
        tabId: TAB_ID,
        paymentType: 'cash',
        paymentReference: 'X',
        processedBy: PROCESSED_BY,
        tipAmount: -10,
      })
    ).rejects.toThrow(/tipAmount/);
  });
});

describe('REQ-035: recordPartialPayment persists tip on its row', () => {
  it('persists tipAmount on the pushed partial-payment subdoc', async () => {
    const tab = buildTab({ total: 5000 });
    mockTabFindById.mockReturnValue(tab);
    await TabService.recordPartialPayment({
      tabId: TAB_ID,
      amount: 2000,
      note: 'first round',
      paymentType: 'cash',
      processedBy: PROCESSED_BY,
      tipAmount: 100,
    });
    const partials = tab.partialPayments as PartialPaymentInput[];
    expect(partials).toHaveLength(1);
    expect(partials[0].amount).toBe(2000);
    expect(partials[0].tipAmount).toBe(100);
    expect(tab.tipAmount).toBe(100);
  });
});
