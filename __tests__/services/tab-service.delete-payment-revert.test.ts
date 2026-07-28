/**
 * @requirement REQ-096 — TabService.deleteTab's new `revertPayment` opt.
 *
 * Covers AC6 (reverse payment on paid linked orders) and AC7 (refused
 * when the tab has partial/split payments). Mirrors the mocking style
 * of `__tests__/services/tab-service.delete-super-admin.test.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn(),
  connectDB: vi.fn(),
}));

const TAB_ID = '65a1b2c3d4e5f6a7b8c9d0e1';
const DELETED_BY = '65a1b2c3d4e5f6a7b8c9d0e2';
const ORDER_ID_A = '65a1b2c3d4e5f6a7b8c9d0aa';
const ORDER_ID_B = '65a1b2c3d4e5f6a7b8c9d0bb';

const buildTab = (overrides: Record<string, unknown> = {}) => ({
  _id: TAB_ID,
  tabNumber: 'TAB-A1-123456',
  tableNumber: 'A1',
  status: 'open' as 'open' | 'settling' | 'closed',
  paymentStatus: 'pending' as 'pending' | 'paid' | 'failed',
  customerEmail: 'guest@example.com',
  orders: [ORDER_ID_A, ORDER_ID_B],
  partialPayments: [] as unknown[],
  ...overrides,
});

const mockTabFindById = vi.fn();
const mockTabFindByIdAndDelete = vi.fn().mockResolvedValue(undefined);
const mockOrderFind = vi.fn();
const mockOrderUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });
const mockAuditCreateLog = vi.fn().mockResolvedValue(undefined);
const mockRestoreStockForOrder = vi.fn().mockResolvedValue(undefined);
const mockUpdatePaymentStatus = vi.fn().mockResolvedValue({});

vi.mock('@/models/tab-model', () => ({
  default: {
    findById: (...args: unknown[]) => mockTabFindById(...args),
    findByIdAndDelete: (...args: unknown[]) =>
      mockTabFindByIdAndDelete(...args),
  },
}));

vi.mock('@/models/order-model', () => ({
  default: {
    find: (...args: unknown[]) => mockOrderFind(...args),
    updateOne: (...args: unknown[]) => mockOrderUpdateOne(...args),
  },
}));

vi.mock('@/services/audit-log-service', () => ({
  AuditLogService: {
    createLog: (...args: unknown[]) => mockAuditCreateLog(...args),
  },
}));

vi.mock('@/services/inventory-service', () => ({
  default: {
    restoreStockForOrder: (...args: unknown[]) =>
      mockRestoreStockForOrder(...args),
  },
}));

vi.mock('@/services/order-service', () => ({
  OrderService: {
    updatePaymentStatus: (...args: unknown[]) =>
      mockUpdatePaymentStatus(...args),
  },
}));

import { TabService } from '@/services/tab-service';

beforeEach(() => {
  mockTabFindById.mockReset();
  mockTabFindByIdAndDelete.mockReset();
  mockTabFindByIdAndDelete.mockResolvedValue(undefined);
  mockOrderFind.mockReset();
  mockOrderUpdateOne.mockReset();
  mockOrderUpdateOne.mockResolvedValue({ modifiedCount: 1 });
  mockAuditCreateLog.mockReset();
  mockAuditCreateLog.mockResolvedValue(undefined);
  mockRestoreStockForOrder.mockReset();
  mockRestoreStockForOrder.mockResolvedValue(undefined);
  mockUpdatePaymentStatus.mockReset();
  mockUpdatePaymentStatus.mockResolvedValue({});
});

describe('TabService.deleteTab — revertPayment — AC6', () => {
  it('reverses payment on every paid linked order, leaves unpaid ones alone', async () => {
    mockTabFindById.mockResolvedValue(buildTab());
    mockOrderFind.mockResolvedValue([
      { _id: ORDER_ID_A, status: 'cancelled', paymentStatus: 'paid' },
      { _id: ORDER_ID_B, status: 'cancelled', paymentStatus: 'pending' },
    ]);

    await TabService.deleteTab(TAB_ID, DELETED_BY, {
      superAdminOverride: true,
      revertPayment: true,
    });

    expect(mockUpdatePaymentStatus).toHaveBeenCalledTimes(1);
    expect(mockUpdatePaymentStatus).toHaveBeenCalledWith(ORDER_ID_A, {
      paymentStatus: 'refunded',
    });

    const tabLog = mockAuditCreateLog.mock.calls.find(
      (c) => c[0].action === 'tab.delete'
    );
    expect(tabLog![0].details.revertPayment).toBe(true);
    expect(tabLog![0].details.paymentRevertedOrders).toEqual([ORDER_ID_A]);
  });

  it('is independent of revertItems — both can be chosen together', async () => {
    mockTabFindById.mockResolvedValue(buildTab());
    mockOrderFind.mockResolvedValue([
      {
        _id: ORDER_ID_A,
        status: 'preparing',
        paymentStatus: 'paid',
        inventoryDeducted: true,
      },
    ]);

    await TabService.deleteTab(TAB_ID, DELETED_BY, {
      superAdminOverride: true,
      revertItems: true,
      revertPayment: true,
    });

    expect(mockRestoreStockForOrder).toHaveBeenCalledWith(ORDER_ID_A);
    expect(mockUpdatePaymentStatus).toHaveBeenCalledWith(ORDER_ID_A, {
      paymentStatus: 'refunded',
    });

    const tabLog = mockAuditCreateLog.mock.calls.find(
      (c) => c[0].action === 'tab.delete'
    );
    expect(tabLog![0].details.revertItems).toBe(true);
    expect(tabLog![0].details.revertPayment).toBe(true);
  });
});

describe('TabService.deleteTab — partialPayments guard — AC7', () => {
  it('refuses revertPayment when the tab has partial payments', async () => {
    mockTabFindById.mockResolvedValue(
      buildTab({ partialPayments: [{ amount: 1000 }] })
    );

    await expect(
      TabService.deleteTab(TAB_ID, DELETED_BY, {
        superAdminOverride: true,
        revertPayment: true,
      })
    ).rejects.toThrow(/partial\/split payments/i);

    expect(mockUpdatePaymentStatus).not.toHaveBeenCalled();
    expect(mockTabFindByIdAndDelete).not.toHaveBeenCalled();
  });

  it('still allows deletion via revertItems when partial payments are present', async () => {
    mockTabFindById.mockResolvedValue(
      buildTab({ partialPayments: [{ amount: 1000 }] })
    );
    mockOrderFind.mockResolvedValue([
      { _id: ORDER_ID_A, status: 'preparing', inventoryDeducted: true },
    ]);

    await TabService.deleteTab(TAB_ID, DELETED_BY, {
      superAdminOverride: true,
      revertItems: true,
    });

    expect(mockRestoreStockForOrder).toHaveBeenCalledWith(ORDER_ID_A);
    expect(mockTabFindByIdAndDelete).toHaveBeenCalledWith(TAB_ID);
  });
});
