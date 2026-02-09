import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { OrderService } from '@/services';
import { sessionOptions, SessionData } from '@/lib/session';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Clock, Package } from 'lucide-react';
import { OrderStatus } from '@/interfaces';

/**
 * Order history page for authenticated users
 */
export default async function OrderHistoryPage() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.userId) {
    redirect('/login?redirect=/orders/history');
  }

  const { orders, total } = await OrderService.getOrdersByUserId(session.userId, {
    limit: 20,
  });

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Order History</h1>
          <p className="text-muted-foreground">
            {total} order{total !== 1 ? 's' : ''} total
          </p>
        </div>
        
        <Link href="/menu">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Menu
          </Button>
        </Link>
      </div>

      {/* Orders list */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No orders yet</h3>
            <p className="mb-4 text-center text-muted-foreground">
              You haven&apos;t placed any orders yet. Start exploring our menu!
            </p>
            <Link href="/menu">
              <Button>Browse Menu</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order._id.toString()} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Order #{order.orderNumber}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  
                  <OrderStatusBadge status={order.status} />
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {/* Order items */}
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Items</h4>
                    <div className="space-y-1">
                      {order.items.slice(0, 3).map((item, index) => {
                        let quantityDisplay = `${item.quantity}x`;
                        if (item.portionSize === 'half') {
                          quantityDisplay = `${item.quantity} × 1/2x`;
                        } else if (item.portionSize === 'quarter') {
                          quantityDisplay = `${item.quantity} × 1/4x`;
                        }
                        
                        return (
                          <p key={index} className="text-sm text-muted-foreground">
                            {quantityDisplay} {item.name}
                          </p>
                        );
                      })}
                      {order.items.length > 3 && (
                        <p className="text-sm text-muted-foreground">
                          +{order.items.length - 3} more item
                          {order.items.length - 3 !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Order details */}
                  <div className="flex items-center justify-between border-t pt-4">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="capitalize">
                          {order.orderType.replace('-', ' ')}
                        </span>
                      </div>
                      
                      {order.estimatedWaitTime && order.status !== 'completed' && order.status !== 'cancelled' && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{order.estimatedWaitTime} min</span>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-lg font-semibold">
                      ₦{order.total.toLocaleString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 border-t pt-4">
                    <Link href={`/orders/${order._id.toString()}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        View Details
                      </Button>
                    </Link>
                    
                    {order.status === 'completed' && !order.rating && (
                      <Link href={`/orders/${order._id.toString()}/review`} className="flex-1">
                        <Button variant="default" className="w-full">
                          Leave Review
                        </Button>
                      </Link>
                    )}
                    
                    {order.status === 'completed' && (
                      <Button variant="outline">
                        Reorder
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Load more */}
      {orders.length > 0 && orders.length < total && (
        <div className="mt-6 text-center">
          <Button variant="outline">Load More Orders</Button>
        </div>
      )}
    </div>
  );
}

/**
 * Order status badge component
 */
function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const variants: Record<OrderStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    pending: { variant: 'secondary', label: 'Pending' },
    confirmed: { variant: 'default', label: 'Confirmed' },
    preparing: { variant: 'default', label: 'Preparing' },
    ready: { variant: 'default', label: 'Ready' },
    'out-for-delivery': { variant: 'default', label: 'On the Way' },
    delivered: { variant: 'default', label: 'Delivered' },
    completed: { variant: 'outline', label: 'Completed' },
    cancelled: { variant: 'destructive', label: 'Cancelled' },
  };

  const config = variants[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

/**
 * Generate metadata
 */
export const metadata = {
  title: 'Order History - Wawa Garden Bar',
  description: 'View your order history and track past orders',
};
