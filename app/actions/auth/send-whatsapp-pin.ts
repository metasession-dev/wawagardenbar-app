'use server';

import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/models';
import { WhatsAppService } from '@/lib/whatsapp';
import {
  generatePin,
  getPinExpirationTime,
  hashPin,
  sanitizePhone,
  phoneLookupVariants,
  validatePhone,
  PIN_MAX_REQUESTS_PER_HOUR,
  PIN_REQUEST_WINDOW_MS,
} from '@/lib/auth-utils';
import {
  NOT_ON_WHATSAPP_MESSAGE,
  WHATSAPP_UNAVAILABLE_MESSAGE,
} from '@/lib/auth-messages';

// A send that fails for any of these means WhatsApp itself (credentials,
// template, Meta outage) is the problem, not this customer's number.
const UNAVAILABLE_ERROR_CODES = new Set([
  'SERVICE_DISABLED',
  'MISSING_CREDENTIALS',
  'TEMPLATE_NOT_FOUND',
  'API_ERROR',
  'UNKNOWN_ERROR',
  'QUOTA_EXCEEDED',
]);

interface SendWhatsAppPinResult {
  success: boolean;
  message: string;
  isNewUser?: boolean;
  errorCode?: string;
  /** REQ-117 AC3 — terminal: no retry through another channel. */
  notOnWhatsApp?: boolean;
  /** REQ-117 AC9 — WhatsApp is unavailable; show the notice. */
  serviceUnavailable?: boolean;
}

async function recordUnavailableIncident(
  phone: string,
  errorCode: string | undefined
): Promise<void> {
  try {
    const { IncidentEventService } = await import(
      '@/services/incident-event-service'
    );
    // One incident per hour is enough to alert admins; every sign-in attempt
    // during an outage would otherwise flood the incidents page.
    const entityId = 'whatsapp-signin-unavailable';
    if (
      await IncidentEventService.dedupRecent({
        kind: 'notification_delivery_failed',
        entityId,
        withinHours: 1,
      })
    ) {
      return;
    }
    await IncidentEventService.recordIncident({
      kind: 'notification_delivery_failed',
      entityId,
      summary:
        'Customer sign-in is unavailable: the WhatsApp PIN could not be sent',
      errorDetails: {
        errorCode: errorCode ?? null,
        lastPhoneSuffix: phone.slice(-4),
      },
    });
  } catch (error) {
    console.error(
      '[REQ-117] could not record the WhatsApp-unavailable incident:',
      error instanceof Error ? error.message : String(error)
    );
  }
}

export async function sendWhatsAppPinAction(
  phone: string
): Promise<SendWhatsAppPinResult> {
  try {
    if (!phone || !validatePhone(phone)) {
      return {
        success: false,
        message: 'Please provide a valid phone number',
      };
    }

    const sanitizedPhone = sanitizePhone(phone);

    await connectDB();

    // REQ-117 (AC8) — an existing account is found in any legacy phone form
    // and reused (never duplicated); the WhatsApp round-trip below is what
    // verifies it.
    let user = await UserModel.findOne({
      phone: { $in: phoneLookupVariants(sanitizedPhone) },
      accountStatus: { $ne: 'deleted' },
    }).select('+pinRequestWindowStart +pinRequestCount');
    const isNewUser = !user;

    if (!user) {
      user = await UserModel.create({
        phone: sanitizedPhone,
        phoneVerified: false,
        isGuest: false,
      });
    }

    // REQ-117 (AC5) — at most five PIN requests per phone per hour, counted on
    // the user document so the limit survives restarts and works across
    // instances.
    const now = Date.now();
    const windowStart = user.pinRequestWindowStart?.getTime();
    if (windowStart && now - windowStart < PIN_REQUEST_WINDOW_MS) {
      if ((user.pinRequestCount ?? 0) >= PIN_MAX_REQUESTS_PER_HOUR) {
        return {
          success: false,
          message: 'Too many PIN requests. Please try again later.',
          errorCode: 'RATE_LIMITED',
        };
      }
      user.pinRequestCount = (user.pinRequestCount ?? 0) + 1;
    } else {
      user.pinRequestWindowStart = new Date(now);
      user.pinRequestCount = 1;
    }

    const pin = generatePin();
    user.verificationPinHash = hashPin(pin);
    user.pinExpiresAt = getPinExpirationTime();
    user.pinAttempts = 0;

    // REQ-074 — E2E intercept. Only under this flag the plaintext PIN is also
    // kept (test-only field read by `readPinFromMongo`); in every other
    // environment only the keyed hash is stored. The flag also short-circuits
    // the send so specs work without Meta.
    const intercept = process.env.ENABLE_E2E_PIN_INTERCEPT === 'true';
    user.verificationPin = intercept ? pin : undefined;
    await user.save();

    if (intercept) {
      return {
        success: true,
        message: 'PIN persisted (E2E intercept mode)',
        isNewUser,
      };
    }

    const whatsappResult = await WhatsAppService.sendVerificationPinWhatsApp(
      sanitizedPhone,
      pin
    );

    if (!whatsappResult.success) {
      console.error(
        'Failed to send WhatsApp PIN to',
        sanitizedPhone,
        whatsappResult.errorCode
      );

      if (whatsappResult.errorCode === 'NOT_ON_WHATSAPP') {
        return {
          success: false,
          message: NOT_ON_WHATSAPP_MESSAGE,
          errorCode: whatsappResult.errorCode,
          notOnWhatsApp: true,
        };
      }
      if (whatsappResult.errorCode === 'INVALID_PHONE') {
        return {
          success: false,
          message:
            'The phone number format is invalid. Please check and try again.',
          errorCode: whatsappResult.errorCode,
        };
      }
      if (
        whatsappResult.errorCode &&
        UNAVAILABLE_ERROR_CODES.has(whatsappResult.errorCode)
      ) {
        await recordUnavailableIncident(
          sanitizedPhone,
          whatsappResult.errorCode
        );
        return {
          success: false,
          message: WHATSAPP_UNAVAILABLE_MESSAGE,
          errorCode: whatsappResult.errorCode,
          serviceUnavailable: true,
        };
      }
      // REQ-115 (D17) — Meta rejected the send for a reason that is not the
      // phone number (e.g. template parameters). Do not blame the number.
      return {
        success: false,
        message: 'We could not send your PIN. Please try again.',
        errorCode: whatsappResult.errorCode,
      };
    }

    return {
      success: true,
      message: 'Verification PIN sent via WhatsApp',
      isNewUser,
    };
  } catch (error) {
    console.error('Send WhatsApp PIN error:', error);
    return {
      success: false,
      message: 'Failed to send verification PIN. Please try again.',
    };
  }
}
