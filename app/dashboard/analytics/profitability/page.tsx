import { Suspense } from 'react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight } from 'lucide-react';
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
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground">
          Dashboard
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/dashboard/analytics" className="hover:text-foreground">
          Analytics
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Profitability</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profitability Analytics</h1>
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
