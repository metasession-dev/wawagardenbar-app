import { requireRole } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

/**
 * @requirement REQ-066 AC6 — Incidents section RBAC
 *
 * Mirrors `/dashboard/support` (REQ-064): csr + admin + super-admin
 * can read.
 */
export default async function IncidentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(['csr', 'admin', 'super-admin']);
  return <>{children}</>;
}
