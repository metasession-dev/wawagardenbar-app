/**
 * @requirement REQ-098 AC2 — TabService.writeOffTab.
 *
 * Covers: happy path including a tab with `partialPayments` (unlike
 * `deleteTab`, write-off does NOT refuse those), refusal on an
 * already-written-off tab (R-022), and the `tab.write_off` audit-log
 * call shape. Mirrors the mocking style of
 * `__tests__/services/tab-service.business-date.test.ts` /
 * `__tests__/services/tab-service.delete-payment-revert.test.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

const TAB_ID = '65a1b2c3d4e5f6a7b8c9d0e1';
const WRITTEN_OFF_BY = '65a1b2c3d4e5f6a7b8c9d0e2';
const ORDER_ID_A = '65a1b2c3d4e5f6a7b8c9d0aa';
const ORDER_ID_B = '65a1b2c3d4e5f6a7b8c9d0bb';
const FIXED_BUSINESS_DATE = new Date('2026-08-03T00:00:00.000Z');

const buildTab = (overrides: Record<string, unknown> = {}) => {
  const tab: Record<string, unknown> = {
    _id: TAB_ID,
    tabNumber: 'TAB-A1-123456',
    tableNumber: 'A1',
    status: 'open',
    paymentStatus: 'pending',
    total: 12000,
    customerEmail: 'guest@example.com',
    orders: [ORDER_ID_A, ORDER_ID_B],
    partialPayments: [] as unknown[],
    writeOff: undefined,
    businessDate: undefined,
    closedAt: undefined,
    save: vi.fn().mockResolvedValue(undefined),
    toObject: vi.fn(function (this: Record<string, unknown>) {
      return { ...this };
    }),
    ...overrides,
  };
  return tab;
};

const mockTabFindById = vi.fn();
const mockOrderFind = vi.fn().mockResolvedValue([]);
const mockOrderUpdateMany = vi.fn().mockResolvedValue({ modifiedCount: 2 });
const mockAuditCreateLog = vi.fn().mockResolvedValue(undefined);
const mockGetBusinessDayCutoff = vi.fn().mockResolvedValue('15:00');
const mockDeriveBusinessDate = vi.fn(
  (_now: Date, _cutoff: string) => FIXED_BUSINESS_DATE
);

vi.mock('@/models/tab-model', () => ({
  default: {
    findById: (...args: unknown[]) => mockTabFindById(...args),
  },
}));

vi.mock('@/models/order-model', () => ({
  default: {
    find: (...args: unknown[]) => mockOrderFind(...args),
    updateMany: (...args: unknown[]) => mockOrderUpdateMany(...args),
  },
}));

vi.mock('@/services/audit-log-service', () => ({
  AuditLogService: {
    createLog: (...args: unknown[]) => mockAuditCreateLog(...args),
  },
}));

vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getBusinessDayCutoff: () => mockGetBusinessDayCutoff(),
  },
}));

vi.mock('@/lib/business-date', () => ({
  deriveBusinessDate: (now: Date, cutoff: string) =>
    mockDeriveBusinessDate(now, cutoff),
}));

import { TabService } from '@/services/tab-service';

beforeEach(() => {
  mockTabFindById.mockReset();
  mockOrderFind.mockReset();
  mockOrderFind.mockResolvedValue([]);
  mockOrderUpdateMany.mockReset();
  mockOrderUpdateMany.mockResolvedValue({ modifiedCount: 2 });
  mockAuditCreateLog.mockReset();
  mockAuditCreateLog.mockResolvedValue(undefined);
  mockGetBusinessDayCutoff.mockClear();
  mockGetBusinessDayCutoff.mockResolvedValue('15:00');
  mockDeriveBusinessDate.mockClear();
  mockDeriveBusinessDate.mockReturnValue(FIXED_BUSINESS_DATE);
});

describe('TabService.writeOffTab — AC2 happy path', () => {
  it('writes off an open tab with no partial payments', async () => {
    const tab = buildTab();
    mockTabFindById.mockResolvedValue(tab);
    mockOrderFind.mockResolvedValue([
      { _id: ORDER_ID_A, paymentStatus: 'pending' },
      { _id: ORDER_ID_B, paymentStatus: 'pending' },
    ]);

    const result = await TabService.writeOffTab(TAB_ID, {
      reason: 'Dormant since Dec 2025, customer unreachable.',
      writtenOffBy: WRITTEN_OFF_BY,
    });

    expect(tab.paymentStatus).toBe('written-off');
    expect(tab.status).toBe('closed');
    expect(tab.writeOff).toEqual(
      expect.objectContaining({
        amount: 12000,
        reason: 'Dormant since Dec 2025, customer unreachable.',
      })
    );
    expect(tab.save).toHaveBeenCalledTimes(1);
    expect(result.paymentStatus).toBe('written-off');

    expect(mockOrderUpdateMany).toHaveBeenCalledWith(
      { _id: { $in: [ORDER_ID_A, ORDER_ID_B] } },
      expect.objectContaining({
        $set: expect.objectContaining({
          paymentStatus: 'written-off',
        }),
      })
    );
  });

  it('accepts a tab with partialPayments — unlike deleteTab, this is never refused', async () => {
    const tab = buildTab({
      partialPayments: [{ amount: 5000, note: 'cash deposit' }],
    });
    mockTabFindById.mockResolvedValue(tab);

    await expect(
      TabService.writeOffTab(TAB_ID, {
        reason: 'Dormant tab with a partial deposit, uncollectible.',
        writtenOffBy: WRITTEN_OFF_BY,
      })
    ).resolves.toBeDefined();

    expect(tab.paymentStatus).toBe('written-off');
  });

  it('writes a tab.write_off audit log entry with reason, actor, and amount', async () => {
    const tab = buildTab();
    mockTabFindById.mockResolvedValue(tab);

    await TabService.writeOffTab(TAB_ID, {
      reason: 'Dormant since Dec 2025, customer unreachable.',
      writtenOffBy: WRITTEN_OFF_BY,
    });

    expect(mockAuditCreateLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: WRITTEN_OFF_BY,
        action: 'tab.write_off',
        resource: 'tab',
        resourceId: TAB_ID,
        details: expect.objectContaining({
          tabNumber: 'TAB-A1-123456',
          amount: 12000,
          reason: 'Dormant since Dec 2025, customer unreachable.',
          writtenOffBy: WRITTEN_OFF_BY,
        }),
      })
    );
  });

  it('requires a non-empty reason', async () => {
    const tab = buildTab();
    mockTabFindById.mockResolvedValue(tab);

    await expect(
      TabService.writeOffTab(TAB_ID, {
        reason: '   ',
        writtenOffBy: WRITTEN_OFF_BY,
      })
    ).rejects.toThrow(/reason is required/i);

    expect(tab.save).not.toHaveBeenCalled();
  });
});

describe('TabService.writeOffTab — refusal on already-written-off tab (R-022)', () => {
  it('refuses to write off a tab that is already written-off', async () => {
    const tab = buildTab({ paymentStatus: 'written-off' });
    mockTabFindById.mockResolvedValue(tab);

    await expect(
      TabService.writeOffTab(TAB_ID, {
        reason: 'Attempting a second write-off.',
        writtenOffBy: WRITTEN_OFF_BY,
      })
    ).rejects.toThrow(/already been written off/i);

    expect(tab.save).not.toHaveBeenCalled();
    expect(mockOrderUpdateMany).not.toHaveBeenCalled();
    expect(mockAuditCreateLog).not.toHaveBeenCalled();
  });

  it('throws when the tab does not exist', async () => {
    mockTabFindById.mockResolvedValue(null);

    await expect(
      TabService.writeOffTab(TAB_ID, {
        reason: 'Some reason',
        writtenOffBy: WRITTEN_OFF_BY,
      })
    ).rejects.toThrow(/not found/i);
  });
});
