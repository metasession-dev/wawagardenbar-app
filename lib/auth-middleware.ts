import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { redirect } from 'next/navigation';
import { sessionOptions, SessionData } from './session';
import { UserRole } from '@/interfaces/user.interface';
import { IAdminPermissions } from '@/interfaces';

/**
 * Check if user is authenticated
 */
export async function requireAuth(): Promise<SessionData> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    sessionOptions
  );

  if (!session.userId) {
    redirect('/login');
  }

  return session;
}

/**
 * Check if user has required role
 */
export async function requireRole(
  allowedRoles: UserRole[]
): Promise<SessionData> {
  const session = await requireAuth();

  if (!session.role || !allowedRoles.includes(session.role as UserRole)) {
    redirect('/unauthorized');
  }

  return session;
}

/**
 * Check if user is staff (admin-side surfaces).
 * Includes csr-equivalent roles (bar, waiting) but NOT kitchen — kitchen
 * has a default-deny allowlist on /dashboard/kitchen/* via requireKitchen().
 */
export async function requireAdmin(): Promise<SessionData> {
  return requireRole(['csr', 'admin', 'super-admin', 'bar', 'waiting']);
}

/**
 * Check if user is super admin
 */
export async function requireSuperAdmin(): Promise<SessionData> {
  return requireRole(['super-admin']);
}

/**
 * Check if user is allowed on /dashboard/kitchen/* surfaces.
 * Kitchen role + admin + super-admin only.
 */
export async function requireKitchen(): Promise<SessionData> {
  return requireRole(['kitchen', 'admin', 'super-admin']);
}

/**
 * REQ-034 — outermost guard for `/dashboard/layout.tsx`. Allows every
 * dashboard-capable role through so each sub-route's own layout can
 * apply its narrower allowlist (e.g. `requirePermission` for
 * feature-gated areas, `requireKitchen` for `/dashboard/kitchen/*`).
 * `kitchen` is included here so its sub-route layout can run; kitchen
 * still gets denied at every non-kitchen sub-route by the existing
 * per-section guards (kitchen's feature-permissions are all-false by
 * design, and `requirePermission` calls `requireAdmin` internally
 * which excludes kitchen).
 */
export async function requireDashboardAccess(): Promise<SessionData> {
  return requireRole([
    'csr',
    'admin',
    'super-admin',
    'bar',
    'waiting',
    'kitchen',
  ]);
}

/**
 * Get current session (without redirect)
 */
export async function getCurrentSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.userId) {
      return null;
    }

    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Check if user has permission
 */
export function hasPermission(
  userRole: UserRole,
  requiredRoles: UserRole[]
): boolean {
  return requiredRoles.includes(userRole);
}

/**
 * Check if admin has specific permission
 * Super-admins always have access
 */
export async function requirePermission(
  permission: keyof IAdminPermissions
): Promise<SessionData> {
  const session = await requireAdmin();

  // Super-admin has all permissions
  if (session.role === 'super-admin') {
    return session;
  }

  // Debug logging
  console.log(`[Auth] Checking permission: ${permission}`);
  console.log(`[Auth] User Role: ${session.role}`);
  console.log(
    `[Auth] Permissions:`,
    JSON.stringify(session.permissions, null, 2)
  );

  // Check if admin has the required permission
  if (!session.permissions || !session.permissions[permission]) {
    console.log(`[Auth] Access denied: Missing permission ${permission}`);
    redirect('/dashboard/forbidden');
  }

  return session;
}
