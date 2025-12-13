import { connectDB } from '@/lib/mongodb';
import OrderModel from '@/models/order-model';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, Clock, TrendingUp, AlertCircle } from 'lucide-react';

/**
 * Get today's order statistics
 */
async function getTodayStats() {
  await connectDB();

  // Use last 24 hours instead of calendar day
  const last24Hours = new Date();
  last24Hours.setHours(last24Hours.getHours() - 24);

  // Get all orders (not just last 24 hours) for accurate counts
  const [
    totalOrders,
    pendingOrders,
    preparingOrders,
    completedOrders,
  ] = await Promise.all([
    // All orders (not just last 24h)
    OrderModel.countDocuments(),
    // Pending orders (current state, regardless of creation time)
    OrderModel.countDocuments({
      status: { $in: ['pending', 'confirmed'] },
    }),
    // Preparing orders (current state)
    OrderModel.countDocuments({
      status: 'preparing',
    }),
    // Completed orders (current state)
    OrderModel.countDocuments({
      status: 'completed',
    }),
  ]);

  return {
    totalOrders,
    pendingOrders,
    preparingOrders,
    completedOrders,
  };
}

/**
 * Order statistics cards
 * Shows today's order metrics
 */
export async function OrderStats() {
  const stats = await getTodayStats();

  const cards = [
    {
      title: 'Total Orders',
      value: stats.totalOrders,
      description: 'Last 24 hours',
      icon: ShoppingCart,
      color: 'text-blue-600',
    },
    {
      title: 'Pending',
      value: stats.pendingOrders,
      description: 'Awaiting preparation',
      icon: Clock,
      color: 'text-yellow-600',
      alert: stats.pendingOrders > 5,
    },
    {
      title: 'Preparing',
      value: stats.preparingOrders,
      description: 'Currently cooking',
      icon: TrendingUp,
      color: 'text-blue-600',
    },
    {
      title: 'Completed',
      value: stats.completedOrders,
      description: 'Orders completed',
      icon: TrendingUp,
      color: 'text-green-600',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.title}
            className={card.alert ? 'border-yellow-500' : ''}
            data-testid="order-stats-card"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className="flex items-center gap-2">
                {card.alert && <AlertCircle className="h-4 w-4 text-yellow-600" />}
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
