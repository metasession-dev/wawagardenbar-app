'use server';

import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/models';
import { WhatsAppService } from '@/lib/whatsapp';
import {
  generatePin,
  getPinExpirationTime,
  sanitizePhone,
  validatePhone,
} from '@/lib/auth-utils';

interface SendWhatsAppPinResult {
  success: boolean;
  message: string;
  isNewUser?: boolean;
  errorCode?: string;
  canRetryWithSMS?: boolean;
  canRetryWithEmail?: boolean;
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
      });
    }

    const pin = generatePin();
    const pinExpiresAt = getPinExpirationTime();

    user.verificationPin = pin;
    user.pinExpiresAt = pinExpiresAt;
    await user.save();

    // REQ-074 — E2E intercept. See app/actions/auth/send-pin.ts for the
    // shared rationale; same env flag short-circuits all three send
    // pathways (SMS, WhatsApp, Email) so any auth-touching spec works
    // regardless of which channel the test picks.
    if (process.env.ENABLE_E2E_PIN_INTERCEPT === 'true') {
      return {
        success: true,
        message: 'PIN persisted (E2E intercept mode)',
        isNewUser,
      };
    }

    // Send PIN via WhatsApp
    const whatsappResult = await WhatsAppService.sendVerificationPinWhatsApp(
      sanitizedPhone,
      pin
    );

    if (!whatsappResult.success) {
      console.error(
        'Failed to send WhatsApp PIN to',
        sanitizedPhone,
        whatsappResult
      );

      // Provide specific error messages based on error code
      let userMessage = 'Failed to send verification PIN via WhatsApp.';
      let canRetryWithSMS = true;
      let canRetryWithEmail = true;

      if (whatsappResult.errorCode === 'NOT_ON_WHATSAPP') {
        userMessage = 'This phone number is not registered on WhatsApp.';
      } else if (whatsappResult.errorCode === 'INVALID_PHONE') {
        userMessage =
          'The phone number format is invalid. Please check and try again.';
        canRetryWithSMS = false;
        canRetryWithEmail = false;
      } else if (whatsappResult.errorCode === 'SERVICE_DISABLED') {
        userMessage = 'WhatsApp service is currently unavailable.';
      } else if (whatsappResult.errorCode === 'QUOTA_EXCEEDED') {
        userMessage =
          'WhatsApp service limit reached. Please try SMS or Email.';
      } else if (whatsappResult.errorCode === 'TEMPLATE_NOT_FOUND') {
        userMessage = 'WhatsApp messaging is temporarily unavailable.';
      } else if (whatsappResult.errorCode === 'MISSING_CREDENTIALS') {
        userMessage =
          'WhatsApp service is not configured. Please use SMS or Email.';
      } else if (whatsappResult.message) {
        userMessage = whatsappResult.message;
      }

      return {
        success: false,
        message: userMessage,
        errorCode: whatsappResult.errorCode,
        canRetryWithSMS,
        canRetryWithEmail,
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
      canRetryWithSMS: true,
      canRetryWithEmail: true,
    };
  }
}
