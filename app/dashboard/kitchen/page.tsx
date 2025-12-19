import { getOrdersAction } from '@/app/actions/admin/order-management-actions';
import { KitchenOrderGrid } from '@/components/features/kitchen/kitchen-order-grid';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/**
 * Kitchen display page
 * Full-screen view for kitchen staff
 */
export default async function KitchenPage() {
  // Get active orders (pending, confirmed, preparing, ready)
  const result = await getOrdersAction(
    {
      status: 'pending,confirmed,preparing,ready',
    },
    1,
    100
  );

  const orders = (result.data as any)?.orders || [];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/orders">
            <Button variant="outline" size="sm" className="bg-gray-800 border-gray-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Kitchen Display</h1>
        </div>
        <div className="text-lg text-gray-400">
          {orders.length} Active {orders.length === 1 ? 'Order' : 'Orders'}
        </div>
      </div>

      {/* Kitchen Order Grid */}
      <KitchenOrderGrid initialOrders={orders} />
    </div>
  );
}
