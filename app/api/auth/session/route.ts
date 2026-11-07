import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import {
  sessionOptions,
  SessionData,
  defaultSession,
  applyCustomerSessionLifetime,
  shouldRefreshCustomerSession,
  getPrimaryRole,
  getRoles,
} from '@/lib/session';
import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/models';

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.isLoggedIn) {
      return NextResponse.json(defaultSession);
    }

    // REQ-117 (AC7) — extend an active customer's 90-day session at most
    // once a day.
    if (shouldRefreshCustomerSession(session)) {
      session.refreshedAt = Date.now();
      applyCustomerSessionLifetime(session);
      await session.save();
    }

    if (session.userId && !session.isGuest) {
      try {
        await connectDB();
        const user = await UserModel.findById(session.userId).select(
          'firstName lastName name email emailVerified role totalSpent rewardsEarned totalOrders'
        );

        if (!user) {
          // User not found in database, but session exists
          // This might be an admin user - return session data
          console.warn(
            '[Session API] User not found in DB, returning session data:',
            session.userId
          );
          return NextResponse.json({
            isLoggedIn: session.isLoggedIn,
            userId: session.userId,
            email: session.email,
            name: session.name,
            role: getPrimaryRole(session),
            roles: getRoles(session),
            isGuest: false,
          });
        }

        // Compute full name from firstName and lastName
        const fullName =
          user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.name || user.email?.split('@')[0];

        return NextResponse.json({
          isLoggedIn: true,
          userId: user._id.toString(),
          email: user.email,
          name: fullName,
          emailVerified: user.emailVerified,
          role: getPrimaryRole(user),
          roles: getRoles(user),
          totalSpent: user.totalSpent,
          rewardsEarned: user.rewardsEarned,
          orderCount: user.totalOrders,
          isGuest: false,
        });
      } catch (dbError) {
        // Database error - return session data anyway for admin users
        console.error(
          '[Session API] Database error, returning session data:',
          dbError
        );
        return NextResponse.json({
          isLoggedIn: session.isLoggedIn,
          userId: session.userId,
          email: session.email,
          name: session.name,
          role: getPrimaryRole(session),
          roles: getRoles(session),
          isGuest: false,
        });
      }
    }

    // Guest or no userId - return basic session data
    return NextResponse.json({
      isLoggedIn: session.isLoggedIn,
      userId: session.userId,
      email: session.email,
      name: session.name,
      role: getPrimaryRole(session),
      roles: getRoles(session),
      isGuest: session.isGuest,
    });
  } catch (error) {
    console.error('Session API error:', error);
    return NextResponse.json(defaultSession, { status: 500 });
  }
}
