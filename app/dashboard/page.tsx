import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth-middleware';
import { OrderService } from '@/services';
import { IOrder } from '@/interfaces';
import OrderModel from '@/models/order-model';
import InventoryModel from '@/models/inventory-model';
import UserModel from '@/models/user-model';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  Clock,
  Package,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const dynamic = 'force-dynamic';

/**
 * Get dashboard metrics
 */
async function getDashboardMetrics() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const [todayStats, monthStats, activeOrders] = await Promise.all([
    OrderService.getOrderStats(today, new Date()),
    OrderService.getOrderStats(thisMonth, new Date()),
    OrderService.getActiveOrders(),
  ]);

  return {
    today: todayStats,
    month: monthStats,
    activeOrders: activeOrders.length,
  };
}

/**
 * Dashboard metrics cards
 */
async function DashboardMetrics() {
  const metrics = await getDashboardMetrics();

  const cards = [
    {
      title: "Today's Revenue",
      value: `₦${metrics.today.totalRevenue.toLocaleString()}`,
      description: `${metrics.today.totalOrders} orders`,
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      title: "Today's Orders",
      value: metrics.today.totalOrders.toString(),
      description: `${metrics.activeOrders} active`,
      icon: ShoppingCart,
      color: 'text-blue-600',
    },
    {
      title: 'Monthly Revenue',
      value: `₦${metrics.month.totalRevenue.toLocaleString()}`,
      description: `${metrics.month.totalOrders} orders`,
      icon: TrendingUp,
      color: 'text-purple-600',
    },
    {
      title: 'Avg Order Value',
      value: `₦${metrics.month.averageOrderValue.toLocaleString()}`,
      description: 'This month',
      icon: DollarSign,
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/**
 * Recent orders list
 */
async function RecentOrders() {
  const orders = await OrderService.getRecentOrders(10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent orders</p>
          ) : (
            orders.map((order: IOrder) => (
              <div
                key={order._id.toString()}
                className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">#{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.orderType} • {order.items.length} items
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    ₦{order.total.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {order.status}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Quick stats
 */
async function QuickStats() {
  // Fetch real statistics from database
  const [pendingOrdersCount, lowStockCount, activeCustomersCount] = await Promise.all([
    // Count pending/confirmed orders
    OrderModel.countDocuments({
      status: { $in: ['pending', 'confirmed'] },
    }),
    // Count low stock items
    InventoryModel.countDocuments({
      status: 'low-stock',
    }),
    // Count active customers (users who have placed at least one order)
    UserModel.countDocuments({
      role: 'customer',
    }),
  ]);

  const stats = [
    {
      title: 'Pending Orders',
      value: pendingOrdersCount.toString(),
      icon: Clock,
      color: 'text-yellow-600',
    },
    {
      title: 'Low Stock Items',
      value: lowStockCount.toString(),
      icon: Package,
      color: 'text-red-600',
    },
    {
      title: 'Active Customers',
      value: activeCustomersCount.toString(),
      icon: Users,
      color: 'text-blue-600',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/**
 * Loading skeleton
 */
function MetricsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-2 h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Admin dashboard home page
 */
export default async function DashboardPage() {
  const session = await getCurrentSession();

  // Redirect CSR and regular admins to orders page since they don't have access to overview
  if (session?.role === 'csr' || session?.role === 'admin') {
    redirect('/dashboard/orders');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening today.
        </p>
      </div>

      {/* Key Metrics */}
      <Suspense fallback={<MetricsSkeleton />}>
        <DashboardMetrics />
      </Suspense>

      {/* Quick Stats */}
      <Suspense fallback={<MetricsSkeleton />}>
        <QuickStats />
      </Suspense>

      {/* Recent Orders */}
      <Suspense fallback={<Skeleton className="h-96" />}>
        <RecentOrders />
      </Suspense>
    </div>
  );
}
