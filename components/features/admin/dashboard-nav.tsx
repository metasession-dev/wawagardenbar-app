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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserRole } from '@/interfaces/user.interface';
import { IAdminPermissions } from '@/interfaces';
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

const navItems: NavItem[] = [
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
    roles: ['admin', 'super-admin'],
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
    roles: ['super-admin'],
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
    roles: ['admin', 'super-admin'],
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
    title: 'Reports',
    href: '/dashboard/reports',
    icon: BarChart3,
    roles: ['admin', 'super-admin'],
    permission: 'reportsAndAnalytics',
  },
  {
    title: 'Audit Logs',
    href: '/dashboard/audit-logs',
    icon: FileText,
    roles: ['super-admin'],
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    roles: ['admin', 'super-admin'],
    permission: 'settingsAndConfiguration',
  },
];

interface DashboardNavProps {
  userEmail?: string;
  userRole?: UserRole;
  permissions?: IAdminPermissions;
}

/**
 * Dashboard sidebar navigation with role-based and permission-based filtering
 * Only shows navigation items that the user has permission to access
 */
export function DashboardNav({ userEmail, userRole, permissions }: DashboardNavProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Filter navigation items based on user role and permissions
  const filteredNavItems = navItems.filter((item) => {
    if (!userRole) return false;
    
    // Check role access
    if (!item.roles.includes(userRole)) return false;
    
    // Super-admin has access to everything
    if (userRole === 'super-admin') return true;
    
    // For admin role, check permissions if specified
    if (item.permission) {
      if (!permissions) return false;
      return permissions[item.permission] === true;
    }
    
    // If no permission specified, allow access (for items like Overview)
    return true;
  });

  return (
    <div className={cn(
      "flex h-full flex-col border-r bg-card transition-all duration-300 ease-in-out",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Logo/Brand */}
      <div className="flex h-16 items-center justify-between border-b px-3">
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex-shrink-0" />
            <div className="overflow-hidden">
              <h1 className="text-lg font-bold whitespace-nowrap">Wawa Garden Bar</h1>
              <p className="text-xs text-muted-foreground whitespace-nowrap">Admin Dashboard</p>
            </div>
          </Link>
        )}
        {isCollapsed && (
          <Link href="/dashboard" className="flex items-center justify-center w-full">
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
            "w-full transition-all",
            isCollapsed ? "justify-center px-2" : "justify-start"
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
            const isActive =
              pathname === item.href || (pathname?.startsWith(`${item.href}/`) ?? false);

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
            {userRole && (
              <div className="mt-2">
                <RoleBadge role={userRole} showIcon={true} />
              </div>
            )}
          </div>
        )}
        <form action={logoutAction}>
          <Button 
            variant="outline" 
            className={cn(
              "w-full",
              isCollapsed ? "justify-center px-2" : "justify-start"
            )} 
            type="submit"
            title={isCollapsed ? "Logout" : undefined}
          >
            <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
            {!isCollapsed && "Logout"}
          </Button>
        </form>
      </div>
    </div>
  );
}
