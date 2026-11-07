/**
 * @requirement REQ-119 — AC1, AC2, AC6, AC9 (ADR-009)
 * @srs REQ-AUTHA-004, REQ-AUTHA-005, REQ-AUTHA-007
 *
 * The any-of role helpers: roles[] with the `[role]` fallback, the union of
 * access, `isAdmin` excluding `kitchen`, and customers never gaining staff
 * access.
 */
import { describe, it, expect } from 'vitest';
import {
  getRoles,
  hasAnyRole,
  getPrimaryRole,
  hasAnyAssignedRole,
  isStaff,
  isAdmin,
  isSuperAdmin,
  isCustomerSession,
  hasPermission,
  applyRolesToSession,
  type SessionData,
} from '@/lib/session';

describe('getRoles (AC1, AC9)', () => {
  it('reads roles[]', () => {
    expect(getRoles({ roles: ['csr', 'kitchen'] })).toEqual(['csr', 'kitchen']);
  });

  it('falls back to [role] when only role exists (pre-release session or unmigrated user)', () => {
    expect(getRoles({ role: 'csr' })).toEqual(['csr']);
    expect(getRoles({ role: 'csr', roles: [] })).toEqual(['csr']);
    expect(getRoles({ role: 'super-admin', roles: undefined })).toEqual([
      'super-admin',
    ]);
  });

  it('roles[] wins over role', () => {
    expect(getRoles({ role: 'csr', roles: ['manager'] })).toEqual(['manager']);
  });

  it('de-duplicates and ignores unknown values', () => {
    expect(getRoles({ roles: ['csr', 'csr', 'bogus', 'kitchen'] })).toEqual([
      'csr',
      'kitchen',
    ]);
    expect(getRoles({ role: 'bogus' })).toEqual([]);
  });

  it('returns [] for null, undefined and empty subjects', () => {
    expect(getRoles(null)).toEqual([]);
    expect(getRoles(undefined)).toEqual([]);
    expect(getRoles({})).toEqual([]);
  });

  it('a customer is [customer], never a staff role', () => {
    expect(getRoles({ role: 'customer', roles: [] })).toEqual(['customer']);
  });
});

describe('hasAnyRole is an any-of check (AC2)', () => {
  it('passes when any held role is allowed', () => {
    expect(hasAnyRole({ roles: ['kitchen', 'csr'] }, ['csr', 'admin'])).toBe(
      true
    );
  });

  it('fails when none of the held roles is allowed', () => {
    expect(hasAnyRole({ roles: ['kitchen'] }, ['csr', 'admin'])).toBe(false);
  });

  it('fails for a subject with no roles', () => {
    expect(hasAnyRole({}, ['csr'])).toBe(false);
    expect(hasAnyRole(null, ['csr'])).toBe(false);
  });
});

describe('isAdmin / isStaff / isSuperAdmin (AC2, ADR-009 decision 3)', () => {
  it('isAdmin means csr or above and EXCLUDES kitchen', () => {
    expect(isAdmin({ roles: ['kitchen'] })).toBe(false);
    expect(isAdmin({ roles: ['csr'] })).toBe(true);
    expect(isAdmin({ roles: ['manager'] })).toBe(true);
    expect(isAdmin({ roles: ['admin'] })).toBe(true);
    expect(isAdmin({ roles: ['super-admin'] })).toBe(true);
  });

  it('isAdmin is true for kitchen + csr (union)', () => {
    expect(isAdmin({ roles: ['kitchen', 'csr'] })).toBe(true);
  });

  it('isStaff is true for any staff role including kitchen', () => {
    expect(isStaff({ roles: ['kitchen'] })).toBe(true);
    expect(isStaff({ role: 'csr' })).toBe(true);
  });

  it('isSuperAdmin needs the super-admin role among the roles', () => {
    expect(isSuperAdmin({ roles: ['admin', 'super-admin'] })).toBe(true);
    expect(isSuperAdmin({ roles: ['admin'] })).toBe(false);
  });

  it('hasPermission(session, roles) is any-of', () => {
    expect(hasPermission({ roles: ['kitchen'] }, ['kitchen', 'admin'])).toBe(
      true
    );
    expect(hasPermission({ roles: ['kitchen'] }, ['admin'])).toBe(false);
  });
});

describe('customer and anonymous sessions never gain staff access (AC6)', () => {
  const customer = { role: 'customer', roles: [] };

  it('is not staff, admin or super-admin and holds no allowed staff role', () => {
    expect(isStaff(customer)).toBe(false);
    expect(isAdmin(customer)).toBe(false);
    expect(isSuperAdmin(customer)).toBe(false);
    expect(
      hasAnyRole(customer, [
        'csr',
        'kitchen',
        'manager',
        'admin',
        'super-admin',
      ])
    ).toBe(false);
  });

  it('isCustomerSession is true only for customers', () => {
    expect(isCustomerSession(customer)).toBe(true);
    expect(isCustomerSession({ roles: ['csr'] })).toBe(false);
    expect(isCustomerSession(null)).toBe(false);
    expect(isCustomerSession({})).toBe(false);
  });

  it('a guest or null session is rejected everywhere', () => {
    for (const subject of [null, undefined, {}, { isGuest: true }]) {
      expect(isStaff(subject as never)).toBe(false);
      expect(isAdmin(subject as never)).toBe(false);
      expect(hasAnyAssignedRole(subject as never)).toBe(false);
    }
  });

  it('a tampered customer record with roles: ["customer"] is not staff', () => {
    expect(isStaff({ role: 'customer', roles: ['customer'] })).toBe(false);
  });
});

describe('getPrimaryRole picks the highest role', () => {
  it('orders super-admin > admin > manager > csr > kitchen', () => {
    expect(getPrimaryRole({ roles: ['kitchen', 'csr'] })).toBe('csr');
    expect(getPrimaryRole({ roles: ['csr', 'manager'] })).toBe('manager');
    expect(getPrimaryRole({ roles: ['manager', 'admin'] })).toBe('admin');
    expect(getPrimaryRole({ roles: ['admin', 'super-admin'] })).toBe(
      'super-admin'
    );
    expect(getPrimaryRole({ role: 'kitchen' })).toBe('kitchen');
    expect(getPrimaryRole({})).toBeUndefined();
  });
});

describe('applyRolesToSession (AC1)', () => {
  it('writes roles and the back-compat role (highest)', () => {
    const session: SessionData = { isLoggedIn: true };
    applyRolesToSession(session, ['kitchen', 'csr']);
    expect(session.roles).toEqual(['kitchen', 'csr']);
    expect(session.role).toBe('csr');
  });

  it('a customer session gets role customer and no staff roles', () => {
    const session: SessionData = { isLoggedIn: true };
    applyRolesToSession(session, ['customer']);
    expect(session.roles).toEqual([]);
    expect(session.role).toBe('customer');
  });
});

describe('pre-release session cookie (AC9, US-03.14)', () => {
  it('a session with only role resolves to the same access', () => {
    const old: SessionData = { isLoggedIn: true, role: 'csr' };
    expect(getRoles(old)).toEqual(['csr']);
    expect(isAdmin(old)).toBe(true);
    expect(isSuperAdmin(old)).toBe(false);
  });
});
