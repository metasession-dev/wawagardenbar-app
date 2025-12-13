'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { Fragment } from 'react';

interface BreadcrumbItem {
  label: string;
  href: string;
}

/**
 * Generate breadcrumb items from pathname
 */
function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  // Route label mappings for better display names
  const labelMap: Record<string, string> = {
    dashboard: 'Dashboard',
    orders: 'Orders',
    menu: 'Menu',
    inventory: 'Inventory',
    customers: 'Customers',
    rewards: 'Rewards',
    settings: 'Settings',
    'audit-logs': 'Audit Logs',
    kitchen: 'Kitchen Display',
    analytics: 'Analytics',
    tabs: 'Tabs',
    new: 'New',
    edit: 'Edit',
    reports: 'Reports',
    daily: 'Daily Reports',
    finance: 'Finance',
    expenses: 'Expenses',
    rules: 'Rules',
    templates: 'Templates',
    issued: 'Issued Rewards',
    issue: 'Issue Reward',
    admins: 'Admin Users',
    'data-requests': 'Data Deletion Requests',
    history: 'Order History',
    checkout: 'Checkout',
  };

  let currentPath = '';

  segments.forEach((segment) => {
    currentPath += `/${segment}`;

    // Skip dynamic segments (IDs) but keep track of the path
    if (segment.match(/^[a-f0-9]{24}$/i) || segment.startsWith('WGB')) {
      // MongoDB ObjectId or Order ID - skip but keep in path
      return;
    }

    // Get label from map or format the segment
    const label = labelMap[segment] || formatSegment(segment);

    breadcrumbs.push({
      label,
      href: currentPath,
    });
  });

  return breadcrumbs;
}

/**
 * Format segment for display
 */
function formatSegment(segment: string): string {
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Breadcrumb navigation component
 */
export function Breadcrumb() {
  const pathname = usePathname();
  const breadcrumbs = generateBreadcrumbs(pathname);

  // Don't show breadcrumbs on dashboard home
  if (pathname === '/dashboard') {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1 text-sm text-muted-foreground">
      {/* Home/Dashboard Link */}
      <Link
        href="/dashboard"
        className="flex items-center hover:text-foreground transition-colors"
        aria-label="Dashboard Home"
      >
        <Home className="h-4 w-4" />
      </Link>

      {/* Breadcrumb Items */}
      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;

        return (
          <Fragment key={item.href}>
            <ChevronRight className="h-4 w-4 flex-shrink-0" />
            {isLast ? (
              <span className="font-medium text-foreground" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
