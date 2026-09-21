/**
 * @requirement REQ-090 — Unit tests for getOrdersAction serialization hardening.
 *
 * Covers AC1.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCookies = vi.fn();
const mockGetIronSession = vi.fn();
const mockConnectDB = vi.fn();
const mockCountDocuments = vi.fn();
const mockFind = vi.fn();
const mockFindById = vi.fn();

vi.mock('next/headers', () => ({
  cookies: mockCookies,
}));

vi.mock('iron-session', () => ({
  getIronSession: mockGetIronSession,
}));

vi.mock('@/lib/mongodb', () => ({
  connectDB: mockConnectDB,
}));

vi.mock('@/models/order-model', () => ({
  default: {
    countDocuments: mockCountDocuments,
    find: mockFind,
    findById: (...a: unknown[]) => mockFindById(...a),
  },
}));

const mockTabExists = vi.fn();

vi.mock('@/models/tab-model', () => ({
  default: {
    exists: (...a: unknown[]) => mockTabExists(...a),
  },
}));

const mockCreateLog = vi.fn();

vi.mock('@/services/audit-log-service', () => ({
  AuditLogService: {
    createLog: (...a: unknown[]) => mockCreateLog(...a),
  },
}));

const mockDeleteOrder = vi.fn();

vi.mock('@/services', () => ({
  TabService: {},
  OrderService: {
    deleteOrder: (...a: unknown[]) => mockDeleteOrder(...a),
  },
}));

vi.mock('@/services/inventory-service', () => ({
  default: {},
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/socket-emit-helper', () => ({
  emitBatchUpdateEvent: vi.fn(),
  emitOrderUpdatedEvent: vi.fn(),
  emitOrderCancelledEvent: vi.fn(),
}));

const mockGetBusinessDayCutoff = vi.fn();

vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getBusinessDayCutoff: (...a: unknown[]) => mockGetBusinessDayCutoff(...a),
  },
}));

const FIXED_BUSINESS_DATE = new Date('2026-09-21T00:00:00.000Z');

vi.mock('@/lib/business-date', () => ({
  deriveBusinessDate: vi.fn(() => FIXED_BUSINESS_DATE),
}));

const { getOrdersAction, deleteOrderAction, updateOrderStatusAction } =
  await import('@/app/actions/admin/order-management-actions');

describe('REQ-090: getOrdersAction serialization hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.mockResolvedValue({});
    mockGetIronSession.mockResolvedValue({
      userId: 'admin-1',
      role: 'admin',
    });
    mockConnectDB.mockResolvedValue(undefined);
    mockCountDocuments.mockResolvedValue(1);
  });

  it('AC1 — serializes orders without updatedAt using createdAt fallback', async () => {
    const createdAt = new Date('2026-07-08T20:00:00.000Z');
    const lean = vi.fn().mockResolvedValue([
      {
        _id: { toString: () => 'order-1' },
        orderNumber: 'ORD-001',
        orderType: 'pickup',
        status: 'ready',
        items: [],
        total: 2500,
        paymentStatus: 'paid',
        specialInstructions: 'No onions',
        createdAt,
        updatedAt: undefined,
      },
    ]);
    const limit = vi.fn(() => ({ lean }));
    const skip = vi.fn(() => ({ limit }));
    const sort = vi.fn(() => ({ skip }));
    mockFind.mockReturnValue({ sort });

    const result = await getOrdersAction({}, 1, 50);

    expect(result.success).toBe(true);
    // REQ-096 — soft-deleted orders excluded by default (ADR-002).
    expect(mockFind).toHaveBeenCalledWith({ isDeleted: { $ne: true } });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(skip).toHaveBeenCalledWith(0);
    expect(limit).toHaveBeenCalledWith(50);
    expect(result.data).toMatchObject({
      total: 1,
      page: 1,
      pages: 1,
      orders: [
        {
          _id: 'order-1',
          orderNumber: 'ORD-001',
          createdAt: createdAt.toISOString(),
          updatedAt: createdAt.toISOString(),
        },
      ],
    });
  });
});

describe('REQ-096: deleteOrderAction role gate — AC2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.mockResolvedValue({});
    mockDeleteOrder.mockResolvedValue(undefined);
  });

  it('rejects when not logged in', async () => {
    mockGetIronSession.mockResolvedValue({ isLoggedIn: false });

    const result = await deleteOrderAction('order-1');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/unauthorized/i);
    expect(mockDeleteOrder).not.toHaveBeenCalled();
  });

  it('rejects an override attempt from a non-super-admin, regardless of client input', async () => {
    mockGetIronSession.mockResolvedValue({
      isLoggedIn: true,
      userId: 'admin-1',
      role: 'admin',
    });

    const result = await deleteOrderAction('order-1', {
      superAdminOverride: true,
      revertInventory: true,
      revertPayment: true,
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/only super-admin/i);
    expect(mockDeleteOrder).not.toHaveBeenCalled();
  });

  it('allows a plain admin to delete without override', async () => {
    mockGetIronSession.mockResolvedValue({
      isLoggedIn: true,
      userId: 'admin-1',
      role: 'admin',
      email: 'admin@wgb.test',
    });

    const result = await deleteOrderAction('order-1');

    expect(result.success).toBe(true);
    expect(mockDeleteOrder).toHaveBeenCalledWith('order-1', 'admin-1', {
      deletedByEmail: 'admin@wgb.test',
    });
  });

  it('allows a super-admin override with revert choices', async () => {
    mockGetIronSession.mockResolvedValue({
      isLoggedIn: true,
      userId: 'super-1',
      role: 'super-admin',
      email: 'super@wgb.test',
    });

    const result = await deleteOrderAction('order-1', {
      superAdminOverride: true,
      revertInventory: true,
      revertPayment: false,
    });

    expect(result.success).toBe(true);
    expect(mockDeleteOrder).toHaveBeenCalledWith('order-1', 'super-1', {
      superAdminOverride: true,
      revertInventory: true,
      revertPayment: false,
      deletedByEmail: 'super@wgb.test',
    });
  });

  it('surfaces the service error message on failure', async () => {
    mockGetIronSession.mockResolvedValue({
      isLoggedIn: true,
      userId: 'admin-1',
      role: 'admin',
    });
    mockDeleteOrder.mockRejectedValue(new Error('Cannot delete a live order.'));

    const result = await deleteOrderAction('order-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Cannot delete a live order.');
  });
});

describe('REQ-108: updateOrderStatusAction auto-mark-cash guard', () => {
  const buildOrder = (overrides: Record<string, unknown> = {}) => {
    const order: Record<string, unknown> = {
      _id: 'order-1',
      status: 'ready',
      tabId: undefined,
      paymentStatus: 'pending',
      paymentMethod: undefined,
      paymentReference: undefined,
      paidAt: undefined,
      businessDate: undefined,
      inventoryDeducted: true, // skip the completeOrder/inventory chokepoint entirely
      statusHistory: [] as unknown[],
      save: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    };
    (order.statusHistory as unknown[]).push = vi.fn();
    return order;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.mockResolvedValue({});
    mockGetIronSession.mockResolvedValue({
      userId: 'kitchen-1',
      role: 'kitchen-staff',
    });
    mockConnectDB.mockResolvedValue(undefined);
    mockTabExists.mockResolvedValue(null);
    mockGetBusinessDayCutoff.mockResolvedValue('15:00');
    mockCreateLog.mockResolvedValue(undefined);
  });

  it('AC2 — auto-marks a non-tab order paid/cash on completion (regression guard)', async () => {
    const order = buildOrder();
    mockFindById.mockResolvedValue(order);

    const result = await updateOrderStatusAction('order-1', 'completed');

    expect(result.success).toBe(true);
    expect(order.paymentStatus).toBe('paid');
    expect(order.paymentMethod).toBe('cash');
    expect(order.paymentReference).toMatch(/^CASH-\d+$/);
    expect(order.paidAt).toBeInstanceOf(Date);
    expect(order.businessDate).toBe(FIXED_BUSINESS_DATE);
  });

  it('AC1 — does NOT auto-mark a tab order paid when Order.tabId is set', async () => {
    const order = buildOrder({ tabId: 'tab-1' });
    mockFindById.mockResolvedValue(order);

    const result = await updateOrderStatusAction('order-1', 'completed');

    expect(result.success).toBe(true);
    expect(order.paymentStatus).toBe('pending');
    expect(order.paymentMethod).toBeUndefined();
    expect(mockTabExists).not.toHaveBeenCalled();
  });

  it('AC1 — does NOT auto-mark a tab order paid via the TabModel.exists fallback (the actual historical bug scenario: tabId unset but genuinely tab-linked)', async () => {
    const order = buildOrder({ tabId: undefined });
    mockFindById.mockResolvedValue(order);
    mockTabExists.mockResolvedValue({ _id: 'tab-1' });

    const result = await updateOrderStatusAction('order-1', 'completed');

    expect(result.success).toBe(true);
    expect(mockTabExists).toHaveBeenCalledWith({ orders: 'order-1' });
    expect(order.paymentStatus).toBe('pending');
    expect(order.paymentMethod).toBeUndefined();
  });

  it('does not double-stamp an order that is already paid', async () => {
    const order = buildOrder({
      paymentStatus: 'paid',
      paymentMethod: 'card',
      paymentReference: 'EXISTING-REF',
    });
    mockFindById.mockResolvedValue(order);

    const result = await updateOrderStatusAction('order-1', 'completed');

    expect(result.success).toBe(true);
    expect(order.paymentMethod).toBe('card');
    expect(order.paymentReference).toBe('EXISTING-REF');
    expect(mockTabExists).not.toHaveBeenCalled();
  });

  it('completion still succeeds (non-fatal) when getBusinessDayCutoff rejects', async () => {
    const order = buildOrder();
    mockFindById.mockResolvedValue(order);
    mockGetBusinessDayCutoff.mockRejectedValue(new Error('settings down'));

    const result = await updateOrderStatusAction('order-1', 'completed');

    expect(result.success).toBe(true);
    expect(order.status).toBe('completed');
    expect(order.paymentStatus).toBe('pending');
    expect(order.paymentMethod).toBeUndefined();
  });
});
