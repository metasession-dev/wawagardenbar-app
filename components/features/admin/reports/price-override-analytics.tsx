'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DollarSign, TrendingDown, TrendingUp, Users, FileText, AlertCircle } from 'lucide-react';
import {
  PriceOverrideMetrics,
  OverrideByReason,
  OverrideByStaff,
  OverrideTrend,
} from '@/services/price-override-analytics-service';

interface PriceOverrideAnalyticsProps {
  metrics: PriceOverrideMetrics;
  byReason: OverrideByReason[];
  byStaff: OverrideByStaff[];
  trend: OverrideTrend[];
}

export function PriceOverrideAnalytics({
  metrics,
  byReason,
  byStaff,
  trend,
}: PriceOverrideAnalyticsProps) {
  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Overrides</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalOverrides}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.overrideRate.toFixed(1)}% of orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Impact</CardTitle>
            {metrics.totalImpact >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              metrics.totalImpact >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(metrics.totalImpact)}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg: {formatCurrency(metrics.averageImpact)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Lost</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(metrics.totalRevenueLost)}
            </div>
            <p className="text-xs text-muted-foreground">From discounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Gained</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(metrics.totalRevenueGained)}
            </div>
            <p className="text-xs text-muted-foreground">From markups</p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown by Reason */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <CardTitle>Overrides by Reason</CardTitle>
          </div>
          <CardDescription>
            Breakdown of price overrides by reason provided
          </CardDescription>
        </CardHeader>
        <CardContent>
          {byReason.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No price overrides recorded
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Total Impact</TableHead>
                    <TableHead className="text-right">Avg Impact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byReason.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.reason}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{item.count}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={item.totalImpact >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(item.totalImpact)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={item.averageImpact >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(item.averageImpact)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Breakdown by Staff */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Overrides by Staff Member</CardTitle>
          </div>
          <CardDescription>
            Staff members who performed price overrides
          </CardDescription>
        </CardHeader>
        <CardContent>
          {byStaff.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No staff overrides recorded
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Total Impact</TableHead>
                    <TableHead className="text-right">Avg Impact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byStaff.map((item) => (
                    <TableRow key={item.staffId}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.staffName}</p>
                          <p className="text-xs text-muted-foreground">{item.staffEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{item.count}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={item.totalImpact >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(item.totalImpact)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={item.averageImpact >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(item.averageImpact)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trend Analysis */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <CardTitle>Override Trend</CardTitle>
          </div>
          <CardDescription>
            Daily breakdown of price overrides
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trend.length === 0 || trend.every(t => t.count === 0) ? (
            <div className="text-center py-8 text-muted-foreground">
              No override trend data available
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Discounts</TableHead>
                    <TableHead className="text-right">Markups</TableHead>
                    <TableHead className="text-right">Impact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trend.filter(t => t.count > 0).map((item) => (
                    <TableRow key={item.date}>
                      <TableCell className="font-medium">
                        {new Date(item.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{item.count}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive">{item.discounts}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="default" className="bg-green-600">{item.markups}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={item.totalImpact >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(item.totalImpact)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profit Impact Alert */}
      {metrics.totalImpact < -10000 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-900">Profit Impact Alert</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-800">
              Price overrides have resulted in a significant revenue loss of{' '}
              <strong>{formatCurrency(Math.abs(metrics.totalImpact))}</strong> during this period.
              Consider reviewing override policies and staff training.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
