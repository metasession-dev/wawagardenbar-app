import { requirePermission } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

/**
 * Orders section layout
 * Requires orderManagement permission for all sub-routes
 */
export default async function OrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission('orderManagement');

  return <>{children}</>;
}
