import { Suspense } from 'react';
import Link from 'next/link';
import { getCurrentSession } from '@/lib/auth-middleware';
import { getOrdersAction } from '@/app/actions/admin/order-management-actions';
import { OrderQueue } from '@/components/features/admin/order-queue';
import { OrderStats } from '@/components/features/admin/order-stats';
import { CreateTabDialog } from '@/components/features/admin/tabs/create-tab-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  ChefHat, 
  BarChart3, 
  Receipt, 
  ArrowRight, 
  ShoppingBag, 
  PlusCircle, 
  FilePlus 
} from 'lucide-react';

/**
 * Loading skeletons
 */
function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="mt-2 h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function QueueSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Orders dashboard page
 * Main order management interface
 */
export default async function OrdersPage() {
  const session = await getCurrentSession();
  const isSuperAdmin = session?.role === 'super-admin';

  const result = await getOrdersAction({}, 1, 50);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders Dashboard</h1>
          <p className="text-muted-foreground">
            Manage and track all restaurant orders
          </p>
        </div>
      </div>

      {/* Main Dashboard Views - Large & Prominent */}
      <div className="grid gap-6 md:grid-cols-3">
        <Link href="/dashboard/orders/tabs">
          <Card className="hover:bg-accent/50 transition-all hover:shadow-md cursor-pointer h-full border-t-4 border-t-blue-500 group">
            <CardHeader className="space-y-4 py-8">
              <CardTitle className="flex flex-col items-center text-2xl text-center gap-4">
                <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900/30 group-hover:scale-110 transition-transform">
                  <Receipt className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                </div>
                Tabs Display
              </CardTitle>
              <CardDescription className="text-center text-base">
                View all open tabs, process payments, and manage tables.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dashboard/kitchen">
          <Card className="hover:bg-accent/50 transition-all hover:shadow-md cursor-pointer h-full border-t-4 border-t-orange-500 group">
            <CardHeader className="space-y-4 py-8">
              <CardTitle className="flex flex-col items-center text-2xl text-center gap-4">
                <div className="p-4 rounded-full bg-orange-100 dark:bg-orange-900/30 group-hover:scale-110 transition-transform">
                  <ChefHat className="h-10 w-10 text-orange-600 dark:text-orange-400" />
                </div>
                Kitchen Display
              </CardTitle>
              <CardDescription className="text-center text-base">
                Real-time specialized view for kitchen staff to fulfill orders.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        {isSuperAdmin && (
          <Link href="/dashboard/orders/analytics">
            <Card className="hover:bg-accent/50 transition-all hover:shadow-md cursor-pointer h-full border-t-4 border-t-green-500 group">
              <CardHeader className="space-y-4 py-8">
                <CardTitle className="flex flex-col items-center text-2xl text-center gap-4">
                  <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30 group-hover:scale-110 transition-transform">
                    <BarChart3 className="h-10 w-10 text-green-600 dark:text-green-400" />
                  </div>
                  Analytics
                </CardTitle>
                <CardDescription className="text-center text-base">
                  View detailed sales performance, revenue, and order trends.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        )}
      </div>

      {/* Order Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {/* Open a Order */}
          <Link href="/menu">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full border-l-4 border-l-purple-500">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <ShoppingBag className="h-5 w-5 mr-2 text-purple-500" />
                  Open a Order
                  <ArrowRight className="ml-auto h-4 w-4 opacity-50" />
                </CardTitle>
                <CardDescription>
                  Start a new takeaway or quick order for a customer.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          {/* Open a New Tab */}
          <CreateTabDialog 
            trigger={
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full border-l-4 border-l-indigo-500 w-full text-left">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <PlusCircle className="h-5 w-5 mr-2 text-indigo-500" />
                    Open a New Tab
                    <ArrowRight className="ml-auto h-4 w-4 opacity-50" />
                  </CardTitle>
                  <CardDescription>
                    Create a new tab for a table. Cannot be created for existing tables.
                  </CardDescription>
                </CardHeader>
              </Card>
            }
          />

          {/* Add to Existing Tab */}
          <Link href="/dashboard/orders/tabs">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full border-l-4 border-l-cyan-500">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <FilePlus className="h-5 w-5 mr-2 text-cyan-500" />
                  Add to Existing Tab
                  <ArrowRight className="ml-auto h-4 w-4 opacity-50" />
                </CardTitle>
                <CardDescription>
                  Find an open tab to add new orders to it.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <Suspense fallback={<StatsSkeleton />}>
        <OrderStats />
      </Suspense>

      {/* Order Queue */}
      <Suspense fallback={<QueueSkeleton />}>
        <OrderQueue initialOrders={(result.data as any)?.orders || []} />
      </Suspense>
    </div>
  );
}
