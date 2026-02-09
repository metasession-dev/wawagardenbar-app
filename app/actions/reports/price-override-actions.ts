'use server';

import PriceOverrideAnalyticsService from '@/services/price-override-analytics-service';

export async function getPriceOverrideAnalyticsAction(startDate: Date, endDate: Date) {
  try {
    const [metrics, byReason, byStaff, trend] = await Promise.all([
      PriceOverrideAnalyticsService.getOverrideMetrics(startDate, endDate),
      PriceOverrideAnalyticsService.getOverridesByReason(startDate, endDate),
      PriceOverrideAnalyticsService.getOverridesByStaff(startDate, endDate),
      PriceOverrideAnalyticsService.getOverrideTrend(startDate, endDate),
    ]);

    return {
      success: true,
      data: {
        metrics,
        byReason,
        byStaff,
        trend,
      },
    };
  } catch (error) {
    console.error('Failed to get price override analytics:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load price override analytics',
    };
  }
}
