import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/shared/providers';
import { CookieConsentBanner } from '@/components/shared/cookie-consent-banner';

export const metadata: Metadata = {
  title: 'Wawa Garden Bar - Order Food & Drinks',
  description:
    'Order delicious food and drinks from Wawa Garden Bar. Dine-in, pickup, or delivery available.',
  keywords: ['restaurant', 'food delivery', 'wawa cafe', 'garden bar'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>
          {children}
          <CookieConsentBanner />
        </Providers>
      </body>
    </html>
  );
}
