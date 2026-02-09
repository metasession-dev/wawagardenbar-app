import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { redirect } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { MainLayout } from '@/components/shared/layout';
import { Container } from '@/components/shared/layout';
import { PageHeader } from '@/components/shared/ui';
import { EmptyState } from '@/components/shared/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Clock, CheckCircle, XCircle, ChefHat, Package, Receipt, CreditCard } from 'lucide-react';
import { sessionOptions, SessionData } from '@/lib/session';
import { OrderService, TabService } from '@/services';
import { OrderStatus } from '@/interfaces';

export const metadata: Metadata = {
  title: 'Orders/Tabs - Wawa Garden Bar',
  description: 'View your order history and open tabs',
};

export default async function OrdersPage() {
  // Check authentication
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.isLoggedIn) {
    redirect('/login?redirect=/orders');
  }

  let standaloneOrders: any[] = [];
  let allTabs: any[] = [];

  if (session.userId) {
    // Registered User Logic
    // Fetch user orders (exclude orders that are part of tabs)
    const result = await OrderService.getOrdersByUserId(session.userId, {
      limit: 50,
      skip: 0,
    });

    // Fetch ALL user's tabs (open, closed, paid - all statuses)
    allTabs = await TabService.listAllTabsForUser(session.userId);

    // Show only orders that are NOT part of any tab
    standaloneOrders = (result.orders || []).filter(
      (order: any) => !order.tabId
    );
  } else if (session.isGuest) {
    // Guest Logic
    // Guests mainly use tabs for now. 
    // If we want to show past orders for guests, we'd need to track them by guestId in OrderService too.
    
    if (session.guestId) {
      // We can reuse listOpenTabs but here we want ALL tabs? 
      // TabService.listOpenTabs only returns open ones.
      // Let's check if we can list all tabs for guest.
      // Currently TabService doesn't have listAllTabsForGuest.
      // We can fallback to listOpenTabs for now or use listOpenTabs logic but without status filter?
      // Actually, let's just use listOpenTabs for guests as they likely only care about current session.
      
      const openTabs = await TabService.listOpenTabs({ guestId: session.guestId });
      allTabs = openTabs;
    } else if (session.email) {
      const openTabs = await TabService.listOpenTabs({ customerEmail: session.email });
      allTabs = openTabs;
    }
  }

  // Serialize for client components
  const serializedOrders = standaloneOrders.map((order: any) => JSON.parse(JSON.stringify(order)));
  
  // Fully serialize tabs to plain objects
  const serializedTabs = JSON.parse(JSON.stringify(allTabs)).map((tab: any) => ({
    _id: tab._id,
    tabNumber: tab.tabNumber,
    tableNumber: tab.tableNumber,
    status: tab.status,
    orders: Array.isArray(tab.orders) ? tab.orders : [],
    subtotal: tab.subtotal,
    serviceFee: tab.serviceFee,
    tax: tab.tax,
    tipAmount: tab.tipAmount,
    total: tab.total,
    paymentStatus: tab.paymentStatus,
    openedAt: tab.openedAt,
  }));

  return (
    <MainLayout>
      <Container size="lg" className="py-8">
        <PageHeader
          title="My Orders & Tabs"
          description="View and track your order history and open tabs"
        />

        <div className="mt-8">
          {serializedTabs.length === 0 && serializedOrders.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="No orders or tabs yet"
              description="You haven't placed any orders. Start by browsing our menu!"
              action={{
                label: 'Browse Menu',
                href: '/menu',
              }}
            />
          ) : (
            <div className="space-y-6">
              {/* Tabs Section */}
              {serializedTabs.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Tabs</h2>
                  <div className="space-y-4">
                    {serializedTabs.map((tab: any) => (
                      <TabCard key={tab._id} tab={tab} />
                    ))}
                  </div>
                </div>
              )}

              {/* Orders Section */}
              {serializedOrders.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">
                    {serializedTabs.length > 0 ? 'Other Orders' : 'Orders'}
                  </h2>
                  <div className="space-y-4">
                    {serializedOrders.map((order) => (
                      <OrderCard key={order._id.toString()} order={order} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Container>
    </MainLayout>
  );
}

/**
 * Tab card component
 */
function TabCard({ tab }: { tab: any }) {
  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Tab #{tab.tabNumber}
              <Badge variant={tab.status === 'open' ? 'default' : 'secondary'}>
                {tab.status}
              </Badge>
            </CardTitle>
            <CardDescription>
              Table {tab.tableNumber} • Opened {new Date(tab.openedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">₦{tab.total.toLocaleString()}</p>
            <Badge variant={tab.paymentStatus === 'paid' ? 'default' : 'secondary'}>
              {tab.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Tab Summary */}
          <div>
            <h4 className="mb-2 text-sm font-semibold">Tab Summary</h4>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Orders:</span>
                <span className="font-medium">{tab.orders.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">₦{tab.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service Fee:</span>
                <span className="font-medium">₦{tab.serviceFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax:</span>
                <span className="font-medium">₦{tab.tax.toLocaleString()}</span>
              </div>
              {tab.tipAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tip:</span>
                  <span className="font-medium">₦{tab.tipAmount.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Link href={`/orders/tabs/${tab._id}`} className="flex-1">
              <Button variant="outline" className="w-full">
                <Receipt className="mr-2 h-4 w-4" />
                View Tab Details
              </Button>
            </Link>
            {tab.status === 'open' && (
              <Link href={`/orders/tabs/${tab._id}/checkout`} className="flex-1">
                <Button className="w-full">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay & Close Tab
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Order card component
 */
function OrderCard({ order }: { order: any }) {
  function getStatusBadge(status: OrderStatus) {
    const variants: Record<OrderStatus, { variant: any; icon: any; label: string }> = {
      pending: { variant: 'secondary', icon: Clock, label: 'Pending' },
      confirmed: { variant: 'default', icon: CheckCircle, label: 'Confirmed' },
      preparing: { variant: 'default', icon: ChefHat, label: 'Preparing' },
      ready: { variant: 'default', icon: Package, label: 'Ready' },
      'out-for-delivery': { variant: 'default', icon: Package, label: 'Out for Delivery' },
      delivered: { variant: 'default', icon: CheckCircle, label: 'Delivered' },
      completed: { variant: 'default', icon: CheckCircle, label: 'Completed' },
      cancelled: { variant: 'destructive', icon: XCircle, label: 'Cancelled' },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any}>
        <Icon className="mr-1 h-3 w-3" />
        {config.label}
      </Badge>
    );
  }

  function getPaymentBadge(paymentStatus: string) {
    if (paymentStatus === 'paid') {
      return <Badge variant="default">Paid</Badge>;
    }
    if (paymentStatus === 'pending') {
      return <Badge variant="secondary">Payment Pending</Badge>;
    }
    return <Badge variant="destructive">Failed</Badge>;
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
            <p className="text-2xl font-bold">₦{order.total.toLocaleString()}</p>
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
                    <span className="font-medium">₦{item.subtotal.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Type & Details */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="capitalize">{order.orderType.replace('-', ' ')}</span>
            {order.orderType === 'dine-in' && order.dineInDetails?.tableNumber && (
              <span>• Table {order.dineInDetails.tableNumber}</span>
            )}
            {order.orderType === 'delivery' && order.deliveryDetails?.address && (
              <span>• {order.deliveryDetails.address.street}, {order.deliveryDetails.address.city}</span>
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
