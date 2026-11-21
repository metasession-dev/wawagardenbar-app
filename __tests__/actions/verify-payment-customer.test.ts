/**
 * @requirement REQ-123 — AC3, AC4
 * @srs REQ-PAY-007, REQ-PAY-008
 *
 * The redirect return (`verifyPayment`) confirms a customer payment through the
 * same one `markOrderPaid` as the webhook, with the same amount check, and a
 * failed attempt never cancels a customer order.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/headers', () => ({ cookies: vi.fn().mockResolvedValue({}) }));
vi.mock('iron-session', () => ({ getIronSession: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));
const findOne = vi.hoisted(() => vi.fn());
vi.mock('@/models/order-model', () => ({ default: { findOne } }));
vi.mock('@/models/tab-model', () => ({ default: { findOne: vi.fn() } }));
const verify = vi.hoisted(() => vi.fn());
vi.mock('@/services/payment-service', () => ({
  PaymentService: {
    verifyPayment: verify,
    isPaymentSuccessful: (s: string) => s === 'PAID' || s === 'OVERPAID',
  },
}));
const markOrderPaid = vi.hoisted(() => vi.fn());
vi.mock('@/services/order-service', () => ({
  OrderService: { markOrderPaid },
}));
const recordIncident = vi.hoisted(() => vi.fn());
vi.mock('@/services/incident-event-service', () => ({
  IncidentEventService: { recordIncident },
}));
vi.mock('@/services', () => ({ TabService: {}, UserService: {} }));
vi.mock('@/lib/socket-server', () => ({ emitNewOrder: vi.fn() }));
vi.mock('@/services/customer-order-service', () => ({
  createCustomerOrder: vi.fn(),
}));

import { verifyPayment } from '@/app/actions/payment/payment-actions';

const liveOrder = (over: Record<string, unknown> = {}) => ({
  _id: { toString: () => 'order-1' },
  orderNumber: 'WG2611190001',
  origin: 'customer',
  status: 'pending',
  paymentStatus: 'pending',
  paymentProvider: 'paystack',
  paymentReference: 'WAWA-1',
  total: 5500,
  save: vi.fn().mockResolvedValue(undefined),
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe('REQ-123: verifyPayment for a customer order', () => {
  it('verifies with the provider stored on the order and confirms through markOrderPaid', async () => {
    findOne.mockResolvedValue(liveOrder());
    verify.mockResolvedValue({
      status: 'PAID',
      amount: 5500,
      transactionReference: '77',
      paidAt: new Date('2026-11-19T12:00:00Z'),
    });

    const r = await verifyPayment('WAWA-1');

    expect(r.success).toBe(true);
    expect(verify).toHaveBeenCalledWith('WAWA-1', 'paystack');
    expect(markOrderPaid).toHaveBeenCalledWith('order-1', 'payment_redirect', {
      transactionReference: '77',
      paidAt: new Date('2026-11-19T12:00:00Z'),
    });
  });

  it('[US-A2.16] a paid amount that differs from the total is not confirmed and raises an Incident', async () => {
    const order = liveOrder();
    findOne.mockResolvedValue(order);
    verify.mockResolvedValue({ status: 'PAID', amount: 100 });

    await verifyPayment('WAWA-1');

    expect(markOrderPaid).not.toHaveBeenCalled();
    expect(order.paymentStatus).toBe('payment_mismatch');
    expect(recordIncident.mock.calls[0][0]).toMatchObject({
      kind: 'payment_mismatch',
    });
  });

  it('an already-paid order is not touched again', async () => {
    const order = liveOrder({ paymentStatus: 'paid' });
    findOne.mockResolvedValue(order);
    verify.mockResolvedValue({ status: 'PAID', amount: 5500 });

    await verifyPayment('WAWA-1');

    expect(markOrderPaid).not.toHaveBeenCalled();
    expect(order.save).not.toHaveBeenCalled();
  });

  it('a failed attempt leaves the customer order open to try again, never cancelled', async () => {
    const order = liveOrder();
    findOne.mockResolvedValue(order);
    verify.mockResolvedValue({ status: 'FAILED', amount: 0 });

    await verifyPayment('WAWA-1');

    expect(order.paymentStatus).toBe('failed');
    expect(order.status).toBe('pending');
  });

  it('a failed attempt on a staff order still cancels it, as before', async () => {
    const order = liveOrder({ origin: 'staff' });
    findOne.mockResolvedValue(order);
    verify.mockResolvedValue({ status: 'FAILED', amount: 0 });

    await verifyPayment('WAWA-1');

    expect(order.status).toBe('cancelled');
  });
});
