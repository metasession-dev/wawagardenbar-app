import { requirePermission } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

/**
 * Inventory section layout
 * Requires inventoryManagement permission for all sub-routes
 */
export default async function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission('inventoryManagement');

  return <>{children}</>;
}
