import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { SnapshotsListClient } from '@/components/features/inventory/snapshots-list-client';

export default async function SnapshotsPage() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (session.role !== 'super-admin') {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Inventory Snapshots</h1>
          <p className="text-muted-foreground">
            Review and approve staff inventory submissions
          </p>
        </div>
      </div>

      <SnapshotsListClient />
    </div>
  );
}
