import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, SessionData } from '@/lib/session';
import { ProfitabilityAnalyticsService } from '@/services/profitability-analytics-service';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    // Check authentication
    if (!session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin/super-admin role
    if (session.role !== 'admin' && session.role !== 'super-admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse date range
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    
    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);

    // Parse filters
    const filters: any = {};
    const orderType = searchParams.get('orderType');
    const category = searchParams.get('category');

    if (orderType) filters.orderType = orderType;
    if (category) filters.category = category;

    // Generate report
    const report = await ProfitabilityAnalyticsService.generateProfitabilityReport(
      startDate,
      endDate,
      filters
    );

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error generating profitability report:', error);
    return NextResponse.json(
      { error: 'Failed to generate profitability report' },
      { status: 500 }
    );
  }
}
