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
  },
}));

vi.mock('@/models/tab-model', () => ({
  default: {},
}));

vi.mock('@/services/audit-log-service', () => ({
  AuditLogService: {},
}));

vi.mock('@/services', () => ({
  TabService: {},
  OrderService: {},
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

vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {},
}));

const { getOrdersAction } = await import(
  '@/app/actions/admin/order-management-actions'
);

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
    expect(mockFind).toHaveBeenCalledWith({});
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
