/**
 * @requirement REQ-106 - Cash deposit workflow: pending | approved | transferred
 */
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { DepositsClient } from './deposits-client';

export const metadata = {
  title: 'Cash Deposits | Wawa Garden Bar',
  description: 'Record and track cash deposited from the till into the bank',
};

async function getSession() {
  return await getIronSession<SessionData>(await cookies(), sessionOptions);
}

export default async function DepositsPage() {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect('/login');
  }

  if (session.role !== 'super-admin' && session.role !== 'admin') {
    redirect('/dashboard');
  }

  return <DepositsClient userRole={session.role ?? 'admin'} />;
}
