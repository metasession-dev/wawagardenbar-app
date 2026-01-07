# Transactional SMS Requirements

## Overview
Integrate **Africa's Talking SMS API** to enable transactional SMS notifications for the Wawa Garden Bar application. This will work alongside the existing SMTP email system, providing a dual-channel notification system.

## Objectives
1.  **PIN Verification:** Deliver authentication PINs via SMS for faster and more accessible login.
2.  **Order Notifications:** Send order confirmations and status updates via SMS.
3.  **Dual-Channel Support:** Allow the system to be configured to use Email, SMS, or both.
4.  **Admin Configuration:** Enable administrators to toggle SMS features and configure API credentials from the dashboard.

## Functional Requirements

### 1. SMS Provider Integration
*   **Provider:** Africa's Talking (https://developers.africastalking.com/docs/sms/sending/bulk)
*   **Service Wrapper:** Create a dedicated service (`lib/sms.ts`) to handle all SMS interactions.
*   **API Credentials:**
    *   `AFRICASTALKING_USERNAME`
    *   `AFRICASTALKING_API_KEY`
    *   `AFRICASTALKING_SENDER_ID` (Optional, default to 'WAWAGARDEN')

### 2. Notification Channels Configuration
The system must allow admins to configure notification preferences via `Dashboard > Settings`.
*   **Global Toggles:**
    *   Enable/Disable SMS System-wide.
    *   Enable/Disable Email System-wide.
*   **Feature-Specific Toggles:**
    *   **Auth PINs:** SMS Only
    *   **Order Confirmation:** [Email | SMS | Both]
    *   **Order Status Updates:** [Email | SMS | Both]

### 3. Use Cases

#### A. Authentication (SMS Only)
*   **Scenario:** User requests to sign in or register.
*   **Action:**
    *   User enters **Phone Number** (Input field must accept phone numbers).
    *   System generates PIN.
    *   System sends PIN via **SMS** to the provided number.
    *   **No Email fallback** for authentication PINs.
*   **User Profile:**
    *   Phone number becomes the primary unique identifier for login.
    *   Email is optional for login but required for receipts (collected during profile setup or checkout).

#### B. Order Notifications
*   **Scenario:** Customer places an order.
*   **Action:** Send "Order Received" SMS with Order # and Estimated Time.
*   **Scenario:** Order status changes (e.g., "Ready for Pickup").
*   **Action:** Send "Order Ready" SMS.

### 4. Data Requirements
*   **User Model:** Ensure `phone` field is properly formatted (E.164 format preferred for API).
*   **System Settings Model:** Update to store:
    *   `smsEnabled` (boolean)
    *   `smsProvider` (string, default 'africastalking')
    *   `notificationChannels` (object defining preferences for each event type)

### 5. Fallback & Error Handling
*   If SMS fails (API error, invalid number), the system **MUST** log the error and attempt to fall back to Email if available/enabled.
*   SMS delivery status should be tracked (optional for MVP, but good for logs).

## Technical Specifications

### API Endpoint Reference (Africa's Talking)
*   **URL:** `https://api.africastalking.com/version1/messaging`
*   **Method:** `POST`
*   **Headers:**
    *   `apiKey`: `YOUR_API_KEY`
    *   `Content-Type`: `application/x-www-form-urlencoded`
*   **Body Parameters:**
    *   `username`: `YOUR_USERNAME`
    *   `to`: `+234...` (Comma separated for bulk)
    *   `message`: `Your PIN is 1234...`
    *   `from`: `SENDER_ID` (Optional)

### Security
*   API Keys must be stored in environment variables (`.env.local`), NOT in the database code.
*   Phone numbers must be sanitized before sending.

## User Interface (Dashboard)
*   **Settings Page:**
    *   Section: "Notification Settings"
    *   Input: API Key / Username (loaded from Env)
    *   Toggle: "Enable SMS Notifications"
    *   Test Button: "Send Test SMS"
