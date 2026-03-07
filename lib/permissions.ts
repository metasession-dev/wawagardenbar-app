import { UserRole } from '@/interfaces/user.interface';
import { SessionData } from './session';

/**
 * Route permissions configuration
 * Maps routes to allowed roles
 */
export const routePermissions: Record<string, UserRole[]> = {
  '/dashboard': ['csr', 'admin', 'super-admin'],
  '/dashboard/menu': ['super-admin'],
  '/dashboard/orders': ['csr', 'admin', 'super-admin'],
  '/dashboard/customers': ['csr', 'super-admin'],
  '/dashboard/inventory': ['super-admin'],
  '/dashboard/rewards': ['csr', 'super-admin'],
  '/dashboard/analytics': ['super-admin'],
  '/dashboard/audit-logs': ['super-admin'],
  '/dashboard/settings': ['super-admin'],
};

/**
 * Dashboard sections configuration
 * Used for sidebar navigation filtering
 */
export const dashboardSections = {
  overview: { roles: ['admin', 'super-admin'] as UserRole[] },
  menu: { roles: ['super-admin'] as UserRole[] },
  orders: { roles: ['csr', 'admin', 'super-admin'] as UserRole[] },
  customers: { roles: ['csr', 'super-admin'] as UserRole[] },
  inventory: { roles: ['super-admin'] as UserRole[] },
  rewards: { roles: ['csr', 'super-admin'] as UserRole[] },
  analytics: { roles: ['super-admin'] as UserRole[] },
  auditLogs: { roles: ['super-admin'] as UserRole[] },
  settings: { roles: ['super-admin'] as UserRole[] },
};

/**
 * Check if user is admin (admin or super-admin)
 */
export function isAdmin(session: SessionData | null): boolean {
  if (!session?.role) return false;
  return session.role === 'csr' || session.role === 'admin' || session.role === 'super-admin';
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(session: SessionData | null): boolean {
  if (!session?.role) return false;
  return session.role === 'super-admin';
}

/**
 * Check if user has permission to access a specific route
 */
export function hasPermission(
  session: SessionData | null,
  route: string
): boolean {
  if (!session?.role) return false;

  // Find matching route permission
  const allowedRoles = routePermissions[route];
  if (!allowedRoles) return false;

  return allowedRoles.includes(session.role);
}

/**
 * Check if user can access a dashboard section
 */
export function canAccessDashboardSection(
  role: UserRole | undefined,
  section: keyof typeof dashboardSections
): boolean {
  if (!role) return false;

  const sectionConfig = dashboardSections[section];
  if (!sectionConfig) return false;

  return sectionConfig.roles.includes(role);
}

/**
 * Get accessible routes for a user role
 */
export function getAccessibleRoutes(role: UserRole | undefined): string[] {
  if (!role) return [];

  return Object.entries(routePermissions)
    .filter(([, allowedRoles]) => allowedRoles.includes(role))
    .map(([route]) => route);
}

/**
 * Check if route requires super-admin access
 */
export function requiresSuperAdmin(route: string): boolean {
  const allowedRoles = routePermissions[route];
  if (!allowedRoles) return false;

  return (
    allowedRoles.length === 1 && allowedRoles[0] === 'super-admin'
  );
}

/**
 * Get user's highest permission level
 */
export function getPermissionLevel(role: UserRole | undefined): number {
  switch (role) {
    case 'super-admin':
      return 4;
    case 'admin':
      return 3;
    case 'csr':
      return 2;
    case 'customer':
      return 1;
    default:
      return 0;
  }
}
