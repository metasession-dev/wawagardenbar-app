import { Suspense } from 'react';
import Link from 'next/link';
import { Plus, BarChart3, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RewardStatsCards, RewardCharts } from '@/components/features/admin/rewards';
import { PointsConversionSettings } from '@/components/features/admin/rewards/points-conversion-settings';
import {
  getRewardStatisticsAction,
  getRewardsIssuedOverTimeAction,
  getRewardsByTypeAction,
  getTopPerformingRulesAction,
} from '@/app/actions/admin/reward-analytics-actions';

/**
 * Rewards statistics section
 */
async function RewardsStats() {
  const result = await getRewardStatisticsAction();

  if (!result.success || !result.data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Failed to load statistics
          </p>
        </CardContent>
      </Card>
    );
  }

  return <RewardStatsCards stats={result.data} />;
}

/**
 * Rewards analytics charts section
 */
async function RewardsAnalytics() {
  const [overTimeResult, byTypeResult, topRulesResult] = await Promise.all([
    getRewardsIssuedOverTimeAction(30),
    getRewardsByTypeAction(),
    getTopPerformingRulesAction(10),
  ]);

  if (!overTimeResult.success || !byTypeResult.success || !topRulesResult.success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Failed to load analytics data
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <RewardCharts
      overTimeData={overTimeResult.data || []}
      byTypeData={byTypeResult.data || []}
      topRulesData={topRulesResult.data || []}
    />
  );
}

/**
 * Loading skeleton for stats
 */
function StatsLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * Rewards dashboard page
 */
export default async function RewardsDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rewards Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage reward rules and track redemptions
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/rewards/issued">
              <BarChart3 className="mr-2 h-4 w-4" />
              View Issued Rewards
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/rewards/issue">
              <Gift className="mr-2 h-4 w-4" />
              Issue Reward
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/rewards/rules/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Rule
            </Link>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <Suspense fallback={<StatsLoading />}>
        <RewardsStats />
      </Suspense>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
          <Link href="/dashboard/rewards/rules">
            <CardHeader>
              <CardTitle className="text-lg">Reward Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create, edit, and manage reward rules
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
          <Link href="/dashboard/rewards/issue">
            <CardHeader>
              <CardTitle className="text-lg">Issue Reward</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manually issue rewards to customers
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
          <Link href="/dashboard/rewards/issued">
            <CardHeader>
              <CardTitle className="text-lg">Issued Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Track and manage issued rewards
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
          <Link href="/dashboard/rewards/templates">
            <CardHeader>
              <CardTitle className="text-lg">Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Use pre-configured reward templates
              </p>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* Points Conversion Settings */}
      <PointsConversionSettings />

      {/* Analytics & Charts */}
      <Suspense fallback={<StatsLoading />}>
        <RewardsAnalytics />
      </Suspense>
    </div>
  );
}
