import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/models';

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.isLoggedIn || !session.userId || session.isGuest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const user = await UserModel.findById(session.userId).select(
      '-verificationPin -pinExpiresAt -sessionToken'
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Compute full name from firstName and lastName
    const fullName =
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.name || user.email?.split('@')[0] || '';

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        name: fullName,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
        phone: user.phone,
        addresses: user.addresses,
        paymentMethods: user.paymentMethods,
        totalSpent: user.totalSpent,
        rewardsEarned: user.rewardsEarned,
        orderCount: user.totalOrders,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get user API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.isLoggedIn || !session.userId || session.isGuest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone } = body;

    await connectDB();
    const user = await UserModel.findById(session.userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (name !== undefined) {
      user.name = name;
    }
    if (phone !== undefined) {
      user.phone = phone;
    }

    await user.save();

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error('Update user API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
