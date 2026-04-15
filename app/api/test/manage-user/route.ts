import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/models';

function isTestEndpointsEnabled(): boolean {
  return process.env.ENABLE_TEST_ENDPOINTS === 'true';
}

/**
 * POST /api/test/manage-user
 *
 * Test-only endpoint for seeding and cleaning up customer users in E2E tests.
 * Gated by ENABLE_TEST_ENDPOINTS=true.
 *
 * Actions:
 *   - create:  Seed a customer user with given email, phone, name
 *   - cleanup: Hard-delete users matching an email pattern (for teardown)
 */
export async function POST(request: NextRequest) {
  if (!isTestEndpointsEnabled()) {
    return NextResponse.json(
      { success: false, error: 'Test endpoints disabled' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { action } = body;

  await connectDB();

  if (action === 'create') {
    const { email, phone, firstName, lastName } = body;
    if (!email || !phone) {
      return NextResponse.json(
        { success: false, error: 'email and phone are required' },
        { status: 400 }
      );
    }

    const user = await UserModel.create({
      email: email.toLowerCase().trim(),
      phone,
      firstName,
      lastName,
      role: 'customer',
      accountStatus: 'active',
      isGuest: false,
      emailVerified: false,
    });

    return NextResponse.json({
      success: true,
      data: { _id: user._id.toString(), email: user.email, phone: user.phone },
    });
  }

  if (action === 'cleanup') {
    const { emailPattern } = body;
    if (!emailPattern) {
      return NextResponse.json(
        { success: false, error: 'emailPattern is required' },
        { status: 400 }
      );
    }

    const result = await UserModel.deleteMany({
      email: { $regex: emailPattern },
    });

    return NextResponse.json({
      success: true,
      data: { deletedCount: result.deletedCount },
    });
  }

  return NextResponse.json(
    { success: false, error: `Unknown action: ${action}` },
    { status: 400 }
  );
}
