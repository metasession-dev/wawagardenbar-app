import { requireRole } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

/**
 * Customers section layout
 * Requires CSR or super-admin role for all sub-routes
 */
export default async function CustomersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(['csr', 'super-admin']);

  return <>{children}</>;
}
