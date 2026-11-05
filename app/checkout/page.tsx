import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getIronSession } from 'iron-session';
import { MainLayout } from '@/components/shared/layout';
import { CustomerCheckoutForm } from '@/components/features/checkout/customer-checkout-form';
import { Skeleton } from '@/components/ui/skeleton';
import { sessionOptions, SessionData } from '@/lib/session';

export const metadata = {
  title: 'Checkout - Wawa Garden Bar',
  description: 'Complete your order',
};

export default async function CheckoutPage() {
  // REQ-117 (AC4) — checkout needs the WhatsApp PIN sign-in. Browsing and
  // building a cart do not; the cart lives in localStorage, so it survives the
  // round-trip to /login and back.
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
  if (!session.isLoggedIn || session.isGuest) {
    redirect('/login?redirect=/checkout');
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<CheckoutSkeleton />}>
          <CustomerCheckoutForm />
        </Suspense>
      </div>
    </MainLayout>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Skeleton className="h-12 w-64" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-96" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  );
}
