'use client';

import { useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { History, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getPriceHistoryAction } from '@/app/actions/admin/price-management-actions';

interface PriceHistoryViewerProps {
  menuItemId: string;
  menuItemName: string;
}

export interface PriceHistoryViewerRef {
  refresh: () => void;
}

interface PriceHistoryRecord {
  _id: string;
  menuItemId: string;
  price: number;
  costPerUnit: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  reason?: string;
  changedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

const REASON_LABELS: Record<string, string> = {
  supplier_increase: 'Supplier Price Increase',
  supplier_decrease: 'Supplier Price Decrease',
  promotion: 'Promotional Pricing',
  seasonal: 'Seasonal Adjustment',
  market_adjustment: 'Market Adjustment',
  cost_optimization: 'Cost Optimization',
  initial_price: 'Initial Price',
  manual_adjustment: 'Manual Adjustment',
};

export const PriceHistoryViewer = forwardRef<PriceHistoryViewerRef, PriceHistoryViewerProps>(
  function PriceHistoryViewer({ menuItemId, menuItemName }, ref) {
    const [history, setHistory] = useState<PriceHistoryRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    async function fetchHistory() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getPriceHistoryAction(menuItemId, 20);

        if (result.success && result.data) {
          setHistory(result.data as unknown as PriceHistoryRecord[]);
        } else {
          setError(result.error || 'Failed to load price history');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    useEffect(() => {
      fetchHistory();
    }, [menuItemId]);

    // Expose refresh method to parent
    useImperativeHandle(ref, () => ({
      refresh: fetchHistory,
    }));

  function getPriceChangeIcon(currentPrice: number, previousPrice?: number) {
    if (!previousPrice) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (currentPrice > previousPrice)
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (currentPrice < previousPrice)
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }

  function getPriceChangeBadge(currentPrice: number, previousPrice?: number) {
    if (!previousPrice) return null;
    const change = currentPrice - previousPrice;
    const percentChange = (change / previousPrice) * 100;

    if (change === 0) return null;

    return (
      <Badge variant={change > 0 ? 'default' : 'destructive'} className="ml-2">
        {change > 0 ? '+' : ''}₦{change.toFixed(2)} ({percentChange > 0 ? '+' : ''}
        {percentChange.toFixed(1)}%)
      </Badge>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Price History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Price History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Price History
          </CardTitle>
          <CardDescription>Price change history for {menuItemName}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No price history available yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Price History
        </CardTitle>
        <CardDescription>
          Price change history for {menuItemName} ({history.length} record
          {history.length !== 1 ? 's' : ''})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((record, index) => {
            const previousRecord = history[index + 1];
            const margin = record.price > 0 ? ((record.price - record.costPerUnit) / record.price) * 100 : 0;
            const isCurrent = !record.effectiveTo;

            return (
              <div
                key={record._id}
                className={`p-4 rounded-lg border ${
                  isCurrent
                    ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                    : 'bg-muted/50'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getPriceChangeIcon(record.price, previousRecord?.price)}
                    <div>
                      <p className="font-semibold">
                        ₦{record.price.toLocaleString()}
                        {getPriceChangeBadge(record.price, previousRecord?.price)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(record.effectiveFrom).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {isCurrent && (
                    <Badge variant="default" className="bg-blue-600">
                      Current
                    </Badge>
                  )}
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Cost Per Unit</p>
                    <p className="font-medium">₦{record.costPerUnit.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Profit Margin</p>
                    <p className="font-medium">{margin.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Reason</p>
                    <p className="font-medium">
                      {record.reason ? REASON_LABELS[record.reason] || record.reason : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Changed By</p>
                    <p className="font-medium">
                      {record.changedBy
                        ? `${record.changedBy.firstName} ${record.changedBy.lastName}`
                        : 'System'}
                    </p>
                  </div>
                </div>

                {/* Effective Period */}
                {!isCurrent && record.effectiveTo && (
                  <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                    Effective until: {new Date(record.effectiveTo).toLocaleString()}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        {history.length > 1 && (
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm font-semibold mb-3">Summary</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Changes</p>
                <p className="font-bold text-lg">{history.length - 1}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Highest Price</p>
                <p className="font-bold text-lg">
                  ₦{Math.max(...history.map((h) => h.price)).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Lowest Price</p>
                <p className="font-bold text-lg">
                  ₦{Math.min(...history.map((h) => h.price)).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg Margin</p>
                <p className="font-bold text-lg">
                  {(
                    history.reduce((sum, h) => {
                      const m = h.price > 0 ? ((h.price - h.costPerUnit) / h.price) * 100 : 0;
                      return sum + m;
                    }, 0) / history.length
                  ).toFixed(1)}
                  %
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
  }
);
