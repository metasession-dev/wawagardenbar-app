/**
 * @requirement REQ-ORDMGT-020 (REQ-124 AC7) — delivery status steps.
 * `updateOrderStatusAction` calls `notifyOrderStatus` once per save;
 * `batchUpdateOrdersAction` reaches it only through that action (no extra call).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFindById = vi.fn();
const notifyOrderStatus = vi.hoisted(() => vi.fn());

vi.mock('next/headers', () => ({ cookies: vi.fn().mockResolvedValue({}) }));
vi.mock('iron-session', () => ({
  getIronSession: vi
    .fn()
    .mockResolvedValue({ userId: 'staff-1', role: 'admin', roles: ['admin'] }),
}));
vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));
vi.mock('@/models/order-model', () => ({
  default: { findById: (...a: unknown[]) => mockFindById(...a) },
}));
vi.mock('@/models/tab-model', () => ({
  default: { exists: vi.fn().mockResolvedValue(null) },
}));
vi.mock('@/services/audit-log-service', () => ({
  AuditLogService: { createLog: vi.fn() },
}));
vi.mock('@/services', () => ({ TabService: {}, OrderService: {} }));
vi.mock('@/services/inventory-service', () => ({ default: {} }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/socket-emit-helper', () => ({
  emitBatchUpdateEvent: vi.fn(),
  emitOrderUpdatedEvent: vi.fn(),
  emitOrderCancelledEvent: vi.fn(),
}));
vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {
    getBusinessDayCutoff: vi.fn().mockResolvedValue('15:00'),
  },
}));
vi.mock('@/lib/business-date', () => ({
  deriveBusinessDate: vi.fn(() => new Date()),
}));
vi.mock('@/services/order-status-notifier', () => ({ notifyOrderStatus }));

const { updateOrderStatusAction } = await import(
  '@/app/actions/admin/order-management-actions'
);

const build = (id: string, orderType: string, status: string) => {
  const history: unknown[] = [];
  history.push = vi.fn();
  return {
    _id: id,
    status,
    orderType,
    paymentStatus: 'paid',
    inventoryDeducted: true,
    statusHistory: history,
    save: vi.fn().mockResolvedValue(undefined),
  };
};

describe('REQ-124 AC7: delivery steps in updateOrderStatusAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notifyOrderStatus.mockResolvedValue({ sent: true });
  });

  it('[US-A4.2] a ready delivery order goes out-for-delivery, then delivered, and each step notifies once', async () => {
    const order = build('d1', 'delivery', 'ready');
    mockFindById.mockResolvedValue(order);
    expect(
      (await updateOrderStatusAction('d1', 'out-for-delivery')).success
    ).toBe(true);
    expect(order.status).toBe('out-for-delivery');
    expect((await updateOrderStatusAction('d1', 'delivered')).success).toBe(
      true
    );
    expect(order.status).toBe('delivered');
    expect(notifyOrderStatus.mock.calls).toEqual([
      ['d1', 'out-for-delivery'],
      ['d1', 'delivered'],
    ]);
  });

  it('refuses out-for-delivery for a pickup order and notifies nobody', async () => {
    mockFindById.mockResolvedValue(build('p1', 'pickup', 'ready'));
    const result = await updateOrderStatusAction('p1', 'out-for-delivery');
    expect(result.success).toBe(false);
    expect(result.error).toContain(
      'Cannot transition from ready to out-for-delivery'
    );
    expect(notifyOrderStatus).not.toHaveBeenCalled();
  });

  it('refuses skipping a step on a delivery order', async () => {
    mockFindById.mockResolvedValue(build('d2', 'delivery', 'ready'));
    expect((await updateOrderStatusAction('d2', 'delivered')).success).toBe(
      false
    );
    expect(notifyOrderStatus).not.toHaveBeenCalled();
  });
});
