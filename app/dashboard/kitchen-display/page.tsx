import { getOrdersAction } from '@/app/actions/admin/order-management-actions';
import { KitchenOrderGrid } from '@/components/features/kitchen/kitchen-order-grid';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/**
 * Kitchen Display — full-screen order grid for kitchen staff at a tablet.
 *
 * D9 — previously lived at `/dashboard/kitchen`; moved here so the
 * `/dashboard/kitchen` route can host the REQ-034 kitchen-management
 * hub (Recipes + Production) without breadcrumbs colliding.
 */
export default async function KitchenDisplayPage() {
  const result = await getOrdersAction(
    {
      status: 'pending,confirmed,preparing,ready',
    },
    1,
    100
  );

  const orders =
    (result.data as { orders?: unknown[] } | undefined)?.orders ?? [];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/orders">
            <Button
              variant="outline"
              size="sm"
              className="bg-gray-800 border-gray-700"
            >
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

      <KitchenOrderGrid initialOrders={orders as never} />
    </div>
  );
}
