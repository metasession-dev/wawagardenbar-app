import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderAnalyticsService } from '@/services/order-analytics-service';
import { TrendingUp, DollarSign, ShoppingCart, Clock } from 'lucide-react';

/**
 * Order analytics dashboard
 * Shows comprehensive order metrics and trends
 */
export async function OrderAnalytics() {
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    todayStats,
    ordersByStatus,
    ordersByType,
    revenueByDay,
    popularItems,
    peakHours,
    avgPrepTime,
    customerStats,
  ] = await Promise.all([
    OrderAnalyticsService.getTodayStats(),
    OrderAnalyticsService.getOrdersByStatus(thirtyDaysAgo, today),
    OrderAnalyticsService.getOrdersByType(thirtyDaysAgo, today),
    OrderAnalyticsService.getRevenueByDay(7),
    OrderAnalyticsService.getPopularItems(5),
    OrderAnalyticsService.getPeakHours(),
    OrderAnalyticsService.getAveragePreparationTime(),
    OrderAnalyticsService.getCustomerStats(thirtyDaysAgo, today),
  ]);

  return (
    <div className="space-y-6">
      {/* Today's Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Orders
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {todayStats.completedOrders} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{todayStats.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              From {todayStats.completedOrders} orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Order Value
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{Math.round(todayStats.avgOrderValue).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Per completed order</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Prep Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(avgPrepTime)} min
            </div>
            <p className="text-xs text-muted-foreground">Average preparation</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders by Status (Last 30 Days) */}
      <Card>
        <CardHeader>
          <CardTitle>Orders by Status (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {ordersByStatus.map((item) => (
              <div
                key={item.status}
                className="flex items-center justify-between"
              >
                <span className="capitalize">{item.status}</span>
                <span className="font-semibold">{item.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Orders by Type (Last 30 Days) */}
      <Card>
        <CardHeader>
          <CardTitle>Orders by Type (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ordersByType.map((item) => (
              <div key={item.type} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="capitalize">{item.type}</span>
                  <span className="font-semibold">{item.count} orders</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Revenue: ₦{item.revenue.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Revenue Trend (Last 7 Days) */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {revenueByDay.map((item) => (
              <div
                key={item.date}
                className="flex items-center justify-between"
              >
                <span>{new Date(item.date).toLocaleDateString()}</span>
                <div className="text-right">
                  <div className="font-semibold">
                    ₦{item.revenue.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {item.orders} orders
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Popular Items */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Popular Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {popularItems.map((item, index) => (
              <div
                key={item.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground">
                    #{index + 1}
                  </span>
                  <span>{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{item.count} sold</div>
                  <div className="text-sm text-muted-foreground">
                    ₦{item.revenue.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Peak Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Peak Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            {peakHours.map((item) => (
              <div
                key={item.hour}
                className="text-center p-2 rounded bg-muted"
                style={{
                  opacity:
                    0.3 +
                    (item.count / Math.max(...peakHours.map((h) => h.count))) *
                      0.7,
                }}
              >
                <div className="text-sm font-semibold">{item.hour}:00</div>
                <div className="text-xs text-muted-foreground">
                  {item.count}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Customer Stats (Last 30 Days) */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Statistics (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Total Customers</span>
              <span className="font-semibold">
                {customerStats.totalCustomers}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Returning Customers</span>
              <span className="font-semibold">
                {customerStats.returningCustomers}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>New Customers</span>
              <span className="font-semibold">
                {customerStats.newCustomers}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span>Return Rate</span>
              <span className="font-semibold">
                {customerStats.totalCustomers > 0
                  ? Math.round(
                      (customerStats.returningCustomers /
                        customerStats.totalCustomers) *
                        100
                    )
                  : 0}
                %
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
