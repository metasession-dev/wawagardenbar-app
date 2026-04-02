/**
 * @requirement REQ-019
 */
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { RestockRecommendationsClient } from '@/components/features/inventory/restock-recommendations-client';

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-20" />
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}

export default async function RestockRecommendationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Restock Recommendations
        </h1>
        <p className="text-muted-foreground">
          View suggested restock quantities based on sales velocity and current
          stock levels
        </p>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <RestockRecommendationsClient />
      </Suspense>
    </div>
  );
}
