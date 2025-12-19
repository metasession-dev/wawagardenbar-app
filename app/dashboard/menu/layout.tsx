import { requirePermission } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

/**
 * Menu section layout
 * Requires menuManagement permission for all sub-routes
 */
export default async function MenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log('[MenuLayout] Checking menuManagement permission...');
  await requirePermission('menuManagement');
  console.log('[MenuLayout] Access granted');

  return <>{children}</>;
}
