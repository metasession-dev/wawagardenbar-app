'use client';

/**
 * @requirement REQ-076 — Per-main-category report + per-user access control
 * @requirement SRS REQ-MENUMGT-006
 *
 * Client component for /dashboard/reports/by-main-category.
 *
 * Layout mirrors the daily report (controls row → summary cards →
 * revenue/cost item tables → honesty footer) so the page reads as a
 * sibling, not a different feature. Payments + tips deliberately
 * absent — see footer note. Server gated allowed mains via
 * `getAllowedMainCategoriesForReports`; the dropdown only renders
 * slugs the session can see.
 */
import { useEffect, useMemo, useState } from 'react';
import { Calendar, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { generateMainCategoryReportAction } from '@/app/actions/reports/report-actions';
import type { MainCategoryReport } from '@/services/financial-report-service';
import {
  exportMainCategoryReportAsPDF,
  exportMainCategoryReportAsExcel,
  exportMainCategoryReportAsCSV,
} from '@/lib/report-export';

interface DateRange {
  from: Date;
  to: Date;
}

interface MainCategoryOption {
  slug: string;
  label: string;
}

interface ByMainCategoryReportClientProps {
  mainCategories: MainCategoryOption[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(amount);
}

export function ByMainCategoryReportClient({
  mainCategories,
}: ByMainCategoryReportClientProps) {
  // Auto-select the first allowed main; if only one is allowed the
  // dropdown is effectively read-only.
  const [selectedSlug, setSelectedSlug] = useState<string>(
    mainCategories[0]?.slug ?? ''
  );
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(),
    to: new Date(),
  });
  const [report, setReport] = useState<MainCategoryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedLabel = useMemo(
    () =>
      mainCategories.find((m) => m.slug === selectedSlug)?.label ??
      selectedSlug,
    [mainCategories, selectedSlug]
  );

  useEffect(() => {
    if (!selectedSlug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    generateMainCategoryReportAction(dateRange.from, dateRange.to, selectedSlug)
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          setReport(result.report);
        } else {
          setReport(null);
          setError(result.error ?? 'Failed to load report');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSlug, dateRange.from, dateRange.to]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Per-Main-Category Report
        </h1>
        <p className="text-muted-foreground">
          Revenue, costs, gross profit + items scoped to one main category at a
          time.
        </p>
      </div>

      {/* Controls row: main category + date range + exports */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="w-full md:w-64">
                <label
                  htmlFor="main-category"
                  className="text-sm text-muted-foreground"
                >
                  Main Category
                </label>
                <Select value={selectedSlug} onValueChange={setSelectedSlug}>
                  <SelectTrigger
                    id="main-category"
                    data-testid="main-category-selector"
                  >
                    <SelectValue placeholder="Select a main category" />
                  </SelectTrigger>
                  <SelectContent>
                    {mainCategories.map((m) => (
                      <SelectItem key={m.slug} value={m.slug}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-auto">
                <label className="text-sm text-muted-foreground">
                  Date range
                </label>
                <DateRangePicker
                  value={dateRange}
                  onChange={(r) => {
                    if (r && r.from && r.to) {
                      setDateRange({ from: r.from, to: r.to });
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => report && exportMainCategoryReportAsPDF(report)}
                disabled={!report}
                data-testid="export-pdf"
              >
                <Download className="mr-2 h-4 w-4" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  report && exportMainCategoryReportAsExcel(report)
                }
                disabled={!report}
                data-testid="export-excel"
              >
                <Download className="mr-2 h-4 w-4" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => report && exportMainCategoryReportAsCSV(report)}
                disabled={!report}
                data-testid="export-csv"
              >
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <div
          className="text-center py-8 text-muted-foreground"
          data-testid="loading"
        >
          Loading report…
        </div>
      )}

      {!loading && report && (
        <>
          {/* Summary cards */}
          <div
            className="grid gap-4 md:grid-cols-3 lg:grid-cols-6"
            data-testid="summary-cards"
          >
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="total-revenue">
                  {formatCurrency(report.revenue.totalRevenue)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="total-cost">
                  {formatCurrency(report.costs.totalCost)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Gross Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="gross-profit">
                  {formatCurrency(report.grossProfit)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Margin
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="margin">
                  {report.grossProfitMargin.toFixed(2)}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Items sold
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="item-count">
                  {report.revenue.itemCount}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Orders involving {selectedLabel}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="order-count">
                  {report.orderCount}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue items */}
          <Card>
            <CardHeader>
              <CardTitle>{selectedLabel} — Revenue items</CardTitle>
            </CardHeader>
            <CardContent>
              {report.revenue.items.length === 0 ? (
                <p
                  className="text-sm text-muted-foreground"
                  data-testid="revenue-empty"
                >
                  No items sold in the selected period.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit price</TableHead>
                      <TableHead className="text-right">Line total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody data-testid="revenue-table-body">
                    {report.revenue.items.map((item) => (
                      <TableRow key={item.name}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.price)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Cost items */}
          <Card>
            <CardHeader>
              <CardTitle>{selectedLabel} — Cost items</CardTitle>
            </CardHeader>
            <CardContent>
              {report.costs.items.length === 0 ? (
                <p
                  className="text-sm text-muted-foreground"
                  data-testid="cost-empty"
                >
                  No cost data for the selected period.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Cost / unit</TableHead>
                      <TableHead className="text-right">Line total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody data-testid="cost-table-body">
                    {report.costs.items.map((item) => (
                      <TableRow key={item.name}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.costPerUnit)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Honesty footer */}
          <Alert>
            <Calendar className="h-4 w-4" />
            <AlertDescription>
              Payments + tips are aggregate-only. See the Daily Report for those
              breakdowns. Order count = distinct orders containing at least one
              item from this main category; multi-main orders count toward each
              main&apos;s report, so sums won&apos;t tie out to the aggregate
              Daily Report&apos;s order count.
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
