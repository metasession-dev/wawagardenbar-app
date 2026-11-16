/**
 * @requirement REQ-121 — AC1, AC4
 * @srs REQ-CHECKOUT-014, REQ-CHECKOUT-006
 *
 * A customer pays only their own order and is charged the total the server
 * computed (fees and tip included), never the client's amount. Staff flows
 * keep sending their own amount. No email is required.
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
vi.mock('@/services/payment-service', () => ({
  PaymentService: {
    generatePaymentReference: (id: string) => `ref-${id}`,
    initializePayment: initialize,
  },
}));
const getUserProfile = vi.hoisted(() => vi.fn());
vi.mock('@/services', () => ({
  TabService: {},
  UserService: { getUserProfile, updateProfileFromCheckout: vi.fn() },
}));
vi.mock('@/lib/socket-server', () => ({ emitNewOrder: vi.fn() }));
vi.mock('@/services/customer-order-service', () => ({
  createCustomerOrder: vi.fn(),
}));

import { initializePayment } from '@/app/actions/payment/payment-actions';
import { GUEST_PAYMENT_EMAIL } from '@/lib/checkout/checkout-rules';

function setSession(f: Record<string, unknown>) {
  for (const k of Object.keys(session)) delete session[k];
  Object.assign(session, f);
}

function order(over: Record<string, unknown> = {}) {
  return {
    userId: { toString: () => 'u1' },
    total: 8350,
    save: vi.fn(),
    ...over,
  };
}

const INPUT = {
  orderId: 'o'.repeat(24),
  amount: 1,
  paymentMethods: ['CARD', 'ACCOUNT_TRANSFER', 'USSD', 'PHONE_NUMBER'] as never,
};

beforeEach(() => {
  vi.clearAllMocks();
  initialize.mockResolvedValue({
    checkoutUrl: 'https://pay.example/c',
    reference: 'tx-1',
  });
  getUserProfile.mockResolvedValue({ name: 'Ada Obi', email: undefined });
});

describe('initializePayment for a customer', () => {
  it('charges the server order total, not the client amount (AC4)', async () => {
    setSession({ isLoggedIn: true, userId: 'u1', role: 'customer', roles: [] });
    findById.mockResolvedValue(order({ total: 8350 }));
    const r = await initializePayment({ ...INPUT, amount: 1 });
    expect(r.success).toBe(true);
    expect(initialize.mock.calls[0][0].amount).toBe(8350);
  });

  it('offers every payment method so the hosted page lets the customer choose (AC1)', async () => {
    setSession({ isLoggedIn: true, userId: 'u1', role: 'customer', roles: [] });
    findById.mockResolvedValue(order());
    await initializePayment(INPUT);
    expect(initialize.mock.calls[0][0].paymentMethods).toEqual([
      'CARD',
      'ACCOUNT_TRANSFER',
      'USSD',
      'PHONE_NUMBER',
    ]);
  });

  it('works without an email: falls back to the account email, then the guest address (AC1)', async () => {
    setSession({ isLoggedIn: true, userId: 'u1', role: 'customer', roles: [] });
    findById.mockResolvedValue(order());
    await initializePayment(INPUT);
    expect(initialize.mock.calls[0][0].customerEmail).toBe(GUEST_PAYMENT_EMAIL);
    expect(initialize.mock.calls[0][0].customerName).toBe('Ada Obi');

    getUserProfile.mockResolvedValue({
      name: 'Ada Obi',
      email: 'ada@example.com',
    });
    await initializePayment(INPUT);
    expect(initialize.mock.calls[1][0].customerEmail).toBe('ada@example.com');
  });

  it("refuses another customer's order and initialises nothing", async () => {
    setSession({ isLoggedIn: true, userId: 'u2', role: 'customer', roles: [] });
    findById.mockResolvedValue(order());
    const r = await initializePayment(INPUT);
    expect(r).toMatchObject({ success: false, message: 'Order not found' });
    expect(initialize).not.toHaveBeenCalled();
  });
});

describe('initializePayment for staff', () => {
  it('keeps the staff amount', async () => {
    setSession({ isLoggedIn: true, userId: 's1', role: 'csr', roles: ['csr'] });
    findById.mockResolvedValue(
      order({ userId: { toString: () => 'someone-else' } })
    );
    await initializePayment({ ...INPUT, amount: 4000, customerEmail: 'x@y.z' });
    expect(initialize.mock.calls[0][0].amount).toBe(4000);
    expect(initialize.mock.calls[0][0].customerEmail).toBe('x@y.z');
  });
});
