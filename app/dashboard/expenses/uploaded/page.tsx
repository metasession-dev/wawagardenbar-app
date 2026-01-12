import { Suspense } from 'react';
import { UploadedExpensesList } from '@/components/features/admin/expenses/uploaded-expenses-list';
import { UploadedExpensesStats } from '@/components/features/admin/expenses/uploaded-expenses-stats';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Uploaded Expenses | Wawa Garden Bar',
  description: 'Review and approve imported expenses from Excel files',
};

async function getSession() {
  const cookieStore = await cookies();
  return await getIronSession<SessionData>(cookieStore, sessionOptions);
}

export default async function UploadedExpensesPage() {
  const session = await getSession();
  
  if (!session.isLoggedIn || (session.role !== 'admin' && session.role !== 'super-admin')) {
    redirect('/admin/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Uploaded Expenses</h1>
        <p className="text-muted-foreground">
          Review and approve imported expenses from Excel files
        </p>
      </div>

      <Suspense fallback={<div>Loading statistics...</div>}>
        <UploadedExpensesStats />
      </Suspense>

      <Suspense fallback={<div>Loading expenses...</div>}>
        <UploadedExpensesList />
      </Suspense>
    </div>
  );
}
