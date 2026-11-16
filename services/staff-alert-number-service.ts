/**
 * @requirement REQ-122 - Staff alert number with WhatsApp PIN verification and consent
 * @srs REQ-AUTHA-008
 *
 * A staff member's alert number is separate from the customer `phone`. It
 * receives `staff_alert` messages only after the member proves they own it
 * with a WhatsApp PIN, which also records their consent (ADR-011). A number
 * that belongs to a customer account is refused, so a customer can never be
 * mistaken for staff by the inbound router.
 */
import { connectDB } from '@/lib/mongodb';
import UserModel from '@/models/user-model';
import { STAFF_ROLES } from '@/interfaces/user.interface';
import { WhatsAppService } from '@/lib/whatsapp';
import {
  generatePin,
  getPinExpirationTime,
  hashPin,
  isValidPinFormat,
  normalizePhone,
  phoneLookupVariants,
  validatePhone,
  verifyPinHash,
  PIN_MAX_ATTEMPTS,
  PIN_MAX_REQUESTS_PER_HOUR,
  PIN_REQUEST_WINDOW_MS,
} from '@/lib/auth-utils';

export interface AlertNumberResult {
  success: boolean;
  message: string;
}

const STAFF_FILTER = { roles: { $in: [...STAFF_ROLES] } } as const;

export class StaffAlertNumberService {
  /**
   * Save a staff member's alert number, unverified. Used by admins (create and
   * edit admin) and by staff on their own account. Changing the number clears
   * any earlier verification.
   */
  static async setAlertPhone(
    userId: string,
    rawPhone: string
  ): Promise<AlertNumberResult> {
    await connectDB();
    if (!rawPhone || !validatePhone(rawPhone)) {
      return { success: false, message: 'Enter a valid phone number.' };
    }
    const phone = normalizePhone(rawPhone);
    const variants = phoneLookupVariants(rawPhone);

    const staff = await UserModel.findOne({ _id: userId, ...STAFF_FILTER })
      .select('_id alertPhone')
      .lean<{ _id: unknown; alertPhone?: string } | null>();
    if (!staff) {
      return { success: false, message: 'Staff account not found.' };
    }

    const customer = await UserModel.exists({
      phone: { $in: variants },
      role: 'customer',
    });
    if (customer) {
      return {
        success: false,
        message:
          'That number belongs to a customer account. Use a staff number.',
      };
    }
    const other = await UserModel.exists({
      _id: { $ne: userId },
      alertPhone: { $in: variants },
      alertPhoneVerified: true,
    });
    if (other) {
      return {
        success: false,
        message: 'That number is already verified for another staff member.',
      };
    }

    if (staff.alertPhone === phone) {
      return { success: true, message: 'Alert number unchanged.' };
    }
    await UserModel.updateOne(
      { _id: userId },
      {
        $set: { alertPhone: phone, alertPhoneVerified: false },
        $unset: {
          alertConsentAt: '',
          alertPinHash: '',
          alertPinExpiresAt: '',
        },
      }
    );
    return {
      success: true,
      message: 'Alert number saved. Verify it to receive alerts.',
    };
  }

  /** Remove the alert number and everything tied to it. */
  static async removeAlertPhone(userId: string): Promise<AlertNumberResult> {
    await connectDB();
    await UserModel.updateOne(
      { _id: userId, ...STAFF_FILTER },
      {
        $set: { alertPhoneVerified: false, onShift: false },
        $unset: {
          alertPhone: '',
          alertConsentAt: '',
          alertPinHash: '',
          alertPinExpiresAt: '',
        },
      }
    );
    return { success: true, message: 'Alert number removed.' };
  }

