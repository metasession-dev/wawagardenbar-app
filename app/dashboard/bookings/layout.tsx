import { requireRole } from '@/lib/auth-middleware';
import { BOOKING_ROLES } from '@/lib/dashboard-section-roles';

export const dynamic = 'force-dynamic';

/**
 * @requirement REQ-BOOK-003 — Staff Bookings section (REQ-129, AC4)
 *
 * Same role list as the Support section and the menu entry
 * (`lib/dashboard-section-roles`): csr, manager, admin, super-admin. A
 * kitchen-only member or a customer is refused here, whatever the menu shows.
 */
export default async function BookingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole([...BOOKING_ROLES]);
  return <>{children}</>;
}
