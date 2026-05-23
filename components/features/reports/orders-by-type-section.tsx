/**
 * Per-order-type revenue card for the Daily Summary Report.
 *
 * Renders one row per OrderType (Sit-in / Takeaway / Pickup / Pay-now)
 * with revenue, order count, and share of total. Source is
 * `report.revenue.byOrderType` populated server-side by
 * `FinancialReportService.generateDailySummary` /
 * `generateDateRangeReport`.
 *
 * Data source uses each order's full `total` (not the partial-payment-
 * adjusted amount in `paymentBreakdown`), answering "what was sold
 * per type" rather than "what cash arrived per channel".
 */
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ORDER_TYPE_DISPLAY_ORDER,
  ORDER_TYPE_LABELS,
} from '@/lib/order-type-labels';
import type { DailySummaryReport } from '@/services/financial-report-service';

interface OrdersByTypeSectionProps {
  report: DailySummaryReport;
}

function formatCurrency(value: number): string {
  return `₦${value.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
}

export function OrdersByTypeSection({ report }: OrdersByTypeSectionProps) {
  const byType = report.revenue.byOrderType;
  const totalRevenue = ORDER_TYPE_DISPLAY_ORDER.reduce(
    (sum, t) => sum + (byType[t]?.revenue ?? 0),
    0
  );

  return (
    <Card data-testid="orders-by-type-section">
      <CardHeader>
        <CardTitle>Orders by type</CardTitle>
        <CardDescription>
          Revenue and order count split by Sit-in, Takeaway, Pickup, and
          Pay-now. Uses each order&apos;s full total, so the sum may differ
          slightly from the Payment breakdown which tracks cash received.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium text-right">Orders</th>
                <th className="pb-2 font-medium text-right">Revenue</th>
                <th className="pb-2 font-medium text-right">% of total</th>
              </tr>
            </thead>
            <tbody>
              {ORDER_TYPE_DISPLAY_ORDER.map((type) => {
                const bucket = byType[type] ?? { revenue: 0, orderCount: 0 };
                const pct =
                  totalRevenue > 0 ? (bucket.revenue / totalRevenue) * 100 : 0;
                return (
                  <tr key={type} className="border-b last:border-0">
                    <td className="py-2 font-medium">
                      {ORDER_TYPE_LABELS[type]}
                    </td>
                    <td className="py-2 text-right">{bucket.orderCount}</td>
                    <td className="py-2 text-right">
                      {formatCurrency(bucket.revenue)}
                    </td>
                    <td className="py-2 text-right text-muted-foreground">
                      {totalRevenue > 0 ? `${pct.toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t font-medium">
                <td className="pt-2">Total</td>
                <td className="pt-2 text-right">{report.metrics.orderCount}</td>
                <td className="pt-2 text-right">
                  {formatCurrency(totalRevenue)}
                </td>
                <td className="pt-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
