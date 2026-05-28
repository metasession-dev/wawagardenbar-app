/**
 * @requirement REQ-048 — Order cancellation reverses points (#117 P0 #2)
 *
 * Unit tests for PointsService.reverseOrderTransactions. Models + DB are
 * mocked; we assert the compensating $inc and the reversal transaction
 * without spinning up Mongo.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn(), connectDB: vi.fn() }));

const USER_ID = '65a1b2c3d4e5f6a7b8c9d0e2';
const ORDER_ID = '65a1b2c3d4e5f6a7b8c9d0e1';

const mockFind = vi.fn();
const mockFindOne = vi.fn();
const mockCreate = vi.fn();

vi.mock('@/models/points-transaction-model', () => ({
  default: {
    find: (...a: unknown[]) => mockFind(...a),
    findOne: (...a: unknown[]) => mockFindOne(...a),
    create: (...a: unknown[]) => mockCreate(...a),
  },
}));

const mockUserUpdate = vi.fn();
vi.mock('@/models/user-model', () => ({
  default: { findByIdAndUpdate: (...a: unknown[]) => mockUserUpdate(...a) },
}));

vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {},
}));

import { PointsService } from '@/services/points-service';

beforeEach(() => {
  vi.clearAllMocks();
  mockFindOne.mockResolvedValue(null);
  mockUserUpdate.mockResolvedValue({ loyaltyPoints: 1000 });
  mockCreate.mockImplementation(async (doc: unknown) => doc);
});

describe('REQ-048: PointsService.reverseOrderTransactions', () => {
  it('refunds spent points and claws back earned points', async () => {
    // earned +50, spent -200 → reversal = 200 - 50 = +150
    mockFind.mockResolvedValue([
      { type: 'earned', amount: 50 },
      { type: 'spent', amount: -200 },
    ]);

    await PointsService.reverseOrderTransactions(USER_ID, ORDER_ID);

    const inc = mockUserUpdate.mock.calls[0][1].$inc;
    expect(inc.loyaltyPoints).toBe(150);
    expect(inc.totalPointsEarned).toBe(-50);
    expect(inc.totalPointsSpent).toBe(-200);

    const created = mockCreate.mock.calls[0][0];
    expect(created.type).toBe('adjusted');
    expect(created.amount).toBe(150);
    expect(String(created.orderId)).toBe(ORDER_ID);
  });

  it('is a no-op when a reversal already exists (idempotent)', async () => {
    mockFindOne.mockResolvedValue({ _id: 'existing-reversal' });

    const result = await PointsService.reverseOrderTransactions(
      USER_ID,
      ORDER_ID
    );

    expect(result).toBeNull();
    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('is a no-op when the order had no points movements', async () => {
    mockFind.mockResolvedValue([]);

    const result = await PointsService.reverseOrderTransactions(
      USER_ID,
      ORDER_ID
    );

    expect(result).toBeNull();
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });
});
