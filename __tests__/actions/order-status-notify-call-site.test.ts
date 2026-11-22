/**
 * @requirement REQ-ORDER-007 (REQ-124 AC1, AC2) — single call site.
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
  SystemSettingsService: { getBusinessDayCutoff: vi.fn().mockResolvedValue('15:00') },
}));
vi.mock('@/lib/business-date', () => ({ deriveBusinessDate: vi.fn(() => new Date()) }));
vi.mock('@/services/order-status-notifier', () => ({ notifyOrderStatus }));

const { updateOrderStatusAction, batchUpdateOrdersAction } = await import(
  '@/app/actions/admin/order-management-actions'
);

const build = (id: string) => {
  const history: unknown[] = [];
  history.push = vi.fn();
  return {
    _id: id,
    status: 'preparing',
    paymentStatus: 'paid',
    inventoryDeducted: true,
    statusHistory: history,
    save: vi.fn().mockResolvedValue(undefined),
  };
};

describe('REQ-124 AC2: one call site for customer status messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notifyOrderStatus.mockResolvedValue({ sent: true });
  });

  it('calls notifyOrderStatus once after the status is saved', async () => {
    const order = build('o1');
    mockFindById.mockResolvedValue(order);
    const result = await updateOrderStatusAction('o1', 'ready');
    expect(result.success).toBe(true);
    expect(order.save).toHaveBeenCalled();
    expect(notifyOrderStatus).toHaveBeenCalledTimes(1);
    expect(notifyOrderStatus).toHaveBeenCalledWith('o1', 'ready');
    expect(order.save.mock.invocationCallOrder[0]).toBeLessThan(
      notifyOrderStatus.mock.invocationCallOrder[0]
    );
  });

  it('does not call it when the order is not found', async () => {
    mockFindById.mockResolvedValue(null);
    const result = await updateOrderStatusAction('missing', 'ready');
    expect(result.success).toBe(false);
    expect(notifyOrderStatus).not.toHaveBeenCalled();
  });

  it('still succeeds when notifyOrderStatus reports a failed send', async () => {
    mockFindById.mockResolvedValue(build('o1'));
    notifyOrderStatus.mockResolvedValue({ sent: false, reason: 'send_failed' });
    const result = await updateOrderStatusAction('o1', 'ready');
    expect(result.success).toBe(true);
  });

  it('a batch of three orders produces exactly three calls, one per order', async () => {
    mockFindById.mockImplementation(async (id: string) => build(id));
    const result = await batchUpdateOrdersAction(['a', 'b', 'c'], 'updateStatus', {
      status: 'ready',
    });
    expect(result.success).toBe(true);
    expect(notifyOrderStatus.mock.calls).toEqual([
      ['a', 'ready'],
      ['b', 'ready'],
      ['c', 'ready'],
    ]);
  });
});
