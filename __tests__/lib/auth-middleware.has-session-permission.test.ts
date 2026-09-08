/**
 * @requirement REQ-103 — AC1-AC6: `hasSessionPermission` is the shared,
 * non-redirecting gate reused by every save action this REQ fixes
 * (`updateMenuItemRowAction`, `updateMenuItemPriceAction`,
 * `updatePricingWindowsAction`). Super-admin always bypasses; otherwise the
 * named permission must be explicitly `true` on the session.
 */
import { describe, it, expect } from 'vitest';
import { hasSessionPermission } from '@/lib/auth-middleware';
import { SessionData } from '@/lib/session';

function makeSession(overrides: Partial<SessionData>): SessionData {
  return {
    userId: 'user-1',
    role: 'admin',
    ...overrides,
  } as SessionData;
}

describe('hasSessionPermission', () => {
  it('returns true for super-admin regardless of the permissions object', () => {
    const session = makeSession({
      role: 'super-admin',
      permissions: undefined,
    });
    expect(hasSessionPermission(session, 'menuManagement')).toBe(true);
  });

  it('returns true for super-admin even when the named permission is explicitly false', () => {
    const session = makeSession({
      role: 'super-admin',
      permissions: { menuManagement: false } as any,
    });
    expect(hasSessionPermission(session, 'menuManagement')).toBe(true);
  });

  it('returns true for an admin whose permission is explicitly true', () => {
    const session = makeSession({
      role: 'admin',
      permissions: { menuManagement: true } as any,
    });
    expect(hasSessionPermission(session, 'menuManagement')).toBe(true);
  });

  it('returns false for an admin whose permission is explicitly false', () => {
    const session = makeSession({
      role: 'admin',
      permissions: { menuManagement: false } as any,
    });
    expect(hasSessionPermission(session, 'menuManagement')).toBe(false);
  });

  it('returns false for an admin with no permissions object at all', () => {
    const session = makeSession({ role: 'admin', permissions: undefined });
    expect(hasSessionPermission(session, 'menuManagement')).toBe(false);
  });

  it('returns false for a csr session lacking the permission', () => {
    const session = makeSession({
      role: 'csr',
      permissions: { menuManagement: false } as any,
    });
    expect(hasSessionPermission(session, 'menuManagement')).toBe(false);
  });
});
