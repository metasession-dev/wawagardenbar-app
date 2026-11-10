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
vi.mock('@/services', () => ({
  TabService: {},
  UserService: { updateProfileFromCheckout: vi.fn() },
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
  customerInfo: { name: 'Ada Obi', email: 'a@b.c', phone: '08000000000' },
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
});
