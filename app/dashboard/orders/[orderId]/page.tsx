import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { OrderService } from '@/services';
import { OrderDetailsHeader } from '@/components/features/admin/order-details-header';
import { OrderCustomerInfo } from '@/components/features/admin/order-customer-info';
import { OrderItemsTable } from '@/components/features/admin/order-items-table';
import { OrderPaymentInfo } from '@/components/features/admin/order-payment-info';
import { OrderTimeline } from '@/components/features/admin/order-timeline';
import { OrderActionsSidebar } from '@/components/features/admin/order-actions-sidebar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

interface OrderDetailsPageProps {
  params: Promise<{
    orderId: string;
  }>;
}

/**
 * Order details page
 * Displays comprehensive order information with real-time updates
 */
export default async function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  const { orderId } = await params;

  // Fetch order data
  const orderData = await OrderService.getOrderById(orderId);

  if (!orderData) {
    notFound();
  }

  // Serialize order for client components with proper customer data
  const populatedUser = orderData.userId as any;
  const serializedOrder = JSON.parse(JSON.stringify(orderData));
  
  // Add customer object with user profile data or guest data
  const order = {
    ...serializedOrder,
    customer: {
      name: orderData.guestName || populatedUser?.name || 'Guest',
      email: orderData.guestEmail || populatedUser?.email,
      phone: orderData.guestPhone || populatedUser?.phone,
    },
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <Link href="/dashboard/orders">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Orders
          </Button>
        </Link>
      </div>

      {/* Order Header */}
      <Suspense fallback={<Skeleton className="h-32 w-full" />}>
        <OrderDetailsHeader order={order} />
      </Suspense>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <OrderCustomerInfo order={order} />
          </Suspense>

          {/* Order Items */}
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <OrderItemsTable order={order} />
          </Suspense>

          {/* Special Instructions */}
          {order.specialInstructions && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Special Instructions</h3>
                <p className="text-sm text-muted-foreground bg-muted p-4 rounded-md">
                  {order.specialInstructions}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Order Timeline */}
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <OrderTimeline order={order} />
          </Suspense>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Actions Sidebar */}
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <OrderActionsSidebar order={order} />
          </Suspense>

          {/* Payment Information */}
          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <OrderPaymentInfo order={order} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
