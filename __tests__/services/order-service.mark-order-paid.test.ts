/**
 * @requirement REQ-123 — AC4
 * @srs REQ-PAY-008
 *
 * `OrderService.markOrderPaid` is the one idempotent path that marks a customer
 * order paid (ADR-012). Only the caller that wins the conditional update runs
 * the side effects: staff alert, rewards, kitchen event, `order_confirmation`
 * then `receipt`. A repeat call changes nothing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn(), connectDB: vi.fn() }));

const ORDER_ID = '65a1b2c3d4e5f6a7b8c9d0e1';
const findOneAndUpdate = vi.hoisted(() => vi.fn());
const findById = vi.hoisted(() => vi.fn());
vi.mock('@/models/order-model', () => ({
  default: { findOneAndUpdate, findById },
}));
vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: { getBusinessDayCutoff: vi.fn().mockResolvedValue(0) },
}));
vi.mock('@/lib/business-date', () => ({
  deriveBusinessDate: vi.fn(() => new Date('2026-11-19T00:00:00Z')),
}));
const raiseForPaidOrder = vi.hoisted(() => vi.fn());
vi.mock('@/services/staff-notification-service', () => ({
  StaffNotificationService: { raiseForPaidOrder },
}));
const emitOrderCreatedEvent = vi.hoisted(() => vi.fn());
const emitNewOrder = vi.hoisted(() => vi.fn());
vi.mock('@/lib/socket-server', () => ({ emitNewOrder }));
vi.mock('@/models/user-model', () => ({
  default: {
    findById: () => ({
      select: () => ({
        lean: async () => ({ name: 'Ada', email: 'a@b.co', phone: '+234801' }),
      }),
    }),
  },
}));
vi.mock('@/lib/socket-emit-helper', () => ({ emitOrderCreatedEvent }));
const calculateReward = vi.hoisted(() => vi.fn());
vi.mock('@/services/rewards-service', () => ({
  RewardsService: { calculateReward },
}));
const send = vi.hoisted(() => vi.fn());
vi.mock('@/services/notification-service', () => ({
  NotificationService: { send },
}));
const recordIncident = vi.hoisted(() => vi.fn());
vi.mock('@/services/incident-event-service', () => ({
  IncidentEventService: { recordIncident },
}));

import { OrderService } from '@/services/order-service';

const customerOrder = (over: Record<string, unknown> = {}) => ({
  _id: ORDER_ID,
  orderNumber: 'WG2611190007',
  origin: 'customer',
  status: 'confirmed',
  paymentStatus: 'paid',
  userId: { toString: () => 'user-1' },
  total: 5500,
  estimatedWaitTime: 25,
  items: [
    { name: 'Goat Stew', quantity: 2 },
    { name: 'Jollof Rice', quantity: 1 },
  ],
  ...over,
});

const wins = (order: unknown) =>
  findOneAndUpdate.mockReturnValueOnce({ lean: async () => order });
const loses = (existing: unknown) => {
  findOneAndUpdate.mockReturnValueOnce({ lean: async () => null });
  findById.mockReturnValueOnce({ lean: async () => existing });
};

beforeEach(() => {
  vi.clearAllMocks();
  calculateReward.mockResolvedValue(null);
  send.mockResolvedValue({ sentVia: 'whatsapp', success: true, attempts: [] });
});

describe('REQ-123 AC4: markOrderPaid', () => {
  it('[US-A2.14] the first call marks paid, emits to the kitchen once and logs order_confirmation then receipt', async () => {
    wins(customerOrder());

    const result = await OrderService.markOrderPaid(
      ORDER_ID,
      'paystack_webhook',
      {
        transactionReference: '9876543210',
        paymentMethod: 'card',
      }
    );

    expect(result.firstTime).toBe(true);
    expect(raiseForPaidOrder).toHaveBeenCalledOnce();
    expect(emitNewOrder).toHaveBeenCalledOnce();
    expect(emitNewOrder.mock.calls[0][0]).toMatchObject({
      orderId: ORDER_ID,
      orderNumber: 'WG2611190007',
      customer: { name: 'Ada' },
    });
    expect(emitOrderCreatedEvent).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0][0]).toMatchObject({
      userId: 'user-1',
      templateKey: 'order_confirmation',
      whatsapp: { params: ['WG2611190007', '₦5,500', '25 minutes'] },
    });
    expect(send.mock.calls[1][0]).toMatchObject({
      templateKey: 'receipt',
      whatsapp: {
        params: ['2× Goat Stew, 1× Jollof Rice', '₦5,500', 'Card', '0'],
        headerParams: ['WG2611190007'],
        buttonParams: [{ index: 0, params: [ORDER_ID] }],
      },
    });
  });

  it('updates only an order that is not already paid, in one conditional update', async () => {
    wins(customerOrder());
    await OrderService.markOrderPaid(ORDER_ID, 'paystack_webhook');

    const [filter, pipeline, options] = findOneAndUpdate.mock.calls[0];
    expect(String(filter._id)).toBe(ORDER_ID);
    expect(filter.paymentStatus).toEqual({ $ne: 'paid' });
    expect(Array.isArray(pipeline)).toBe(true);
    expect(pipeline[0].$set).toMatchObject({ paymentStatus: 'paid' });
    expect(options).toMatchObject({ new: true });
  });

  it('[US-A2.15] a repeat call is a no-op: no alert, no kitchen event, no messages', async () => {
    loses(customerOrder());

    const result = await OrderService.markOrderPaid(
      ORDER_ID,
      'payment_redirect'
    );

    expect(result.firstTime).toBe(false);
    expect(raiseForPaidOrder).not.toHaveBeenCalled();
    expect(emitOrderCreatedEvent).not.toHaveBeenCalled();
    expect(emitNewOrder).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(calculateReward).not.toHaveBeenCalled();
  });

  it('when the webhook and the redirect race, only the winner runs the side effects', async () => {
    wins(customerOrder());
    loses(customerOrder());

    const [a, b] = await Promise.all([
      OrderService.markOrderPaid(ORDER_ID, 'paystack_webhook'),
      OrderService.markOrderPaid(ORDER_ID, 'payment_redirect'),
    ]);

    expect([a.firstTime, b.firstTime].sort()).toEqual([false, true]);
    expect(emitOrderCreatedEvent).toHaveBeenCalledOnce();
    expect(emitNewOrder).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledTimes(2);
    expect(raiseForPaidOrder).toHaveBeenCalledOnce();
  });

  it('awards a reward and shows loyalty points on the receipt', async () => {
    calculateReward.mockResolvedValue({
      rewardType: 'loyalty-points',
      rewardValue: 55,
    });
    wins(customerOrder());

    await OrderService.markOrderPaid(ORDER_ID, 'paystack_webhook');

    expect(calculateReward).toHaveBeenCalledWith('user-1', ORDER_ID, 5500);
    expect(send.mock.calls[1][0].whatsapp.params[3]).toBe('55');
  });

  it('a staff order is marked paid and alerts staff, but never emits to the kitchen or messages the customer', async () => {
    wins(customerOrder({ origin: 'staff' }));

    const result = await OrderService.markOrderPaid(ORDER_ID, 'status_update');

    expect(result.firstTime).toBe(true);
    expect(raiseForPaidOrder).toHaveBeenCalledOnce();
    expect(emitOrderCreatedEvent).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('a payment on an order the expiry job already cancelled raises an Incident and does not reach the kitchen', async () => {
    wins(
      customerOrder({ status: 'cancelled', cancelReason: 'payment_timeout' })
    );

    const result = await OrderService.markOrderPaid(
      ORDER_ID,
      'paystack_webhook'
    );

    expect(result.firstTime).toBe(true);
    expect(recordIncident).toHaveBeenCalledOnce();
    expect(recordIncident.mock.calls[0][0]).toMatchObject({
      kind: 'late_payment_on_cancelled_order',
      entityId: ORDER_ID,
    });
    expect(emitOrderCreatedEvent).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('a failing side effect never breaks payment confirmation', async () => {
    raiseForPaidOrder.mockRejectedValue(new Error('alert down'));
    emitOrderCreatedEvent.mockRejectedValue(new Error('socket down'));
    emitNewOrder.mockImplementation(() => {
      throw new Error('socket down');
    });
    send.mockRejectedValue(new Error('meta down'));
    calculateReward.mockRejectedValue(new Error('rewards down'));
    wins(customerOrder());

    const result = await OrderService.markOrderPaid(
      ORDER_ID,
      'paystack_webhook'
    );

    expect(result.firstTime).toBe(true);
    expect(recordIncident).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'reward_grant_failed' })
    );
  });

  it('an invalid id is a no-op', async () => {
    const result = await OrderService.markOrderPaid('nope', 'status_update');
    expect(result).toEqual({ order: null, firstTime: false });
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });
});
