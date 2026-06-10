import { UserRole } from '@/interfaces/user.interface';
import { SessionData } from './session';

/**
 * Route permissions configuration
 * Maps routes to allowed roles
 *
 * REQ-034: `/dashboard/kitchen/*` is gated by the `kitchenManagement`
 * feature-permission (toggled per admin in Settings → Admins), not by
 * a dedicated role. Any admin or super-admin with the permission can
 * reach those routes.
 */
export const routePermissions: Record<string, UserRole[]> = {
  '/dashboard': ['csr', 'admin', 'super-admin'],
  // Each route lists the maximal role allowlist; the layout's
  // `requirePermission(...)` does the per-feature gate. Mismatches here
  // bounce users at `proxy.ts` middleware before the layout can run.
  '/dashboard/menu': ['admin', 'super-admin'],
  '/dashboard/orders': ['csr', 'admin', 'super-admin'],
  '/dashboard/customers': ['csr', 'super-admin'],
  '/dashboard/inventory': ['admin', 'super-admin'],
  '/dashboard/rewards': ['csr', 'admin', 'super-admin'],
  '/dashboard/analytics': ['super-admin'],
  '/dashboard/audit-logs': ['super-admin'],
  /**
   * REQ-066 AC10 — Incidents queue + Retry-now action surface. The
   * layout adds a `requirePermission('incidentsAccess')` feature-gate
   * on top of this role allowlist for fine-grained control via Settings →
   * Admins → Permissions.
   */
  '/dashboard/incidents': ['csr', 'admin', 'super-admin'],
  '/dashboard/settings': ['admin', 'super-admin'],
  '/dashboard/kitchen': ['admin', 'super-admin'],
  '/dashboard/kitchen/recipes': ['admin', 'super-admin'],
  '/dashboard/kitchen/production': ['admin', 'super-admin'],
  '/dashboard/kitchen-display': ['csr', 'admin', 'super-admin'],
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
  /** REQ-034 — visible when session.permissions.kitchenManagement is true. */
  kitchenRecipes: { roles: ['admin', 'super-admin'] as UserRole[] },
  kitchenProduction: { roles: ['admin', 'super-admin'] as UserRole[] },
};

/**
 * Check if user is admin-side staff (csr or above).
 */
export function isAdmin(session: SessionData | null): boolean {
  if (!session?.role) return false;
  return (
    session.role === 'csr' ||
    session.role === 'admin' ||
    session.role === 'super-admin'
  );
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

  return allowedRoles.length === 1 && allowedRoles[0] === 'super-admin';
}

/**
 * REQ-076 — Resolve which main-category slugs a session is allowed to
 * see in `/dashboard/reports/by-main-category`.
 *
 * Resolution table (load-bearing — pinned by unit tests in
 * `__tests__/lib/permissions.main-category-access.test.ts`):
 *
 * | Session state                                          | Returns           |
 * | ------------------------------------------------------ | ----------------- |
 * | `null` session                                         | `[]`              |
 * | super-admin (any permission field value)               | all registered    |
 * | `permissions.reportsAndAnalytics === false`            | `[]`              |
 * | `permissions.mainCategoryReportAccess === undefined`   | all registered    |
 * | `permissions.mainCategoryReportAccess === []`          | `[]`              |
 * | `permissions.mainCategoryReportAccess === ['food']`    | `['food']` ∩ all  |
 * | `mainCategoryReportAccess: ['food','xxx']`             | `['food']`        |
 *
 * Super-admin always bypasses to prevent operator lockout. CSR / admin
 * users also need `reportsAndAnalytics: true` to reach ANY report page;
 * `mainCategoryReportAccess` is an additional sub-filter on top.
 *
 * @param session     The active session (may be null for unauth).
 * @param allRegisteredMainSlugs Registered enabled mains from
 *                    `SystemSettingsService.getMainCategories()`. Caller
 *                    is responsible for filtering to `isEnabled === true`
 *                    if disabled mains should be excluded.
 * @returns           Sorted array of slugs the session may view. Empty
 *                    array means no access; the caller should redirect
 *                    or 403.
 */
export function getAllowedMainCategoriesForReports(
  session: SessionData | null,
  allRegisteredMainSlugs: string[]
): string[] {
  if (!session?.role) return [];

  // Super-admin bypass: always sees everything, even if the field is
  // explicitly set to `[]`. Prevents accidental operator lockout.
  if (session.role === 'super-admin') {
    return [...allRegisteredMainSlugs];
  }

  // Non-super-admin needs the top-level report gate first.
  if (session.permissions?.reportsAndAnalytics !== true) {
    return [];
  }

  const access = session.permissions?.mainCategoryReportAccess;

  // undefined / null → back-compat default: see all registered mains.
  // Pre-REQ-076 admin users hit this branch.
  if (access === undefined || access === null) {
    return [...allRegisteredMainSlugs];
  }

  // Explicit empty array → no access to the per-main report page.
  if (access.length === 0) {
    return [];
  }

  // Subset → intersect with currently-registered mains. Slugs in the
  // permission that no longer exist in the registry (e.g. after a
  // delete) are silently filtered out — they wouldn't render anyway.
  const registered = new Set(allRegisteredMainSlugs);
  return access.filter((slug) => registered.has(slug));
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
