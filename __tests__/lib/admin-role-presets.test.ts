/**
 * @requirement REQ-034 — AC4
 *
 * Settings UI role-dropdown helpers. The dropdown itself is rendered in
 * `components/features/admin/create-admin-dialog.tsx`; this suite covers
 * the pure helpers that drive it.
 */
import { describe, it, expect } from 'vitest';
import {
  ASSIGNABLE_ROLES,
  getRoleDisplayLabel,
  getRoleDescription,
  getDefaultPermissionsForRole,
} from '@/lib/admin-role-presets';
import {
  BAR_DEFAULT_PERMISSIONS,
  CSR_DEFAULT_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,
  KITCHEN_DEFAULT_PERMISSIONS,
  WAITING_DEFAULT_PERMISSIONS,
} from '@/interfaces/admin-permissions.interface';
import type { UserRole } from '@/interfaces/user.interface';

describe('REQ-034 AC4 — ASSIGNABLE_ROLES', () => {
  it('includes csr, kitchen, bar, waiting, admin, super-admin and excludes customer', () => {
    expect(ASSIGNABLE_ROLES).toEqual([
      'csr',
      'bar',
      'waiting',
      'kitchen',
      'admin',
      'super-admin',
    ]);
    expect(ASSIGNABLE_ROLES).not.toContain('customer');
  });

  it('orders least-privileged first, super-admin last', () => {
    expect(ASSIGNABLE_ROLES[0]).toBe('csr');
    expect(ASSIGNABLE_ROLES[ASSIGNABLE_ROLES.length - 1]).toBe('super-admin');
  });
});

describe('REQ-034 AC4 — getRoleDisplayLabel', () => {
  const cases: Array<[UserRole, string]> = [
    ['csr', 'Customer Service Rep'],
    ['admin', 'Admin'],
    ['super-admin', 'Super Admin'],
    ['kitchen', 'Kitchen Staff'],
    ['bar', 'Bar Staff'],
    ['waiting', 'Waiting Staff'],
    ['customer', 'Customer'],
  ];
  for (const [role, label] of cases) {
    it(`labels ${role} as "${label}"`, () => {
      expect(getRoleDisplayLabel(role)).toBe(label);
    });
  }
});

describe('REQ-034 AC4 — getRoleDescription', () => {
  it('returns a non-empty description for every assignable role', () => {
    for (const role of ASSIGNABLE_ROLES) {
      expect(getRoleDescription(role).length).toBeGreaterThan(0);
    }
  });

  it('flags kitchen as kitchen-only / no orders / finance / settings', () => {
    const desc = getRoleDescription('kitchen').toLowerCase();
    expect(desc).toContain('recipes');
    expect(desc).toContain('production');
  });

  it('marks bar and waiting as csr-equivalent in the helper text', () => {
    expect(getRoleDescription('bar').toLowerCase()).toContain('csr-equivalent');
    expect(getRoleDescription('waiting').toLowerCase()).toContain(
      'csr-equivalent'
    );
  });
});

describe('REQ-034 AC4 — getDefaultPermissionsForRole', () => {
  it('maps csr → CSR_DEFAULT_PERMISSIONS', () => {
    expect(getDefaultPermissionsForRole('csr')).toBe(CSR_DEFAULT_PERMISSIONS);
  });

  it('maps admin → DEFAULT_ADMIN_PERMISSIONS', () => {
    expect(getDefaultPermissionsForRole('admin')).toBe(
      DEFAULT_ADMIN_PERMISSIONS
    );
  });

  it('maps bar → BAR_DEFAULT_PERMISSIONS (csr-equivalent shape)', () => {
    expect(getDefaultPermissionsForRole('bar')).toBe(BAR_DEFAULT_PERMISSIONS);
  });

  it('maps waiting → WAITING_DEFAULT_PERMISSIONS (csr-equivalent shape)', () => {
    expect(getDefaultPermissionsForRole('waiting')).toBe(
      WAITING_DEFAULT_PERMISSIONS
    );
  });

  it('maps kitchen → KITCHEN_DEFAULT_PERMISSIONS (all false, route-gated)', () => {
    expect(getDefaultPermissionsForRole('kitchen')).toBe(
      KITCHEN_DEFAULT_PERMISSIONS
    );
    // belt-and-braces: every feature flag is false
    expect(
      Object.values(KITCHEN_DEFAULT_PERMISSIONS).every((v) => v === false)
    ).toBe(true);
  });

  it('returns null for super-admin (no feature gating)', () => {
    expect(getDefaultPermissionsForRole('super-admin')).toBeNull();
  });

  it('returns null for customer (never an admin)', () => {
    expect(getDefaultPermissionsForRole('customer')).toBeNull();
  });
});
