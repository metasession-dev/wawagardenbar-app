import { SessionOptions, IronSession } from 'iron-session';
import { UserRole, StaffRole } from '@/interfaces/user.interface';
import { getPrimaryRole, isCustomerSession, isStaffRole } from './roles';
import { IAdminPermissions } from '@/interfaces';

export interface SessionData {
  userId?: string;
  email?: string;
  phone?: string;
  name?: string;
  /** Highest role (back-compat for one release; REQ-119). Read it only through the helpers below. */
  role?: UserRole;
  /** REQ-119 — staff roles held by the signed-in user. */
  roles?: StaffRole[];
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
  if (!session.isLoggedIn || session.isGuest || !isCustomerSession(session)) {
    return false;
  }
  const last = session.refreshedAt ?? session.createdAt ?? 0;
  return now - last >= CUSTOMER_SESSION_REFRESH_AFTER_MS;
}

export const defaultSession: SessionData = {
  isLoggedIn: false,
};

export * from './roles';

/**
 * Write the roles onto a session: `roles` as given and `role` as the highest
 * of them (back-compat for one release).
 */
export function applyRolesToSession(
  session: SessionData,
  roles: readonly UserRole[]
): void {
  const staff = roles.filter(isStaffRole);
  session.roles = staff;
  session.role = getPrimaryRole({ roles: staff }) ?? roles[0];
}
