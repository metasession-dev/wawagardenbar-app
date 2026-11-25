/**
 * @requirement REQ-127 (AC1, AC2, AC3) — the idempotency key follows the cart.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CHECKOUT_ATTEMPT_TTL_MS,
  cartFingerprint,
  clearCheckoutAttempt,
  readCheckoutAttempt,
  resolveCheckoutAttempt,
  writeCheckoutAttempt,
} from '@/lib/checkout-attempt';

function fakeSessionStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

const base = {
  orderType: 'dine-in',
  tableNumber: '12',
  items: [
    { id: 'jollof', quantity: 2 },
    { id: 'zobo', quantity: 1, specialInstructions: 'no ice' },
  ],
  tipAmount: 0,
};

describe('cartFingerprint', () => {
  it('is stable and ignores item order', () => {
    const a = cartFingerprint(base);
    const b = cartFingerprint({ ...base, items: [...base.items].reverse() });
    expect(a).toBe(b);
    expect(a).toBe(cartFingerprint(base));
  });

  it.each([
    ['quantity', { items: [{ id: 'jollof', quantity: 3 }, base.items[1]] }],
    ['an extra item', { items: [...base.items, { id: 'suya', quantity: 1 }] }],
    ['the tip (it is part of the order total)', { tipAmount: 500 }],
    ['the table', { tableNumber: '7' }],
    ['the order type', { orderType: 'pickup' }],
    ['the delivery details', { delivery: '{"street":"1 Road"}' }],
    ['the note', { specialInstructions: 'allergy' }],
    [
      'a customisation',
      {
        items: [
          {
            id: 'jollof',
            quantity: 2,
            customizations: [{ id: 'x', price: 100 }],
          },
          base.items[1],
        ],
      },
    ],
  ])('changes when %s changes', (_what, change) => {
    expect(cartFingerprint({ ...base, ...change })).not.toBe(
      cartFingerprint(base)
    );
  });
});

describe('resolveCheckoutAttempt', () => {
  let store: ReturnType<typeof fakeSessionStorage>;
  beforeEach(() => {
    store = fakeSessionStorage();
    vi.stubGlobal('window', { sessionStorage: store });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('gives a new key when nothing is stored', () => {
    const r = resolveCheckoutAttempt('fp-1');
    expect(r.key).toMatch(/^checkout-/);
    expect(r).toMatchObject({ reused: false, supersededOrderId: null });
  });

  it('AC1: the same cart reuses the stored key, even after a remount or reload', () => {
    writeCheckoutAttempt({
      key: 'checkout-A',
      fingerprint: 'fp-1',
      orderId: 'order-1',
      createdAt: Date.now(),
    });
    expect(resolveCheckoutAttempt('fp-1')).toEqual({
      key: 'checkout-A',
      supersededOrderId: null,
      reused: true,
    });
  });

  it('AC2: a changed cart gets a new key and names the superseded order', () => {
    writeCheckoutAttempt({
      key: 'checkout-A',
      fingerprint: 'fp-1',
      orderId: 'order-1',
      createdAt: Date.now(),
    });
    const r = resolveCheckoutAttempt('fp-2');
    expect(r.key).not.toBe('checkout-A');
    expect(r).toMatchObject({ reused: false, supersededOrderId: 'order-1' });
  });

  it('a changed cart before any order was created supersedes nothing', () => {
    writeCheckoutAttempt({
      key: 'checkout-A',
      fingerprint: 'fp-1',
      orderId: null,
      createdAt: Date.now(),
    });
    expect(resolveCheckoutAttempt('fp-2').supersededOrderId).toBeNull();
  });

  it('an expired attempt is ignored (unpaid orders expire at 30 minutes)', () => {
    const now = Date.now();
    writeCheckoutAttempt({
      key: 'checkout-A',
      fingerprint: 'fp-1',
      orderId: 'order-1',
      createdAt: now - CHECKOUT_ATTEMPT_TTL_MS - 1,
    });
    expect(readCheckoutAttempt(now)).toBeNull();
    expect(resolveCheckoutAttempt('fp-1', now).reused).toBe(false);
  });

  it('AC3: clearing removes the attempt', () => {
    writeCheckoutAttempt({
      key: 'checkout-A',
      fingerprint: 'fp-1',
      orderId: 'order-1',
      createdAt: Date.now(),
    });
    clearCheckoutAttempt();
    expect(readCheckoutAttempt()).toBeNull();
  });

  it('ignores corrupt stored data', () => {
    store.setItem('wgb:checkout-attempt', '{not json');
    expect(readCheckoutAttempt()).toBeNull();
    store.setItem('wgb:checkout-attempt', JSON.stringify({ key: 1 }));
    expect(readCheckoutAttempt()).toBeNull();
  });

  it('works without storage: a new key every time, as before', () => {
    vi.stubGlobal('window', {
      get sessionStorage(): Storage {
        throw new Error('blocked');
      },
    });
    expect(resolveCheckoutAttempt('fp-1').reused).toBe(false);
    expect(() =>
      writeCheckoutAttempt({
        key: 'k',
        fingerprint: 'f',
        orderId: null,
        createdAt: Date.now(),
      })
    ).not.toThrow();
    expect(() => clearCheckoutAttempt()).not.toThrow();
  });
});
