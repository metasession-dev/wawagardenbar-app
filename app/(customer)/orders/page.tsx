import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { MainLayout } from '@/components/shared/layout';
import { Container } from '@/components/shared/layout';
import { PageHeader } from '@/components/shared/ui';
import { EmptyState } from '@/components/shared/ui';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShoppingBag,
  Clock,
  CheckCircle,
  XCircle,
  ChefHat,
  Package,
} from 'lucide-react';
import { sessionOptions, SessionData } from '@/lib/session';
import { OrderService } from '@/services';
import { OrderStatus } from '@/interfaces';

export const metadata: Metadata = {
  title: 'Orders - Wawa Garden Bar',
  description: 'View your order history',
};

export default async function OrdersPage() {
  // Check authentication
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    sessionOptions
  );

  if (!session.isLoggedIn) {
    redirect('/login?redirect=/orders');
  }

  let orders: any[] = [];

  if (session.userId) {
    // REQ-120 — tabs are staff-only; customers see their orders (including
    // orders placed on a tab before this release).
    const result = await OrderService.getOrdersByUserId(session.userId, {
      limit: 50,
      skip: 0,
    });
    orders = result.orders || [];
  }

  const serializedOrders = orders.map((order: any) =>
    JSON.parse(JSON.stringify(order))
  );

  return (
    <MainLayout>
      <Container size="lg" className="py-8">
        <PageHeader
          title="My Orders"
          description="View and track your order history"
        />

        <div className="mt-8">
          {serializedOrders.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No orders yet"
              description="You haven't placed any orders. Start by browsing our menu!"
              action={{
                label: 'Browse Menu',
                href: '/menu',
              }}
            />
          ) : (
            <div className="space-y-4">
              {serializedOrders.map((order) => (
                <OrderCard key={order._id.toString()} order={order} />
              ))}
            </div>
          )}
        </div>
      </Container>
    </MainLayout>
  );
}

/**
 * Order card component
 * @requirement REQ-085 - Labeled Kitchen/Payment badges for customer clarity
 */
function OrderCard({ order }: { order: any }) {
  function getStatusBadge(status: OrderStatus) {
    const variants: Record<
      OrderStatus,
      { variant: any; icon: any; label: string }
    > = {
      pending: { variant: 'secondary', icon: Clock, label: 'Pending' },
      confirmed: { variant: 'default', icon: CheckCircle, label: 'Confirmed' },
      preparing: { variant: 'default', icon: ChefHat, label: 'Preparing' },
      ready: { variant: 'default', icon: Package, label: 'Ready' },
      'out-for-delivery': {
        variant: 'default',
        icon: Package,
        label: 'Out for Delivery',
      },
      delivered: { variant: 'default', icon: CheckCircle, label: 'Delivered' },
      completed: { variant: 'default', icon: CheckCircle, label: 'Completed' },
      cancelled: { variant: 'destructive', icon: XCircle, label: 'Cancelled' },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any}>
        <Icon className="mr-1 h-3 w-3" />
        Kitchen: {config.label}
      </Badge>
    );
  }

  function getPaymentBadge(paymentStatus: string) {
    if (paymentStatus === 'paid') {
      return <Badge variant="default">Payment: Paid</Badge>;
    }
    if (paymentStatus === 'pending') {
      return <Badge variant="secondary">Payment: Pending</Badge>;
    }
    return <Badge variant="destructive">Payment: Failed</Badge>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Order #{order.orderNumber}
              {getStatusBadge(order.status)}
            </CardTitle>
            <CardDescription>
              {new Date(order.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">
              ₦{order.total.toLocaleString()}
            </p>
            {getPaymentBadge(order.paymentStatus)}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Order Items */}
          <div>
            <h4 className="mb-2 text-sm font-semibold">Items</h4>
            <div className="space-y-1">
              {order.items.map((item: any, index: number) => {
                let quantityDisplay = `${item.quantity}x`;
                if (item.portionSize === 'half') {
                  quantityDisplay = `${item.quantity} × 1/2x`;
                } else if (item.portionSize === 'quarter') {
                  quantityDisplay = `${item.quantity} × 1/4x`;
                }

                return (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {quantityDisplay} {item.name}
                    </span>
                    <span className="font-medium">
                      ₦{item.subtotal.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Type & Details */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="capitalize">
              {order.orderType.replace('-', ' ')}
            </span>
            {order.orderType === 'dine-in' &&
              order.dineInDetails?.tableNumber && (
                <span>• Table {order.dineInDetails.tableNumber}</span>
              )}
            {order.orderType === 'delivery' &&
              order.deliveryDetails?.address && (
                <span>
                  • {order.deliveryDetails.address.street},{' '}
                  {order.deliveryDetails.address.city}
                </span>
              )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Link href={`/orders/${order._id}`} className="flex-1">
              <Button variant="outline" className="w-full">
                View Details
              </Button>
            </Link>
            {order.status === 'completed' && !order.review && (
              <Button variant="default">Leave Review</Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
