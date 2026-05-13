/**
 * @requirement REQ-034 — AC4 (post-walkback shape)
 *
 * AC4 originally added three new roles (kitchen / bar / waiting). The
 * design was walked back on 2026-05-13 in favour of a single
 * `kitchenManagement` feature-permission toggled on existing
 * csr / admin / super-admin roles. This file now asserts the
 * post-walkback invariants:
 *   - UserRole stays at the original four values.
 *   - `/dashboard/kitchen/*` routes are allowlisted for admin +
 *     super-admin (the layout itself uses
 *     `requirePermission('kitchenManagement')` which is the
 *     load-bearing gate; the route allowlist is documentation).
 *   - `IAdminPermissions` includes the new `kitchenManagement` field
 *     with sensible defaults (false on admin/csr; true on super-admin).
 */
import { describe, it, expect } from 'vitest';
import { routePermissions } from '@/lib/permissions';
import {
  DEFAULT_ADMIN_PERMISSIONS,
  CSR_DEFAULT_PERMISSIONS,
  SUPER_ADMIN_PERMISSIONS,
  type IAdminPermissions,
} from '@/interfaces/admin-permissions.interface';

describe('REQ-034 AC4 — UserRole stays at the original four values', () => {
  it('only customer / csr / admin / super-admin are accepted', () => {
    const validRole: import('@/interfaces/user.interface').UserRole = 'admin';
    expect(validRole).toBe('admin');
    // @ts-expect-error — 'kitchen' should not be assignable
    const _kitchen: import('@/interfaces/user.interface').UserRole = 'kitchen';
    // @ts-expect-error — 'bar' should not be assignable
    const _bar: import('@/interfaces/user.interface').UserRole = 'bar';
    // @ts-expect-error — 'waiting' should not be assignable
    const _waiting: import('@/interfaces/user.interface').UserRole = 'waiting';
    void _kitchen;
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
