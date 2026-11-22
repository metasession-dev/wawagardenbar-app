/**
 * @requirement REQ-ORDER-008 — Order access by owner or signed tracking token (REQ-124, ADR-013)
 *
 * Stateless, order-bound, expiring token. Format: `<expiryEpochSeconds>.<signature>`
 * where signature = base64url(HMAC-SHA256(secret, `${orderId}.${expiryEpochSeconds}`)).
 * The order id is part of the signed message, so a token only works for the order
 * it was minted for. Fails closed when `ORDER_TRACKING_SECRET` is missing or short.
 */
import { createHmac, timingSafeEqual } from 'crypto';

export const TRACKING_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
export const MIN_SECRET_LENGTH = 32;

function getSecret(): string | null {
  const secret = process.env.ORDER_TRACKING_SECRET;
  return secret && secret.length >= MIN_SECRET_LENGTH ? secret : null;
}

function sign(secret: string, orderId: string, expiry: number): string {
  return createHmac('sha256', secret)
    .update(`${orderId}.${expiry}`)
    .digest('base64url');
}

/** Mint a token for one order. Returns null when the secret is not configured. */
export function createTrackingToken(
  orderId: string,
  now: number = Date.now()
): string | null {
  const secret = getSecret();
  if (!secret || !orderId) return null;
  const expiry = Math.floor(now / 1000) + TRACKING_TOKEN_TTL_SECONDS;
  return `${expiry}.${sign(secret, orderId, expiry)}`;
}

/** True only for an unexpired, untampered token minted for exactly this order. */
export function verifyTrackingToken(
  orderId: string,
  token: string | null | undefined,
  now: number = Date.now()
): boolean {
  const secret = getSecret();
  if (!secret || !orderId || !token || typeof token !== 'string') return false;
  const dot = token.indexOf('.');
  if (dot < 1) return false;
  const expiryRaw = token.slice(0, dot);
  const given = token.slice(dot + 1);
  if (!/^\d{1,12}$/.test(expiryRaw)) return false;
  const expiry = Number(expiryRaw);
  if (expiry * 1000 < now) return false;
  const expected = Buffer.from(sign(secret, orderId, expiry));
  const actual = Buffer.from(given);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/**
 * Customer-facing link to an order. Carries the token when one can be minted;
 * without it the link still works for a signed-in owner.
 */
export function buildTrackingUrl(orderId: string, baseUrl?: string): string {
  const base = (baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? '').replace(
    /\/$/,
    ''
  );
  const token = createTrackingToken(orderId);
  return `${base}/orders/${orderId}${token ? `?t=${token}` : ''}`;
}

/** The URL-button suffix for the `order_status_update_v2` template (`{{1}}` after `/orders/`). */
export function buildTrackingButtonSuffix(orderId: string): string {
  const token = createTrackingToken(orderId);
  return token ? `${orderId}?t=${token}` : orderId;
}
