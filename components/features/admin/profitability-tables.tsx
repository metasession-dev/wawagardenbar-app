'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import {
  getTopProfitableItemsAction,
  getItemsWithDecliningMarginsAction,
} from '@/app/actions/admin/profitability-analytics-actions';
import type { ProfitabilityReport, ItemProfitability } from '@/services/profitability-analytics-service';

interface ProfitabilityTablesProps {
  dateRange: { startDate: string; endDate: string };
  report: ProfitabilityReport | null;
  isLoading: boolean;
}

export function ProfitabilityTables({ dateRange, report, isLoading }: ProfitabilityTablesProps) {
  const [topItems, setTopItems] = useState<ItemProfitability[]>([]);
  const [lowMarginItems, setLowMarginItems] = useState<ItemProfitability[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(true);

  useEffect(() => {
    async function fetchTableData() {
      setIsLoadingTables(true);

      try {
        const [topResult, lowResult] = await Promise.all([
          getTopProfitableItemsAction(dateRange.startDate, dateRange.endDate, 10),
          getItemsWithDecliningMarginsAction(20),
        ]);

        if (topResult.success && topResult.data) {
          setTopItems(topResult.data);
        }

        if (lowResult.success && lowResult.data) {
          setLowMarginItems(lowResult.data);
        }
      } catch (error) {
        console.error('Error fetching table data:', error);
      } finally {
        setIsLoadingTables(false);
      }
    }

    fetchTableData();
  }, [dateRange]);

  if (isLoading || isLoadingTables) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Profitable Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Top 10 Profitable Items
          </CardTitle>
          <CardDescription>Best performing menu items by gross profit</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No data available for the selected period
              </p>
            ) : (
              topItems.map((item, index) => (
                <div
                  key={item.menuItemId}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.orderCount} orders · ₦{item.totalRevenue.toLocaleString()} revenue
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">₦{item.grossProfit.toLocaleString()}</p>
                    <Badge variant="secondary" className="text-xs">
                      {item.profitMargin.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Low Margin Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Low Margin Items (&lt; 20%)
          </CardTitle>
          <CardDescription>Items that need pricing review</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {lowMarginItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                All items have healthy profit margins! 🎉
              </p>
            ) : (
              lowMarginItems.map((item) => {
                const marginColor =
                  item.profitMargin < 10
                    ? 'text-red-600'
                    : item.profitMargin < 15
                    ? 'text-orange-600'
                    : 'text-yellow-600';

                return (
                  <div
                    key={item.menuItemId}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <TrendingDown className={`h-5 w-5 ${marginColor}`} />
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.orderCount} orders · ₦{item.totalCost.toLocaleString()} cost
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${marginColor}`}>{item.profitMargin.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">
                        ₦{item.grossProfit.toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* By Item Summary (from report) */}
      {report && report.byItem.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>All Items Performance</CardTitle>
            <CardDescription>Complete breakdown of all menu items in the period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Item</th>
                    <th className="text-right p-2 font-medium">Orders</th>
                    <th className="text-right p-2 font-medium">Revenue</th>
                    <th className="text-right p-2 font-medium">Cost</th>
                    <th className="text-right p-2 font-medium">Profit</th>
                    <th className="text-right p-2 font-medium">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byItem.slice(0, 20).map((item) => (
                    <tr key={item.menuItemId} className="border-b hover:bg-accent/50">
                      <td className="p-2 font-medium">{item.name}</td>
                      <td className="text-right p-2">{item.orderCount}</td>
                      <td className="text-right p-2">₦{item.totalRevenue.toLocaleString()}</td>
                      <td className="text-right p-2">₦{item.totalCost.toLocaleString()}</td>
                      <td className="text-right p-2 text-green-600">
                        ₦{item.grossProfit.toLocaleString()}
                      </td>
                      <td className="text-right p-2">
                        <Badge
                          variant={item.profitMargin < 20 ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {item.profitMargin.toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
