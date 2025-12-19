import { requirePermission } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

/**
 * Kitchen section layout
 * Requires orderManagement permission
 */
export default async function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission('orderManagement');

  return <>{children}</>;
}
