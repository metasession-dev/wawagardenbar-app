# Bulk SMS Implementation Plan

## Overview
This plan details the steps to implement transactional and bulk SMS capabilities using the Africa's Talking API. The feature will be integrated into the existing notification system, allowing for a hybrid Email/SMS approach managed via the Admin Dashboard.

## Phase 1: Infrastructure & Service Layer

### 1. Environment Setup
*   **Action:** Update `.env.example` and `.env.local`.
*   **Variables:**
    ```bash
    # SMS Configuration (Africa's Talking)
    AFRICASTALKING_USERNAME=sandbox
    AFRICASTALKING_API_KEY=your_api_key
    AFRICASTALKING_SENDER_ID=WAWAGARDEN # Optional
    ENABLE_SMS_NOTIFICATIONS=true
    ```

### 2. Create SMS Library (`lib/sms.ts`)
*   **Objective:** Create a wrapper around Africa's Talking API.
*   **Functions:**
    *   `sendSMS(to: string, message: string)`: Core sending logic.
    *   `sendVerificationPinSMS(phone: string, pin: string)`: Formatted PIN message.
    *   `sendOrderConfirmationSMS(phone: string, orderNumber: string, total: number)`: Order receipt.
    *   `sendOrderStatusSMS(phone: string, orderNumber: string, status: string)`: Status updates.
*   **Dependencies:** `axios` or native `fetch`.

### 3. Update System Settings Model
*   **Action:** Modify `models/system-settings-model.ts`.
*   **Changes:** Add a new setting key `notification-preferences` or extend the existing structure to store:
    ```typescript
    interface NotificationSettings {
      smsEnabled: boolean;
      emailEnabled: boolean;
      channels: {
        auth: 'email' | 'sms' | 'both';
        orders: 'email' | 'sms' | 'both';
        marketing: 'email' | 'sms' | 'both';
      };
    }
    ```

## Phase 2: Integration

### 4. Integrate with Auth Flow (`app/actions/auth/send-pin.ts`)
*   **Action:** Update `sendPinAction`.
*   **Logic:**
    1.  Check if user has a valid `phone` number.
    2.  Check System Settings for "Auth" channel preference.
    3.  If SMS is enabled and phone exists, call `sendVerificationPinSMS`.
    4.  Fallback to Email if SMS fails or if phone is missing.

### 5. Integrate with Order Flow (`services/order-service.ts`)
*   **Action:** Update `createOrder` and `updateOrderStatus`.
*   **Logic:**
    *   **On Creation:** Trigger `sendOrderConfirmationSMS`.
    *   **On Update:** Trigger `sendOrderStatusSMS`.
    *   **Context:** Ensure these calls happen asynchronously (don't block the main thread) or use `waitUntil` if available, to prevent API latency from slowing down the UI.

## Phase 3: Admin Dashboard & Configuration

### 6. Create Notification Settings UI
*   **Location:** `app/dashboard/settings/notifications/page.tsx` (New Page) or add to `app/dashboard/settings/page.tsx`.
*   **Components:**
    *   Toggles for enabling/disabling SMS/Email.
    *   Test SMS input field and "Send" button to verify credentials.
    *   Save button to persist preferences to `SystemSettings`.

### 7. Backend Service for Settings
*   **Action:** Update `services/system-settings-service.ts`.
*   **Methods:**
    *   `getNotificationSettings()`
    *   `updateNotificationSettings()`

## Phase 4: Testing & Verification

### 8. Test Scenarios
*   **Unit Tests:** Test `sendSMS` function with mock API calls.
*   **Integration Tests:**
    *   Send PIN via SMS (verify delivery).
    *   Place Order (verify confirmation SMS).
    *   Update Order Status (verify status SMS).
    *   Test Fallback: Disable SMS and ensure Email still sends.

## Timeline Estimate
*   **Phase 1 (Infra):** 2 Hours
*   **Phase 2 (Integration):** 3 Hours
*   **Phase 3 (Dashboard):** 3 Hours
*   **Phase 4 (Testing):** 2 Hours
*   **Total:** ~10 Hours
