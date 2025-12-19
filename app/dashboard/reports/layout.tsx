import { requirePermission } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

/**
 * Reports section layout
 * Requires reportsAndAnalytics permission for all sub-routes
 */
export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission('reportsAndAnalytics');

  return <>{children}</>;
}
