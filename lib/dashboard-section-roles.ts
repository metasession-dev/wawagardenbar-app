/**
 * @requirement REQ-DASH-007 — Support link in the dashboard menu (REQ-130)
 * @requirement REQ-BOOK-003 — Staff Bookings page (REQ-129)
 *
 * One role list per dashboard section, shared by the section's layout, its
 * server actions and its menu entry, so the menu can never show a link to a
 * page the layout refuses (or hide one it allows).
 */
import type { UserRole } from '@/interfaces/user.interface';

/** Who may open `/dashboard/support`. */
export const SUPPORT_ROLES: readonly UserRole[] = [
  'csr',
  'manager',
  'admin',
  'super-admin',
];

/** Who may open `/dashboard/bookings` and act on bookings. */
export const BOOKING_ROLES: readonly UserRole[] = [
  'csr',
  'manager',
  'admin',
  'super-admin',
];
