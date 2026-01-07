# Paystack Integration Requirements

## Overview
Integration of Paystack as an alternate payment processor alongside Monnify, configurable via the Admin Dashboard. This allows the business to switch between payment providers or offer multiple options to customers.

## 1. Configuration Requirements

### Admin Dashboard (`/dashboard/settings`)
A new section in the Settings page for "Payment Gateways" to manage Paystack configuration.

**Fields Required:**
*   **Provider Status:** Toggle to Enable/Disable Paystack.
*   **Environment:** Toggle between `Test` and `Live` modes.
*   **Public Key:** Input field for `pk_test_...` or `pk_live_...`.
*   **Secret Key:** Input field for `sk_test_...` or `sk_live_...` (masked input).
*   **Active Provider Selection:** Radio button or dropdown to select the *primary* payment processor (Monnify vs Paystack) if only one should be active at a time, or checkboxes if both can be active.

### Database Schema (`SystemSettings`)
Store configuration securely in the `SystemSettings` collection under a new key (e.g., `payment-gateway-config`).

```typescript
interface PaymentConfig {
  activeProvider: 'monnify' | 'paystack';
  paystack: {
    enabled: boolean;
    mode: 'test' | 'live';
    publicKey: string;
    secretKey: string; // Encrypted or stored securely
  };
  monnify: {
    // ... existing monnify config if moved here
  };
}
```

*Note: Sensitive keys (Secret Keys) should ideally be stored in Environment Variables (`.env.local`) for security, but if "configurable in dashboard" is a strict requirement, they must be stored in the DB (encrypted) or just referencing env var names.*

**Recommendation:** 
For security best practices, API Keys should be loaded from Environment Variables. The Dashboard should only toggle the *Status* (Enabled/Disabled) and *Mode* (Test/Live), unless the requirement specifically demands dynamic key entry in the UI.
*   **Option A (Secure):** Keys in `.env`. Dashboard toggles provider.
*   **Option B (Dynamic):** Keys in DB. Dashboard updates DB. (Required if keys change frequently without redeploy).

## 2. Functional Requirements

### A. Checkout Process
*   **Payment Method Selection:** Update the checkout flow to allow users to pay via Paystack if enabled.
*   **Supported Channels:**
    *   Card
    *   Bank Transfer
    *   USSD
    *   QR
*   **Currency:** NGN (Nigeria Naira).

### B. Transaction Lifecycle
1.  **Initialization:**
    *   Create a transaction reference unique to Wawa Garden Bar (e.g., `WG-PAY-{OrderId}-{Timestamp}`).
    *   Call Paystack Initialize API (`POST /transaction/initialize`) with email, amount (in kobo), and reference.
2.  **Redirect:**
    *   Redirect user to Paystack's authorization URL.
3.  **Verification:**
    *   On callback (return URL), verify the transaction status using Paystack Verify API (`GET /transaction/verify/:reference`).
    *   Verify `status` is `success` and `amount` matches expected order amount.
4.  **Order Update:**
    *   Update Order status to `confirmed` upon successful payment.
    *   Update Order `paymentMethod` to `paystack`.
    *   Update Order `paymentReference` with Paystack reference.

### C. Webhooks
*   Endpoint: `/api/webhooks/paystack`
*   Events to Handle:
    *   `charge.success`: Verify and complete order if not already completed.
*   Security: Verify `x-paystack-signature` header using the Secret Key.

## 3. Technical Requirements

### Dependencies
*   `axios` or `fetch` for API calls.
*   `crypto` for signature verification.

### API Endpoints (Paystack)
*   Base URL: `https://api.paystack.co`
*   Initialize: `POST /transaction/initialize`
*   Verify: `GET /transaction/verify/:reference`

### New Interfaces
```typescript
interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  data: {
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number; // in kobo
    gateway_response: string;
    channel: string;
  };
}
```

## 4. UX/UI Updates
*   **Admin Settings:** Form to input/update Paystack credentials.
*   **Checkout Page:**
    *   If multiple providers are active, show a "Pay with Paystack" option.
    *   If Paystack is the only active provider, default to it.
