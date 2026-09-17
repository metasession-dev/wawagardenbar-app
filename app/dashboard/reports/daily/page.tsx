import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { DailyReportClient } from './daily-report-client';

export const metadata = {
  title: 'Daily Financial Report | Wawa Garden Bar',
  description: 'Comprehensive daily financial analysis and insights',
};

async function getSession() {
  return await getIronSession<SessionData>(await cookies(), sessionOptions);
}

export default async function DailyReportPage() {
  const session = await getSession();

  // Check authentication
  if (!session.isLoggedIn) {
    redirect('/login');
  }

  // Check authorization - only super-admin and admin can access
  if (session.role !== 'super-admin' && session.role !== 'admin') {
    redirect('/dashboard');
  }

  return <DailyReportClient userRole={session.role} />;
}
