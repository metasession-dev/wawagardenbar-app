import { SessionOptions } from 'iron-session';
import { UserRole } from '@/interfaces/user.interface';
import { IAdminPermissions } from '@/interfaces';

export interface SessionData {
  userId?: string;
  email?: string;
  phone?: string;
  name?: string;
  role?: UserRole;
  permissions?: IAdminPermissions;
  isGuest?: boolean;
  guestId?: string;
  isLoggedIn: boolean;
  createdAt?: number;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD as string,
  cookieName: process.env.SESSION_COOKIE_NAME || 'wawa_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  },
};

export const defaultSession: SessionData = {
  isLoggedIn: false,
};

/**
 * Check if session belongs to admin or super-admin
 */
export function isAdmin(session: SessionData | null): boolean {
  if (!session?.role) return false;
  return session.role === 'csr' || session.role === 'admin' || session.role === 'super-admin';
}

/**
 * Check if session belongs to super-admin
 */
export function isSuperAdmin(session: SessionData | null): boolean {
  if (!session?.role) return false;
  return session.role === 'super-admin';
}

/**
 * Check if session has permission to access a route
 */
export function hasPermission(
  session: SessionData | null,
  allowedRoles: UserRole[]
): boolean {
  if (!session?.role) return false;
  return allowedRoles.includes(session.role);
}
