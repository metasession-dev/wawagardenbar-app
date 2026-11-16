/**
 * @requirement REQ-120 — AC1, AC3
 * @srs REQ-CHECKOUT-012, REQ-CHECKOUT-007
 *
 * The web `createOrder` is a thin wrapper over `createCustomerOrder`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const session: Record<string, unknown> = {};
vi.mock('next/headers', () => ({ cookies: vi.fn().mockResolvedValue({}) }));
vi.mock('iron-session', () => ({
  getIronSession: vi.fn().mockImplementation(async () => session),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));
vi.mock('@/models/order-model', () => ({ default: {} }));
vi.mock('@/models/tab-model', () => ({ default: {} }));
vi.mock('@/services/payment-service', () => ({ PaymentService: {} }));
const updateProfileFromCheckout = vi.hoisted(() => vi.fn());
const getUserProfile = vi.hoisted(() => vi.fn());
vi.mock('@/services', () => ({
  TabService: {},
  UserService: { updateProfileFromCheckout, getUserProfile },
}));
const emitNewOrder = vi.hoisted(() => vi.fn());
vi.mock('@/lib/socket-server', () => ({ emitNewOrder }));
const createCustomerOrder = vi.hoisted(() => vi.fn());
vi.mock('@/services/customer-order-service', () => ({ createCustomerOrder }));

import { createOrder } from '@/app/actions/payment/payment-actions';

const INPUT = {
  orderType: 'dine-in' as const,
  idempotencyKey: 'k1',
  tableNumber: 'T5',
  customerInfo: { name: 'Ada' },
  items: [
    {
      id: 'm1',
      name: 'x',
      price: 1,
      quantity: 2,
      portionMultiplier: 1,
      customizations: [{ name: 'Protein', option: 'Chicken', price: 0 }],
    },
  ] as never,
};

function setSession(f: Record<string, unknown>) {
  for (const k of Object.keys(session)) delete session[k];
  Object.assign(session, f);
}

beforeEach(() => {
  vi.clearAllMocks();
  getUserProfile.mockResolvedValue({
    name: 'Ada Obi',
    email: 'ada@example.com',
    phone: '2348000000000',
  });
  createCustomerOrder.mockResolvedValue({
    success: true,
    reused: false,
    order: {
      _id: { toString: () => 'o1' },
      orderNumber: 'WG2611100001',
      orderType: 'dine-in',
      items: [],
      total: 1,
      status: 'pending',
      createdAt: new Date(),
    },
  });
});

describe('createOrder (web wrapper)', () => {
  it('calls the customer order service as channel web and sends only ids, never prices', async () => {
    setSession({ isLoggedIn: true, userId: 'u1', role: 'customer', roles: [] });
    const r = await createOrder(INPUT);
    expect(r).toEqual({ success: true, data: { orderId: 'o1' } });
    const [arg, ctx] = createCustomerOrder.mock.calls[0];
    expect(ctx).toEqual({ userId: 'u1', channel: 'web' });
    expect(arg.items).toEqual([
      {
        menuItemId: 'm1',
        quantity: 2,
        portionMultiplier: 1,
        specialInstructions: undefined,
        customizations: [{ name: 'Protein', option: 'Chicken' }],
      },
    ]);
    expect(emitNewOrder).toHaveBeenCalledOnce();
  });

  it('passes the typed error code through', async () => {
    setSession({ isLoggedIn: true, userId: 'u1', role: 'customer', roles: [] });
    createCustomerOrder.mockResolvedValue({
      success: false,
      code: 'OUT_OF_HOURS',
      message: 'closed',
    });
    expect(await createOrder(INPUT)).toEqual({
      success: false,
      code: 'OUT_OF_HOURS',
      message: 'closed',
    });
    expect(emitNewOrder).not.toHaveBeenCalled();
  });

  it('does not re-emit to the kitchen for a repeated key', async () => {
    setSession({ isLoggedIn: true, userId: 'u1', role: 'customer', roles: [] });
    createCustomerOrder.mockResolvedValue({
      success: true,
      reused: true,
      order: { _id: { toString: () => 'o1' } },
    });
    expect((await createOrder(INPUT)).data?.orderId).toBe('o1');
    expect(emitNewOrder).not.toHaveBeenCalled();
  });

  it.each([
    [
      'a staff session',
      { isLoggedIn: true, userId: 's1', role: 'csr', roles: ['csr'] },
    ],
    ['a guest', { isGuest: true, guestId: 'g' }],
    ['no session', {}],
  ])('refuses %s', async (_n, s) => {
    setSession(s);
    const r = await createOrder(INPUT);
    expect(r).toMatchObject({ success: false, code: 'NOT_ALLOWED' });
    expect(createCustomerOrder).not.toHaveBeenCalled();
  });

  // REQ-121 (REQ-CHECKOUT-015, REQ-CHECKOUT-016)
  it('takes phone and email from the verified account, never the form (REQ-121 AC2)', async () => {
    setSession({ isLoggedIn: true, userId: 'u1', role: 'customer', roles: [] });
    await createOrder(INPUT);
    expect(emitNewOrder.mock.calls[0][0].customer).toEqual({
      name: 'Ada Obi',
      email: 'ada@example.com',
      phone: '2348000000000',
    });
  });

  it('saves the first name only when the account has none (REQ-121 AC2)', async () => {
    setSession({ isLoggedIn: true, userId: 'u1', role: 'customer', roles: [] });
    await createOrder(INPUT);
    expect(updateProfileFromCheckout).not.toHaveBeenCalled();

    getUserProfile.mockResolvedValue({ name: '', phone: '2348000000000' });
    await createOrder(INPUT);
    expect(updateProfileFromCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        firstName: 'Ada',
        saveAddress: false,
      })
    );
  });

  it('saves a delivery address automatically and keeps the landmark in the note (REQ-121 AC3)', async () => {
    setSession({ isLoggedIn: true, userId: 'u1', role: 'customer', roles: [] });
    await createOrder({
      ...INPUT,
      orderType: 'delivery',
      deliveryInfo: {
        street: '12 Allen Avenue',
        city: 'Lagos',
        state: 'Lagos',
        postalCode: '',
        country: 'Nigeria',
        landmark: 'Near the mall',
        instructions: 'Call on arrival',
      },
    });
    const [arg] = createCustomerOrder.mock.calls[0];
    expect(arg.deliveryInstructions).toBe(
      'Landmark: Near the mall. Call on arrival'
    );
    expect(updateProfileFromCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        saveAddress: true,
        address: expect.objectContaining({
          streetAddress: '12 Allen Avenue',
          city: 'Lagos',
        }),
      })
    );
  });

  it('does not save a dine-in or pickup order address (REQ-121 AC3)', async () => {
    setSession({ isLoggedIn: true, userId: 'u1', role: 'customer', roles: [] });
    await createOrder({ ...INPUT, orderType: 'pickup' });
    expect(updateProfileFromCheckout).not.toHaveBeenCalled();
  });
});
