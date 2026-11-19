/**
 * @requirement REQ-122 — AC1
 * @srs REQ-DASH-003
 *
 * `OrderService.updatePaymentStatus` raises a staff alert when a customer
 * order becomes paid, and only then. US-B5.3.
 *
 * REQ-123 — `updatePaymentStatus('paid')` now delegates to the one idempotent
 * `markOrderPaid`, so the alert is raised by the winner of the conditional
 * update; a call on an already-paid order raises nothing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn(), connectDB: vi.fn() }));

const ORDER_ID = '65a1b2c3d4e5f6a7b8c9d0e1';
const findByIdAndUpdate = vi.hoisted(() => vi.fn());
const findOneAndUpdate = vi.hoisted(() => vi.fn());
const findById = vi.hoisted(() => vi.fn());
const updateOne = vi.hoisted(() => vi.fn());
vi.mock('@/models/order-model', () => ({
  default: { findByIdAndUpdate, findOneAndUpdate, findById, updateOne },
}));
vi.mock('@/lib/socket-emit-helper', () => ({
  emitOrderCreatedEvent: vi.fn(),
}));
vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: { getBusinessDayCutoff: vi.fn().mockResolvedValue(0) },
}));
vi.mock('@/lib/business-date', () => ({
  deriveBusinessDate: vi.fn(() => new Date('2026-11-16T00:00:00Z')),
}));
const raiseForPaidOrder = vi.hoisted(() => vi.fn());
vi.mock('@/services/staff-notification-service', () => ({
  StaffNotificationService: { raiseForPaidOrder },
}));

import { OrderService } from '@/services/order-service';

// `returns` stubs what both update paths hand back: the non-paid update
// (`findByIdAndUpdate`) and the paid path's conditional update (`findOneAndUpdate`).
const returns = (order: unknown) => {
  findByIdAndUpdate.mockReturnValue({ lean: async () => order });
  findOneAndUpdate.mockReturnValue({ lean: async () => order });
  findById.mockReturnValue({ lean: async () => null });
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AC1: a paid customer order raises a staff alert', () => {
  it('[US-B5.3] raises once when the order becomes paid', async () => {
    const order = {
      _id: ORDER_ID,
      orderNumber: 'WG2611160001',
      origin: 'customer',
      status: 'confirmed',
    };
    returns(order);
    const result = await OrderService.updatePaymentStatus(ORDER_ID, {
      paymentStatus: 'paid',
    });
    expect(result).toBe(order);
    expect(raiseForPaidOrder).toHaveBeenCalledOnce();
    expect(raiseForPaidOrder).toHaveBeenCalledWith(order);
  });

  it.each(['pending', 'failed', 'refunded', 'cancelled'] as const)(
    'does not raise for payment status %s',
    async (paymentStatus) => {
      returns({ _id: ORDER_ID, origin: 'customer' });
      await OrderService.updatePaymentStatus(ORDER_ID, { paymentStatus });
      expect(raiseForPaidOrder).not.toHaveBeenCalled();
    }
  );

  it('does not raise when the order is not found or the id is invalid', async () => {
    returns(null);
    await OrderService.updatePaymentStatus(ORDER_ID, { paymentStatus: 'paid' });
    await OrderService.updatePaymentStatus('not-an-id', {
      paymentStatus: 'paid',
    });
    expect(raiseForPaidOrder).not.toHaveBeenCalled();
  });

  it('the payment update still succeeds if the alert helper does nothing for a staff order', async () => {
    returns({ _id: ORDER_ID, origin: 'staff', status: 'confirmed' });
    const result = await OrderService.updatePaymentStatus(ORDER_ID, {
      paymentStatus: 'paid',
    });
    // The helper decides on origin; the service always hands the paid order over.
    expect(result).toMatchObject({ origin: 'staff' });
    expect(raiseForPaidOrder).toHaveBeenCalledOnce();
  });
});
