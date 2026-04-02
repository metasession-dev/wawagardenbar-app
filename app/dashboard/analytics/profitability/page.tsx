import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ProfitabilityDashboardClient } from '@/components/features/admin/profitability-dashboard-client';

/**
 * Loading skeleton
 */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-96" />
      <Skeleton className="h-96" />
    </div>
  );
}

/**
 * Profitability Analytics Dashboard
 */
export default async function ProfitabilityDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Profitability Analytics
        </h1>
        <p className="text-muted-foreground">
          Track revenue, costs, and profit margins across your menu items
        </p>
      </div>

      {/* Dashboard Content */}
      <Suspense fallback={<DashboardSkeleton />}>
        <ProfitabilityDashboardClient />
      </Suspense>
    </div>
  );
}
