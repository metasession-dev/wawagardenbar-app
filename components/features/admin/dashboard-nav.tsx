'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Settings,
  FileText,
  LogOut,
  UtensilsCrossed,
  Gift,
  DollarSign,
  BarChart3,
  PiggyBank,
  ChevronLeft,
  ChevronRight,
  Clock,
  ChefHat,
  Boxes,
  AlertTriangle,
  UserCircle,
  CalendarDays,
  LifeBuoy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserRole } from '@/interfaces/user.interface';
import { IAdminPermissions } from '@/interfaces';
import { BOOKING_ROLES, SUPPORT_ROLES } from '@/lib/dashboard-section-roles';
import { RoleBadge } from './role-badge';
import { logoutAction } from '@/app/actions/auth/logout';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  permission?: keyof IAdminPermissions;
  badge?: string;
}

export const navItems: NavItem[] = [
  {
    title: 'Overview',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['super-admin'],
  },
  {
    title: 'Orders',
    href: '/dashboard/orders',
    icon: ShoppingCart,
    roles: ['csr', 'kitchen', 'manager', 'admin', 'super-admin'],
    permission: 'orderManagement',
  },
  {
    title: 'Kitchen display',
    href: '/dashboard/kitchen-display',
    icon: ChefHat,
    roles: ['csr', 'kitchen', 'manager', 'admin', 'super-admin'],
    permission: 'orderManagement',
  },
  {
    title: 'Menu',
    href: '/dashboard/menu',
    icon: UtensilsCrossed,
    roles: ['admin', 'super-admin'],
    permission: 'menuManagement',
  },
  {
    title: 'Customers',
    href: '/dashboard/customers',
    icon: Users,
    roles: ['csr', 'manager', 'super-admin'],
  },
  {
    // REQ-129 — table and event booking requests.
    title: 'Bookings',
    href: '/dashboard/bookings',
    icon: CalendarDays,
    roles: [...BOOKING_ROLES],
  },
  {
    // REQ-130 — the Support queue had no menu entry. Same roles as the
    // Support layout, so a role that cannot open the page never sees the link.
    title: 'Support',
    href: '/dashboard/support',
    icon: LifeBuoy,
    roles: [...SUPPORT_ROLES],
  },
  {
    title: 'Inventory',
    href: '/dashboard/inventory',
    icon: Package,
    roles: ['admin', 'super-admin'],
    permission: 'inventoryManagement',
  },
  {
    title: 'Rewards',
    href: '/dashboard/rewards',
    icon: Gift,
    roles: ['csr', 'manager', 'admin', 'super-admin'],
    permission: 'rewardsAndLoyalty',
  },
  {
    title: 'Expenses',
    href: '/dashboard/finance/expenses',
    icon: DollarSign,
    roles: ['admin', 'super-admin'],
    permission: 'expensesManagement',
  },
  {
    title: 'Pending Expenses',
    href: '/dashboard/finance/expenses/pending',
    icon: Clock,
    roles: ['admin', 'super-admin'],
    permission: 'expensesManagement',
  },
  {
    // REQ-128 — refunds report for the people who may refund.
    title: 'Refunds',
    href: '/dashboard/refunds',
    icon: DollarSign,
    roles: ['manager', 'admin', 'super-admin'],
  },
  {
    title: 'Reports',
    href: '/dashboard/reports',
    icon: BarChart3,
    roles: ['manager', 'admin', 'super-admin'],
    permission: 'reportsAndAnalytics',
  },
  {
    // REQ-034 D8/D9 — Recipes + Production as sibling entries under
    // `kitchenManagement`. The legacy full-screen order grid lives at
    // `/dashboard/kitchen-display` (accessed from /dashboard/orders).
    title: 'Recipes',
    href: '/dashboard/kitchen/recipes',
    icon: ChefHat,
    roles: ['admin', 'super-admin'],
    permission: 'kitchenManagement',
  },
  {
    title: 'Production',
    href: '/dashboard/kitchen/production',
    icon: Boxes,
    roles: ['admin', 'super-admin'],
    permission: 'kitchenManagement',
  },
  {
    title: 'Staff Pot',
    href: '/dashboard/staff-pot',
    icon: PiggyBank,
    roles: ['admin', 'super-admin'],
  },
  {
    title: 'Audit Logs',
    href: '/dashboard/audit-logs',
    icon: FileText,
    roles: ['super-admin'],
  },
  {
    // REQ-066 AC10 — surfaces inventory_deduction_failed +
    // stale_paid_order events; gates the Retry Now action.
    title: 'Incidents',
    href: '/dashboard/incidents',
    icon: AlertTriangle,
    roles: ['csr', 'manager', 'admin', 'super-admin'],
    permission: 'incidentsAccess',
  },
  {
    // REQ-122 — own WhatsApp alert number and verification; every staff role.
    title: 'My account',
    href: '/dashboard/account',
    icon: UserCircle,
    roles: ['csr', 'kitchen', 'manager', 'admin', 'super-admin'],
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    roles: ['admin', 'super-admin'],
    permission: 'settingsAndConfiguration',
  },
];

