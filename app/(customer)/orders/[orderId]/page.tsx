import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, type SessionData } from '@/lib/session';
import { hasOrderAccess, idString } from '@/lib/order-access';
import { Suspense } from 'react';
import { OrderService } from '@/services';
import { RealTimeOrderTracker } from '@/components/features/orders/real-time-order-tracker';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { verifyPayment } from '@/app/actions/payment/payment-actions';
import { VerifyPaymentButton } from '@/components/features/orders/verify-payment-button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { OrderCancellationForm } from '@/components/features/communication/order-cancellation-form';

interface OrderPageProps {
  params: Promise<{
    orderId: string;
  }>;
  searchParams: Promise<{
    payment?: string;
    t?: string;
  }>;
}

/**
 * Order confirmation and tracking page
 */
export default async function OrderPage({
  params,
  searchParams,
}: OrderPageProps) {
  const { orderId } = await params;
  const { payment, t } = await searchParams;

  let orderData = await OrderService.getOrderById(orderId);

  if (!orderData) {
    notFound();
  }

  // REQ-124 (AC3, ADR-013) — signed-in owner or a valid tracking token, else 404
  // (404, not 403, so the existence of an order id is not revealed).
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions
  );
  if (
    !hasOrderAccess({
      orderId,
      token: t,
      sessionUserId: session.isLoggedIn ? session.userId : null,
      orderUserId: idString(orderData.userId),
    })
  ) {
    notFound();
  }

  // If redirected from payment and payment is still pending, verify it
  if (
    payment === 'success' &&
    orderData.paymentStatus === 'pending' &&
    orderData.paymentReference
  ) {
    console.log('Verifying payment for order:', orderId);
    const verificationResult = await verifyPayment(orderData.paymentReference);

    if (verificationResult.success) {
      console.log('Payment verified successfully');
      // Refetch order to get updated payment status
      orderData = await OrderService.getOrderById(orderId);
    } else {
      console.error('Payment verification failed:', verificationResult.message);
    }
  }

  if (!orderData) {
    notFound();
  }

  // Serialize order for client components
  const order = JSON.parse(JSON.stringify(orderData));

  // REQ-128 — only the signed-in owner of a customer order sees Cancel (a
  // tracking-token visitor does not); the server action checks ownership again.
  const canCancelAsOwner =
    Boolean(session.isLoggedIn && session.userId) &&
    idString(orderData.userId) === session.userId &&
    order.origin === 'customer';

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Link href="/menu">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Menu
          </Button>
        </Link>

        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Receipt
        </Button>
      </div>

      {/* Payment pending alert */}
      {order.paymentStatus === 'pending' && order.paymentReference && (
        <Alert
          variant="default"
          className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
        >
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-700 dark:text-yellow-400">
            Payment Pending
          </AlertTitle>
          <AlertDescription className="text-yellow-600 dark:text-yellow-500">
            <p className="mb-3">
              Your payment is still being processed. If you&apos;ve completed
              the payment, click the button below to verify.
            </p>
            <VerifyPaymentButton paymentReference={order.paymentReference} />
          </AlertDescription>
        </Alert>
      )}

      {/* Success message */}
      {order.status === 'confirmed' && order.paymentStatus === 'paid' && (
        <div className="mb-6 rounded-lg border border-green-500 bg-green-50 p-6 dark:bg-green-950/20">
          <h1 className="mb-2 text-2xl font-bold text-green-700 dark:text-green-400">
            Order Confirmed!
          </h1>
          <p className="text-green-600 dark:text-green-500">
            Thank you for your order. We&apos;ll start preparing it right away.
          </p>
        </div>
      )}

      {/* Real-time order tracker */}
      <Suspense fallback={<OrderTrackerSkeleton />}>
        <RealTimeOrderTracker order={order} />
      </Suspense>

      {/* Help section */}
      <div className="mt-8 rounded-lg border bg-muted/50 p-4">
        <h3 className="mb-2 font-semibold">Need Help?</h3>
        <p className="mb-3 text-sm text-muted-foreground">
          If you have any questions or concerns about your order, please contact
          us.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/contact">Contact Support</Link>
          </Button>
          {/* REQ-128 — the signed-in owner can cancel; paid orders refund. */}
          {canCancelAsOwner && (
            <OrderCancellationForm
              orderId={orderId}
              orderNumber={order.orderNumber}
              orderStatus={order.status}
              orderTotal={order.total}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for order tracker
 */
function OrderTrackerSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-20" />
      </div>

      <Skeleton className="h-32 w-full rounded-lg" />

      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-start gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>

      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}

/**
 * Generate metadata for the order page.
 *
 * REQ-124 (ADR-013): the page is reachable only by the owner or a token holder,
 * so the title no longer looks the order up (it would reveal an order number to
 * someone who is about to get a 404), and the link's bearer token is kept out of
 * Referer headers.
 */
export function generateMetadata(): Metadata {
  return {
    title: 'Your order - Wawa Garden Bar',
    description: 'Track your order',
    referrer: 'no-referrer',
  };
}
