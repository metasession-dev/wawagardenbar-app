/**
 * @requirement REQ-034 — AC4 (post-walkback shape)
 *
 * AC4 originally added three new roles (kitchen / bar / waiting). The
 * design was walked back on 2026-05-13 in favour of a single
 * `kitchenManagement` feature-permission toggled on existing
 * csr / admin / super-admin roles. This file now asserts the
 * post-walkback invariants:
 *   - (REQ-119) `kitchen` and `manager` are now valid roles; `bar` and `waiting` are not.
 *   - `/dashboard/kitchen/*` routes are allowlisted for admin +
 *     super-admin (the layout itself uses
 *     `requirePermission('kitchenManagement')` which is the
 *     load-bearing gate; the route allowlist is documentation).
 *   - `IAdminPermissions` includes the new `kitchenManagement` field
 *     with sensible defaults (false on admin/csr; true on super-admin).
 */
import { describe, it, expect } from 'vitest';
import {
  routePermissions,
  defaultPermissionsForRoles,
  recomputePermissionsForRoleChange,
  hasPermission,
  canAccessDashboardSection,
  getAccessibleRoutes,
} from '@/lib/permissions';
import {
  DEFAULT_ADMIN_PERMISSIONS,
  CSR_DEFAULT_PERMISSIONS,
  SUPER_ADMIN_PERMISSIONS,
  KITCHEN_DEFAULT_PERMISSIONS,
  type IAdminPermissions,
} from '@/interfaces/admin-permissions.interface';

describe('REQ-119 AC1 — staff roles', () => {
  it('kitchen and manager are valid staff roles; bar and waiting are still not', () => {
    // REQ-034 walked back separate kitchen/bar/waiting ROLES in favour of the
    // kitchenManagement permission. REQ-119 deliberately adds `kitchen` and
    // `manager` as roles (alert and refund-approval targets, ADR-009); `bar`
    // and `waiting` remain rejected.
    const kitchen: import('@/interfaces/user.interface').UserRole = 'kitchen';
    const manager: import('@/interfaces/user.interface').UserRole = 'manager';
    expect([kitchen, manager]).toEqual(['kitchen', 'manager']);
    // @ts-expect-error — 'bar' should not be assignable
    const _bar: import('@/interfaces/user.interface').UserRole = 'bar';
    // @ts-expect-error — 'waiting' should not be assignable
    const _waiting: import('@/interfaces/user.interface').UserRole = 'waiting';
    void _bar;
    void _waiting;
  });
});

describe('REQ-034 AC4 — kitchen route allowlist', () => {
  it('grants admin + super-admin only (permission-gated downstream)', () => {
    expect(routePermissions['/dashboard/kitchen']).toEqual([
      'admin',
      'super-admin',
    ]);
    expect(routePermissions['/dashboard/kitchen/recipes']).toEqual([
      'admin',
      'super-admin',
    ]);
    expect(routePermissions['/dashboard/kitchen/production']).toEqual([
      'admin',
      'super-admin',
    ]);
  });
});

describe('REQ-034 AC4 — kitchenManagement permission shape', () => {
  it('exists on IAdminPermissions', () => {
    const sample: IAdminPermissions = DEFAULT_ADMIN_PERMISSIONS;
    expect(typeof sample.kitchenManagement).toBe('boolean');
  });

  it('defaults: admin = false, csr = false, super-admin = true', () => {
    expect(DEFAULT_ADMIN_PERMISSIONS.kitchenManagement).toBe(false);
    expect(CSR_DEFAULT_PERMISSIONS.kitchenManagement).toBe(false);
    expect(SUPER_ADMIN_PERMISSIONS.kitchenManagement).toBe(true);
  });
});

