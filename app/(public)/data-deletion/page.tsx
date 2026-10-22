import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { ProfileService } from '@/services';
import { DataDeletionForm } from './data-deletion-form';

export const metadata = {
  title: 'Data Deletion Request | Wawa Garden Bar',
  description: 'Request permanent deletion of your account and data',
};

// Intentionally does NOT redirect unauthenticated visitors: this URL is also
// submitted to Meta as the WhatsApp app's data deletion instructions URL,
// and their review fetches it without a session. The deletion instructions
// must render for a logged-out visitor; only the submit form itself needs
// a signed-in account.
export default async function DataDeletionPage() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    sessionOptions
  );

  if (!session.isLoggedIn || !session.userId) {
    return <DataDeletionForm isLoggedIn={false} />;
  }

  // Get user profile to check for phone number if email is missing
  const profile = await ProfileService.getUserProfile(session.userId);

  // Determine identifier to pre-fill (Email > Phone)
  const identifier = profile?.email || profile?.phone || '';

  return <DataDeletionForm isLoggedIn initialEmail={identifier} />;
}