  /** Send a WhatsApp PIN to the saved alert number (5 per hour, 10 minutes valid). */
  static async requestVerification(
    userId: string,
    now: Date = new Date()
  ): Promise<AlertNumberResult> {
    await connectDB();
    const user = await UserModel.findOne({
      _id: userId,
      ...STAFF_FILTER,
    }).select(
      '+alertPinRequestWindowStart +alertPinRequestCount alertPhone alertPhoneVerified'
    );
    if (!user) return { success: false, message: 'Staff account not found.' };
    if (!user.alertPhone) {
      return { success: false, message: 'Save an alert number first.' };
    }

    const windowStart = user.alertPinRequestWindowStart;
    const inWindow =
      windowStart &&
      now.getTime() - windowStart.getTime() < PIN_REQUEST_WINDOW_MS;
    const count = inWindow ? (user.alertPinRequestCount ?? 0) : 0;
    if (count >= PIN_MAX_REQUESTS_PER_HOUR) {
      return {
        success: false,
        message: 'Too many codes requested. Try again in an hour.',
      };
    }

    const pin = generatePin();
    user.alertPinHash = hashPin(pin);
    user.alertPinExpiresAt = getPinExpirationTime();
    user.alertPinAttempts = 0;
    user.alertPinRequestWindowStart = inWindow ? windowStart : now;
    user.alertPinRequestCount = count + 1;
    await user.save();

    const sent = await WhatsAppService.sendVerificationPinWhatsApp(
      user.alertPhone,
      pin
    );
    if (!sent.success) {
      return {
        success: false,
        message:
          'We could not send the code on WhatsApp. Check the number and try again.',
      };
    }
    return { success: true, message: 'Code sent on WhatsApp.' };
  }

  /** Check the PIN. On success the number is verified and consent recorded. */
  static async verify(
    userId: string,
    pin: string,
    now: Date = new Date()
  ): Promise<AlertNumberResult> {
    await connectDB();
    if (!isValidPinFormat(pin)) {
      return { success: false, message: 'Enter the 6-digit code.' };
    }
    const user = await UserModel.findOne({
      _id: userId,
      ...STAFF_FILTER,
    }).select('+alertPinHash +alertPinExpiresAt +alertPinAttempts alertPhone');
    if (!user || !user.alertPhone || !user.alertPinHash) {
      return { success: false, message: 'Request a new code first.' };
    }
    if (
      !user.alertPinExpiresAt ||
      user.alertPinExpiresAt.getTime() <= now.getTime()
    ) {
      return {
        success: false,
        message: 'That code has expired. Request a new one.',
      };
    }
    const attempts = user.alertPinAttempts ?? 0;
    if (attempts >= PIN_MAX_ATTEMPTS) {
      return {
        success: false,
        message: 'Too many wrong codes. Request a new one.',
      };
    }
    if (!verifyPinHash(pin, user.alertPinHash)) {
      user.alertPinAttempts = attempts + 1;
      await user.save();
      return { success: false, message: 'That code is not right.' };
    }
    user.alertPhoneVerified = true;
    user.alertConsentAt = now;
    user.alertsEnabled = true;
    user.alertPinHash = undefined;
    user.alertPinExpiresAt = undefined;
    user.alertPinAttempts = 0;
    await user.save();
    return { success: true, message: 'Alert number verified.' };
  }

  /** On shift only makes sense with a verified number. */
  static async setOnShift(
    userId: string,
    onShift: boolean
  ): Promise<AlertNumberResult> {
    await connectDB();
    await UserModel.updateOne(
      { _id: userId, ...STAFF_FILTER },
      { $set: { onShift } }
    );
    return {
      success: true,
      message: onShift ? 'You are on shift.' : 'You are off shift.',
    };
  }

  /** A member can stop receiving WhatsApp alerts without removing the number. */
  static async setAlertsEnabled(
    userId: string,
    enabled: boolean
  ): Promise<AlertNumberResult> {
    await connectDB();
    await UserModel.updateOne(
      { _id: userId, ...STAFF_FILTER },
      { $set: { alertsEnabled: enabled } }
    );
    return {
      success: true,
      message: enabled ? 'WhatsApp alerts are on.' : 'WhatsApp alerts are off.',
    };
  }

  static async getMine(userId: string): Promise<{
    alertPhone: string | null;
    alertPhoneVerified: boolean;
    alertsEnabled: boolean;
    onShift: boolean;
  } | null> {
    await connectDB();
    const user = await UserModel.findOne({ _id: userId, ...STAFF_FILTER })
      .select('alertPhone alertPhoneVerified alertsEnabled onShift')
      .lean<{
        alertPhone?: string;
        alertPhoneVerified?: boolean;
        alertsEnabled?: boolean;
        onShift?: boolean;
      } | null>();
    if (!user) return null;
    return {
      alertPhone: user.alertPhone ?? null,
      alertPhoneVerified: Boolean(user.alertPhoneVerified),
      alertsEnabled: user.alertsEnabled !== false,
      onShift: Boolean(user.onShift),
    };
  }
}