describe('REQ-119 AC7 — effective permissions are the union of role defaults', () => {
  it('defaultPermissionsForRoles unions the defaults of each role', () => {
    const merged = defaultPermissionsForRoles(['csr', 'kitchen']);
    // csr grants rewards + incidents; kitchen grants orders only.
    expect(merged.orderManagement).toBe(true);
    expect(merged.rewardsAndLoyalty).toBe(true);
    expect(merged.incidentsAccess).toBe(true);
    expect(merged.reportsAndAnalytics).toBe(false);
    expect(merged.settingsAndConfiguration).toBe(false);
  });

  it('kitchen alone gets orders only; manager gets csr plus reports', () => {
    expect(defaultPermissionsForRoles(['kitchen'])).toEqual(
      KITCHEN_DEFAULT_PERMISSIONS
    );
    const manager = defaultPermissionsForRoles(['manager']);
    expect(manager.reportsAndAnalytics).toBe(true);
    expect(manager.incidentsAccess).toBe(true);
    expect(manager.rewardsAndLoyalty).toBe(true);
    expect(manager.settingsAndConfiguration).toBe(false);
    expect(manager.menuManagement).toBe(false);
    expect(manager.inventoryManagement).toBe(false);
  });

  it('adding a role switches its permissions on and keeps per-user overrides', () => {
    const current = { ...CSR_DEFAULT_PERMISSIONS, rewardsAndLoyalty: false };
    const next = recomputePermissionsForRoleChange(
      current,
      ['csr'],
      ['csr', 'manager']
    );
    // manager's defaults turn reports on; an override that csr alone had off
    // is switched on again only because manager's defaults grant it.
    expect(next.reportsAndAnalytics).toBe(true);
    expect(next.rewardsAndLoyalty).toBe(true);
    expect(next.orderManagement).toBe(true);
  });

  it('removing a role switches off only what that role alone granted', () => {
    const current = defaultPermissionsForRoles(['csr', 'manager']);
    const next = recomputePermissionsForRoleChange(
      current,
      ['csr', 'manager'],
      ['csr']
    );
    expect(next.reportsAndAnalytics).toBe(false); // only manager granted it
    expect(next.rewardsAndLoyalty).toBe(true); // csr still grants it
    expect(next.orderManagement).toBe(true);
  });

  it('a per-user override that no role default granted survives a role change', () => {
    const current = { ...CSR_DEFAULT_PERMISSIONS, menuManagement: true };
    const next = recomputePermissionsForRoleChange(
      current,
      ['csr'],
      ['csr', 'kitchen']
    );
    expect(next.menuManagement).toBe(true);
  });
});

describe('REQ-119 AC8 — route allowlists (any-of, least privilege for kitchen)', () => {
  it('kitchen reaches orders and the kitchen display, not the dashboard root', () => {
    expect(routePermissions['/dashboard']).not.toContain('kitchen');
    expect(routePermissions['/dashboard/orders']).toContain('kitchen');
    expect(routePermissions['/dashboard/kitchen-display']).toContain('kitchen');
  });

  it('kitchen is refused on the staff-only order sub-areas and on every other section', () => {
    for (const route of [
      '/dashboard/orders/express',
      '/dashboard/orders/tabs',
      '/dashboard/orders/inventory-summary',
      '/dashboard/orders/inventory-updates',
      '/dashboard/menu',
      '/dashboard/customers',
      '/dashboard/inventory',
      '/dashboard/rewards',
      '/dashboard/incidents',
      '/dashboard/settings',
      '/dashboard/kitchen',
      '/dashboard/audit-logs',
      '/dashboard/analytics',
    ]) {
      expect(routePermissions[route], route).not.toContain('kitchen');
    }
  });

  it('manager has every route csr has, and none of the admin-only ones', () => {
    for (const [route, roles] of Object.entries(routePermissions)) {
      if (roles.includes('csr')) {
        expect(roles, route).toContain('manager');
      }
    }
    for (const route of [
      '/dashboard/menu',
      '/dashboard/inventory',
      '/dashboard/settings',
      '/dashboard/audit-logs',
    ]) {
      expect(routePermissions[route], route).not.toContain('manager');
    }
  });

  it('a multi-role member reaches a route when any role grants it', () => {
    const session = { isLoggedIn: true, roles: ['kitchen', 'csr'] } as never;
    expect(hasPermission(session, '/dashboard/customers')).toBe(true);
    expect(hasPermission(session, '/dashboard/settings')).toBe(false);
    expect(canAccessDashboardSection(session, 'customers')).toBe(true);
    expect(getAccessibleRoutes(session)).toContain('/dashboard/orders');
  });
});
