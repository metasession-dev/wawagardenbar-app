'use server';

import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/models';
import { SMSService } from '@/lib/sms';
import {
  generatePin,
  getPinExpirationTime,
  sanitizePhone,
  validatePhone,
} from '@/lib/auth-utils';

interface SendPinResult {
  success: boolean;
  message: string;
  isNewUser?: boolean;
  errorCode?: string;
  canRetryWithSMS?: boolean;
  canRetryWithEmail?: boolean;
}

export async function sendPinAction(phone: string): Promise<SendPinResult> {
  try {
    if (!phone || !validatePhone(phone)) {
      return {
        success: false,
        message: 'Please provide a valid phone number',
      };
    }

    const sanitizedPhone = sanitizePhone(phone);

    await connectDB();

    let user = await UserModel.findOne({
      phone: sanitizedPhone,
      accountStatus: { $ne: 'deleted' },
    });
    const isNewUser = !user;

    if (!user) {
      user = await UserModel.create({
        phone: sanitizedPhone,
        phoneVerified: false,
        isGuest: false,
        // Email is optional and sparse, so we don't need to set it
      });
    }

    const pin = generatePin();
    const pinExpiresAt = getPinExpirationTime();

    user.verificationPin = pin;
    user.pinExpiresAt = pinExpiresAt;
    await user.save();

    // REQ-074 — E2E intercept. When the env flag is on, skip the real
    // SMS dispatch and return success after the PIN is persisted. Specs
    // read the PIN from User.verificationPin in Mongo and submit it via
    // verify-pin. Default-off; only the operator sets this on UAT.
    if (process.env.ENABLE_E2E_PIN_INTERCEPT === 'true') {
      return {
        success: true,
        message: 'PIN persisted (E2E intercept mode)',
        isNewUser,
      };
    }

    // Send PIN via SMS
    const smsResult = await SMSService.sendVerificationPinSMS(
      sanitizedPhone,
      pin
    );

    if (!smsResult.success) {
      console.error('Failed to send SMS PIN to', sanitizedPhone, smsResult);

      // Provide specific error messages based on error code
      let userMessage = 'Failed to send verification PIN via SMS.';
      let canRetryWithEmail = true;

      if (smsResult.errorCode === 'DND_REJECTION') {
        userMessage =
          'Unable to send SMS to this number. This number may be on a Do Not Disturb list.';
      } else if (smsResult.errorCode === 'INVALID_PHONE') {
        userMessage =
          'The phone number format is invalid. Please check and try again.';
        canRetryWithEmail = false; // Invalid phone shouldn't allow email retry
      } else if (smsResult.errorCode === 'SERVICE_DISABLED') {
        userMessage = 'SMS service is currently unavailable.';
      } else if (smsResult.errorCode === 'INSUFFICIENT_BALANCE') {
        userMessage = 'SMS service is temporarily unavailable.';
      } else if (smsResult.message) {
        userMessage = smsResult.message;
      }

      return {
        success: false,
        message: userMessage,
        errorCode: smsResult.errorCode,
        canRetryWithEmail,
      };
    }

    return {
      success: true,
      message: 'Verification PIN sent to your phone',
      isNewUser,
    };
  } catch (error) {
    console.error('Send PIN error:', error);
    return {
      success: false,
      message: 'Failed to send verification PIN. Please try again.',
    };
  }
}
