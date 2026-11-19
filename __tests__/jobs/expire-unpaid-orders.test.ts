/**
 * @requirement REQ-123 — AC6, AC7
 * @srs REQ-PAY-009, REQ-PAY-010
 *
 * Unpaid customer orders: cancelled after 30 minutes (Paystack asked first, so
 * a lost webhook never cancels a paid order), and one `payment_link` for an
 * abandoned payment after 5 minutes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn(), connectDB: vi.fn() }));

const find = vi.hoisted(() => vi.fn());
const updateOne = vi.hoisted(() => vi.fn());
vi.mock('@/models/order-model', () => ({ default: { find, updateOne } }));
const userFindById = vi.hoisted(() => vi.fn());
vi.mock('@/models/user-model', () => ({ default: { findById: userFindById } }));

const verifyPayment = vi.hoisted(() => vi.fn());
vi.mock('@/services/payment-service', () => ({
  PaymentService: {
    verifyPayment,
    isPaymentSuccessful: (s: string) => s === 'PAID' || s === 'OVERPAID',
  },
}));
const markOrderPaid = vi.hoisted(() => vi.fn());
vi.mock('@/services/order-service', () => ({
  OrderService: { markOrderPaid },
}));
const send = vi.hoisted(() => vi.fn());
vi.mock('@/services/notification-service', () => ({
  NotificationService: { send },
}));
vi.mock('@/services/rewards-service', () => ({ RewardsService: {} }));
vi.mock('@/services/instagram-service', () => ({ InstagramService: {} }));
vi.mock('@/services/inventory-service', () => ({ default: {} }));
vi.mock('@/services/tab-service', () => ({ TabService: {} }));
vi.mock('@/services/system-settings-service', () => ({
  SystemSettingsService: {},
}));
vi.mock('@/services/incident-event-service', () => ({
  IncidentEventService: {},
}));
vi.mock('@/services/staff-notification-service', () => ({
  StaffNotificationService: {},
}));

import {
  runPaymentLinkJob,
  runUnpaidOrderExpiryJob,
} from '@/lib/scheduled-jobs';

const NOW = new Date('2026-11-19T12:00:00.000Z');
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

const order = (over: Record<string, unknown> = {}) => ({
  _id: 'order-1',
  origin: 'customer',
  status: 'pending',
  paymentStatus: 'pending',
  paymentProvider: 'paystack',
  paymentReference: 'WAWA-1',
  paystackAccessCode: '0peioxfhpn',
  userId: 'user-1',
  total: 5500,
  createdAt: minutesAgo(31),
  ...over,
});

const candidates = (orders: unknown[]) =>
  find.mockReturnValue({ limit: () => ({ lean: async () => orders }) });

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.ENABLE_UNPAID_ORDER_EXPIRY;
  updateOne.mockResolvedValue({ modifiedCount: 1 });
  send.mockResolvedValue({ success: true });
  userFindById.mockReturnValue({
    select: () => ({ lean: async () => ({ firstName: 'Adaeze' }) }),
  });
});
afterEach(() => {
  delete process.env.ENABLE_UNPAID_ORDER_EXPIRY;
});

describe('REQ-123 AC6: unpaid customer orders expire after 30 minutes', () => {
  it('[US-A2.18] cancels an unpaid order with payment_timeout, with no customer message', async () => {
    candidates([order()]);
    verifyPayment.mockResolvedValue({ status: 'PENDING', amount: 0 });

    const result = await runUnpaidOrderExpiryJob(NOW);

    expect(result.cancelled).toBe(1);
    const [filter, update] = updateOne.mock.calls[0];
    expect(filter).toMatchObject({ _id: 'order-1', status: 'pending' });
    expect(update.$set).toMatchObject({
      status: 'cancelled',
      paymentStatus: 'cancelled',
      cancelReason: 'payment_timeout',
    });
    expect(send).not.toHaveBeenCalled();
  });

  it('selects only customer orders older than 30 minutes that are still pending and unpaid', async () => {
    candidates([]);
    await runUnpaidOrderExpiryJob(NOW);
    const query = find.mock.calls[0][0];
    expect(query).toMatchObject({
      origin: 'customer',
      status: 'pending',
      paymentStatus: { $in: ['pending', 'failed'] },
    });
    expect(query.createdAt.$lt).toEqual(minutesAgo(30));
  });

  it('a payment Paystack already confirmed is marked paid, not cancelled', async () => {
    candidates([order()]);
    verifyPayment.mockResolvedValue({
      status: 'PAID',
      amount: 5500,
      transactionReference: '123',
    });

    const result = await runUnpaidOrderExpiryJob(NOW);

    expect(result).toMatchObject({ recovered: 1, cancelled: 0 });
    expect(markOrderPaid).toHaveBeenCalledWith('order-1', 'expiry_job', {
      transactionReference: '123',
      paidAt: undefined,
    });
    expect(updateOne).not.toHaveBeenCalled();
  });

  it('a paid amount that differs from the total is left for staff, never cancelled', async () => {
    candidates([order()]);
    verifyPayment.mockResolvedValue({ status: 'PAID', amount: 100 });

    const result = await runUnpaidOrderExpiryJob(NOW);

    expect(result).toMatchObject({ skipped: 1, cancelled: 0, recovered: 0 });
    expect(markOrderPaid).not.toHaveBeenCalled();
    expect(updateOne).not.toHaveBeenCalled();
  });

  it('when Paystack cannot be reached the order is kept for the next tick', async () => {
    candidates([order()]);
    verifyPayment.mockRejectedValue(new Error('fetch failed'));

    const result = await runUnpaidOrderExpiryJob(NOW);

    expect(result).toMatchObject({ skipped: 1, cancelled: 0 });
    expect(updateOne).not.toHaveBeenCalled();
  });

  it('when Paystack has no record of the transaction it is cancelled', async () => {
    candidates([order()]);
    verifyPayment.mockRejectedValue(
      new Error('Transaction reference not found')
    );

    const result = await runUnpaidOrderExpiryJob(NOW);

    expect(result.cancelled).toBe(1);
  });

  it('an order that never started payment (no reference) is cancelled without asking Paystack', async () => {
    candidates([
      order({ paymentReference: undefined, paymentProvider: undefined }),
    ]);

    const result = await runUnpaidOrderExpiryJob(NOW);

    expect(result.cancelled).toBe(1);
    expect(verifyPayment).not.toHaveBeenCalled();
  });

  it('is switched off by ENABLE_UNPAID_ORDER_EXPIRY=false', async () => {
    process.env.ENABLE_UNPAID_ORDER_EXPIRY = 'false';
    candidates([order()]);

    const result = await runUnpaidOrderExpiryJob(NOW);

    expect(result).toEqual({ cancelled: 0, recovered: 0, skipped: 0 });
    expect(find).not.toHaveBeenCalled();
  });
});

describe('REQ-123 AC7: one payment_link for an abandoned payment', () => {
  it('[US-A2.19] sends payment_link with the stable access code and the minutes left', async () => {
    candidates([order({ createdAt: minutesAgo(6) })]);

    const result = await runPaymentLinkJob(NOW);

    expect(result.sent).toBe(1);
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0]).toMatchObject({
      userId: 'user-1',
      templateKey: 'payment_link',
      whatsapp: {
        params: ['Adaeze', '₦5,500', '24'],
        buttonParams: [{ index: 0, params: ['0peioxfhpn'] }],
      },
    });
  });

  it('selects orders unpaid for 5 minutes, not yet expired, with no link sent', async () => {
    candidates([]);
    await runPaymentLinkJob(NOW);
    const query = find.mock.calls[0][0];
    expect(query).toMatchObject({
      origin: 'customer',
      status: 'pending',
      paymentStatus: 'pending',
      paymentProvider: 'paystack',
      paymentLinkSentAt: { $in: [null] },
    });
    expect(query.createdAt.$lte).toEqual(minutesAgo(5));
    expect(query.createdAt.$gt).toEqual(minutesAgo(30));
  });

  it('claims the send with a conditional update, so a repeat run sends nothing', async () => {
    candidates([order({ createdAt: minutesAgo(6) })]);
    updateOne.mockResolvedValue({ modifiedCount: 0 }); // another run already claimed it

    const result = await runPaymentLinkJob(NOW);

    expect(result.sent).toBe(0);
    expect(send).not.toHaveBeenCalled();
    expect(updateOne.mock.calls[0][0]).toMatchObject({
      _id: 'order-1',
      paymentLinkSentAt: { $in: [null] },
    });
  });

  it('is switched off by ENABLE_UNPAID_ORDER_EXPIRY=false', async () => {
    process.env.ENABLE_UNPAID_ORDER_EXPIRY = 'false';
    candidates([order()]);
    expect(await runPaymentLinkJob(NOW)).toEqual({ sent: 0 });
    expect(find).not.toHaveBeenCalled();
  });
});
