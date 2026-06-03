'use server';

import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/models';
import { sessionOptions, SessionData } from '@/lib/session';
import { validateEmail } from '@/lib/auth-utils';

interface VerifyEmailPinResult {
  success: boolean;
  message: string;
}

/**
 * REQ-053 — see `verify-pin.ts:PinOptInPayload`. Shared shape; re-declared
 * locally to keep each verify-action self-contained.
 */
export interface EmailPinOptInPayload {
  whatsappTransactional: boolean;
  whatsappMarketing: boolean;
  // REQ-063 — separate gate for marketing email; default false at the form.
  emailMarketing: boolean;
}

export async function verifyEmailPinAction(
  email: string,
  pin: string,
  optIn?: EmailPinOptInPayload
): Promise<VerifyEmailPinResult> {
  try {
    if (!email || !validateEmail(email)) {
      return {
        success: false,
        message: 'Invalid email address',
      };
    }

    if (!pin || pin.length !== 4) {
      return {
        success: false,
        message: 'Invalid PIN',
      };
    }

    await connectDB();

    const user = await UserModel.findOne({
      email: email.toLowerCase(),
      accountStatus: { $ne: 'deleted' },
    }).select('+verificationPin +pinExpiresAt');

    if (!user) {
      console.error('User not found for email:', email);
      return {
        success: false,
        message: 'User not found',
      };
    }

    console.log('Verifying email PIN for user:', {
      userId: user._id,
      email: user.email,
      phone: user.phone,
      hasPIN: !!user.verificationPin,
      pinExpiry: user.pinExpiresAt,
    });

    if (!user.verificationPin || !user.pinExpiresAt) {
      console.error('No PIN found for user:', user._id);
      return {
        success: false,
        message: 'No verification PIN found. Please request a new one.',
      };
    }

    if (new Date() > user.pinExpiresAt) {
      return {
        success: false,
        message: 'PIN has expired. Please request a new one.',
      };
    }

    if (user.verificationPin !== pin) {
      return {
        success: false,
        message: 'Invalid PIN. Please try again.',
      };
    }

    // REQ-053 — persist WhatsApp opt-in ONLY on truly first verification
    // (no verified channel yet). See `verify-pin.ts` for the rationale.
    if (optIn && !user.phoneVerified && !user.emailVerified) {
      user.set(
        'preferences.communicationPreferences.whatsappTransactional',
        optIn.whatsappTransactional
      );
      user.set(
        'preferences.communicationPreferences.whatsappMarketing',
        optIn.whatsappMarketing
      );
      // REQ-063 — email-marketing consent + audit timestamp.
      user.set(
        'preferences.communicationPreferences.emailMarketing',
        optIn.emailMarketing
      );
      user.set('preferences.communicationPreferencesUpdatedAt', new Date());
    }

    // PIN is valid - mark email as verified and clear PIN
    user.emailVerified = true;
    user.verificationPin = undefined;
    user.pinExpiresAt = undefined;
    await user.save();

    // Create session
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    session.userId = user._id.toString();
    session.email = user.email;
    session.phone = user.phone;
    session.role = user.role;
    session.isGuest = false;
    session.isLoggedIn = true;
    session.createdAt = Date.now(); // Also add creation timestamp for consistency

    await session.save();

    return {
      success: true,
      message: 'Email verified successfully',
    };
  } catch (error) {
    console.error('Verify email PIN error:', error);
    return {
      success: false,
      message: 'Failed to verify PIN. Please try again.',
    };
  }
}
