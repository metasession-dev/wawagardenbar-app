import { UserRole, StaffRole, STAFF_ROLES } from '@/interfaces/user.interface';

/**
 * REQ-119 (ADR-009) — role helpers.
 *
 * Every authorization check goes through these any-of helpers; nothing
 * outside this module compares `session.role` directly (pinned by
 * `__tests__/lib/no-direct-role-checks.test.ts`). A subject (session, user
 * document or API record) that only has `role` is read as `[role]`, so the
 * code is correct before, during and after the staff-roles migration.
 */
export interface RoleCarrier {
  role?: string | null;
  roles?: readonly string[] | null;
}

const ROLE_RANK: Record<string, number> = {
  customer: 0,
  kitchen: 1,
  csr: 2,
  manager: 3,
  admin: 4,
  'super-admin': 5,
};

function isKnownRole(value: unknown): value is UserRole {
  return typeof value === 'string' && value in ROLE_RANK;
}

export function isStaffRole(value: unknown): value is StaffRole {
  return STAFF_ROLES.includes(value as StaffRole);
}

/**
 * Roles held by a subject. Staff accounts return their `roles`; a subject
 * with only `role` returns `[role]`; a customer returns `['customer']`.
 */
export function getRoles(subject: RoleCarrier | null | undefined): UserRole[] {
  if (!subject) return [];
  const staff = (subject.roles ?? []).filter(isStaffRole);
  if (staff.length > 0) return Array.from(new Set(staff));
  return isKnownRole(subject.role) ? [subject.role] : [];
}

/** True when the subject holds at least one of the allowed roles. */
export function hasAnyRole(
  subject: RoleCarrier | null | undefined,
  allowed: readonly UserRole[]
): boolean {
  return getRoles(subject).some((role) => allowed.includes(role));
}

/** The highest role held (used where one role is recorded, e.g. audit rows). */
export function getPrimaryRole(
  subject: RoleCarrier | null | undefined
): UserRole | undefined {
  const roles = getRoles(subject);
  if (roles.length === 0) return undefined;
  return roles.reduce((best, role) =>
    ROLE_RANK[role] > ROLE_RANK[best] ? role : best
  );
}

/** True when the subject holds any role at all (replaces `!!session.role`). */
export function hasAnyAssignedRole(
  subject: RoleCarrier | null | undefined
): boolean {
  return getRoles(subject).length > 0;
}

/** Holds any staff role (the dashboard entry gate). */
export function isStaff(subject: RoleCarrier | null | undefined): boolean {
  return getRoles(subject).some(isStaffRole);
}

/** True for a signed-in customer account (never staff). */
export function isCustomerSession(
  subject: RoleCarrier | null | undefined
): boolean {
  const roles = getRoles(subject);
  return roles.length > 0 && roles.every((role) => role === 'customer');
}

/** Roles that count as "csr or above" (`kitchen` is deliberately not one). */
export const ADMIN_SIDE_ROLES: readonly UserRole[] = [
  'csr',
  'manager',
  'admin',
  'super-admin',
];

/**
 * Check if session belongs to admin-side staff (csr or above). A
 * `kitchen`-only member is NOT admin-side (ADR-009, least privilege).
 */
export function isAdmin(session: RoleCarrier | null | undefined): boolean {
  return hasAnyRole(session, ADMIN_SIDE_ROLES);
}

/**
 * Check if session belongs to super-admin
 */
export function isSuperAdmin(session: RoleCarrier | null | undefined): boolean {
  return hasAnyRole(session, ['super-admin']);
}

/**
 * Check if session has permission to access a route
 */
export function hasPermission(
  session: RoleCarrier | null | undefined,
  allowedRoles: readonly UserRole[]
): boolean {
  return hasAnyRole(session, allowedRoles);
}
