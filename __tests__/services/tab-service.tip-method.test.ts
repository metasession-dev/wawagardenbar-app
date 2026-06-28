/**
 * @requirement REQ-036 — independent tipPaymentMethod on partial-payment rows
 *
 * Service-level tests for TabService.completeTabPaymentManually +
 * recordPartialPayment with the new optional `tipPaymentMethod` param.
 *
 * The `tipPaymentMethod` is independent of the row's `paymentType`,
 * letting staff record card-paid bill + cash-paid tip on the same row.
 * When the caller omits `tipPaymentMethod`, the subdoc has no explicit
 * field — the daily-report aggregator falls back to `paymentType` (per
 * REQ-036's `??` aggregator change, tested separately).
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
  tipPaymentMethod?: 'cash' | 'transfer' | 'card';
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
    deductStockForOrder: vi.fn().mockResolvedValue({
      allSucceeded: true,
      results: [],
    }),
  },
}));

import { TabService } from '@/services/tab-service';

beforeEach(() => {
  mockTabFindById.mockReset();
});

describe('REQ-036: completeTabPaymentManually persists tipPaymentMethod', () => {
  it('persists explicit tipPaymentMethod distinct from paymentType', async () => {
    const tab = buildTab({ total: 5000 });
    mockTabFindById.mockReturnValue(tab);
    await TabService.completeTabPaymentManually({
      tabId: TAB_ID,
      paymentType: 'card',
      paymentReference: 'POS-001',
      processedBy: PROCESSED_BY,
      tipAmount: 500,
      tipPaymentMethod: 'cash',
    });
    const partials = tab.partialPayments as PartialPaymentInput[];
    expect(partials).toHaveLength(1);
    expect(partials[0].paymentType).toBe('card');
    expect(partials[0].tipAmount).toBe(500);
    expect(partials[0].tipPaymentMethod).toBe('cash');
  });

  it('leaves tipPaymentMethod unset when caller omits it (legacy fallback)', async () => {
    const tab = buildTab({ total: 3000 });
    mockTabFindById.mockReturnValue(tab);
    await TabService.completeTabPaymentManually({
      tabId: TAB_ID,
      paymentType: 'cash',
      paymentReference: 'CASH-001',
      processedBy: PROCESSED_BY,
      tipAmount: 100,
    });
    const partials = tab.partialPayments as PartialPaymentInput[];
    expect(partials[0].tipAmount).toBe(100);
    expect(partials[0].tipPaymentMethod).toBeUndefined();
  });
});

describe('REQ-036: recordPartialPayment persists tipPaymentMethod', () => {
  it('persists explicit tipPaymentMethod on the pushed partial-payment subdoc', async () => {
    const tab = buildTab({ total: 5000 });
    mockTabFindById.mockReturnValue(tab);
    await TabService.recordPartialPayment({
      tabId: TAB_ID,
      amount: 2000,
      note: 'first round',
      paymentType: 'card',
      processedBy: PROCESSED_BY,
      tipAmount: 200,
      tipPaymentMethod: 'cash',
    });
    const partials = tab.partialPayments as PartialPaymentInput[];
    expect(partials).toHaveLength(1);
    expect(partials[0].paymentType).toBe('card');
    expect(partials[0].tipAmount).toBe(200);
    expect(partials[0].tipPaymentMethod).toBe('cash');
  });
});
