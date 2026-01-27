import { redirect, notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { getSnapshotDetailsAction } from '@/app/actions/inventory/snapshot-actions';
import { SnapshotDetailsClient } from '@/components/features/inventory/snapshot-details-client';

export default async function SnapshotDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (session.role !== 'super-admin') {
    redirect('/dashboard');
  }

  const { id } = await params;
  const result = await getSnapshotDetailsAction(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">
      <SnapshotDetailsClient snapshot={result.data} />
    </div>
  );
}
