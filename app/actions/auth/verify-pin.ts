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

interface VerifyPinResult {
  success: boolean;
  message: string;
  userId?: string;
}

/**
 * REQ-053 / REQ-063 — opt-in payload from the PIN-entry form when the user
 * is new (the checkboxes are only rendered then). Persisted on first
 * verification only. REQ-063 split the original collapsed `whatsappOptIn`
 * into three independent fields so transactional vs marketing consent is
 * actually captured separately as #117 P4 #21 requires.
 */
export interface PinOptInPayload {
  whatsappTransactional: boolean;
  whatsappMarketing: boolean;
  // REQ-063 — separate gate for MARKETING email (offers, expiry nudges).
  // Default false at the form level (explicit opt-in required).
  emailMarketing: boolean;
}

export async function verifyPinAction(
  phone: string,
  pin: string,
  optIn?: PinOptInPayload
): Promise<VerifyPinResult> {
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
    // (no verified channel yet). Strict gate so a returning user who
    // verifies a *different* channel (e.g. email-first signup, then phone
    // PIN later) doesn't have their existing prefs overwritten by a stale
    // optIn payload from the client.
    if (optIn && !user.phoneVerified && !user.emailVerified) {
      // Use Mongoose `.set('path')` — schema defaults guarantee the path
      // exists at runtime and `set` marks it dirty so the save persists.
      user.set(
        'preferences.communicationPreferences.whatsappTransactional',
        optIn.whatsappTransactional
      );
      user.set(
        'preferences.communicationPreferences.whatsappMarketing',
        optIn.whatsappMarketing
      );
      // REQ-063 — email-marketing consent captured independently.
      user.set(
        'preferences.communicationPreferences.emailMarketing',
        optIn.emailMarketing
      );
      // REQ-063 — server-stamped audit timestamp for explicit-consent
      // capture (GDPR posture). Single timestamp covers all 5 channels.
      user.set('preferences.communicationPreferencesUpdatedAt', new Date());
    }

    const sessionToken = generateSessionToken();
    user.sessionToken = sessionToken;
    user.phoneVerified = true; // Mark phone as verified
    user.lastLoginAt = new Date();
    user.verificationPin = undefined;
    user.pinExpiresAt = undefined;
    await user.save();

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
      message: 'Successfully logged in',
      userId: user._id.toString(),
    };
  } catch (error) {
    console.error('Verify PIN error:', error);
    return {
      success: false,
      message: 'Failed to verify PIN. Please try again.',
    };
  }
}
