'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, BarChart3 } from 'lucide-react';
import type { ProfitabilityReport } from '@/services/profitability-analytics-service';

interface ProfitabilityChartsProps {
  report: ProfitabilityReport | null;
  isLoading: boolean;
}

export function ProfitabilityCharts({ report, isLoading }: ProfitabilityChartsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const { trends, byOrderType } = report;

  // Calculate max values for scaling
  const maxRevenue = Math.max(...trends.daily.map((d) => d.revenue));
  const maxCost = Math.max(...trends.daily.map((d) => d.costs));
  const maxProfit = Math.max(...trends.daily.map((d) => d.profit));
  const maxValue = Math.max(maxRevenue, maxCost, maxProfit);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Revenue vs Cost vs Profit Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            Revenue vs Cost vs Profit
          </CardTitle>
          <CardDescription>Daily trends over the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {trends.daily.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No data available for the selected period
              </p>
            ) : (
              <div className="space-y-2">
                {trends.daily.slice(-14).map((day) => {
                  const revenueWidth = maxValue > 0 ? (day.revenue / maxValue) * 100 : 0;
                  const costWidth = maxValue > 0 ? (day.costs / maxValue) * 100 : 0;
                  const profitWidth = maxValue > 0 ? (day.profit / maxValue) * 100 : 0;

                  return (
                    <div key={day.date} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {new Date(day.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span className="font-medium">₦{day.revenue.toLocaleString()}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-16 text-xs text-muted-foreground">Revenue</div>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500"
                              style={{ width: `${revenueWidth}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 text-xs text-muted-foreground">Cost</div>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-red-500"
                              style={{ width: `${costWidth}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 text-xs text-muted-foreground">Profit</div>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500"
                              style={{ width: `${profitWidth}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order Type Profitability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Profitability by Order Type
          </CardTitle>
          <CardDescription>Compare performance across order types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {byOrderType.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No data available for the selected period
              </p>
            ) : (
              byOrderType.map((type) => {
                const maxTypeRevenue = Math.max(...byOrderType.map((t) => t.totalRevenue));
                const width = maxTypeRevenue > 0 ? (type.totalRevenue / maxTypeRevenue) * 100 : 0;

                return (
                  <div key={type.orderType} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium capitalize">{type.orderType}</p>
                        <p className="text-xs text-muted-foreground">
                          {type.orderCount} orders · Avg: ₦
                          {type.averageOrderValue.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">₦{type.totalRevenue.toLocaleString()}</p>
                        <p className="text-xs text-green-600">{type.profitMargin.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
