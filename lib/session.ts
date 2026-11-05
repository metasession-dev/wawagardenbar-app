import { SessionOptions, IronSession } from 'iron-session';
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
  /** REQ-117 (AC7) — last time a customer session's lifetime was extended. */
  refreshedAt?: number;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_PASSWORD as string,
  cookieName: process.env.SESSION_COOKIE_NAME || 'wawa_session',
  cookieOptions: {
    // Defaults to NODE_ENV-based behavior (secure in production), but can
    // be overridden — needed for environments that are otherwise
    // production-configured but served over plain HTTP with no TLS yet
    // (e.g. an internal k3s UAT instance behind a LAN-only Ingress):
    // browsers silently refuse to store a Secure cookie over HTTP, which
    // makes login appear to succeed but never actually persist a session.
    secure:
      process.env.SESSION_COOKIE_SECURE !== undefined
        ? process.env.SESSION_COOKIE_SECURE === 'true'
        : process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  },
};

/**
 * REQ-117 (AC7, ADR-008) — customers stay signed in for 90 days, extended on
 * activity; staff sessions keep the 7-day `sessionOptions` default. The seal
 * carries its own expiry, so the lifetime is set when the cookie is written.
 */
export const CUSTOMER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 90;
export const CUSTOMER_SESSION_REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;

export function applyCustomerSessionLifetime(
  session: IronSession<SessionData>
): void {
  session.updateConfig({
    ...sessionOptions,
    ttl: CUSTOMER_SESSION_TTL_SECONDS,
    cookieOptions: {
      ...sessionOptions.cookieOptions,
      maxAge: CUSTOMER_SESSION_TTL_SECONDS,
    },
  });
}

/** True for a signed-in customer (not staff, not guest) whose lifetime is due an extension. */
export function shouldRefreshCustomerSession(
  session: SessionData,
  now: number = Date.now()
): boolean {
  if (!session.isLoggedIn || session.isGuest || session.role !== 'customer') {
    return false;
  }
  const last = session.refreshedAt ?? session.createdAt ?? 0;
  return now - last >= CUSTOMER_SESSION_REFRESH_AFTER_MS;
}

export const defaultSession: SessionData = {
  isLoggedIn: false,
};

/**
 * Check if session belongs to admin-side staff (csr or above).
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
