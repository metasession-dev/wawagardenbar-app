import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import './globals.css';
import { Providers } from '@/components/shared/providers';
import { CookieConsentBanner } from '@/components/shared/cookie-consent-banner';
import { sessionOptions, SessionData } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Wawa Garden Bar - Order Food & Drinks',
  description:
    'Order delicious food and drinks from Wawa Garden Bar. Dine-in, pickup, or delivery available.',
  keywords: ['restaurant', 'food delivery', 'wawa cafe', 'garden bar'],
};

/**
 * Whether the current request is from a logged-in staff member
 * (csr / admin / super-admin). Staff don't need the customer-facing
 * cookie consent banner — their employment relationship is the
 * consent, and the banner overlays admin dashboard surfaces (e.g. the
 * permissions form's Save Changes button at the bottom of the page).
 *
 * Returns false on any error (missing cookie, malformed session,
 * iron-session crypto failure) — keeps the failure mode privacy-safe:
 * unknown auth state → show the banner.
 *
 * @requirement REQ-065 — cookie consent banner scope clarified.
 *   Banner continues to render for anonymous customers + logged-in
 *   customers (`role: 'customer'`); only staff get the suppression.
 */
async function isAuthenticatedStaff(): Promise<boolean> {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );
    return (
      session.isLoggedIn === true &&
      (session.role === 'csr' ||
        session.role === 'admin' ||
        session.role === 'super-admin')
    );
  } catch {
    return false;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isStaff = await isAuthenticatedStaff();

  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>
          {children}
          {!isStaff && <CookieConsentBanner />}
        </Providers>
      </body>
    </html>
  );
}
