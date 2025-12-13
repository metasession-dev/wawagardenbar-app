import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/models';
import { sessionOptions, SessionData } from '@/lib/session';

const TEST_USERS = {
  customer: 'customer@test.com',
  admin: 'admin@test.com',
  superAdmin: 'superadmin@test.com',
} as const;

interface LoginPayload {
  user?: keyof typeof TEST_USERS;
  email?: string;
}

function isTestEndpointsEnabled(): boolean {
  return process.env.ENABLE_TEST_ENDPOINTS === 'true';
}

export async function POST(request: NextRequest) {
  if (!isTestEndpointsEnabled()) {
    return NextResponse.json({ success: false, error: 'Test endpoints disabled' }, { status: 403 });
  }

  let payload: LoginPayload = {};
  try {
    payload = (await request.json()) as LoginPayload;
  } catch (error) {
    // ignore parse errors, payload stays empty
  }

  const targetEmail = payload.email || (payload.user ? TEST_USERS[payload.user] : undefined) || TEST_USERS.customer;

  await connectDB();

  const user = await UserModel.findOne({ email: targetEmail });

  if (!user) {
    return NextResponse.json({ success: false, error: `User ${targetEmail} not found` }, { status: 404 });
  }

  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  session.userId = user._id.toString();
  session.email = user.email || undefined;
  session.phone = user.phone;
  session.role = user.role;
  session.isGuest = false;
  session.isLoggedIn = true;
  session.createdAt = Date.now();

  await session.save();

  return NextResponse.json({
    success: true,
    user: {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    },
  });
}
