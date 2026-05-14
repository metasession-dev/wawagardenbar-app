import { requirePermission } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

/**
 * Kitchen section layout — REQ-034 AC4.
 *
 * Gated by the `kitchenManagement` feature-permission (toggled per
 * admin in Settings → Admins → Permissions). Super-admin has the
 * permission unconditionally; admin / csr require an explicit grant.
 */
export default async function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission('kitchenManagement');

  return <>{children}</>;
}
