'use client';

import { useState, useEffect } from 'react';
import { subDays } from 'date-fns';
import { ProfitabilityOverviewCards } from './profitability-overview-cards';
import { ProfitabilityFilters } from './profitability-filters';
import { ProfitabilityCharts } from './profitability-charts';
import { ProfitabilityTables } from './profitability-tables';
import { getProfitabilityReportAction } from '@/app/actions/admin/profitability-analytics-actions';
import type { ProfitabilityReport } from '@/services/profitability-analytics-service';

export function ProfitabilityDashboardClient() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ProfitabilityReport | null>(null);

  // Default to last 30 days
  const [dateRange, setDateRange] = useState({
    startDate: subDays(new Date(), 30).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [orderType, setOrderType] = useState<string>('');
  const [category, setCategory] = useState<string>('');

  async function fetchReport() {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getProfitabilityReportAction({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        orderType: orderType || undefined,
        category: category || undefined,
      });

      if (result.success && result.data) {
        setReport(result.data);
      } else {
        setError(result.error || 'Failed to load profitability report');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchReport();
  }, [dateRange, orderType, category]);

  function handleFilterChange(filters: {
    startDate: string;
    endDate: string;
    orderType: string;
    category: string;
  }) {
    setDateRange({ startDate: filters.startDate, endDate: filters.endDate });
    setOrderType(filters.orderType);
    setCategory(filters.category);
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <ProfitabilityFilters
        startDate={dateRange.startDate}
        endDate={dateRange.endDate}
        orderType={orderType}
        category={category}
        onFilterChange={handleFilterChange}
        isLoading={isLoading}
      />

      {/* Overview Cards */}
      <ProfitabilityOverviewCards report={report} isLoading={isLoading} />

      {/* Charts */}
      <ProfitabilityCharts report={report} isLoading={isLoading} />

      {/* Tables */}
      <ProfitabilityTables
        dateRange={dateRange}
        report={report}
        isLoading={isLoading}
      />
    </div>
  );
}
