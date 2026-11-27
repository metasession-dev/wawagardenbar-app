import { requireRole } from '@/lib/auth-middleware';
import { SUPPORT_ROLES } from '@/lib/dashboard-section-roles';

export const dynamic = 'force-dynamic';

/**
 * @requirement REQ-064 — Support ticket model + WA-fed staff queue
 *
 * Section layout. RBAC mirrors the customers section: CSR + super-admin
 * (the existing staff-tier roles that handle inbound work).
 */
export default async function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole([...SUPPORT_ROLES]);
  return <>{children}</>;
}
