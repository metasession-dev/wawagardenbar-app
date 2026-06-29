/**
 * @requirement REQ-048 — Order cancellation reverses points + restores rewards (#117 P0 #2)
 *
 * Service-level tests for OrderService.cancelOrder's new reversal step. The
 * model + downstream services are mocked; we assert the reversal is invoked,
 * the status guard holds, and a reversal failure does not abort the cancel.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn(), connectDB: vi.fn() }));

const ORDER_ID = '65a1b2c3d4e5f6a7b8c9d0e1';
const USER_ID = '65a1b2c3d4e5f6a7b8c9d0e2';

const buildOrder = (overrides: Record<string, unknown> = {}) => ({
  _id: ORDER_ID,
  userId: USER_ID,
  status: 'confirmed',
  statusHistory: [] as unknown[],
  pointsUsed: 200,
  appliedRewards: [] as unknown[],
  inventoryDeducted: false,
  save: vi.fn().mockResolvedValue(undefined),
  toObject: vi.fn(function (this: Record<string, unknown>) {
    return { ...this };
  }),
  ...overrides,
});

const mockFindById = vi.fn();
vi.mock('@/models/order-model', () => ({
  default: { findById: (...a: unknown[]) => mockFindById(...a) },
}));

const mockReverse = vi.fn();
vi.mock('@/services/points-service', () => ({
  PointsService: {
    reverseOrderTransactions: (...a: unknown[]) => mockReverse(...a),
  },
}));

const mockRestore = vi.fn();
vi.mock('@/services/rewards-service', () => ({
  RewardsService: {
    restoreRedeemedRewards: (...a: unknown[]) => mockRestore(...a),
  },
}));

vi.mock('@/services/inventory-service', () => ({
  default: { restoreStockForOrder: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@/services/incident-event-service', () => ({
  IncidentEventService: {
    recordIncident: vi.fn().mockResolvedValue({ _id: 'ie-1' }),
  },
}));

import { OrderService } from '@/services/order-service';

beforeEach(() => {
  vi.clearAllMocks();
  mockReverse.mockResolvedValue(null);
  mockRestore.mockResolvedValue(0);
});

describe('REQ-048: OrderService.cancelOrder reversal', () => {
  it('reverses points and restores rewards on cancellation', async () => {
    const order = buildOrder();
    mockFindById.mockResolvedValue(order);

    await OrderService.cancelOrder(ORDER_ID, 'customer changed mind');

    expect(order.status).toBe('cancelled');
    expect(mockReverse).toHaveBeenCalledWith(USER_ID, ORDER_ID);
    expect(mockRestore).toHaveBeenCalledWith(ORDER_ID);
  });

  it('throws for orders past the cancellable stage (idempotent guard)', async () => {
    mockFindById.mockResolvedValue(buildOrder({ status: 'completed' }));

    await expect(OrderService.cancelOrder(ORDER_ID)).rejects.toThrow(
      /cannot be cancelled/
    );
    expect(mockReverse).not.toHaveBeenCalled();
  });

  it('does not abort the cancel when reversal throws (logged, not fatal)', async () => {
    const order = buildOrder();
    mockFindById.mockResolvedValue(order);
    mockReverse.mockRejectedValue(new Error('points db down'));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await OrderService.cancelOrder(ORDER_ID);

    expect(result).not.toBeNull();
    expect(order.status).toBe('cancelled');
    expect(errSpy).toHaveBeenCalled();
    expect(mockRestore).toHaveBeenCalledWith(ORDER_ID); // still attempted
    errSpy.mockRestore();
  });

  it('skips points reversal for guest orders without a userId', async () => {
    const order = buildOrder({ userId: undefined });
    mockFindById.mockResolvedValue(order);

    await OrderService.cancelOrder(ORDER_ID);

    expect(mockReverse).not.toHaveBeenCalled();
    expect(mockRestore).toHaveBeenCalledWith(ORDER_ID);
  });
});
