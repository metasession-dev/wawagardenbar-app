/**
 * Service-level coverage for TabService.deleteTab with the super-admin
 * override opts. The default (no-opts) path retains its existing guards.
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

type OrderStub = {
  _id: string;
  status:
    | 'pending'
    | 'confirmed'
    | 'preparing'
    | 'ready'
    | 'delivered'
    | 'cancelled';
  inventoryDeducted?: boolean;
};

const buildTab = (overrides: Record<string, unknown> = {}) => ({
  _id: TAB_ID,
  tabNumber: 'TAB-A1-123456',
  tableNumber: 'A1',
  status: 'open' as 'open' | 'settling' | 'closed',
  paymentStatus: 'pending' as 'pending' | 'paid' | 'failed',
  customerEmail: 'guest@example.com',
  orders: [ORDER_ID_A, ORDER_ID_B],
  ...overrides,
});

const mockTabFindById = vi.fn();
const mockTabFindByIdAndDelete = vi.fn().mockResolvedValue(undefined);
const mockOrderFind = vi.fn();
const mockOrderUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });
const mockAuditCreateLog = vi.fn().mockResolvedValue(undefined);
const mockRestoreStockForOrder = vi.fn().mockResolvedValue(undefined);

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

vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getBusinessDayCutoff: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('@/services/settings-service', () => ({
  default: {},
}));

vi.mock('@/lib/business-date', () => ({
  deriveBusinessDate: vi.fn(() => new Date('2026-05-23T00:00:00Z')),
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
});

describe('TabService.deleteTab — default (no opts) path', () => {
  it('throws when tab is closed and paid', async () => {
    mockTabFindById.mockResolvedValue(
      buildTab({ status: 'closed', paymentStatus: 'paid' })
    );
    mockOrderFind.mockResolvedValue([]);

    await expect(TabService.deleteTab(TAB_ID, DELETED_BY)).rejects.toThrow(
      /closed\/paid tab/i
    );
    expect(mockTabFindByIdAndDelete).not.toHaveBeenCalled();
  });

  it('throws when any linked order is not cancelled', async () => {
    mockTabFindById.mockResolvedValue(buildTab());
    const orders: OrderStub[] = [
      { _id: ORDER_ID_A, status: 'delivered', inventoryDeducted: true },
      { _id: ORDER_ID_B, status: 'cancelled' },
    ];
    mockOrderFind.mockResolvedValue(orders);

    await expect(TabService.deleteTab(TAB_ID, DELETED_BY)).rejects.toThrow(
      /cancel all 1 order/i
    );
    expect(mockTabFindByIdAndDelete).not.toHaveBeenCalled();
    expect(mockRestoreStockForOrder).not.toHaveBeenCalled();
  });
});

describe('TabService.deleteTab — super-admin override', () => {
  it('with revertItems=true: restocks and cancels each non-cancelled order, deletes tab, writes per-order + tab audit logs', async () => {
    mockTabFindById.mockResolvedValue(buildTab());
    const orders: OrderStub[] = [
      { _id: ORDER_ID_A, status: 'delivered', inventoryDeducted: true },
      { _id: ORDER_ID_B, status: 'preparing', inventoryDeducted: true },
    ];
    mockOrderFind.mockResolvedValue(orders);

    await TabService.deleteTab(TAB_ID, DELETED_BY, {
      superAdminOverride: true,
      revertItems: true,
    });

    expect(mockRestoreStockForOrder).toHaveBeenCalledTimes(2);
    expect(mockRestoreStockForOrder).toHaveBeenCalledWith(ORDER_ID_A);
    expect(mockRestoreStockForOrder).toHaveBeenCalledWith(ORDER_ID_B);

    expect(mockOrderUpdateOne).toHaveBeenCalledTimes(2);
    const setCalls = mockOrderUpdateOne.mock.calls.map((c) => c[1]);
    for (const setCall of setCalls) {
      expect(setCall.$set).toEqual({ status: 'cancelled' });
      expect(setCall.$push.statusHistory.status).toBe('cancelled');
      expect(setCall.$push.statusHistory.note).toMatch(/super-admin/i);
    }

    const cancelLogs = mockAuditCreateLog.mock.calls.filter(
      (c) => c[0].action === 'order.cancel'
    );
    expect(cancelLogs).toHaveLength(2);
    for (const [log] of cancelLogs) {
      expect(log.userRole).toBe('super-admin');
      expect(log.details.viaTabDelete).toBe(true);
      expect(log.details.inventoryRestored).toBe(true);
    }

    const tabLog = mockAuditCreateLog.mock.calls.find(
      (c) => c[0].action === 'tab.delete'
    );
    expect(tabLog).toBeDefined();
    expect(tabLog![0].userRole).toBe('super-admin');
    expect(tabLog![0].details.superAdminOverride).toBe(true);
    expect(tabLog![0].details.revertItems).toBe(true);
    expect(tabLog![0].details.ordersAffected).toEqual([ORDER_ID_A, ORDER_ID_B]);
    expect(tabLog![0].details.inventoryRestored).toBe(2);

    expect(mockTabFindByIdAndDelete).toHaveBeenCalledWith(TAB_ID);
  });

  it('with revertItems=false: leaves orders untouched, deletes tab, writes only tab.delete log', async () => {
    mockTabFindById.mockResolvedValue(buildTab());
    const orders: OrderStub[] = [
      { _id: ORDER_ID_A, status: 'delivered', inventoryDeducted: true },
    ];
    mockOrderFind.mockResolvedValue(orders);

    await TabService.deleteTab(TAB_ID, DELETED_BY, {
      superAdminOverride: true,
      revertItems: false,
    });

    expect(mockRestoreStockForOrder).not.toHaveBeenCalled();
    expect(mockOrderUpdateOne).not.toHaveBeenCalled();

    const cancelLogs = mockAuditCreateLog.mock.calls.filter(
      (c) => c[0].action === 'order.cancel'
    );
    expect(cancelLogs).toHaveLength(0);

    const tabLog = mockAuditCreateLog.mock.calls.find(
      (c) => c[0].action === 'tab.delete'
    );
    expect(tabLog).toBeDefined();
    expect(tabLog![0].details.superAdminOverride).toBe(true);
    expect(tabLog![0].details.revertItems).toBe(false);
    expect(tabLog![0].details.ordersAffected).toEqual([]);
    expect(tabLog![0].details.inventoryRestored).toBe(0);

    expect(mockTabFindByIdAndDelete).toHaveBeenCalledWith(TAB_ID);
  });

  it('deletes a closed+paid tab', async () => {
    mockTabFindById.mockResolvedValue(
      buildTab({ status: 'closed', paymentStatus: 'paid', orders: [] })
    );
    mockOrderFind.mockResolvedValue([]);

    await TabService.deleteTab(TAB_ID, DELETED_BY, {
      superAdminOverride: true,
      revertItems: true,
    });

    expect(mockTabFindByIdAndDelete).toHaveBeenCalledWith(TAB_ID);
    const tabLog = mockAuditCreateLog.mock.calls.find(
      (c) => c[0].action === 'tab.delete'
    );
    expect(tabLog![0].details.superAdminOverride).toBe(true);
  });

  it('skips restock when order.inventoryDeducted=false, still cancels and audit-logs', async () => {
    mockTabFindById.mockResolvedValue(buildTab({ orders: [ORDER_ID_A] }));
    const orders: OrderStub[] = [
      { _id: ORDER_ID_A, status: 'delivered', inventoryDeducted: false },
    ];
    mockOrderFind.mockResolvedValue(orders);

    await TabService.deleteTab(TAB_ID, DELETED_BY, {
      superAdminOverride: true,
      revertItems: true,
    });

    expect(mockRestoreStockForOrder).not.toHaveBeenCalled();
    expect(mockOrderUpdateOne).toHaveBeenCalledTimes(1);

    const cancelLogs = mockAuditCreateLog.mock.calls.filter(
      (c) => c[0].action === 'order.cancel'
    );
    expect(cancelLogs).toHaveLength(1);
    expect(cancelLogs[0][0].details.inventoryRestored).toBe(false);

    const tabLog = mockAuditCreateLog.mock.calls.find(
      (c) => c[0].action === 'tab.delete'
    );
    expect(tabLog![0].details.inventoryRestored).toBe(0);
  });
});
