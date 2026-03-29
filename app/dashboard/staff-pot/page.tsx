/**
 * @requirement REQ-015 - Staff Pot tracker page
 */
import { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { StaffPotClient } from './staff-pot-client';

export const metadata: Metadata = {
  title: 'Staff Pot | Wawa Garden Bar',
  description: 'Track team bonus progress',
};

export default async function StaffPotPage() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    sessionOptions
  );
  const isSuperAdmin = session.role === 'super-admin';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Staff Pot</h2>
        <p className="text-muted-foreground">
          Track your team bonus — earn more when the business does well
        </p>
      </div>
      <StaffPotClient isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
