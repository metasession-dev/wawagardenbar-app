/**
 * @requirement REQ-096 — OrderService.deleteOrder (soft-delete, ADR-002)
 *
 * Service-level coverage for the default (safe) path and the
 * super-admin override path with independent inventory/payment revert
 * choices. Mirrors the mocking style of
 * `__tests__/services/tab-service.delete-super-admin.test.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn(), connectDB: vi.fn() }));

const ORDER_ID = '65a1b2c3d4e5f6a7b8c9d0e1';
const DELETED_BY = '65a1b2c3d4e5f6a7b8c9d0e2';

const buildOrder = (overrides: Record<string, unknown> = {}) => ({
  _id: ORDER_ID,
  orderNumber: 'ORD-0001',
  status: 'cancelled',
  paymentStatus: 'pending',
  statusHistory: [] as unknown[],
  inventoryDeducted: false,
  save: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const mockFindById = vi.fn();
const mockUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });
const mockFindByIdAndUpdate = vi.fn().mockResolvedValue({});

vi.mock('@/models/order-model', () => ({
  default: {
    findById: (...a: unknown[]) => mockFindById(...a),
    updateOne: (...a: unknown[]) => mockUpdateOne(...a),
    findByIdAndUpdate: (...a: unknown[]) => ({
      lean: () => mockFindByIdAndUpdate(...a),
    }),
  },
}));

const mockAuditCreateLog = vi.fn().mockResolvedValue(undefined);
vi.mock('@/services/audit-log-service', () => ({
  AuditLogService: {
    createLog: (...a: unknown[]) => mockAuditCreateLog(...a),
  },
}));

const mockRestoreStockForOrder = vi.fn().mockResolvedValue(undefined);
vi.mock('@/services/inventory-service', () => ({
  default: {
    restoreStockForOrder: (...a: unknown[]) => mockRestoreStockForOrder(...a),
  },
}));

import { OrderService } from '@/services/order-service';

beforeEach(() => {
  mockFindById.mockReset();
  mockUpdateOne.mockReset();
  mockUpdateOne.mockResolvedValue({ modifiedCount: 1 });
  mockFindByIdAndUpdate.mockReset();
  mockFindByIdAndUpdate.mockResolvedValue({});
  mockAuditCreateLog.mockReset();
  mockAuditCreateLog.mockResolvedValue(undefined);
  mockRestoreStockForOrder.mockReset();
  mockRestoreStockForOrder.mockResolvedValue(undefined);
});

describe('OrderService.deleteOrder — default (no opts) path — AC1', () => {
  it('soft-deletes a cancelled, unpaid order with no override', async () => {
    mockFindById.mockResolvedValue(buildOrder());

    await OrderService.deleteOrder(ORDER_ID, DELETED_BY);

    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: ORDER_ID },
      {
        $set: {
          isDeleted: true,
          deletedAt: expect.any(Date),
          deletedBy: DELETED_BY,
        },
      }
    );

    const log = mockAuditCreateLog.mock.calls.find(
      (c) => c[0].action === 'order.delete'
    );
    expect(log).toBeDefined();
    expect(log![0].userRole).toBe('admin');
    expect(log![0].details.superAdminOverride).toBeUndefined();
  });

  it('throws for an order not found', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(
      OrderService.deleteOrder(ORDER_ID, DELETED_BY)
    ).rejects.toThrow(/not found/i);
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });
});

describe('OrderService.deleteOrder — default path guard — AC2', () => {
  it('throws when the order is not cancelled', async () => {
    mockFindById.mockResolvedValue(buildOrder({ status: 'preparing' }));

    await expect(
      OrderService.deleteOrder(ORDER_ID, DELETED_BY)
    ).rejects.toThrow(/live order/i);
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });

  it('throws when the order is paid, even if cancelled', async () => {
    mockFindById.mockResolvedValue(
      buildOrder({ status: 'cancelled', paymentStatus: 'paid' })
    );

    await expect(
      OrderService.deleteOrder(ORDER_ID, DELETED_BY)
    ).rejects.toThrow(/live order/i);
    expect(mockUpdateOne).not.toHaveBeenCalled();
  });
});

describe('OrderService.deleteOrder — super-admin override — AC3 (inventory)', () => {
  it('restocks inventory and force-cancels when deducted', async () => {
    const order = buildOrder({
      status: 'preparing',
      inventoryDeducted: true,
    });
    mockFindById.mockResolvedValue(order);

    await OrderService.deleteOrder(ORDER_ID, DELETED_BY, {
      superAdminOverride: true,
      revertInventory: true,
    });

    expect(mockRestoreStockForOrder).toHaveBeenCalledWith(ORDER_ID);
    expect(order.status).toBe('cancelled');
    // Targeted update, not a full-document `order.save()` (mirrors
    // TabService.deleteTab's revert path — avoids re-validating the
    // whole document for a status-only change).
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: ORDER_ID },
      expect.objectContaining({
        $set: { status: 'cancelled' },
        $push: expect.objectContaining({
          statusHistory: expect.objectContaining({ status: 'cancelled' }),
        }),
      })
    );

    const log = mockAuditCreateLog.mock.calls.find(
      (c) => c[0].action === 'order.delete'
    );
    expect(log![0].details.revertInventory).toBe(true);
    expect(log![0].details.inventoryReverted).toBe(true);
  });

  it('force-cancels but skips restock when inventory was not deducted', async () => {
    const order = buildOrder({
      status: 'preparing',
      inventoryDeducted: false,
    });
    mockFindById.mockResolvedValue(order);

    await OrderService.deleteOrder(ORDER_ID, DELETED_BY, {
      superAdminOverride: true,
      revertInventory: true,
    });

    expect(mockRestoreStockForOrder).not.toHaveBeenCalled();
    expect(order.status).toBe('cancelled');

    const log = mockAuditCreateLog.mock.calls.find(
      (c) => c[0].action === 'order.delete'
    );
    expect(log![0].details.inventoryReverted).toBe(false);
  });
});

describe('OrderService.deleteOrder — super-admin override — AC4 (payment)', () => {
  it('reverses payment when paid', async () => {
    const order = buildOrder({
      status: 'cancelled',
      paymentStatus: 'paid',
    });
    mockFindById.mockResolvedValue(order);

    await OrderService.deleteOrder(ORDER_ID, DELETED_BY, {
      superAdminOverride: true,
      revertPayment: true,
    });

    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      ORDER_ID,
      expect.objectContaining({ paymentStatus: 'refunded' }),
      { new: true }
    );

    const log = mockAuditCreateLog.mock.calls.find(
      (c) => c[0].action === 'order.delete'
    );
    expect(log![0].details.revertPayment).toBe(true);
    expect(log![0].details.paymentReverted).toBe(true);
  });

  it('is a no-op when the order is not paid (idempotent — R-014)', async () => {
    const order = buildOrder({
      status: 'cancelled',
      paymentStatus: 'pending',
    });
    mockFindById.mockResolvedValue(order);

    await OrderService.deleteOrder(ORDER_ID, DELETED_BY, {
      superAdminOverride: true,
      revertPayment: true,
    });

    expect(mockFindByIdAndUpdate).not.toHaveBeenCalled();

    const log = mockAuditCreateLog.mock.calls.find(
      (c) => c[0].action === 'order.delete'
    );
    expect(log![0].details.paymentReverted).toBe(false);
  });
});

describe('OrderService.deleteOrder — super-admin override — AC5 (leave as-is)', () => {
  it('soft-deletes without touching status/paymentStatus when neither is chosen', async () => {
    const order = buildOrder({
      status: 'preparing',
      paymentStatus: 'paid',
      inventoryDeducted: true,
    });
    mockFindById.mockResolvedValue(order);

    await OrderService.deleteOrder(ORDER_ID, DELETED_BY, {
      superAdminOverride: true,
      revertInventory: false,
      revertPayment: false,
    });

    expect(mockRestoreStockForOrder).not.toHaveBeenCalled();
    expect(mockFindByIdAndUpdate).not.toHaveBeenCalled();
    expect(order.status).toBe('preparing');
    expect(mockUpdateOne).toHaveBeenCalledWith(
      { _id: ORDER_ID },
      expect.objectContaining({
        $set: expect.objectContaining({ isDeleted: true }),
      })
    );

    const log = mockAuditCreateLog.mock.calls.find(
      (c) => c[0].action === 'order.delete'
    );
    expect(log![0].details.superAdminOverride).toBe(true);
    expect(log![0].details.inventoryReverted).toBe(false);
    expect(log![0].details.paymentReverted).toBe(false);
  });
});
