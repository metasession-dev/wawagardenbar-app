/**
 * @requirement REQ-117 (AC7, ADR-008) — customers stay signed in for 90 days
 * (extended on activity); staff keep the 7-day default. Uses the real iron
 * seal/unseal so the "two lifetimes under one cookie name" assumption in the
 * ADR is actually proven.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sealData, unsealData } from 'iron-session';
import {
  CUSTOMER_SESSION_TTL_SECONDS,
  CUSTOMER_SESSION_REFRESH_AFTER_MS,
  applyCustomerSessionLifetime,
  shouldRefreshCustomerSession,
  sessionOptions,
  type SessionData,
} from '@/lib/session';

const PASSWORD = 'p'.repeat(32);
const DAY_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-05T10:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
});

describe('REQ-117 customer session lifetime', () => {
  it('AC7 — the customer lifetime is 90 days', () => {
    expect(CUSTOMER_SESSION_TTL_SECONDS).toBe(90 * 24 * 60 * 60);
  });

  it('AC7 — a customer seal still unseals after 60 days under the default unseal options', async () => {
    const seal = await sealData(
      { userId: 'u1', isLoggedIn: true },
      { password: PASSWORD, ttl: CUSTOMER_SESSION_TTL_SECONDS }
    );
    vi.setSystemTime(new Date(Date.now() + 60 * DAY_MS));
    // getIronSession unseals with the session options' default ttl, not 90 days.
    const data = await unsealData<{ userId?: string }>(seal, {
      password: PASSWORD,
    });
    expect(data.userId).toBe('u1');
  });

  it('AC7 — a customer seal is rejected after 91 days', async () => {
    const seal = await sealData(
      { userId: 'u1', isLoggedIn: true },
      { password: PASSWORD, ttl: CUSTOMER_SESSION_TTL_SECONDS }
    );
    vi.setSystemTime(new Date(Date.now() + 91 * DAY_MS));
    const data = await unsealData<{ userId?: string }>(seal, {
      password: PASSWORD,
    });
    expect(data.userId).toBeUndefined();
  });

  it('AC7 — a staff-style 7-day seal is rejected after 8 days (staff lifetime unchanged)', async () => {
    const seal = await sealData(
      { userId: 'staff1', isLoggedIn: true },
      { password: PASSWORD, ttl: 7 * 24 * 60 * 60 }
    );
    vi.setSystemTime(new Date(Date.now() + 8 * DAY_MS));
    const data = await unsealData<{ userId?: string }>(seal, {
      password: PASSWORD,
    });
    expect(data.userId).toBeUndefined();
  });

  it('AC7 — the shared staff default stays 7 days', () => {
    expect(sessionOptions.cookieOptions?.maxAge).toBe(7 * 24 * 60 * 60);
  });

  it('AC7 — applyCustomerSessionLifetime sets ttl and cookie maxAge to 90 days', () => {
    const updateConfig = vi.fn();
    applyCustomerSessionLifetime({ updateConfig } as never);
    const config = updateConfig.mock.calls[0][0];
    expect(config.ttl).toBe(CUSTOMER_SESSION_TTL_SECONDS);
    expect(config.cookieOptions.maxAge).toBe(CUSTOMER_SESSION_TTL_SECONDS);
    expect(config.cookieOptions.httpOnly).toBe(true);
  });
});

describe('REQ-117 customer session refresh on activity', () => {
  const base: SessionData = {
    isLoggedIn: true,
    role: 'customer',
    userId: 'u1',
    createdAt: Date.now(),
  };

  it('AC7 — not refreshed within a day of the last extension', () => {
    expect(shouldRefreshCustomerSession(base)).toBe(false);
  });

  it('AC7 — refreshed once a day has passed', () => {
    expect(
      shouldRefreshCustomerSession(
        base,
        base.createdAt! + CUSTOMER_SESSION_REFRESH_AFTER_MS
      )
    ).toBe(true);
  });

  it('AC7 — uses refreshedAt over createdAt when present', () => {
    const session = { ...base, refreshedAt: Date.now() };
    expect(shouldRefreshCustomerSession(session, Date.now() + 2 * DAY_MS)).toBe(
      true
    );
    expect(shouldRefreshCustomerSession(session, Date.now() + 1000)).toBe(
      false
    );
  });

  it('AC7 — staff, guests and signed-out sessions are never refreshed', () => {
    const later = Date.now() + 100 * DAY_MS;
    expect(
      shouldRefreshCustomerSession({ ...base, role: 'admin' }, later)
    ).toBe(false);
    expect(
      shouldRefreshCustomerSession({ ...base, isGuest: true }, later)
    ).toBe(false);
    expect(
      shouldRefreshCustomerSession({ ...base, isLoggedIn: false }, later)
    ).toBe(false);
  });
});
