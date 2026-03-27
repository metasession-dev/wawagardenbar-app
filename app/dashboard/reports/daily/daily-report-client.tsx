'use client';

import { useState, useEffect } from 'react';
import { subDays } from 'date-fns';
import { Calendar, Download, TrendingUp, TrendingDown, DollarSign, Banknote, CreditCard, Building2, Smartphone, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateDailyReportAction, generateDateRangeReportAction } from '@/app/actions/reports/report-actions';
import type { DailySummaryReport } from '@/services/financial-report-service';
import { RevenueSection } from '@/components/features/reports/revenue-section';
import { CostSection } from '@/components/features/reports/cost-section';
import { ProfitSection } from '@/components/features/reports/profit-section';
import { ExpensesSection } from '@/components/features/reports/expenses-section';
import { PriceOverridesSection } from '@/components/features/reports/price-overrides-section';
import { ReportCharts } from '@/components/features/reports/report-charts';
import { exportReportAsPDF, exportReportAsExcel, exportReportAsCSV } from '@/lib/report-export';

interface DateRange {
  from: Date;
  to: Date;
}

export function DailyReportClient() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(),
    to: new Date(),
  });
  const [report, setReport] = useState<DailySummaryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'single' | 'range'>('single');

  // Load report on mount and when date changes
  useEffect(() => {
    loadReport();
  }, [dateRange, reportType]);

  const loadReport = async () => {
    setLoading(true);
    setError(null);

    try {
      let result;
      
      if (reportType === 'single') {
        result = await generateDailyReportAction(dateRange.from);
      } else {
        result = await generateDateRangeReportAction(dateRange.from, dateRange.to);
      }

      if (result.success && result.report) {
        setReport(result.report);
      } else {
        setError(result.error || 'Failed to load report');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      console.error('Report error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDate = (days: number) => {
    const date = days === 0 ? new Date() : subDays(new Date(), days);
    setDateRange({ from: date, to: date });
    setReportType('single');
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    if (!report) {
      alert('No report data to export');
      return;
    }

    try {
      switch (format) {
        case 'pdf':
          exportReportAsPDF(report, reportType);
          break;
        case 'excel':
          exportReportAsExcel(report, reportType);
          break;
        case 'csv':
          exportReportAsCSV(report, reportType);
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export report. Please try again.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header with Date Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Daily Financial Report</h2>
          <p className="text-muted-foreground">
            Comprehensive financial analysis and insights
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickDate(0)}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickDate(1)}
          >
            Yesterday
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDateRange({
                from: subDays(new Date(), 7),
                to: new Date(),
              });
              setReportType('range');
            }}
          >
            Last 7 Days
          </Button>
        </div>
      </div>

      {/* Date Range Picker */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Report Period:</span>
            </div>
            
            <Tabs value={reportType} onValueChange={(v) => setReportType(v as 'single' | 'range')}>
              <TabsList>
                <TabsTrigger value="single">Single Day</TabsTrigger>
                <TabsTrigger value="range">Date Range</TabsTrigger>
              </TabsList>
            </Tabs>

            <DateRangePicker
              value={dateRange}
              onChange={(range) => {
                if (range && range.from && range.to) {
                  setDateRange({ from: range.from, to: range.to });
                }
              }}
            />

            <Button onClick={loadReport} disabled={loading}>
              {loading ? 'Loading...' : 'Generate Report'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Generating report...</p>
          </div>
        </div>
      )}

      {/* Report Content */}
      {!loading && report && (
        <>
          {/* Key Metrics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Revenue */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(report.revenue.totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {report.metrics.orderCount} orders
                </p>
              </CardContent>
            </Card>

            {/* Gross Profit */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(report.grossProfit.total)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {report.metrics.grossProfitMargin.toFixed(1)}% margin
                </p>
              </CardContent>
            </Card>

            {/* Operating Expenses */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Operating Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(report.operatingExpenses.totalExpenses)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {report.operatingExpenses.directCosts.length + report.operatingExpenses.operatingCosts.length} expenses
                </p>
              </CardContent>
            </Card>

            {/* Net Profit */}
            <Card className={report.netProfit >= 0 ? 'border-green-500' : 'border-red-500'}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                {report.netProfit >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${report.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(report.netProfit)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {report.metrics.netProfitMargin.toFixed(1)}% margin
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Payment Breakdown */}
          {report.paymentBreakdown && (report.metrics.orderCount > 0 || report.paymentBreakdown.total > 0) && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Revenue by Payment Method</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {report.paymentBreakdown.cash > 0 && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Cash</CardTitle>
                      <Banknote className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(report.paymentBreakdown.cash)}</div>
                      <p className="text-xs text-muted-foreground">
                        {((report.paymentBreakdown.cash / (report.paymentBreakdown.total || 1)) * 100).toFixed(1)}% of total
                      </p>
                    </CardContent>
                  </Card>
                )}
                {report.paymentBreakdown.card > 0 && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">POS / Card</CardTitle>
                      <CreditCard className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(report.paymentBreakdown.card)}</div>
                      <p className="text-xs text-muted-foreground">
                        {((report.paymentBreakdown.card / (report.paymentBreakdown.total || 1)) * 100).toFixed(1)}% of total
                      </p>
                    </CardContent>
                  </Card>
                )}
                {report.paymentBreakdown.transfer > 0 && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Transfer</CardTitle>
                      <Building2 className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(report.paymentBreakdown.transfer)}</div>
                      <p className="text-xs text-muted-foreground">
                        {((report.paymentBreakdown.transfer / (report.paymentBreakdown.total || 1)) * 100).toFixed(1)}% of total
                      </p>
                    </CardContent>
                  </Card>
                )}
                {report.paymentBreakdown.ussd > 0 && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">USSD</CardTitle>
                      <Phone className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(report.paymentBreakdown.ussd)}</div>
                      <p className="text-xs text-muted-foreground">
                        {((report.paymentBreakdown.ussd / (report.paymentBreakdown.total || 1)) * 100).toFixed(1)}% of total
                      </p>
                    </CardContent>
                  </Card>
                )}
                {report.paymentBreakdown.phone > 0 && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Phone</CardTitle>
                      <Smartphone className="h-4 w-4 text-teal-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(report.paymentBreakdown.phone)}</div>
                      <p className="text-xs text-muted-foreground">
                        {((report.paymentBreakdown.phone / (report.paymentBreakdown.total || 1)) * 100).toFixed(1)}% of total
                      </p>
                    </CardContent>
                  </Card>
                )}
                {report.paymentBreakdown.unspecified > 0 && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Unspecified</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(report.paymentBreakdown.unspecified)}</div>
                      <p className="text-xs text-muted-foreground">
                        {((report.paymentBreakdown.unspecified / (report.paymentBreakdown.total || 1)) * 100).toFixed(1)}% of total
                      </p>
                    </CardContent>
                  </Card>
                )}
                {report.paymentBreakdown.total === 0 && (
                  <Card className="col-span-full">
                    <CardContent className="py-6 text-center text-muted-foreground">
                      Payment method data not available for these orders. Orders may have been recorded without specifying a payment method.
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Export Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Detailed Sections */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="costs">Costs</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="overrides">Price Overrides</TabsTrigger>
              <TabsTrigger value="charts">Charts</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <ProfitSection report={report} />
            </TabsContent>

            <TabsContent value="revenue" className="space-y-4">
              <RevenueSection report={report} />
            </TabsContent>

            <TabsContent value="costs" className="space-y-4">
              <CostSection report={report} />
            </TabsContent>

            <TabsContent value="expenses" className="space-y-4">
              <ExpensesSection report={report} />
            </TabsContent>

            <TabsContent value="overrides" className="space-y-4">
              <PriceOverridesSection dateRange={dateRange} />
            </TabsContent>

            <TabsContent value="charts" className="space-y-4">
              <ReportCharts report={report} />
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Empty State */}
      {!loading && !report && !error && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Report Generated</h3>
              <p className="text-muted-foreground mb-4">
                Select a date and click "Generate Report" to view financial data
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
