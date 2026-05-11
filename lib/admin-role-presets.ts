/**
 * REQ-034 AC4 — Settings UI role-dropdown presets.
 *
 * Pure helpers that drive the Create-Admin dialog's role selector:
 *   - `ASSIGNABLE_ROLES` — the roles that show up in the dropdown, in the
 *     order they should render. Excludes `'customer'` (not an admin role).
 *   - `getRoleDisplayLabel` — title-case label rendered inside `<SelectItem>`.
 *   - `getRoleDescription` — helper text under the dropdown.
 *   - `getDefaultPermissionsForRole` — returns the IAdminPermissions preset
 *     for a given role (null for super-admin, which has no restrictions).
 */
import type { UserRole } from '@/interfaces/user.interface';
import {
  type IAdminPermissions,
  CSR_DEFAULT_PERMISSIONS,
  DEFAULT_ADMIN_PERMISSIONS,
  BAR_DEFAULT_PERMISSIONS,
  WAITING_DEFAULT_PERMISSIONS,
  KITCHEN_DEFAULT_PERMISSIONS,
} from '@/interfaces/admin-permissions.interface';

/**
 * Roles that may be assigned via the Settings UI. Excludes 'customer'
 * (that role belongs to public end-users, not admins). Order matches the
 * dropdown render order — least-privileged first, super-admin last.
 */
export const ASSIGNABLE_ROLES: readonly UserRole[] = [
  'csr',
  'bar',
  'waiting',
  'kitchen',
  'admin',
  'super-admin',
] as const;

export function getRoleDisplayLabel(role: UserRole): string {
  switch (role) {
    case 'csr':
      return 'Customer Service Rep';
    case 'bar':
      return 'Bar Staff';
    case 'waiting':
      return 'Waiting Staff';
    case 'kitchen':
      return 'Kitchen Staff';
    case 'admin':
      return 'Admin';
    case 'super-admin':
      return 'Super Admin';
    case 'customer':
      return 'Customer';
  }
}

export function getRoleDescription(role: UserRole): string {
  switch (role) {
    case 'csr':
      return 'Order management, customer communication, and refund requests';
    case 'bar':
      return 'CSR-equivalent access — order management, customer service, and rewards';
    case 'waiting':
      return 'CSR-equivalent access — order management, customer service, and rewards';
    case 'kitchen':
      return 'Recipes and production batches only — no access to orders, finance, or settings';
    case 'admin':
      return 'Customizable permissions for specific features';
    case 'super-admin':
      return 'Full access to all dashboard features';
    case 'customer':
      return '';
  }
}

/**
 * Returns the default IAdminPermissions for a role, or `null` for super-admin
 * (the User model interprets null as "no feature gating — only route guards
 * apply"). Used by both the UI default-state and AdminService.createAdmin
 * when the caller does not supply an explicit `permissions` object.
 */
export function getDefaultPermissionsForRole(
  role: UserRole
): IAdminPermissions | null {
  switch (role) {
    case 'csr':
      return CSR_DEFAULT_PERMISSIONS;
    case 'admin':
      return DEFAULT_ADMIN_PERMISSIONS;
    case 'bar':
      return BAR_DEFAULT_PERMISSIONS;
    case 'waiting':
      return WAITING_DEFAULT_PERMISSIONS;
    case 'kitchen':
      return KITCHEN_DEFAULT_PERMISSIONS;
    case 'super-admin':
    case 'customer':
      return null;
  }
}
