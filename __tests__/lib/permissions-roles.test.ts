/**
 * @requirement REQ-034 — AC4
 * New roles kitchen / bar / waiting in enum.
 * Kitchen: default-deny allowlist on /dashboard/kitchen/*.
 * Bar/waiting: csr-equivalent.
 */
import { describe, it, expect } from 'vitest';
import {
  routePermissions,
  dashboardSections,
  hasPermission,
  isAdmin,
  isSuperAdmin,
  canAccessDashboardSection,
  getPermissionLevel,
} from '@/lib/permissions';
import type { UserRole } from '@/interfaces/user.interface';
import type { SessionData } from '@/lib/session';

const session = (role: UserRole): SessionData => ({
  isLoggedIn: true,
  userId: 'u1',
  role,
});

describe('REQ-034 AC4 — kitchen/bar/waiting roles', () => {
  describe('role enum is exhaustive', () => {
    it('UserRole admits the three new values without TS error', () => {
      const roles: UserRole[] = [
        'customer',
        'csr',
        'admin',
        'super-admin',
        'kitchen',
        'bar',
        'waiting',
      ];
      expect(roles).toHaveLength(7);
    });
  });

  describe('kitchen default-deny allowlist', () => {
    it('allows /dashboard/kitchen/recipes', () => {
      expect(
        hasPermission(session('kitchen'), '/dashboard/kitchen/recipes')
      ).toBe(true);
    });
    it('allows /dashboard/kitchen/production', () => {
      expect(
        hasPermission(session('kitchen'), '/dashboard/kitchen/production')
      ).toBe(true);
    });
    it('denies /dashboard/orders', () => {
      expect(hasPermission(session('kitchen'), '/dashboard/orders')).toBe(
        false
      );
    });
    it('denies /dashboard/customers', () => {
      expect(hasPermission(session('kitchen'), '/dashboard/customers')).toBe(
        false
      );
    });
    it('denies /dashboard/inventory', () => {
      expect(hasPermission(session('kitchen'), '/dashboard/inventory')).toBe(
        false
      );
    });
    it('denies /dashboard/rewards', () => {
      expect(hasPermission(session('kitchen'), '/dashboard/rewards')).toBe(
        false
      );
    });
    it('denies /dashboard/settings', () => {
      expect(hasPermission(session('kitchen'), '/dashboard/settings')).toBe(
        false
      );
    });
    it('denies /dashboard/analytics', () => {
      expect(hasPermission(session('kitchen'), '/dashboard/analytics')).toBe(
        false
      );
    });
    it('denies /dashboard/menu', () => {
      expect(hasPermission(session('kitchen'), '/dashboard/menu')).toBe(false);
    });
    it('isAdmin() returns false for kitchen', () => {
      expect(isAdmin(session('kitchen'))).toBe(false);
    });
  });

  describe('bar csr-equivalent', () => {
    it('allows /dashboard/orders (csr-permitted)', () => {
      expect(hasPermission(session('bar'), '/dashboard/orders')).toBe(true);
    });
    it('allows /dashboard/customers (csr-permitted)', () => {
      expect(hasPermission(session('bar'), '/dashboard/customers')).toBe(true);
    });
    it('allows /dashboard/rewards (csr-permitted)', () => {
      expect(hasPermission(session('bar'), '/dashboard/rewards')).toBe(true);
    });
    it('denies /dashboard/settings (super-admin only)', () => {
      expect(hasPermission(session('bar'), '/dashboard/settings')).toBe(false);
    });
    it('denies /dashboard/analytics (super-admin only)', () => {
      expect(hasPermission(session('bar'), '/dashboard/analytics')).toBe(false);
    });
    it('denies /dashboard/inventory (super-admin only)', () => {
      expect(hasPermission(session('bar'), '/dashboard/inventory')).toBe(false);
    });
    it('denies /dashboard/kitchen/recipes', () => {
      expect(hasPermission(session('bar'), '/dashboard/kitchen/recipes')).toBe(
        false
      );
    });
    it('isAdmin() returns true for bar (csr-equivalent)', () => {
      expect(isAdmin(session('bar'))).toBe(true);
    });
  });

  describe('waiting csr-equivalent', () => {
    it('allows /dashboard/orders (csr-permitted)', () => {
      expect(hasPermission(session('waiting'), '/dashboard/orders')).toBe(true);
    });
    it('allows /dashboard/customers (csr-permitted)', () => {
      expect(hasPermission(session('waiting'), '/dashboard/customers')).toBe(
        true
      );
    });
    it('denies /dashboard/settings (super-admin only)', () => {
      expect(hasPermission(session('waiting'), '/dashboard/settings')).toBe(
        false
      );
    });
    it('denies /dashboard/kitchen/recipes', () => {
      expect(
        hasPermission(session('waiting'), '/dashboard/kitchen/recipes')
      ).toBe(false);
    });
    it('isAdmin() returns true for waiting (csr-equivalent)', () => {
      expect(isAdmin(session('waiting'))).toBe(true);
    });
  });

  describe('admin / super-admin still access /dashboard/kitchen/*', () => {
    it('admin allowed on kitchen recipes', () => {
      expect(
        hasPermission(session('admin'), '/dashboard/kitchen/recipes')
      ).toBe(true);
    });
    it('super-admin allowed on kitchen recipes', () => {
      expect(
        hasPermission(session('super-admin'), '/dashboard/kitchen/recipes')
      ).toBe(true);
    });
    it('csr NOT allowed on kitchen recipes', () => {
      expect(hasPermission(session('csr'), '/dashboard/kitchen/recipes')).toBe(
        false
      );
    });
  });

  describe('canAccessDashboardSection', () => {
    it('kitchen section allows kitchen role', () => {
      expect(canAccessDashboardSection('kitchen', 'kitchenRecipes')).toBe(true);
      expect(canAccessDashboardSection('kitchen', 'kitchenProduction')).toBe(
        true
      );
    });
    it('kitchen section denies bar/waiting', () => {
      expect(canAccessDashboardSection('bar', 'kitchenRecipes')).toBe(false);
      expect(canAccessDashboardSection('waiting', 'kitchenRecipes')).toBe(
        false
      );
    });
    it('orders section allows bar / waiting (csr-equivalent)', () => {
      expect(canAccessDashboardSection('bar', 'orders')).toBe(true);
      expect(canAccessDashboardSection('waiting', 'orders')).toBe(true);
    });
    it('orders section denies kitchen', () => {
      expect(canAccessDashboardSection('kitchen', 'orders')).toBe(false);
    });
  });

  describe('getPermissionLevel', () => {
    it('kitchen / bar / waiting are level 2 (csr-equivalent)', () => {
      expect(getPermissionLevel('kitchen')).toBe(2);
      expect(getPermissionLevel('bar')).toBe(2);
      expect(getPermissionLevel('waiting')).toBe(2);
      expect(getPermissionLevel('csr')).toBe(2);
    });
    it('admin is level 3, super-admin level 4', () => {
      expect(getPermissionLevel('admin')).toBe(3);
      expect(getPermissionLevel('super-admin')).toBe(4);
    });
  });

  describe('isSuperAdmin', () => {
    it('returns false for kitchen / bar / waiting', () => {
      expect(isSuperAdmin(session('kitchen'))).toBe(false);
      expect(isSuperAdmin(session('bar'))).toBe(false);
      expect(isSuperAdmin(session('waiting'))).toBe(false);
    });
  });

  describe('routePermissions / dashboardSections shape', () => {
    it('has /dashboard/kitchen/recipes route', () => {
      expect(routePermissions['/dashboard/kitchen/recipes']).toEqual([
        'admin',
        'super-admin',
        'kitchen',
      ]);
    });
    it('has kitchenRecipes + kitchenProduction sections', () => {
      expect(dashboardSections.kitchenRecipes.roles).toContain('kitchen');
      expect(dashboardSections.kitchenProduction.roles).toContain('kitchen');
    });
  });
});
