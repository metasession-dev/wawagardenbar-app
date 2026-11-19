/**
 * @requirement REQ-123 — AC1, AC2
 * @srs REQ-PAY-005, REQ-PAY-006
 *
 * The Paystack transaction is created once per customer order. Pressing Pay
 * again returns the same reference and checkout URL until the order is paid;
 * it re-initialises only when Paystack says the transaction is dead.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const session: Record<string, unknown> = {};
vi.mock('next/headers', () => ({ cookies: vi.fn().mockResolvedValue({}) }));
vi.mock('iron-session', () => ({
  getIronSession: vi.fn().mockImplementation(async () => session),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));
const findById = vi.hoisted(() => vi.fn());
vi.mock('@/models/order-model', () => ({ default: { findById } }));
vi.mock('@/models/tab-model', () => ({ default: {} }));
const initialize = vi.hoisted(() => vi.fn());
const verify = vi.hoisted(() => vi.fn());
vi.mock('@/services/payment-service', () => ({
  PaymentService: {
    generatePaymentReference: (id: string) => `ref-${id}-${Math.random()}`,
    initializePayment: initialize,
    verifyPayment: verify,
    isPaymentSuccessful: (s: string) => s === 'PAID' || s === 'OVERPAID',
  },
}));
const markOrderPaid = vi.hoisted(() => vi.fn());
vi.mock('@/services/order-service', () => ({
  OrderService: { markOrderPaid },
}));
vi.mock('@/services/incident-event-service', () => ({
  IncidentEventService: { recordIncident: vi.fn() },
}));
vi.mock('@/services', () => ({
  TabService: {},
  UserService: {
    getUserProfile: vi
      .fn()
      .mockResolvedValue({ name: 'Ada', phone: '+2348012345678' }),
    updateProfileFromCheckout: vi.fn(),
  },
}));
vi.mock('@/lib/socket-server', () => ({ emitNewOrder: vi.fn() }));
vi.mock('@/services/customer-order-service', () => ({
  createCustomerOrder: vi.fn(),
}));

import { initializePayment } from '@/app/actions/payment/payment-actions';

const INPUT = {
  orderId: 'o'.repeat(24),
  amount: 1,
  paymentMethods: ['CARD'] as never,
};

/** A stateful stand-in for a Mongoose order document. */
function liveOrder(over: Record<string, unknown> = {}) {
  const doc: Record<string, unknown> = {
    userId: { toString: () => 'u1' },
    orderNumber: 'WG2611190001',
    total: 5500,
    paymentStatus: 'pending',
    ...over,
  };
  doc.save = vi.fn().mockResolvedValue(undefined);
  return doc;
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(session, {
    isLoggedIn: true,
    userId: 'u1',
    role: 'customer',
    roles: [],
  });
  initialize.mockResolvedValue({
    checkoutUrl: 'https://checkout.paystack.com/abc',
    reference: 'WAWA-1',
    accessCode: 'abc',
  });
});

describe('REQ-123 AC1: customer orders use Paystack', () => {
  it('forces the paystack provider and stores provider, url and access code on the order', async () => {
    const order = liveOrder();
    findById.mockResolvedValue(order);

    const r = await initializePayment(INPUT);

    expect(r.success).toBe(true);
    expect(initialize.mock.calls[0][0].provider).toBe('paystack');
    expect(order.paymentProvider).toBe('paystack');
    expect(order.checkoutUrl).toBe('https://checkout.paystack.com/abc');
    expect(order.paystackAccessCode).toBe('abc');
    expect(order.paymentReference).toBeTruthy();
    expect(order.save).toHaveBeenCalled();
  });

  it('a staff session does not force a provider', async () => {
    Object.assign(session, {
      userId: 'staff1',
      role: 'admin',
      roles: ['admin'],
    });
    findById.mockResolvedValue(liveOrder());

    await initializePayment(INPUT);

    expect(initialize.mock.calls[0][0].provider).toBeUndefined();
  });
});

describe('REQ-123 AC2: a stable reference and URL', () => {
  it('[US-A2.13] pressing Pay twice returns the same URL and calls Paystack once', async () => {
    const order = liveOrder();
    findById.mockResolvedValue(order);
    verify.mockResolvedValue({ status: 'PENDING', amount: 0 });

    const first = await initializePayment(INPUT);
    const second = await initializePayment(INPUT);

    expect(second.data?.checkoutUrl).toBe(first.data?.checkoutUrl);
    expect(second.data?.paymentReference).toBe(first.data?.paymentReference);
    expect(initialize).toHaveBeenCalledOnce();
  });

  it('keeps the stored URL when Paystack has no record yet or cannot be reached', async () => {
    const order = liveOrder({
      paymentProvider: 'paystack',
      paymentReference: 'WAWA-1',
      checkoutUrl: 'https://checkout.paystack.com/abc',
    });
    findById.mockResolvedValue(order);
    verify.mockRejectedValue(new Error('Transaction reference not found'));

    const r = await initializePayment(INPUT);

    expect(r.data?.checkoutUrl).toBe('https://checkout.paystack.com/abc');
    expect(initialize).not.toHaveBeenCalled();
  });

  it('re-initialises only when Paystack reports the transaction failed', async () => {
    const order = liveOrder({
      paymentProvider: 'paystack',
      paymentReference: 'WAWA-1',
      checkoutUrl: 'https://checkout.paystack.com/old',
    });
    findById.mockResolvedValue(order);
    verify.mockResolvedValue({ status: 'FAILED', amount: 0 });
    initialize.mockResolvedValue({
      checkoutUrl: 'https://checkout.paystack.com/new',
      reference: 'WAWA-2',
      accessCode: 'new',
    });

    const r = await initializePayment(INPUT);

    expect(initialize).toHaveBeenCalledOnce();
    expect(r.data?.checkoutUrl).toBe('https://checkout.paystack.com/new');
    expect(order.checkoutUrl).toBe('https://checkout.paystack.com/new');
  });

  it('an order already paid goes to the order page, with no second checkout', async () => {
    findById.mockResolvedValue(
      liveOrder({ paymentStatus: 'paid', paymentReference: 'WAWA-1' })
    );

    const r = await initializePayment(INPUT);

    expect(r.data?.checkoutUrl).toContain('/orders/');
    expect(initialize).not.toHaveBeenCalled();
  });

  it('a payment Paystack already confirmed is marked paid instead of opening a second checkout', async () => {
    const order = liveOrder({
      paymentProvider: 'paystack',
      paymentReference: 'WAWA-1',
      checkoutUrl: 'https://checkout.paystack.com/abc',
    });
    findById.mockResolvedValue(order);
    verify.mockResolvedValue({
      status: 'PAID',
      amount: 5500,
      transactionReference: '77',
    });

    const r = await initializePayment(INPUT);

    expect(markOrderPaid).toHaveBeenCalledOnce();
    expect(markOrderPaid.mock.calls[0][1]).toBe('payment_redirect');
    expect(r.data?.checkoutUrl).toContain('/orders/');
    expect(initialize).not.toHaveBeenCalled();
  });
});
