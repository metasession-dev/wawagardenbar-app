/** @requirement REQ-ORDER-008 (REQ-124 AC3) */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createTrackingToken,
  verifyTrackingToken,
  buildTrackingUrl,
  buildTrackingButtonSuffix,
  TRACKING_TOKEN_TTL_SECONDS,
} from '@/lib/order-tracking-token';

const SECRET = 'x'.repeat(40);
const A = '65f0c0ffee0000000000000a';
const B = '65f0c0ffee0000000000000b';

describe('order tracking token', () => {
  const original = process.env.ORDER_TRACKING_SECRET;
  beforeEach(() => {
    process.env.ORDER_TRACKING_SECRET = SECRET;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.ORDER_TRACKING_SECRET;
    else process.env.ORDER_TRACKING_SECRET = original;
  });

  it('accepts a fresh token for its own order', () => {
    const t = createTrackingToken(A)!;
    expect(verifyTrackingToken(A, t)).toBe(true);
  });

  it('rejects a token minted for another order', () => {
    const t = createTrackingToken(A)!;
    expect(verifyTrackingToken(B, t)).toBe(false);
  });

  it('rejects an expired token and accepts it just before expiry', () => {
    const now = Date.now();
    const t = createTrackingToken(A, now)!;
    const ttlMs = TRACKING_TOKEN_TTL_SECONDS * 1000;
    expect(verifyTrackingToken(A, t, now + ttlMs - 2000)).toBe(true);
    expect(verifyTrackingToken(A, t, now + ttlMs + 2000)).toBe(false);
  });

  it('rejects a tampered expiry or signature', () => {
    const t = createTrackingToken(A)!;
    const [exp, sig] = t.split('.');
    expect(verifyTrackingToken(A, `${Number(exp) + 100000}.${sig}`)).toBe(false);
    expect(verifyTrackingToken(A, `${exp}.${sig.slice(0, -1)}A`)).toBe(false);
    expect(verifyTrackingToken(A, `${exp}.`)).toBe(false);
  });

  it('rejects empty, malformed and non-string tokens', () => {
    for (const bad of [undefined, null, '', 'abc', '.', '12.', 'x.y']) {
      expect(verifyTrackingToken(A, bad as string | null | undefined)).toBe(false);
    }
  });

  it('fails closed without a usable secret', () => {
    const t = createTrackingToken(A)!;
    delete process.env.ORDER_TRACKING_SECRET;
    expect(createTrackingToken(A)).toBeNull();
    expect(verifyTrackingToken(A, t)).toBe(false);
    process.env.ORDER_TRACKING_SECRET = 'short';
    expect(createTrackingToken(A)).toBeNull();
    expect(verifyTrackingToken(A, t)).toBe(false);
  });

  it('a token minted with a different secret is rejected', () => {
    const t = createTrackingToken(A)!;
    process.env.ORDER_TRACKING_SECRET = 'y'.repeat(40);
    expect(verifyTrackingToken(A, t)).toBe(false);
  });

  it('builds a link and a button suffix carrying the token', () => {
    const url = buildTrackingUrl(A, 'https://app.example.com/');
    expect(url.startsWith(`https://app.example.com/orders/${A}?t=`)).toBe(true);
    const token = new URL(url).searchParams.get('t');
    expect(verifyTrackingToken(A, token)).toBe(true);
    expect(buildTrackingButtonSuffix(A).startsWith(`${A}?t=`)).toBe(true);
  });

  it('builds a plain link when no secret is set', () => {
    delete process.env.ORDER_TRACKING_SECRET;
    expect(buildTrackingUrl(A, 'https://app.example.com')).toBe(
      `https://app.example.com/orders/${A}`
    );
    expect(buildTrackingButtonSuffix(A)).toBe(A);
  });
});