/**
 * Navigation items the user may see: any of their roles grants the item, and
 * (except for super-admin) the item's permission, when it has one.
 */
export function filterNavItems(
  userRoles: UserRole[],
  permissions?: IAdminPermissions
): NavItem[] {
  return navItems.filter((item) => {
    if (userRoles.length === 0) return false;

    // Check role access (any of the user's roles)
    if (!item.roles.some((role) => userRoles.includes(role))) return false;

    // Super-admin has access to everything
    if (userRoles.includes('super-admin')) return true;

    // For csr/admin role, check permissions if specified
    if (item.permission) {
      if (!permissions) return false;
      return permissions[item.permission] === true;
    }

    // If no permission specified, allow access (for items like Overview)
    return true;
  });
}

/** An item is active on its own path and on every page below it (ticket pages, booking pages). */
export function isNavItemActive(
  pathname: string | null | undefined,
  href: string
): boolean {
  return pathname === href || (pathname?.startsWith(`${href}/`) ?? false);
}

interface DashboardNavProps {
  userEmail?: string;
  /** REQ-119 — every role the user holds; an item shows when any role grants it. */
  userRoles?: UserRole[];
  permissions?: IAdminPermissions;
}

/**
 * Dashboard sidebar navigation with role-based and permission-based filtering
 * Only shows navigation items that the user has permission to access
 */
export function DashboardNav({
  userEmail,
  userRoles = [],
  permissions,
}: DashboardNavProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const filteredNavItems = filterNavItems(userRoles, permissions);

  return (
    <div
      className={cn(
        'flex h-full flex-col border-r bg-card transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo/Brand */}
      <div className="flex h-16 items-center justify-between border-b px-3">
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex-shrink-0" />
            <div className="overflow-hidden">
              <h1 className="text-lg font-bold whitespace-nowrap">
                Wawa Garden Bar
              </h1>
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                Admin Dashboard
              </p>
            </div>
          </Link>
        )}
        {isCollapsed && (
          <Link
            href="/dashboard"
            className="flex items-center justify-center w-full"
          >
            <div className="h-8 w-8 rounded-lg bg-primary flex-shrink-0" />
          </Link>
        )}
      </div>

      {/* Toggle Button */}
      <div className="border-b px-2 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            'w-full transition-all',
            isCollapsed ? 'justify-center px-2' : 'justify-start'
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="mr-2 h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isNavItemActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.title : undefined}
                className={cn(
                  'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isCollapsed ? 'justify-center' : 'gap-3',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="whitespace-nowrap">{item.title}</span>
                    {item.badge && (
                      <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User Info & Logout */}
      <div className="border-t p-3">
        {!isCollapsed && (
          <div className="mb-3 rounded-lg bg-muted p-3">
            <p className="text-sm font-medium truncate">
              {userEmail || 'Admin User'}
            </p>
            {userRoles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {userRoles.map((role) => (
                  <RoleBadge key={role} role={role} showIcon={true} />
                ))}
              </div>
            )}
          </div>
        )}
        <form action={logoutAction}>
          <Button
            variant="outline"
            className={cn(
              'w-full',
              isCollapsed ? 'justify-center px-2' : 'justify-start'
            )}
            type="submit"
            title={isCollapsed ? 'Logout' : undefined}
          >
            <LogOut className={cn('h-4 w-4', !isCollapsed && 'mr-2')} />
            {!isCollapsed && 'Logout'}
          </Button>
        </form>
      </div>
    </div>
  );
}
