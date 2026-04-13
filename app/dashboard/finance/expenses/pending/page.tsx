/**
 * @requirement REQ-026 - Pending expense group workflow
 */
import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentSession } from '@/lib/auth-middleware';
import { redirect } from 'next/navigation';
import { PendingExpenseGroupList } from '@/components/features/finance/pending-expense-group-list';

export const metadata = {
  title: 'Pending Expenses | Wawa Garden Bar',
  description:
    'Review, approve and confirm payment of pending expense submissions',
};

export default async function PendingExpensesPage() {
  const session = await getCurrentSession();

  if (
    !session?.isLoggedIn ||
    (session.role !== 'admin' && session.role !== 'super-admin')
  ) {
    redirect('/login');
  }

  const userRole = session.role ?? 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/finance/expenses">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Expenses
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pending Expenses</h1>
        <p className="text-muted-foreground">
          {userRole === 'super-admin'
            ? 'Review, approve, batch, and confirm transfer for submitted expenses.'
            : 'View and edit submitted expenses awaiting super-admin approval.'}
        </p>
      </div>

      <Suspense
        fallback={
          <div className="py-8 text-center text-muted-foreground">
            Loading...
          </div>
        }
      >
        <PendingExpenseGroupList userRole={userRole} />
      </Suspense>
    </div>
  );
}
