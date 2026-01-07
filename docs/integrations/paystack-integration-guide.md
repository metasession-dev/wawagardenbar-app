# Paystack Integration Guide

## 1. Implementation Steps

### Step 1: System Settings Update
Extend the `SystemSettings` model and service to support Paystack configuration.

**File:** `models/system-settings-model.ts`
*   Add `paymentGateway` key structure to the schema.
*   Or create a separate key `paystack-config`.

**File:** `services/system-settings-service.ts`
*   Add methods: `getPaymentSettings()`, `updatePaymentSettings()`.

### Step 2: Paystack Service
Create a new service class to handle Paystack API interactions.

**File:** `services/paystack-service.ts`
```typescript
export class PaystackService {
  // Get config from SystemSettings or Env
  private static async getConfig() { ... }

  static async initializeTransaction(params: { email: string; amount: number; orderId: string }) {
    // Amount in kobo (NGN * 100)
    // POST https://api.paystack.co/transaction/initialize
  }

  static async verifyTransaction(reference: string) {
    // GET https://api.paystack.co/transaction/verify/:reference
  }

  static verifySignature(payload: any, signature: string) {
    // HMAC SHA512
  }
}
```

### Step 3: Payment Service Adaptation
Refactor `PaymentService` (currently Monnify-focused) to be an adapter or factory that delegates to either `MonnifyService` or `PaystackService` based on active configuration.

*   Rename current `PaymentService` to `MonnifyService`.
*   Create new `PaymentService` acting as a facade.
*   Unified methods: `initializePayment`, `verifyPayment`.

### Step 4: Admin Dashboard Updates
**File:** `app/dashboard/settings/page.tsx` & `components/features/admin/settings-form.tsx`
*   Add "Payment Gateways" tab.
*   Add form fields for Paystack (Enable/Disable, Keys).
*   Implement "Save Settings" action calling `SystemSettingsService`.

### Step 5: Checkout Flow
**File:** `app/checkout/page.tsx` (or relevant checkout component)
*   Fetch active payment provider from settings.
*   If Paystack is active, use `PaystackService.initializeTransaction`.
*   Handle the redirect URL from Paystack.

### Step 6: Callback Page
**File:** `app/payment/callback/page.tsx`
*   Detect if callback is from Monnify or Paystack (query params often differ, e.g., `reference` vs `paymentReference`).
*   Call the appropriate verification method.

### Step 7: Webhook Handler
**File:** `app/api/webhooks/paystack/route.ts`
*   Listen for `POST`.
*   Verify signature.
*   Process `charge.success`.

## 2. API Reference (Paystack)

### Initialize Transaction
**Endpoint:** `POST https://api.paystack.co/transaction/initialize`
**Headers:** `Authorization: Bearer SECRET_KEY`
**Body:**
```json
{
  "email": "customer@email.com",
  "amount": "20000",
  "reference": "UNIQUE_REF",
  "callback_url": "https://wawagarden.com/payment/callback"
}
```

### Verify Transaction
**Endpoint:** `GET https://api.paystack.co/transaction/verify/:reference`
**Headers:** `Authorization: Bearer SECRET_KEY`

## 3. Security Considerations
*   **Secret Keys:** Never expose in frontend code. Always route requests through Next.js Server Actions or API Routes.
*   **Verification:** Always verify the transaction status on the server side (via Verify API or Webhook) before giving value. Do not trust the frontend callback alone.
*   **Idempotency:** Ensure webhook events are processed idempotently (check if order is already paid before updating).

## 4. Testing
*   Use Paystack Test Keys.
*   Use [Paystack Test Cards](https://paystack.com/docs/payments/test-payments/) to simulate successful and failed transactions.
