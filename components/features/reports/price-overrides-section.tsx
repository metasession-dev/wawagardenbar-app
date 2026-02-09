'use client';

import { useState, useEffect } from 'react';
import { PriceOverrideAnalytics } from '@/components/features/admin/reports/price-override-analytics';
import { Card, CardContent } from '@/components/ui/card';
import { getPriceOverrideAnalyticsAction } from '@/app/actions/reports/price-override-actions';
import type {
  PriceOverrideMetrics,
  OverrideByReason,
  OverrideByStaff,
  OverrideTrend,
} from '@/services/price-override-analytics-service';

interface PriceOverridesSectionProps {
  dateRange: {
    from: Date;
    to: Date;
  };
}

export function PriceOverridesSection({ dateRange }: PriceOverridesSectionProps) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<PriceOverrideMetrics | null>(null);
  const [byReason, setByReason] = useState<OverrideByReason[]>([]);
  const [byStaff, setByStaff] = useState<OverrideByStaff[]>([]);
  const [trend, setTrend] = useState<OverrideTrend[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOverrideData();
  }, [dateRange]);

  const loadOverrideData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getPriceOverrideAnalyticsAction(dateRange.from, dateRange.to);

      if (result.success && result.data) {
        setMetrics(result.data.metrics);
        setByReason(result.data.byReason);
        setByStaff(result.data.byStaff);
        setTrend(result.data.trend);
      } else {
        setError(result.error || 'Failed to load price override data');
      }
    } catch (error) {
      console.error('Failed to load override data:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading price override analytics...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-destructive">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            No price override data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <PriceOverrideAnalytics
      metrics={metrics}
      byReason={byReason}
      byStaff={byStaff}
      trend={trend}
    />
  );
}
