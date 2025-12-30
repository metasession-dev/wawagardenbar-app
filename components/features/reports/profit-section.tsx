import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { DailySummaryReport } from '@/services/financial-report-service';

interface ProfitSectionProps {
  report: DailySummaryReport;
}

export function ProfitSection({ report }: ProfitSectionProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const isProfit = report.netProfit >= 0;

  return (
    <div className="space-y-6">
      {/* Profit Flow */}
      <Card>
        <CardHeader>
          <CardTitle>Profit & Loss Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Revenue */}
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2">
                <span className="font-semibold">Total Revenue</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(report.revenue.totalRevenue)}
                </span>
              </div>
              <div className="pl-4 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>• Food Revenue</span>
                  <span>{formatCurrency(report.revenue.food.totalRevenue)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>• Drink Revenue</span>
                  <span>{formatCurrency(report.revenue.drink.totalRevenue)}</span>
                </div>
              </div>
            </div>

            {/* Less: COGS */}
            <div className="border-t pt-2">
              <div className="flex justify-between items-center py-2">
                <span className="font-semibold">Less: Cost of Goods Sold</span>
                <span className="text-lg font-bold text-orange-600">
                  ({formatCurrency(report.costs.totalDirectCosts)})
                </span>
              </div>
              <div className="pl-4 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>• Food Costs</span>
                  <span>({formatCurrency(report.costs.food.totalCost)})</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>• Drink Costs</span>
                  <span>({formatCurrency(report.costs.drink.totalCost)})</span>
                </div>
              </div>
            </div>

            {/* Gross Profit */}
            <div className="border-t-2 border-green-500 pt-3 bg-green-50 dark:bg-green-950 -mx-6 px-6 py-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-lg font-bold">Gross Profit</span>
                  <div className="text-sm text-muted-foreground">
                    {report.metrics.grossProfitMargin.toFixed(1)}% margin
                  </div>
                </div>
                <span className="text-2xl font-bold text-green-600">
                  {formatCurrency(report.grossProfit.total)}
                </span>
              </div>
            </div>

            {/* Less: Operating Overhead */}
            <div className="border-t pt-2">
              <div className="flex justify-between items-center py-2">
                <span className="font-semibold">Less: Operating Overhead</span>
                <span className="text-lg font-bold text-red-600">
                  ({formatCurrency(report.operatingExpenses.totalOperatingExpenses)})
                </span>
              </div>
              <div className="pl-4 space-y-1 text-sm text-muted-foreground">
                <p>Includes Rent, Salaries, Utilities, Maintenance, etc.</p>
                <p className="text-xs italic mt-1">
                  * Ingredient purchases (Direct Costs) are excluded here as they are captured in COGS.
                </p>
              </div>
            </div>

            {/* Net Profit/Loss */}
            <div className={`border-t-2 pt-3 -mx-6 px-6 py-4 ${
              isProfit 
                ? 'border-green-500 bg-green-50 dark:bg-green-950' 
                : 'border-red-500 bg-red-50 dark:bg-red-950'
            }`}>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {isProfit ? (
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  )}
                  <div>
                    <span className="text-xl font-bold">
                      {isProfit ? 'Net Profit' : 'Net Loss'}
                    </span>
                    <div className="text-sm text-muted-foreground">
                      {report.metrics.netProfitMargin.toFixed(1)}% margin
                    </div>
                  </div>
                </div>
                <span className={`text-3xl font-bold ${
                  isProfit ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(Math.abs(report.netProfit))}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Food Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Food Category Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Revenue</span>
                <span className="font-semibold">{formatCurrency(report.revenue.food.totalRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Cost</span>
                <span className="font-semibold">({formatCurrency(report.costs.food.totalCost)})</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold">Gross Profit</span>
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(report.grossProfit.food)}
                  </span>
                </div>
                <div className="text-right text-xs text-muted-foreground mt-1">
                  {report.revenue.food.totalRevenue > 0
                    ? ((report.grossProfit.food / report.revenue.food.totalRevenue) * 100).toFixed(1)
                    : '0.0'}% margin
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Drink Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Drink Category Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Revenue</span>
                <span className="font-semibold">{formatCurrency(report.revenue.drink.totalRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Cost</span>
                <span className="font-semibold">({formatCurrency(report.costs.drink.totalCost)})</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold">Gross Profit</span>
                  <span className="text-lg font-bold text-blue-600">
                    {formatCurrency(report.grossProfit.drink)}
                  </span>
                </div>
                <div className="text-right text-xs text-muted-foreground mt-1">
                  {report.revenue.drink.totalRevenue > 0
                    ? ((report.grossProfit.drink / report.revenue.drink.totalRevenue) * 100).toFixed(1)
                    : '0.0'}% margin
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Insights */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">Key Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="font-semibold min-w-[120px]">Performance:</span>
              <span className={isProfit ? 'text-green-600' : 'text-red-600'}>
                {isProfit 
                  ? `✓ Profitable day with ${report.metrics.netProfitMargin.toFixed(1)}% net margin`
                  : `✗ Loss of ${formatCurrency(Math.abs(report.netProfit))} - review expenses`
                }
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold min-w-[120px]">Best Category:</span>
              <span>
                {report.grossProfit.food > report.grossProfit.drink ? 'Food' : 'Drink'} 
                {' '}(
                {formatCurrency(Math.max(report.grossProfit.food, report.grossProfit.drink))} gross profit)
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold min-w-[120px]">Orders:</span>
              <span>{report.metrics.orderCount} orders processed</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold min-w-[120px]">Avg Order Value:</span>
              <span>
                {report.metrics.orderCount > 0
                  ? formatCurrency(report.revenue.totalRevenue / report.metrics.orderCount)
                  : formatCurrency(0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
