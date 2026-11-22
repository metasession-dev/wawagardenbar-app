/**
 * @requirement REQ-ORDER-008 (REQ-124 AC3) — owner-or-token rule for the
 * tracking page and the socket `join-order` event.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.SESSION_PASSWORD = 'p'.repeat(40);
  process.env.ORDER_TRACKING_SECRET = 't'.repeat(40);
});

import { sealData } from 'iron-session';
import {
  hasOrderAccess,
  idString,
  authorizeOrderRoomJoin,
  parseJoinOrderPayload,
  userIdFromCookieHeader,
} from '@/lib/order-access';
import { createTrackingToken } from '@/lib/order-tracking-token';
import { sessionOptions } from '@/lib/session';

const A = '65f0c0ffee0000000000000a';
const B = '65f0c0ffee0000000000000b';

async function cookieFor(userId: string | null, loggedIn = true) {
  const seal = await sealData(
    { userId: userId ?? undefined, isLoggedIn: loggedIn },
    { password: process.env.SESSION_PASSWORD as string }
  );
  return `other=1; ${sessionOptions.cookieName}=${encodeURIComponent(seal)}`;
}

describe('hasOrderAccess', () => {
  it('allows the signed-in owner, a valid token, and nobody else', () => {
    expect(
      hasOrderAccess({ orderId: A, sessionUserId: 'u1', orderUserId: 'u1' })
    ).toBe(true);
    expect(hasOrderAccess({ orderId: A, token: createTrackingToken(A) })).toBe(
      true
    );
    expect(hasOrderAccess({ orderId: A })).toBe(false);
    expect(
      hasOrderAccess({ orderId: A, sessionUserId: 'u2', orderUserId: 'u1' })
    ).toBe(false);
    expect(
      hasOrderAccess({ orderId: A, sessionUserId: 'u1', orderUserId: null })
    ).toBe(false);
    expect(hasOrderAccess({ orderId: A, token: createTrackingToken(B) })).toBe(
      false
    );
    expect(hasOrderAccess({ orderId: A, token: 'garbage' })).toBe(false);
  });
});

describe('idString', () => {
  it('reads an id from a string, an ObjectId-like value and a populated document', () => {
    expect(idString('abc')).toBe('abc');
    expect(idString(12)).toBe('12');
    expect(idString({ _id: { toString: () => 'u9' }, name: 'Ada' })).toBe('u9');
    expect(idString(null)).toBeNull();
    expect(idString(undefined)).toBeNull();
    expect(idString({ _id: null })).toBeNull();
  });
  it('a populated owner still matches the signed-in user', () => {
    expect(
      hasOrderAccess({
        orderId: A,
        sessionUserId: 'u9',
        orderUserId: idString({ _id: 'u9', name: 'Ada' }),
      })
    ).toBe(true);
  });
});

describe('parseJoinOrderPayload', () => {
  it('accepts a bare id and { orderId, token }, rejects the rest', () => {
    expect(parseJoinOrderPayload(A)).toEqual({ orderId: A });
    expect(parseJoinOrderPayload({ orderId: A, token: 'x' })).toEqual({
      orderId: A,
      token: 'x',
    });
    for (const bad of [null, undefined, '', 5, {}, { orderId: 5 }]) {
      expect(parseJoinOrderPayload(bad)).toBeNull();
    }
  });
});

describe('userIdFromCookieHeader', () => {
  it('reads the signed-in user, and ignores logged-out, tampered and missing cookies', async () => {
    expect(await userIdFromCookieHeader(await cookieFor('u1'))).toBe('u1');
    expect(
      await userIdFromCookieHeader(await cookieFor('u1', false))
    ).toBeNull();
    expect(
      await userIdFromCookieHeader(`${sessionOptions.cookieName}=bogus`)
    ).toBeNull();
    expect(await userIdFromCookieHeader(undefined)).toBeNull();
  });
});

describe('authorizeOrderRoomJoin', () => {
  const owner = vi.fn();
  beforeEach(() => owner.mockReset());

  it('[US-A4.4] refuses a socket with no token and no session', async () => {
    const r = await authorizeOrderRoomJoin(A, undefined, owner);
    expect(r.allowed).toBe(false);
  });

  it('allows a valid token without touching the database', async () => {
    const r = await authorizeOrderRoomJoin(
      { orderId: A, token: createTrackingToken(A) },
      undefined,
      owner
    );
    expect(r).toEqual({ allowed: true, orderId: A });
    expect(owner).not.toHaveBeenCalled();
  });

  it('refuses a token minted for another order', async () => {
    const r = await authorizeOrderRoomJoin(
      { orderId: A, token: createTrackingToken(B) },
      undefined,
      owner
    );
    expect(r.allowed).toBe(false);
  });

  it('allows the signed-in owner and refuses another signed-in user', async () => {
    owner.mockResolvedValue('u1');
    expect(
      (await authorizeOrderRoomJoin(A, await cookieFor('u1'), owner)).allowed
    ).toBe(true);
    expect(
      (await authorizeOrderRoomJoin(A, await cookieFor('u2'), owner)).allowed
    ).toBe(false);
  });

  it('refuses when the owner lookup fails or the order has no owner', async () => {
    owner.mockRejectedValue(new Error('db'));
    expect(
      (await authorizeOrderRoomJoin(A, await cookieFor('u1'), owner)).allowed
    ).toBe(false);
    owner.mockResolvedValue(null);
    expect(
      (await authorizeOrderRoomJoin(A, await cookieFor('u1'), owner)).allowed
    ).toBe(false);
  });

  it('refuses a malformed payload', async () => {
    expect((await authorizeOrderRoomJoin({}, undefined, owner)).allowed).toBe(
      false
    );
  });
});
