'use server';

import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/models';
import { sessionOptions, SessionData } from '@/lib/session';
import {
  generateSessionToken,
  isPinExpired,
  sanitizePhone,
} from '@/lib/auth-utils';

interface VerifyWhatsAppPinResult {
  success: boolean;
  message: string;
  userId?: string;
}

/**
 * REQ-053 — see `verify-pin.ts:PinOptInPayload`. Shared shape; re-declared
 * locally to keep each verify-action self-contained.
 */
export interface WhatsAppPinOptInPayload {
  whatsappTransactional: boolean;
  whatsappMarketing: boolean;
  // REQ-063 — separate gate for marketing email; default false at the form.
  emailMarketing: boolean;
}

export async function verifyWhatsAppPinAction(
  phone: string,
  pin: string,
  optIn?: WhatsAppPinOptInPayload
): Promise<VerifyWhatsAppPinResult> {
  try {
    if (!phone || !pin) {
      return {
        success: false,
        message: 'Phone number and PIN are required',
      };
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return {
        success: false,
        message: 'Invalid PIN format',
      };
    }

    const sanitizedPhone = sanitizePhone(phone);

    await connectDB();

    const user = await UserModel.findOne({
      phone: sanitizedPhone,
      accountStatus: { $ne: 'deleted' },
    }).select('+verificationPin +pinExpiresAt');

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    if (!user.verificationPin || !user.pinExpiresAt) {
      return {
        success: false,
        message: 'No verification PIN found. Please request a new one.',
      };
    }

    if (isPinExpired(user.pinExpiresAt)) {
      return {
        success: false,
        message: 'PIN has expired. Please request a new one.',
      };
    }

    if (user.verificationPin !== pin) {
      return {
        success: false,
        message: 'Invalid PIN',
      };
    }

    // REQ-053 — persist WhatsApp opt-in ONLY on truly first verification
    // (no verified channel yet). See `verify-pin.ts` for the rationale.
    if (optIn && !user.phoneVerified && !user.emailVerified) {
      // Mongoose's schema defaults supply `preferences.communicationPreferences`
      // on every read, so the nested chain is guaranteed at runtime —
      // narrow it locally for TS via `set` on the doc which also marks
      // the path dirty so the save persists.
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

    // PIN is valid - update user
    const sessionToken = generateSessionToken();
    user.sessionToken = sessionToken;
    user.phoneVerified = true;
    user.lastLoginAt = new Date();
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
    session.email = user.email || undefined;
    session.phone = user.phone;
    session.role = user.role;
    session.isGuest = false;
    session.isLoggedIn = true;
    session.createdAt = Date.now();

    await session.save();

    return {
      success: true,
      message: 'Successfully logged in via WhatsApp',
      userId: user._id.toString(),
    };
  } catch (error) {
    console.error('Verify WhatsApp PIN error:', error);
    return {
      success: false,
      message: 'Failed to verify PIN. Please try again.',
    };
  }
}
