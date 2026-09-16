/**
 * @requirement REQ-106 (amended — AC10) - Dedicated Cash Position page:
 * live balance + itemized ledger of every non-sales movement composing it.
 */
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { CashPositionPageClient } from './cash-position-page-client';

export const metadata = {
  title: 'Cash Position | Wawa Garden Bar',
  description:
    'Live till balance and an itemized ledger of every expense, deposit, and manual adjustment composing it',
};

async function getSession() {
  return await getIronSession<SessionData>(await cookies(), sessionOptions);
}

export default async function CashPositionPage() {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect('/login');
  }

  if (session.role !== 'super-admin' && session.role !== 'admin') {
    redirect('/dashboard');
  }

  return <CashPositionPageClient userRole={session.role ?? 'admin'} />;
}
