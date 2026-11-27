/**
 * @requirement REQ-DASH-007 (REQ-130 AC1, AC2, AC3) — Support link in the dashboard menu
 * @requirement REQ-BOOK-003 (REQ-129 AC4) — Bookings entry, same role rule
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/actions/auth/logout', () => ({ logoutAction: vi.fn() }));

import {
  filterNavItems,
  isNavItemActive,
  navItems,
} from '@/components/features/admin/dashboard-nav';
import { BOOKING_ROLES, SUPPORT_ROLES } from '@/lib/dashboard-section-roles';
import { routePermissions } from '@/lib/permissions';
import type { UserRole } from '@/interfaces/user.interface';

const hrefs = (roles: UserRole[]) =>
  filterNavItems(roles, undefined).map((i) => i.href);

describe('[AC1] Support is in the menu for the roles that can open the page', () => {
  it.each(['csr', 'manager', 'admin', 'super-admin'] as UserRole[])(
    '%s sees Support, opening /dashboard/support',
    (role) => {
      const item = filterNavItems([role], undefined).find(
        (i) => i.title === 'Support'
      );
      expect(item?.href).toBe('/dashboard/support');
    }
  );

  it('a role holding any of the roles sees it (multi-role staff)', () => {
    expect(hrefs(['kitchen', 'csr'])).toContain('/dashboard/support');
  });
});

describe('[AC2] nobody else sees it', () => {
  it.each(['kitchen', 'customer'] as UserRole[])('%s does not', (role) => {
    expect(hrefs([role])).not.toContain('/dashboard/support');
    expect(hrefs([role])).not.toContain('/dashboard/bookings');
  });

  it('no roles at all see nothing', () => {
    expect(hrefs([])).toEqual([]);
  });
});

describe('the menu, the layouts and the proxy use one role list', () => {
  it('Support and Bookings entries use the shared lists', () => {
    expect(navItems.find((i) => i.title === 'Support')?.roles).toEqual([
      ...SUPPORT_ROLES,
    ]);
    expect(navItems.find((i) => i.title === 'Bookings')?.roles).toEqual([
      ...BOOKING_ROLES,
    ]);
  });

  it('the proxy route table lists the same roles for both sections', () => {
    expect(routePermissions['/dashboard/support']).toEqual([...SUPPORT_ROLES]);
    expect(routePermissions['/dashboard/bookings']).toEqual([...BOOKING_ROLES]);
  });
});

describe('[AC3] the item is highlighted on its page and below it', () => {
  it.each([
    '/dashboard/support',
    '/dashboard/support/65f0c0ffee65f0c0ffee0001',
  ])('active on %s', (path) => {
    expect(isNavItemActive(path, '/dashboard/support')).toBe(true);
  });

  it('not active elsewhere, including a path that only shares a prefix', () => {
    expect(isNavItemActive('/dashboard/orders', '/dashboard/support')).toBe(
      false
    );
    expect(isNavItemActive('/dashboard/supportive', '/dashboard/support')).toBe(
      false
    );
    expect(isNavItemActive(null, '/dashboard/support')).toBe(false);
  });
});
