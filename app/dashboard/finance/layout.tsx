import { requirePermission } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

/**
 * Finance section layout
 * Requires expensesManagement permission for all sub-routes
 */
export default async function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission('expensesManagement');

  return <>{children}</>;
}
