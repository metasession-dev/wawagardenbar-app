import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { buttonVariants } from '@/components/ui/button';
import { InventorySummaryClient } from '@/components/features/inventory/inventory-summary-client';

export default async function InventorySummaryPage() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.userId || !session.role || !['admin', 'super-admin'].includes(session.role)) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Daily Inventory Summary</h1>
          <p className="text-muted-foreground">
            Review and adjust inventory counts
          </p>
        </div>
        <Link
          href="/dashboard/orders/inventory-updates"
          className={buttonVariants({ variant: 'outline' })}
        >
          View Previous Updates
        </Link>
      </div>

      <InventorySummaryClient />
    </div>
  );
}
