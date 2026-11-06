import { UserRole, StaffRole } from '@/interfaces/user.interface';
import {
  IAdminPermissions,
  CSR_DEFAULT_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,
  KITCHEN_DEFAULT_PERMISSIONS,
  MANAGER_DEFAULT_PERMISSIONS,
  SUPER_ADMIN_PERMISSIONS,
} from '@/interfaces/admin-permissions.interface';
import type { SessionData } from './session';
import {
  RoleCarrier,
  getRoles,
  hasAnyRole,
  getPrimaryRole,
  isAdmin,
  isSuperAdmin,
} from './roles';

// REQ-119: the role helpers live in `lib/session.ts`; re-exported here so
// existing imports keep working.
export { isAdmin, isSuperAdmin };

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
  // `kitchen` is deliberately absent from the `/dashboard` root and from every
  // route not listed with it below: the longest matching prefix wins in
  // `proxy.ts`, so a kitchen-only member reaches only the orders pages and the
  // kitchen display (REQ-119, ADR-009).
  '/dashboard': ['csr', 'manager', 'admin', 'super-admin'],
  // Each route lists the maximal role allowlist; the layout's
  // `requirePermission(...)` does the per-feature gate. Mismatches here
  // bounce users at `proxy.ts` middleware before the layout can run.
  // The forbidden page is where proxy.ts sends a staff member who lacks a
  // route; it must be reachable by every staff role or the redirect loops.
  '/dashboard/forbidden': ['csr', 'kitchen', 'manager', 'admin', 'super-admin'],
  '/dashboard/menu': ['admin', 'super-admin'],
  '/dashboard/orders': ['csr', 'kitchen', 'manager', 'admin', 'super-admin'],
  // Staff-only order sub-areas that a kitchen-only member must not reach.
  '/dashboard/orders/express': ['csr', 'manager', 'admin', 'super-admin'],
  '/dashboard/orders/tabs': ['csr', 'manager', 'admin', 'super-admin'],
  '/dashboard/orders/inventory-summary': [
    'csr',
    'manager',
    'admin',
    'super-admin',
  ],
  '/dashboard/orders/inventory-updates': [
    'csr',
    'manager',
    'admin',
    'super-admin',
  ],
  '/dashboard/customers': ['csr', 'manager', 'super-admin'],
  '/dashboard/inventory': ['admin', 'super-admin'],
  '/dashboard/rewards': ['csr', 'manager', 'admin', 'super-admin'],
  '/dashboard/analytics': ['super-admin'],
  '/dashboard/audit-logs': ['super-admin'],
  /**
   * REQ-066 AC10 — Incidents queue + Retry-now action surface. The
   * layout adds a `requirePermission('incidentsAccess')` feature-gate
   * on top of this role allowlist for fine-grained control via Settings →
   * Admins → Permissions.
   */
  '/dashboard/incidents': ['csr', 'manager', 'admin', 'super-admin'],
  '/dashboard/settings': ['admin', 'super-admin'],
  '/dashboard/kitchen': ['admin', 'super-admin'],
  '/dashboard/kitchen/recipes': ['admin', 'super-admin'],
  '/dashboard/kitchen/production': ['admin', 'super-admin'],
  '/dashboard/kitchen-display': [
    'csr',
    'kitchen',
    'manager',
    'admin',
    'super-admin',
  ],
};

/**
 * Dashboard sections configuration
 * Used for sidebar navigation filtering
 */
export const dashboardSections = {
  overview: { roles: ['manager', 'admin', 'super-admin'] as UserRole[] },
  menu: { roles: ['super-admin'] as UserRole[] },
  orders: {
    roles: ['csr', 'kitchen', 'manager', 'admin', 'super-admin'] as UserRole[],
  },
  customers: { roles: ['csr', 'manager', 'super-admin'] as UserRole[] },
  inventory: { roles: ['super-admin'] as UserRole[] },
  rewards: { roles: ['csr', 'manager', 'super-admin'] as UserRole[] },
  analytics: { roles: ['super-admin'] as UserRole[] },
  auditLogs: { roles: ['super-admin'] as UserRole[] },
  settings: { roles: ['super-admin'] as UserRole[] },
  /** REQ-034 — visible when session.permissions.kitchenManagement is true. */
  kitchenRecipes: { roles: ['admin', 'super-admin'] as UserRole[] },
  kitchenProduction: { roles: ['admin', 'super-admin'] as UserRole[] },
};

/**
 * Check if user has permission to access a specific route
 */
