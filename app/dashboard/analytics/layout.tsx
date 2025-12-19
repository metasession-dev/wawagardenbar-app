import { requirePermission } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

/**
 * Analytics section layout
 * Requires reportsAndAnalytics permission for all sub-routes
 */
export default async function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Assuming analytics requires similar permissions to reports, or super-admin
  // Based on folder structure, analytics might be distinct. 
  // Checking requirements: "Analytics Dashboard" is listed under Super-Admin Only or Admin restricted.
  // Actually, requirements say "Analytics Dashboard" is restricted for Admin, fully accessible for Super-Admin.
  // However, `reports` section uses `reportsAndAnalytics`.
  // Let's assume `reportsAndAnalytics` permission covers this.
  
  await requirePermission('reportsAndAnalytics');

  return <>{children}</>;
}
