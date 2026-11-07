import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData, hasAnyRole } from '@/lib/session';
import { SystemSettingsService } from '@/services/system-settings-service';

/**
 * POST /api/admin/settings/points-conversion-rate
 * Update points conversion rate (admin only)
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { rate, reason } = body;

    if (typeof rate !== 'number' || rate < 1 || rate > 1000) {
      return NextResponse.json(
        { error: 'Rate must be a number between 1 and 1000' },
        { status: 400 }
      );
    }

    const result = await SystemSettingsService.updatePointsConversionRate(
      rate,
      session.userId,
      reason
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating points conversion rate:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update conversion rate',
      },
      { status: 500 }
    );
  }
}
