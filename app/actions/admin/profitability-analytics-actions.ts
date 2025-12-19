'use server';

import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';
import { ProfitabilityAnalyticsService } from '@/services/profitability-analytics-service';

interface GetProfitabilityReportParams {
  startDate: string;
  endDate: string;
  orderType?: string;
  category?: string;
}

export async function getProfitabilityReportAction(params: GetProfitabilityReportParams) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    // Check authentication
    if (!session.userId) {
      return { success: false, error: 'Unauthorized', data: null };
    }

    // Check admin/super-admin role
    if (session.role !== 'admin' && session.role !== 'super-admin') {
      return { success: false, error: 'Forbidden', data: null };
    }

    const report = await ProfitabilityAnalyticsService.generateProfitabilityReport(
      new Date(params.startDate),
      new Date(params.endDate),
      {
        orderType: params.orderType,
        category: params.category,
      }
    );

    return {
      success: true,
      data: report,
    };
  } catch (error) {
    console.error('Error fetching profitability report:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch profitability report',
      data: null,
    };
  }
}

export async function getTopProfitableItemsAction(
  startDate: string,
  endDate: string,
  limit: number = 10
) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.userId) {
      return { success: false, error: 'Unauthorized', data: null };
    }

    if (session.role !== 'admin' && session.role !== 'super-admin') {
      return { success: false, error: 'Forbidden', data: null };
    }

    const items = await ProfitabilityAnalyticsService.getTopProfitableItems(
      new Date(startDate),
      new Date(endDate),
      limit
    );

    return {
      success: true,
      data: items,
    };
  } catch (error) {
    console.error('Error fetching top profitable items:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch top profitable items',
      data: null,
    };
  }
}

export async function getItemsWithDecliningMarginsAction(threshold: number = 20) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.userId) {
      return { success: false, error: 'Unauthorized', data: null };
    }

    if (session.role !== 'admin' && session.role !== 'super-admin') {
      return { success: false, error: 'Forbidden', data: null };
    }

    const items = await ProfitabilityAnalyticsService.getItemsWithDecliningMargins(threshold);

    return {
      success: true,
      data: items,
    };
  } catch (error) {
    console.error('Error fetching items with declining margins:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch items with declining margins',
      data: null,
    };
  }
}
