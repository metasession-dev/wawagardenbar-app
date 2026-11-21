/**
 * @requirement REQ-ORDER-008 — Order access by owner or signed tracking token (REQ-124, ADR-013)
 *
 * One rule for the tracking page and the socket `join-order` event: the
 * signed-in owner of the order, or a holder of a valid tracking token for it.
 * Anyone else is refused (404 on the page, not joined on the socket).
 */
import { unsealData } from 'iron-session';
import { verifyTrackingToken } from '@/lib/order-tracking-token';
import { sessionOptions, type SessionData } from '@/lib/session';

export interface OrderAccessInput {
  orderId: string;
  token?: string | null;
  /** `session.userId` of the signed-in visitor, if any. */
  sessionUserId?: string | null;
  /** `order.userId` as a string, if the order belongs to an account. */
  orderUserId?: string | null;
}

export function hasOrderAccess(input: OrderAccessInput): boolean {
  const { orderId, token, sessionUserId, orderUserId } = input;
  if (token && verifyTrackingToken(orderId, token)) return true;
  return Boolean(sessionUserId && orderUserId && sessionUserId === orderUserId);
}

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

/** The signed-in user id from a raw `Cookie` header (socket handshake), or null. */
export async function userIdFromCookieHeader(
  header: string | undefined
): Promise<string | null> {
  const seal = readCookie(header, sessionOptions.cookieName);
  if (!seal || !sessionOptions.password) return null;
  try {
    const data = await unsealData<SessionData>(seal, {
      password: sessionOptions.password as string,
    });
    return data?.isLoggedIn && data.userId ? data.userId : null;
  } catch {
    return null;
  }
}

export interface JoinOrderPayload {
  orderId: string;
  token?: string | null;
}

/** Accepts the legacy bare-string payload and `{ orderId, token }`. */
export function parseJoinOrderPayload(raw: unknown): JoinOrderPayload | null {
  if (typeof raw === 'string' && raw) return { orderId: raw };
  if (
    raw &&
    typeof raw === 'object' &&
    typeof (raw as JoinOrderPayload).orderId === 'string' &&
    (raw as JoinOrderPayload).orderId
  ) {
    const { orderId, token } = raw as JoinOrderPayload;
    return { orderId, token: typeof token === 'string' ? token : null };
  }
  return null;
}

/**
 * Decide whether a socket may join `order-<id>`. A valid token is enough and
 * needs no database; otherwise the visitor must be the signed-in owner.
 */
export async function authorizeOrderRoomJoin(
  raw: unknown,
  cookieHeader: string | undefined,
  loadOrderUserId: (orderId: string) => Promise<string | null>
): Promise<{ allowed: boolean; orderId: string | null }> {
  const payload = parseJoinOrderPayload(raw);
  if (!payload) return { allowed: false, orderId: null };
  const { orderId, token } = payload;
  if (token && verifyTrackingToken(orderId, token)) {
    return { allowed: true, orderId };
  }
  const sessionUserId = await userIdFromCookieHeader(cookieHeader);
  if (!sessionUserId) return { allowed: false, orderId };
  let orderUserId: string | null = null;
  try {
    orderUserId = await loadOrderUserId(orderId);
  } catch {
    orderUserId = null;
  }
  return {
    allowed: hasOrderAccess({ orderId, sessionUserId, orderUserId }),
    orderId,
  };
}
