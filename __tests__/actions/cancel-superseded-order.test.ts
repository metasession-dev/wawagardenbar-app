/**
 * @requirement REQ-127 (AC2) — cancelling a superseded unpaid order is narrow:
 * only the signed-in customer's own, pending, unpaid order with no payment
 * started, in one atomic update; never throws.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/headers', () => ({ cookies: vi.fn().mockResolvedValue({}) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/socket-server', () => ({
  emitOrderStatusUpdate: vi.fn(),
  emitOrderChange: vi.fn(),
}));
vi.mock('@/services', () => ({ OrderService: {} }));

const mockSession = vi.fn();
vi.mock('iron-session', () => ({
  getIronSession: (...a: unknown[]) => mockSession(...a),
}));

const updateOne = vi.fn();
vi.mock('@/models', () => ({
  OrderModel: { updateOne: (...a: unknown[]) => updateOne(...a) },
}));

import { cancelSupersededOrderAction } from '@/app/actions/order/order-actions';

const CUSTOMER = {
  isLoggedIn: true,
  userId: '65a1b2c3d4e5f6a7b8c9d0ff',
  role: 'customer',
  roles: ['customer'],
};

beforeEach(() => {
  mockSession.mockReset().mockResolvedValue(CUSTOMER);
  updateOne.mockReset().mockResolvedValue({ modifiedCount: 1 });
});

describe('cancelSupersededOrderAction', () => {
  it('cancels with one guarded update scoped to the caller', async () => {
    const result = await cancelSupersededOrderAction(
      '65a1b2c3d4e5f6a7b8c9d001'
    );
    expect(result).toEqual({ success: true, data: { cancelled: true } });
    expect(updateOne).toHaveBeenCalledTimes(1);
    const [filter, update] = updateOne.mock.calls[0];
    expect(filter).toMatchObject({
      _id: '65a1b2c3d4e5f6a7b8c9d001',
      userId: CUSTOMER.userId,
      origin: 'customer',
      status: 'pending',
      paymentStatus: { $in: ['pending', 'failed'] },
      paymentReference: { $in: [null, ''] },
    });
    expect(update.$set).toMatchObject({
      status: 'cancelled',
      cancelReason: 'superseded_by_new_checkout',
    });
  });

  it('reports cancelled=false (not an error) when the guard excludes the order', async () => {
    updateOne.mockResolvedValue({ modifiedCount: 0 });
    expect(
      await cancelSupersededOrderAction('65a1b2c3d4e5f6a7b8c9d001')
    ).toEqual({
      success: true,
      data: { cancelled: false },
    });
  });

  it.each([
    ['signed out', { isLoggedIn: false }],
    ['no user', { isLoggedIn: true }],
    [
      'a staff session',
      { isLoggedIn: true, userId: 'u', role: 'admin', roles: ['admin'] },
    ],
  ])('refuses %s without touching the database', async (_n, session) => {
    mockSession.mockResolvedValue(session);
    const result = await cancelSupersededOrderAction(
      '65a1b2c3d4e5f6a7b8c9d001'
    );
    expect(result.success).toBe(false);
    expect(updateOne).not.toHaveBeenCalled();
  });

  it('never throws', async () => {
    updateOne.mockRejectedValue(new Error('db down'));
    expect(
      (await cancelSupersededOrderAction('65a1b2c3d4e5f6a7b8c9d001')).success
    ).toBe(false);
  });
});
