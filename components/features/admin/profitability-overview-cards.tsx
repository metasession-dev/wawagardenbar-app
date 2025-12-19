'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingUp, TrendingDown, Percent } from 'lucide-react';
import type { ProfitabilityReport } from '@/services/profitability-analytics-service';

interface ProfitabilityOverviewCardsProps {
  report: ProfitabilityReport | null;
  isLoading: boolean;
}

export function ProfitabilityOverviewCards({ report, isLoading }: ProfitabilityOverviewCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const { summary } = report;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Revenue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₦{summary.totalRevenue.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {summary.orderCount} order{summary.orderCount !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Total Costs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₦{summary.totalCosts.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Avg: ₦{summary.orderCount > 0 ? (summary.totalCosts / summary.orderCount).toFixed(0) : 0}/order
          </p>
        </CardContent>
      </Card>

      {/* Gross Profit */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            ₦{summary.grossProfit.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            Avg: ₦{summary.averageOrderProfit.toFixed(0)}/order
          </p>
        </CardContent>
      </Card>

      {/* Profit Margin */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.profitMargin.toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">
            {summary.profitMargin >= 30 ? 'Excellent' : summary.profitMargin >= 20 ? 'Good' : 'Needs improvement'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
