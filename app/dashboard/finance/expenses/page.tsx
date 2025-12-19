import { Suspense } from 'react';
import { ExpensesPageClient } from '@/app/dashboard/finance/expenses/expenses-client';
import { getCurrentSession } from '@/lib/auth-middleware';

export const metadata = {
  title: 'Expenses | Wawa Garden Bar',
  description: 'Manage business expenses',
};

export default async function ExpensesPage() {
  const session = await getCurrentSession();
  const userRole = session?.role || 'admin';

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Expenses</h2>
          <p className="text-muted-foreground">
            Track and manage your business expenses
          </p>
        </div>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <ExpensesPageClient userRole={userRole} />
      </Suspense>
    </div>
  );
}
