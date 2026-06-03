import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { NextResponse } from 'next/server';
import { sessionOptions, SessionData } from '@/lib/session';
import { connectDB } from '@/lib/mongodb';
import { checkRateLimit } from '@/lib/rate-limit';
import { UserModel } from '@/models';
import OrderModel from '@/models/order-model';
import PointsTransactionModel from '@/models/points-transaction-model';
import TabModel from '@/models/tab-model';
import RewardModel from '@/models/reward-model';
import SupportTicketModel from '@/models/support-ticket-model';
import NotificationLogModel from '@/models/notification-log-model';
import IncomingMessageModel from '@/models/incoming-message-model';
import InstagramPostCreditModel from '@/models/instagram-post-credit-model';

const RATE_LIMIT_MS = 60_000;

/**
 * @requirement REQ-065 — Self-service data export (#117 P4 #19)
 *
 * GET /api/user/export — returns the logged-in user's full data footprint
 * as a downloadable JSON document. Session-gated; rate-limited at one
 * request per user per 60 seconds.
 *
 * The 9-collection projection covers every model that stores something
 * tied to the user. The find filter is keyed on `session.userId` for
 * every query — no cross-user reads possible from the endpoint shape.
 * User-doc secrets (verificationPin, pinExpiresAt, sessionToken) are
 * projected out explicitly.
 */
export async function GET(): Promise<Response> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    sessionOptions
  );

  if (!session.isLoggedIn || !session.userId) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const rate = checkRateLimit(`export:${session.userId}`, RATE_LIMIT_MS);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Rate limit — try again in ${rate.retryAfterSec} seconds`,
        retryAfterSec: rate.retryAfterSec,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rate.retryAfterSec) },
      }
    );
  }

  try {
    await connectDB();
    const userId = session.userId;

    const [
      profile,
      orders,
      pointsTransactions,
      tabs,
      rewards,
      supportTickets,
      notificationLog,
      incomingMessages,
      instagramPostCredits,
    ] = await Promise.all([
      UserModel.findById(userId)
        .select('-verificationPin -pinExpiresAt -sessionToken')
        .lean(),
      OrderModel.find({ userId }).sort({ createdAt: -1 }).lean(),
      PointsTransactionModel.find({ userId }).sort({ createdAt: -1 }).lean(),
      TabModel.find({ userId }).sort({ createdAt: -1 }).lean(),
      RewardModel.find({ userId }).sort({ createdAt: -1 }).lean(),
      SupportTicketModel.find({ userId }).sort({ createdAt: -1 }).lean(),
      NotificationLogModel.find({ userId }).sort({ attemptedAt: -1 }).lean(),
      IncomingMessageModel.find({ userId }).sort({ receivedAt: -1 }).lean(),
      InstagramPostCreditModel.find({ userId }).sort({ postedAt: -1 }).lean(),
    ]);

    const exportedAt = new Date().toISOString();
    const filename = `wawa-data-${userId}-${exportedAt.slice(0, 10)}.json`;

    return NextResponse.json(
      {
        exportedAt,
        userId,
        profile,
        orders,
        pointsTransactions,
        tabs,
        rewards,
        supportTickets,
        notificationLog,
        incomingMessages,
        instagramPostCredits,
      },
      {
        headers: {
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      }
    );
  } catch (error) {
    console.error('[data-export] failed:', error);
    return NextResponse.json(
      { error: 'Failed to build data export' },
      { status: 500 }
    );
  }
}
