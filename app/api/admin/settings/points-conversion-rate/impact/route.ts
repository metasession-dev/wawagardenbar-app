import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData, hasAnyRole } from '@/lib/session';
import { SystemSettingsService } from '@/services/system-settings-service';

/**
 * GET /api/admin/settings/points-conversion-rate/impact
 * Get impact analysis for a potential rate change (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or super-admin
    if (!hasAnyRole(session, ['admin', 'super-admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const newRateParam = searchParams.get('newRate');

    if (!newRateParam) {
      return NextResponse.json(
        { error: 'newRate parameter is required' },
        { status: 400 }
      );
    }

    const newRate = parseInt(newRateParam, 10);

    if (isNaN(newRate) || newRate < 1 || newRate > 1000) {
      return NextResponse.json(
        { error: 'newRate must be a number between 1 and 1000' },
        { status: 400 }
      );
    }

    const impact = await SystemSettingsService.getConversionRateImpact(newRate);

    return NextResponse.json(impact);
  } catch (error) {
    console.error('Error getting conversion rate impact:', error);
    return NextResponse.json(
      { error: 'Failed to analyze impact' },
      { status: 500 }
    );
  }
}
