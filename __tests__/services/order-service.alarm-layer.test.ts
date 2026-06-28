/**
 * @requirement REQ-088 — Catch-site refactoring: IncidentEvent written on failure
 *
 * AC8: cancelOrder inventory restoration failure → IncidentEvent written
 *      cancelOrder points reversal failure → IncidentEvent written
 *      cancelOrder reward restoration failure → IncidentEvent written
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

const mockRestoreStock = vi.fn();
vi.mock('@/services/inventory-service', () => ({
  default: {
    restoreStockForOrder: (...a: unknown[]) => mockRestoreStock(...a),
  },
}));

const mockRecordIncident = vi.fn();
vi.mock('@/services/incident-event-service', () => ({
  IncidentEventService: {
    recordIncident: (...a: unknown[]) => mockRecordIncident(...a),
  },
}));

import { OrderService } from '@/services/order-service';

beforeEach(() => {
  vi.clearAllMocks();
  mockReverse.mockResolvedValue(null);
  mockRestore.mockResolvedValue(0);
  mockRestoreStock.mockResolvedValue(undefined);
  mockRecordIncident.mockResolvedValue({ _id: 'ie-1' });
});

describe('REQ-088: cancelOrder writes IncidentEvent on inventory restoration failure', () => {
  it('AC8 — writes inventory_deduction_failed incident when restoreStockForOrder throws', async () => {
    const order = buildOrder({ inventoryDeducted: true });
    mockFindById.mockResolvedValue(order);
    mockRestoreStock.mockRejectedValue(new Error('stock restore failed'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await OrderService.cancelOrder(ORDER_ID);

    expect(mockRecordIncident).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'inventory_deduction_failed',
        entityId: ORDER_ID,
      })
    );
  });
});

describe('REQ-088: cancelOrder writes IncidentEvent on points reversal failure', () => {
  it('AC8 — writes points_award_failed incident when reverseOrderTransactions throws', async () => {
    const order = buildOrder();
    mockFindById.mockResolvedValue(order);
    mockReverse.mockRejectedValue(new Error('points db down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await OrderService.cancelOrder(ORDER_ID);

    expect(mockRecordIncident).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'points_award_failed',
        entityId: ORDER_ID,
      })
    );
  });
});

describe('REQ-088: cancelOrder writes IncidentEvent on reward restoration failure', () => {
  it('AC8 — writes reward_grant_failed incident when restoreRedeemedRewards throws', async () => {
    const order = buildOrder();
    mockFindById.mockResolvedValue(order);
    mockRestore.mockRejectedValue(new Error('rewards db down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await OrderService.cancelOrder(ORDER_ID);

    expect(mockRecordIncident).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'reward_grant_failed',
        entityId: ORDER_ID,
      })
    );
  });
});

describe('REQ-088: cancelOrder does not write IncidentEvent on success', () => {
  it('AC8 — no IncidentEvent when all reversals succeed', async () => {
    const order = buildOrder({ inventoryDeducted: true });
    mockFindById.mockResolvedValue(order);

    await OrderService.cancelOrder(ORDER_ID);

    expect(mockRecordIncident).not.toHaveBeenCalled();
  });
});
