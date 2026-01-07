# Bulk SMS Implementation Plan V2 (SMS-Only Auth)

## Overview
Transition the authentication system from Email-based to **Phone-based (SMS)**. This aligns with the requirement for SMS-only login/signup. Email will still be collected for receipts but will not be the primary auth credential.

## Phase 1: Database Schema Updates

### 1. Update User Model (`models/user-model.ts`)
*   **Phone Field:**
    *   Make `required: true`.
    *   Ensure `unique: true`.
*   **Email Field:**
    *   Make `required: false`.
    *   Keep `unique: true` but add `sparse: true` (to allow multiple users with null/undefined email if necessary, though distinct emails are preferred).
*   **Migration Strategy:**
    *   For existing users without phone numbers: They might need to add one on next login (but they can't login if auth is phone-only).
    *   *Decision:* For development/new app, we assume clean slate or migration script. For this task, we update schema for new flow.

## Phase 2: Authentication Flow Refactor

### 2. Update Login UI (`app/(auth)/login/page.tsx`)
*   **Input Field:** Change from "Email Address" to "Phone Number".
*   **Validation:** Use phone number regex (e.g., Nigeria format `+234...` or local `080...`).
*   **Component:** Update `LoginForm` to handle phone input.

### 3. Update Auth Actions
*   **`sendPinAction` (`app/actions/auth/send-pin.ts`):**
    *   Input: `phone` (string).
    *   Logic:
        *   Validate phone format.
        *   Find User by `phone`.
        *   If not found -> Create new User with `phone` (mark `isNewUser`).
        *   Generate PIN.
        *   Send PIN via **SMS** (using `SMSService`).
        *   *Remove* email sending logic for auth PINs.
*   **`verifyPinAction` (`app/actions/auth/verify-pin.ts`):**
    *   Input: `phone`, `pin`.
    *   Logic: Find user by `phone` and verify PIN.

### 4. Update Verification UI (`app/(auth)/verify/page.tsx`)
*   **Display:** "Enter the code sent to +234..."
*   **Resend:** Trigger `sendPinAction` with phone number.

## Phase 3: Checkout & Profile Integration

### 5. Checkout Email Handling
*   **Scenario:** User logs in via Phone -> Goes to Checkout.
*   **Logic:**
    *   Check if `user.email` exists.
    *   **If yes:** Pre-populate email field (read-only or editable).
    *   **If no:** Show empty email field (Required for receipt).
*   **Save Action:**
    *   When order is placed, if `user.email` was empty/updated, update the User profile with the provided email.

## Phase 4: Notification Settings

### 6. Update Admin Dashboard
*   **Settings Page:** Ensure "Auth Channel" is locked to "SMS" or defaults to "SMS".
*   **Preferences:** Allow configuring Order/Marketing channels (Email/SMS).

## Execution Steps
1.  Modify `UserModel`.
2.  Update `sendPinAction` and `verifyPinAction`.
3.  Update Login & Verify Pages.
4.  Test Login Flow.
5.  Update Checkout logic to handle email saving.
