import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { TabService } from '@/services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Receipt, Plus } from 'lucide-react';
import Link from 'next/link';
import { DashboardTabActions } from '@/components/features/admin/tabs/dashboard-tab-actions';
import { DeleteTabDialog } from '@/components/features/admin/tabs/delete-tab-dialog';
import { EditTabNameDialog } from '@/components/features/admin/tabs/edit-tab-name-dialog';

interface DashboardTabDetailsPageProps {
  params: Promise<{
    tabId: string;
  }>;
}

interface SerializedOrderItem {
  name: string;
  quantity: number;
  subtotal: number;
  portionSize?: 'full' | 'half';
}

interface SerializedOrder {
  _id: string;
  orderNumber: string;
  status: string;
  items: SerializedOrderItem[];
  specialInstructions?: string;
  total: number;
  createdAt: string;
}

async function getTabDetails(tabId: string) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.userId || (session.role !== 'admin' && session.role !== 'super-admin')) {
    redirect('/dashboard');
  }

  const details = await TabService.getTabDetails(tabId);

  // Fully serialize to plain objects
  const plainTab = JSON.parse(JSON.stringify(details.tab));
  const plainOrders = JSON.parse(JSON.stringify(details.orders));
  
  const serializedTab = {
    _id: plainTab._id,
    tabNumber: plainTab.tabNumber,
    customName: plainTab.customName,
    tableNumber: plainTab.tableNumber,
    status: plainTab.status,
    orders: Array.isArray(plainTab.orders) ? plainTab.orders : [],
    subtotal: plainTab.subtotal,
    serviceFee: plainTab.serviceFee,
    tax: plainTab.tax,
    deliveryFee: plainTab.deliveryFee,
    discountTotal: plainTab.discountTotal,
    tipAmount: plainTab.tipAmount,
    total: plainTab.total,
    paymentStatus: plainTab.paymentStatus,
    paymentReference: plainTab.paymentReference,
    openedAt: plainTab.openedAt,
    closedAt: plainTab.closedAt,
    paidAt: plainTab.paidAt,
  };

  const serializedOrders: SerializedOrder[] = plainOrders.map((order: any): SerializedOrder => ({
    _id: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    items: order.items.map((item: any): SerializedOrderItem => ({
      name: item.name,
      quantity: item.quantity,
      subtotal: item.subtotal,
      portionSize: item.portionSize,
    })),
    specialInstructions: order.specialInstructions,
    total: order.total,
    createdAt: order.createdAt,
  }));

  return { tab: serializedTab, orders: serializedOrders };
}

export default async function DashboardTabDetailsPage({ params }: DashboardTabDetailsPageProps) {
  const { tabId } = await params;
  const { tab, orders } = await getTabDetails(tabId);

  // Count non-cancelled orders
  const nonCancelledOrderCount = orders.filter(order => order.status !== 'cancelled').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard/orders/tabs">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tabs
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">
                {tab.customName || `Tab #${tab.tabNumber}`}
              </h1>
              <EditTabNameDialog
                tabId={tab._id}
                tabNumber={tab.tabNumber}
                currentName={tab.customName}
              />
            </div>
            <p className="text-muted-foreground mt-2">
              {tab.customName && <span className="text-sm">Tab #{tab.tabNumber} • </span>}
              Table {tab.tableNumber} • Opened {new Date(tab.openedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={tab.status === 'open' ? 'default' : 'secondary'} className="text-sm">
              {tab.status}
            </Badge>
            <DeleteTabDialog
              tabId={tab._id}
              tabNumber={tab.tabNumber}
              status={tab.status}
              paymentStatus={tab.paymentStatus}
              orderCount={orders.length}
              nonCancelledOrderCount={nonCancelledOrderCount}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Orders List */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Orders on this Tab</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No orders yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order, index) => (
                    <div key={order._id}>
                      {index > 0 && <Separator className="my-4" />}
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <Link
                              href={`/dashboard/orders/${order._id}`}
                              className="font-semibold hover:underline"
                            >
                              Order #{order.orderNumber}
                            </Link>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <Badge variant="outline">{order.status}</Badge>
                        </div>

                        <div className="space-y-2">
                          {order.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="flex justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span>
                                  {item.quantity}x {item.name}
                                </span>
                                {item.portionSize === 'half' && (
                                  <Badge variant="secondary" className="text-xs">Half</Badge>
                                )}
                              </div>
                              <span className="font-medium">
                                ₦{item.subtotal.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>

                        {order.specialInstructions && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Note: </span>
                            <span>{order.specialInstructions}</span>
                          </div>
                        )}

                        <div className="flex justify-between font-semibold pt-2 border-t">
                          <span>Order Total:</span>
                          <span>₦{order.total.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create Order Button */}
          {tab.status === 'open' && (
            <Link href={`/menu?tableNumber=${tab.tableNumber}`}>
              <Button className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Create an order
              </Button>
            </Link>
          )}
        </div>

        {/* Tab Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tab Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
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
                {tab.discountTotal > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount:</span>
                    <span className="font-medium">-₦{tab.discountTotal.toLocaleString()}</span>
                  </div>
                )}
                {tab.tipAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tip:</span>
                    <span className="font-medium">₦{tab.tipAmount.toLocaleString()}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>₦{tab.total.toLocaleString()}</span>
                </div>
              </div>

              {tab.status === 'closed' && (
                <div className="text-center py-4">
                  <Badge variant="secondary" className="text-sm">
                    Tab Closed
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">
                    Paid on {tab.paidAt ? new Date(tab.paidAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
              )}

              {/* Payment Action Button */}
              {(tab.status === 'open' || tab.status === 'closed') && (
                <div className="pt-4 border-t">
                  <DashboardTabActions
                    tabId={tab._id}
                    tabNumber={tab.tabNumber}
                    tableNumber={tab.tableNumber}
                    total={tab.total}
                    status={tab.status}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Tab Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Table:</span>
                <span className="font-medium">{tab.tableNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Orders:</span>
                <span className="font-medium">{orders.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={tab.status === 'open' ? 'default' : 'secondary'}>
                  {tab.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment:</span>
                <Badge variant={tab.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                  {tab.paymentStatus}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Opened:</span>
                <span className="font-medium">
                  {new Date(tab.openedAt).toLocaleString()}
                </span>
              </div>
              {tab.closedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Closed:</span>
                  <span className="font-medium">
                    {new Date(tab.closedAt).toLocaleString()}
                  </span>
                </div>
              )}
              {tab.paymentReference && (
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Payment Ref:</span>
                  <span className="font-mono text-xs break-all">{tab.paymentReference}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
