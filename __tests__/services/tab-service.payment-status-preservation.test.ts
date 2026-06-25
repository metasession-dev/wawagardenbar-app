/**
 * @requirement REQ-085 — Tab payment (both manual and gateway) must NOT reset
 *   order `status` to 'confirmed'. The kitchen/fulfillment `status` field is
 *   owned by the kitchen display workflow. Tab payment should only update
 *   payment-related fields: paymentStatus, paidAt, paymentMethod, businessDate.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

const TAB_ID = '65a1b2c3d4e5f6a7b8c9d0e1';
const PROCESSED_BY = '65a1b2c3d4e5f6a7b8c9d0e2';
const FIXED_BUSINESS_DATE = new Date('2026-06-25T00:00:00.000Z');

const ORDER_IDS = [
  '65a1b2c3d4e5f6a7b8c9d0a1',
  '65a1b2c3d4e5f6a7b8c9d0a2',
  '65a1b2c3d4e5f6a7b8c9d0a3',
];

const buildTab = (overrides: Record<string, unknown> = {}) => {
  const tab: Record<string, unknown> = {
    _id: TAB_ID,
    status: 'open',
    paymentStatus: 'pending',
    total: 5000,
    tipAmount: 0,
    businessDate: undefined,
    partialPayments: [],
    orders: ORDER_IDS,
    customerEmail: 'test@example.com',
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
const mockOrderUpdateMany = vi.fn().mockResolvedValue({ modifiedCount: 3 });

vi.mock('@/models/tab-model', () => {
  const findById = (...args: unknown[]) => {
    const tab = mockTabFindById(...args);
    if (tab) {
      tab.populate = vi.fn().mockResolvedValue(tab);
      return tab;
    }
    return null;
  };
  return { default: { findById } };
});

vi.mock('@/models/order-model', () => ({
  default: {
    updateMany: (...args: unknown[]) => mockOrderUpdateMany(...args),
  },
}));

const mockGetBusinessDayCutoff = vi.fn().mockResolvedValue('15:00');
vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getBusinessDayCutoff: () => mockGetBusinessDayCutoff(),
  },
}));

vi.mock('@/lib/business-date', () => ({
  deriveBusinessDate: vi.fn(
    (_now: Date, _cutoff: string) => FIXED_BUSINESS_DATE
  ),
}));

vi.mock('@/services/audit-log-service', () => ({
  AuditLogService: {
    createLog: vi.fn().mockResolvedValue(undefined),
  },
}));

import { TabService } from '@/services/tab-service';

beforeEach(() => {
  mockTabFindById.mockReset();
  mockOrderUpdateMany.mockReset();
  mockOrderUpdateMany.mockResolvedValue({ modifiedCount: 3 });
  mockGetBusinessDayCutoff.mockResolvedValue('15:00');
});

describe('REQ-085: Tab payment must not reset order fulfillment status', () => {
  describe('completeTabPaymentManually', () => {
    it('does not include status in the updateMany $set — only payment-related fields', async () => {
      const tab = buildTab();
      mockTabFindById.mockReturnValue(tab);
      await TabService.completeTabPaymentManually({
        tabId: TAB_ID,
        paymentType: 'cash',
        paymentReference: 'REF-001',
        processedBy: PROCESSED_BY,
      });
      expect(mockOrderUpdateMany).toHaveBeenCalledTimes(1);
      const [, updateDoc] = mockOrderUpdateMany.mock.calls[0] as [
        unknown,
        { $set: Record<string, unknown> },
      ];
      const setFields = updateDoc.$set;
      expect(setFields).toHaveProperty('paymentStatus', 'paid');
      expect(setFields).toHaveProperty('paidAt');
      expect(setFields).toHaveProperty('paymentMethod', 'cash');
      expect(setFields).toHaveProperty('businessDate', FIXED_BUSINESS_DATE);
      expect(setFields).not.toHaveProperty('status');
    });

    it('preserves orders in all kitchen statuses — no status field in updateMany', async () => {
      const tab = buildTab();
      mockTabFindById.mockReturnValue(tab);
      await TabService.completeTabPaymentManually({
        tabId: TAB_ID,
        paymentType: 'transfer',
        paymentReference: 'REF-002',
        processedBy: PROCESSED_BY,
      });
      const [, updateDoc] = mockOrderUpdateMany.mock.calls[0] as [
        unknown,
        { $set: Record<string, unknown> },
      ];
      expect(Object.keys(updateDoc.$set)).not.toContain('status');
    });
  });

  describe('markTabPaid', () => {
    it('does not include status in the updateMany $set — only payment-related fields', async () => {
      const tab = buildTab();
      mockTabFindById.mockReturnValue(tab);
      await TabService.markTabPaid(TAB_ID, 'PAY-REF-001', 'TXN-REF-001');
      expect(mockOrderUpdateMany).toHaveBeenCalledTimes(1);
      const [, updateDoc] = mockOrderUpdateMany.mock.calls[0] as [
        unknown,
        { $set: Record<string, unknown> },
      ];
      const setFields = updateDoc.$set;
      expect(setFields).toHaveProperty('paymentStatus', 'paid');
      expect(setFields).toHaveProperty('paidAt');
      expect(setFields).toHaveProperty('paymentMethod', 'card');
      expect(setFields).toHaveProperty('businessDate', FIXED_BUSINESS_DATE);
      expect(setFields).not.toHaveProperty('status');
    });

    it('preserves orders in all kitchen statuses — no status field in updateMany', async () => {
      const tab = buildTab();
      mockTabFindById.mockReturnValue(tab);
      await TabService.markTabPaid(TAB_ID, 'PAY-REF-002', 'TXN-REF-002');
      const [, updateDoc] = mockOrderUpdateMany.mock.calls[0] as [
        unknown,
        { $set: Record<string, unknown> },
      ];
      expect(Object.keys(updateDoc.$set)).not.toContain('status');
    });
  });

  describe('Regression guard — both methods update payment fields correctly', () => {
    it('completeTabPaymentManually sets paymentStatus, paidAt, paymentMethod, businessDate', async () => {
      const tab = buildTab();
      mockTabFindById.mockReturnValue(tab);
      await TabService.completeTabPaymentManually({
        tabId: TAB_ID,
        paymentType: 'card',
        paymentReference: 'REF-CARD',
        processedBy: PROCESSED_BY,
      });
      const [, updateDoc] = mockOrderUpdateMany.mock.calls[0] as [
        unknown,
        { $set: Record<string, unknown> },
      ];
      expect(updateDoc.$set.paymentStatus).toBe('paid');
      expect(updateDoc.$set.paymentMethod).toBe('card');
      expect(updateDoc.$set.paidAt).toBeInstanceOf(Date);
      expect(updateDoc.$set.businessDate).toBe(FIXED_BUSINESS_DATE);
    });

    it('markTabPaid sets paymentStatus, paidAt, paymentMethod=card, businessDate', async () => {
      const tab = buildTab();
      mockTabFindById.mockReturnValue(tab);
      await TabService.markTabPaid(TAB_ID, 'PAY-REF-003', 'TXN-REF-003');
      const [, updateDoc] = mockOrderUpdateMany.mock.calls[0] as [
        unknown,
        { $set: Record<string, unknown> },
      ];
      expect(updateDoc.$set.paymentStatus).toBe('paid');
      expect(updateDoc.$set.paymentMethod).toBe('card');
      expect(updateDoc.$set.paidAt).toBeInstanceOf(Date);
      expect(updateDoc.$set.businessDate).toBe(FIXED_BUSINESS_DATE);
    });
  });
});