export function hasPermission(
  session: SessionData | null,
  route: string
): boolean {
  const allowedRoles = routePermissions[route];
  if (!allowedRoles) return false;

  return hasAnyRole(session, allowedRoles);
}

/**
 * Check if user can access a dashboard section (any of their roles grants it).
 */
export function canAccessDashboardSection(
  roles: RoleCarrier | UserRole | undefined,
  section: keyof typeof dashboardSections
): boolean {
  const sectionConfig = dashboardSections[section];
  if (!sectionConfig) return false;

  return hasAnyRole(asCarrier(roles), sectionConfig.roles);
}

/**
 * Get accessible routes for a user's roles (union).
 */
export function getAccessibleRoutes(
  roles: RoleCarrier | UserRole | undefined
): string[] {
  const carrier = asCarrier(roles);
  return Object.entries(routePermissions)
    .filter(([, allowedRoles]) => hasAnyRole(carrier, allowedRoles))
    .map(([route]) => route);
}

function asCarrier(roles: RoleCarrier | UserRole | undefined): RoleCarrier {
  if (!roles) return {};
  return typeof roles === 'string' ? { role: roles } : roles;
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
  if (!session || getRoles(session).length === 0) return [];

  // Super-admin bypass: always sees everything, even if the field is
  // explicitly set to `[]`. Prevents accidental operator lockout.
  if (isSuperAdmin(session)) {
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
 * Get user's highest permission level (over all their roles).
 */
export function getPermissionLevel(
  roles: RoleCarrier | UserRole | undefined
): number {
  switch (getPrimaryRole(asCarrier(roles))) {
    case 'super-admin':
      return 5;
    case 'admin':
      return 4;
    case 'manager':
      return 3;
    case 'csr':
      return 2;
    case 'kitchen':
      return 1.5;
    case 'customer':
      return 1;
    default:
      return 0;
  }
}

/**
 * REQ-119 (AC7) — default feature permissions per staff role.
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<StaffRole, IAdminPermissions> = {
  csr: CSR_DEFAULT_PERMISSIONS,
  kitchen: KITCHEN_DEFAULT_PERMISSIONS,
  manager: MANAGER_DEFAULT_PERMISSIONS,
  admin: DEFAULT_ADMIN_PERMISSIONS,
  'super-admin': SUPER_ADMIN_PERMISSIONS,
};

const BOOLEAN_PERMISSION_KEYS = [
  'orderManagement',
  'menuManagement',
  'inventoryManagement',
  'rewardsAndLoyalty',
  'reportsAndAnalytics',
  'expensesManagement',
  'settingsAndConfiguration',
  'kitchenManagement',
  'incidentsAccess',
] as const satisfies readonly (keyof IAdminPermissions)[];

/**
 * REQ-119 (AC7) — the union of the default permissions of the given roles.
 */
export function defaultPermissionsForRoles(
  roles: readonly StaffRole[]
): IAdminPermissions {
  const merged = Object.fromEntries(
    BOOLEAN_PERMISSION_KEYS.map((key) => [
      key,
      roles.some((role) => ROLE_DEFAULT_PERMISSIONS[role]?.[key] === true),
    ])
  ) as unknown as IAdminPermissions;
  return merged;
}

/**
 * REQ-119 (AC7) — recompute a user's stored permissions after a role change.
 *
 * Per-user overrides (values set in the permissions editor) are kept: a
 * permission is switched ON when an added role's defaults grant it, and
 * switched OFF only when a removed role's defaults granted it and no
 * remaining role's defaults do. Everything else is left as it was.
 */
export function recomputePermissionsForRoleChange(
  current: IAdminPermissions | undefined,
  before: readonly StaffRole[],
  after: readonly StaffRole[]
): IAdminPermissions {
  const base = current ?? defaultPermissionsForRoles(before);
  const added = after.filter((role) => !before.includes(role));
  const removed = before.filter((role) => !after.includes(role));
  const grantedByAdded = defaultPermissionsForRoles(added);
  const grantedByRemoved = defaultPermissionsForRoles(removed);
  const grantedByRemaining = defaultPermissionsForRoles(after);

  const next: IAdminPermissions = { ...base };
  for (const key of BOOLEAN_PERMISSION_KEYS) {
    if (grantedByAdded[key]) {
      next[key] = true;
    } else if (grantedByRemoved[key] && !grantedByRemaining[key]) {
      next[key] = false;
    }
  }
  return next;
}
