'use server';

import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/models';
import { sendVerificationPinEmail } from '@/lib/email';
import {
  generatePin,
  getPinExpirationTime,
  validateEmail,
  sanitizePhone,
} from '@/lib/auth-utils';

interface SendEmailPinResult {
  success: boolean;
  message: string;
  isNewUser?: boolean;
}

export async function sendEmailPinAction(
  email: string,
  phone?: string
): Promise<SendEmailPinResult> {
  try {
    if (!email || !validateEmail(email)) {
      return {
        success: false,
        message: 'Please provide a valid email address',
      };
    }

    await connectDB();

    // Find user by phone if provided, otherwise by email
    let targetUser;
    // REQ-053 — track whether a new user doc was created in this action;
    // returned to the client so the PIN-entry form can decide whether to
    // render the WhatsApp opt-in checkbox.
    let isNewUser = false;

    if (phone) {
      const sanitizedPhone = sanitizePhone(phone);
      const emailLower = email.toLowerCase();

      // Find potential users
      const notDeleted = { accountStatus: { $ne: 'deleted' } };
      const userByPhone = await UserModel.findOne({
        phone: sanitizedPhone,
        ...notDeleted,
      });
      const userByEmail = await UserModel.findOne({
        email: emailLower,
        ...notDeleted,
      });

      if (userByEmail) {
        // Case 1: Email already exists. We prioritize the existing email account.
        console.log('Found existing user by email:', userByEmail._id);
        targetUser = userByEmail;

        // We do NOT update the phone number here to avoid conflicts or overwriting valid data.
        // The user will be logged in with the phone number associated with this email account.
        if (
          userByPhone &&
          userByPhone._id.toString() !== userByEmail._id.toString()
        ) {
          console.log(
            'Note: Phone number provided belongs to a different temporary user. Ignoring phone update on existing email user.'
          );
        }
      } else {
        // Case 2: Email is new. Use the phone user.
        if (userByPhone) {
          targetUser = userByPhone;
          targetUser.email = emailLower;
        } else {
          // Should not happen if sendPinAction was called first, but handle it gracefully
          console.log('No user found by phone, creating new one');
          targetUser = await UserModel.create({
            phone: sanitizedPhone,
            email: emailLower,
            phoneVerified: false,
            isGuest: false,
          });
          isNewUser = true;
        }
      }
    } else {
      // Email only login (legacy/admin?)
      targetUser = await UserModel.findOne({
        email: email.toLowerCase(),
        accountStatus: { $ne: 'deleted' },
      });

      if (!targetUser) {
        return {
          success: false,
          message:
            'Email authentication requires a phone number. Please use SMS authentication.',
        };
      }
    }

    const pin = generatePin();
    const pinExpiresAt = getPinExpirationTime();

    targetUser.verificationPin = pin;
    targetUser.pinExpiresAt = pinExpiresAt;

    // Save user with email and PIN
    await targetUser.save();

    console.log('Email PIN saved for user:', {
      userId: targetUser._id,
      email: targetUser.email,
      phone: targetUser.phone,
      pinSet: !!targetUser.verificationPin,
    });

    // Send PIN via Email
    try {
      await sendVerificationPinEmail(targetUser.email, pin);
    } catch (emailError) {
      console.error('Failed to send email PIN:', emailError);
      return {
        success: false,
        message:
          'Failed to send verification email. Please check your email address or try SMS instead.',
      };
    }

    return {
      success: true,
      message: 'Verification PIN sent to your email',
      isNewUser,
    };
  } catch (error) {
    console.error('Send email PIN error:', error);
    return {
      success: false,
      message: 'Failed to send verification PIN. Please try again.',
    };
  }
}
