/**
 * @requirement REQ-PAY-012, REQ-PAY-013 (REQ-128 AC2, AC3, D6) — the customer
 * cancel action now goes through RefundService; the old "mark refunded without
 * moving money" path and its 50 % rule are gone.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('next/headers', () => ({ cookies: async () => ({}) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('iron-session', () => ({
  getIronSession: async () => session.current,
}));

const getOrderById = vi.hoisted(() => vi.fn());
const cancelOrder = vi.hoisted(() => vi.fn());
vi.mock('@/services', () => ({
  OrderService: { getOrderById, cancelOrder, updatePaymentStatus: vi.fn() },
  SystemSettingsService: {},
}));
vi.mock('@/models', () => ({ UserModel: {} }));
vi.mock('@/lib/email', () => ({
  sendOrderConfirmationEmail: vi.fn(),
  sendOrderStatusUpdateEmail: vi.fn(),
  sendSupportTicketEmail: vi.fn(),
}));
vi.mock('@/lib/sms', () => ({ SMSService: {} }));
vi.mock('@/lib/socket-server', () => ({
  emitOrderStatusUpdate: vi.fn(),
  emitOrderChange: vi.fn(),
}));
vi.mock('@/services/notification-service', () => ({ NotificationService: {} }));

const cancelPaid = vi.hoisted(() => vi.fn());
vi.mock('@/services/refund-service', () => ({
  RefundService: { cancelPaidOrderForCustomer: cancelPaid },
}));

import { cancelOrderWithRefundAction } from '@/app/actions/communication/communication-actions';

const USER = 'user-1';
const order = (o: Record<string, unknown> = {}) => ({
  _id: 'o1',
  orderNumber: 'WG2611260001',
  // getOrderById populates the owner: a document, not an id (found by the e2e run)
  userId: { _id: { toString: () => USER }, toString: () => '[object Object]' },
  status: 'confirmed',
  paymentStatus: 'paid',
  total: 5000,
  ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  session.current = { isLoggedIn: true, userId: USER };
  getOrderById.mockResolvedValue(order());
});

describe('cancelOrderWithRefundAction', () => {
  it('[AC2] a paid, confirmed order is cancelled with a full refund', async () => {
    cancelPaid.mockResolvedValue({
      ok: true,
      outcome: 'cancelled_refund_started',
      refund: { amountKobo: 500000 },
    });
    const r = await cancelOrderWithRefundAction({
      orderId: 'o1',
      reason: 'changed my mind',
    });
    expect(r).toMatchObject({ success: true, data: { refundAmount: 5000 } });
    expect(r.message).toContain('full refund of ₦5,000');
    expect(cancelPaid).toHaveBeenCalledWith({
      orderId: 'o1',
      customerUserId: USER,
      channel: 'web',
    });
    expect(cancelOrder).not.toHaveBeenCalled();
  });

  it('[AC3] after preparation the customer is told it went to the manager and no money moves', async () => {
    getOrderById.mockResolvedValue(order({ status: 'preparing' }));
    cancelPaid.mockResolvedValue({
      ok: true,
      outcome: 'refund_request_created',
      ticketId: 't',
    });
    const r = await cancelOrderWithRefundAction({ orderId: 'o1', reason: 'x' });
    expect(r.success).toBe(true);
    expect(r.message).toBe(
      "Your order is already being prepared, so we've passed your request to our manager."
    );
    expect(r.data?.refundAmount).toBe(0);
  });

  it('an unpaid order is just cancelled (nothing to refund)', async () => {
    getOrderById.mockResolvedValue(
      order({ paymentStatus: 'pending', status: 'pending' })
    );
    cancelOrder.mockResolvedValue({ _id: 'o1' });
    const r = await cancelOrderWithRefundAction({ orderId: 'o1', reason: 'x' });
    expect(r.success).toBe(true);
    expect(cancelPaid).not.toHaveBeenCalled();
    expect(cancelOrder).toHaveBeenCalledWith('o1', 'x');
  });

  it('someone else, or a signed-out visitor, is refused', async () => {
    session.current = { isLoggedIn: true, userId: 'other' };
    expect(
      await cancelOrderWithRefundAction({ orderId: 'o1', reason: 'x' })
    ).toMatchObject({ success: false, error: 'Unauthorized' });
    session.current = { isLoggedIn: false };
    expect(
      await cancelOrderWithRefundAction({ orderId: 'o1', reason: 'x' })
    ).toMatchObject({ success: false, error: 'Unauthorized' });
    expect(cancelPaid).not.toHaveBeenCalled();
    expect(cancelOrder).not.toHaveBeenCalled();
  });

  it('a delivered, completed or cancelled order cannot be cancelled', async () => {
    getOrderById.mockResolvedValue(order({ status: 'delivered' }));
    expect(
      await cancelOrderWithRefundAction({ orderId: 'o1', reason: 'x' })
    ).toMatchObject({ success: false });
  });

  it('a refused refund is shown to the customer', async () => {
    cancelPaid.mockResolvedValue({
      ok: false,
      code: 'wrong_status',
      error: 'This order can no longer be cancelled.',
    });
    expect(
      await cancelOrderWithRefundAction({ orderId: 'o1', reason: 'x' })
    ).toEqual({
      success: false,
      error: 'This order can no longer be cancelled.',
    });
  });
});
