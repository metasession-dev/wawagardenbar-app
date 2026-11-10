/**
 * @requirement REQ-120 — AC6, AC8
 * @srs REQ-API-007
 *
 * POST /api/public/orders: customer keys go through the customer order service
 * for the user the key is bound to; unbound/role-less keys are refused; tabs
 * are staff-only on the public tab routes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('iron-session', () => ({ getIronSession: vi.fn() }));

const authenticateRequest = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api-key-validator', () => ({ authenticateRequest }));

const createCustomerOrder = vi.hoisted(() => vi.fn());
vi.mock('@/services/customer-order-service', () => ({ createCustomerOrder }));
vi.mock('@/models/order-model', () => ({ default: {} }));
vi.mock('@/models/menu-item-model', () => ({ default: {} }));
vi.mock('@/models/tab-model', () => ({ default: {} }));
vi.mock('@/services/order-service', () => ({ OrderService: {} }));
vi.mock('@/services/tab-service', () => ({ TabService: {} }));
vi.mock('@/lib/order-line-totals', () => ({
  reconcileAndValidateOrderLines: vi.fn(),
}));

import { POST } from '@/app/api/public/orders/route';
import { POST as TAB_POST } from '@/app/api/public/tabs/route';

function req(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/public/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

const BODY = {
  orderType: 'pickup',
  total: 1,
  subtotal: 1,
  items: [{ menuItemId: 'm1', quantity: 2, price: 1, subtotal: 1 }],
  idempotencyKey: 'k1',
  userId: 'someone-else',
};

beforeEach(() => {
  vi.clearAllMocks();
  createCustomerOrder.mockResolvedValue({
    success: true,
    reused: false,
    order: { _id: 'o1', orderNumber: 'WG2611100001' },
  });
});

describe('POST /api/public/orders — customer path', () => {
  it('uses the key’s bound user, ignores body userId and client totals (AC8)', async () => {
    authenticateRequest.mockResolvedValue({
      authenticated: true,
      source: 'api-key',
      role: 'customer',
      userId: 'bound-user',
    });
    const res = await POST(req(BODY));
    expect(res.status).toBe(201);
    const [input, ctx] = createCustomerOrder.mock.calls[0];
    expect(ctx).toEqual({ userId: 'bound-user', channel: 'public_api' });
    expect(JSON.stringify(input)).not.toContain('someone-else');
    expect(input.items[0]).not.toHaveProperty('price');
    expect(input.idempotencyKey).toBe('k1');
  });

  it('accepts the Idempotency-Key header', async () => {
    authenticateRequest.mockResolvedValue({
      authenticated: true,
      source: 'api-key',
      role: 'customer',
      userId: 'bound-user',
    });
    const { idempotencyKey: _k, ...rest } = BODY;
    await POST(req(rest, { 'idempotency-key': 'hdr-1' }));
    expect(createCustomerOrder.mock.calls[0][0].idempotencyKey).toBe('hdr-1');
  });

  it('maps typed errors to HTTP statuses and a code', async () => {
    authenticateRequest.mockResolvedValue({
      authenticated: true,
      source: 'api-key',
      role: 'customer',
      userId: 'bound-user',
    });
    createCustomerOrder.mockResolvedValue({
      success: false,
      code: 'BELOW_MINIMUM',
      message: 'minimum',
    });
    const res = await POST(req(BODY));
    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe('BELOW_MINIMUM');
  });

  it('refuses an unbound customer key', async () => {
    authenticateRequest.mockResolvedValue({
      authenticated: true,
      source: 'api-key',
      role: 'customer',
    });
    expect((await POST(req(BODY))).status).toBe(403);
    expect(createCustomerOrder).not.toHaveBeenCalled();
  });

  it('refuses a customer sending a tab or pay-now', async () => {
    authenticateRequest.mockResolvedValue({
      authenticated: true,
      source: 'api-key',
      role: 'customer',
      userId: 'bound-user',
    });
    expect((await POST(req({ ...BODY, tabId: 't1' }))).status).toBe(403);
    expect((await POST(req({ ...BODY, useTab: 'new' }))).status).toBe(403);
    expect((await POST(req({ ...BODY, orderType: 'pay-now' }))).status).toBe(
      403
    );
    expect(createCustomerOrder).not.toHaveBeenCalled();
  });

  it('refuses a key with no role for order writes', async () => {
    authenticateRequest.mockResolvedValue({
      authenticated: true,
      source: 'api-key',
    });
    expect((await POST(req(BODY))).status).toBe(403);
    expect(createCustomerOrder).not.toHaveBeenCalled();
  });

  it('does not send a staff key through the customer service', async () => {
    authenticateRequest.mockResolvedValue({
      authenticated: true,
      source: 'api-key',
      role: 'csr',
    });
    await POST(req(BODY));
    expect(createCustomerOrder).not.toHaveBeenCalled();
  });
});

describe('public tab routes are staff-only (AC6)', () => {
  const tabReq = () =>
    new NextRequest('http://localhost/api/public/tabs', {
      method: 'POST',
      body: JSON.stringify({ tableNumber: 'T1' }),
    });

  it.each([
    ['customer key', { role: 'customer', userId: 'u' }],
    ['role-less key', {}],
    ['customer session', { source: 'session', role: 'customer', userId: 'u' }],
  ])('rejects a tab write from a %s', async (_n, extra) => {
    authenticateRequest.mockResolvedValue({
      authenticated: true,
      source: 'api-key',
      ...extra,
    });
    expect((await TAB_POST(tabReq())).status).toBe(403);
  });
});
