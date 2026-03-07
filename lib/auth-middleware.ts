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
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

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
 * Check if user is admin
 */
export async function requireAdmin(): Promise<SessionData> {
  return requireRole(['csr', 'admin', 'super-admin']);
}

/**
 * Check if user is super admin
 */
export async function requireSuperAdmin(): Promise<SessionData> {
  return requireRole(['super-admin']);
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
  console.log(`[Auth] Permissions:`, JSON.stringify(session.permissions, null, 2));

  // Check if admin has the required permission
  if (!session.permissions || !session.permissions[permission]) {
    console.log(`[Auth] Access denied: Missing permission ${permission}`);
    redirect('/dashboard/forbidden');
  }

  return session;
}
