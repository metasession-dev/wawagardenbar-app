import { requireSuperAdmin } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

/**
 * Customers section layout
 * Requires super-admin role for all sub-routes
 */
export default async function CustomersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperAdmin();

  return <>{children}</>;
}
