import { Suspense } from 'react';
import { MainLayout } from '@/components/shared/layout';
import { CustomerCheckoutForm } from '@/components/features/checkout/customer-checkout-form';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'Checkout - Wawa Garden Bar',
  description: 'Complete your order',
};

export default function CheckoutPage() {
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
