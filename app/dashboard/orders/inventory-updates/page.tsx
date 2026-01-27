import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { PreviousInventoryUpdatesClient } from '@/components/features/inventory/previous-inventory-updates-client';

export default async function PreviousInventoryUpdatesPage() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.userId || !session.role || !['admin', 'super-admin'].includes(session.role)) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Previous Inventory Updates</h1>
          <p className="text-muted-foreground">
            View all historical inventory reviews and updates
          </p>
        </div>
      </div>

      <PreviousInventoryUpdatesClient />
    </div>
  );
}
