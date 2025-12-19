import { requireSuperAdmin } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

/**
 * Audit Logs section layout
 * Requires super-admin role for all sub-routes
 */
export default async function AuditLogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperAdmin();

  return <>{children}</>;
}
