import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { InventoryReportClient } from './inventory-report-client';

export const metadata = {
  title: 'Inventory Report | Wawa Garden Bar',
  description: 'Stock levels, usage, and reorder recommendations',
};

async function getSession() {
  return await getIronSession<SessionData>(await cookies(), sessionOptions);
}

export default async function InventoryReportPage() {
  const session = await getSession();

  // Check authentication
  if (!session.isLoggedIn) {
    redirect('/login');
  }

  // Check authorization - only super-admin and admin can access
  if (session.role !== 'super-admin' && session.role !== 'admin') {
    redirect('/dashboard');
  }

  return <InventoryReportClient />;
}
