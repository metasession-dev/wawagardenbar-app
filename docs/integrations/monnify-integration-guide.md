# Monnify Payment Integration Guide

## Overview
This guide details the integration of Monnify One-Time Payments for the Wawa Garden Bar application, supporting four payment methods: Card, Transfer, USSD, and Phone Number.

**Official Documentation:** https://developers.monnify.com/docs/collections/one-time-payment

---

## Payment Methods Supported

### 1. **Pay with Card**
- Credit/Debit card payments
- Supports Visa, Mastercard, Verve
- Instant payment confirmation
- 3D Secure authentication

### 2. **Pay with Transfer**
- Bank account transfer
- Dynamic account number generation
- Real-time payment notification
- Supports all Nigerian banks

### 3. **Pay with USSD**
- USSD code generation for payment
- Works on all mobile phones
- No internet required
- Bank-specific USSD codes

### 4. **Pay with Phone Number**
- Payment via registered phone number
- Linked to customer's bank account
- Quick and convenient
- OTP verification

---

## Integration Architecture

### Server-Side Components

#### 1. Payment Service (`/services/payment-service.ts`)
```typescript
interface MonnifyPaymentRequest {
  amount: number;
  customerName: string;
  customerEmail: string;
  paymentReference: string;
  paymentDescription: string;
  currencyCode: string;
  contractCode: string;
  redirectUrl: string;
  paymentMethods: string[];
}

interface MonnifyPaymentResponse {
  requestSuccessful: boolean;
  responseMessage: string;
  responseBody: {
    transactionReference: string;
    paymentReference: string;
    merchantName: string;
    apiKey: string;
    enabledPaymentMethod: string[];
    checkoutUrl: string;
  };
}
```

**Key Functions:**
- `initializePayment()` - Create payment transaction
- `verifyPayment()` - Verify payment status
- `getTransactionStatus()` - Check transaction status
- `generatePaymentReference()` - Create unique reference

#### 2. Webhook Handler (`/app/api/webhooks/monnify/route.ts`)
```typescript
export async function POST(request: NextRequest) {
  // 1. Verify webhook signature
  // 2. Parse payment notification
  // 3. Update order status
  // 4. Send confirmation email
  // 5. Trigger real-time updates
}
```

**Webhook Events:**
- `PAID` - Payment successful
- `OVERPAID` - Payment exceeds amount
- `PARTIALLY_PAID` - Partial payment received
- `PENDING` - Payment initiated
- `FAILED` - Payment failed
- `CANCELLED` - Payment cancelled

#### 3. Payment API Routes

**Initialize Payment:** `/app/api/payments/initialize/route.ts`
```typescript
export async function POST(request: NextRequest) {
  // 1. Validate order details
  // 2. Generate payment reference
  // 3. Call Monnify API
  // 4. Return checkout URL
}
```

**Verify Payment:** `/app/api/payments/verify/route.ts`
```typescript
export async function POST(request: NextRequest) {
  // 1. Get payment reference
  // 2. Query Monnify API
  // 3. Update order status
  // 4. Return payment details
}
```

---

## Frontend Implementation

### Payment Flow Components

#### 1. Payment Method Selection (`/components/checkout/payment-method-selector.tsx`)
```typescript
interface PaymentMethod {
  id: 'CARD' | 'ACCOUNT_TRANSFER' | 'USSD' | 'PHONE_NUMBER';
  name: string;
  description: string;
  icon: LucideIcon;
  enabled: boolean;
}
```

**Features:**
- Visual payment method cards
- Method-specific instructions
- Disabled state for unavailable methods
- Mobile-optimized layout

#### 2. Payment Modal (`/components/checkout/payment-modal.tsx`)
```typescript
'use client';

interface PaymentModalProps {
  orderId: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}
```

**Features:**
- Embed Monnify checkout
- Handle payment callbacks
- Show loading states
- Error handling

#### 3. Payment Status Tracker (`/components/checkout/payment-status.tsx`)
```typescript
interface PaymentStatus {
  status: 'pending' | 'processing' | 'success' | 'failed';
  reference: string;
  message: string;
}
```

**Features:**
- Real-time status updates
- Progress indicators
- Success/failure animations
- Retry functionality

---

## Environment Configuration

### Required Environment Variables

```env
# Monnify Configuration
MONNIFY_API_KEY=your_api_key
MONNIFY_SECRET_KEY=your_secret_key
MONNIFY_CONTRACT_CODE=your_contract_code
MONNIFY_BASE_URL=https://sandbox.monnify.com
MONNIFY_WEBHOOK_SECRET=your_webhook_secret

# Payment Settings
NEXT_PUBLIC_PAYMENT_REDIRECT_URL=https://yourdomain.com/payment/callback
NEXT_PUBLIC_CURRENCY_CODE=NGN

# Feature Flags
ENABLE_CARD_PAYMENT=true
ENABLE_TRANSFER_PAYMENT=true
ENABLE_USSD_PAYMENT=true
ENABLE_PHONE_PAYMENT=true
```

---

## Database Schema Updates

### Payment Collection
```typescript
interface Payment {
  _id: ObjectId;
  orderId: ObjectId;
  paymentReference: string;
  transactionReference: string;
  amount: number;
  currency: string;
  paymentMethod: 'CARD' | 'ACCOUNT_TRANSFER' | 'USSD' | 'PHONE_NUMBER';
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
  customerEmail: string;
  customerName: string;
  paidAt?: Date;
  metadata: {
    monnifyResponse?: object;
    webhookData?: object;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Implementation Steps

### Phase 1: Backend Setup (Week 3, Day 1-2)

1. **Create Payment Service**
   ```bash
   # Create service file
   touch services/payment-service.ts
   ```
   - Implement Monnify API client
   - Add authentication logic
   - Create payment initialization
   - Add verification methods

2. **Set Up Webhook Handler**
   ```bash
   # Create webhook route
   mkdir -p app/api/webhooks/monnify
   touch app/api/webhooks/monnify/route.ts
   ```
   - Implement signature verification
   - Parse webhook payload
   - Update order status
   - Send notifications

3. **Create API Routes**
   ```bash
   # Create payment routes
   mkdir -p app/api/payments/{initialize,verify}
   touch app/api/payments/initialize/route.ts
   touch app/api/payments/verify/route.ts
   ```

### Phase 2: Frontend Integration (Week 3, Day 3-4)

1. **Payment Method Selector**
   - Create component with all four methods
   - Add icons and descriptions
   - Implement selection logic
   - Add validation

2. **Checkout Flow**
   - Integrate payment initialization
   - Handle Monnify redirect
   - Implement callback handling
   - Add error states

3. **Payment Status Page**
   - Create status tracking page
   - Add real-time updates
   - Implement retry logic
   - Add success/failure UI

### Phase 3: Testing (Week 3, Day 5)

1. **Test Each Payment Method**
   - Card payment flow
   - Transfer payment flow
   - USSD payment flow
   - Phone number payment flow

2. **Test Edge Cases**
   - Network failures
   - Timeout scenarios
   - Webhook delays
   - Duplicate payments

---

## Payment Method Instructions

### For Customers

#### Card Payment
1. Select "Pay with Card"
2. Enter card details
3. Complete 3D Secure authentication
4. Wait for confirmation

#### Bank Transfer
1. Select "Pay with Transfer"
2. Copy generated account number
3. Transfer exact amount from your bank app
4. Wait for automatic confirmation (usually instant)

#### USSD Payment
1. Select "Pay with USSD"
2. Choose your bank
3. Dial the generated USSD code
4. Follow prompts on your phone
5. Enter PIN to complete

#### Phone Number Payment
1. Select "Pay with Phone Number"
2. Enter registered phone number
3. Enter OTP sent to your phone
4. Confirm payment

---

## Security Considerations

### 1. API Key Management
- Store keys in environment variables
- Never expose in client-side code
- Rotate keys periodically
- Use different keys for test/production

### 2. Webhook Security
- Verify webhook signatures
- Validate payload structure
- Check transaction amounts
- Prevent replay attacks

### 3. Payment Verification
- Always verify on server-side
- Don't trust client-side status
- Check amount matches order
- Validate payment reference

### 4. Error Handling
- Log all payment errors
- Don't expose sensitive details
- Provide user-friendly messages
- Implement retry mechanisms

---

## Testing Strategy

### Sandbox Testing

**Test Cards:**
```
Card Number: 5061020000000000094
CVV: 123
Expiry: 12/25
PIN: 1234
OTP: 123456
```

**Test Transfer:**
- Use sandbox account numbers
- Test with various amounts
- Verify webhook delivery
- Check status updates

**Test USSD:**
- Use test bank codes
- Verify code generation
- Test timeout scenarios

**Test Phone Number:**
- Use sandbox phone numbers
- Test OTP delivery
- Verify payment flow

### Production Checklist
- [ ] All test cases passed
- [ ] Webhook endpoint accessible
- [ ] SSL certificate valid
- [ ] Production keys configured
- [ ] Error logging enabled
- [ ] Monitoring set up
- [ ] Backup payment method available

---

## Monitoring & Analytics

### Key Metrics to Track
1. **Payment Success Rate** (target: >95%)
2. **Average Payment Time**
3. **Method Usage Distribution**
4. **Failed Payment Reasons**
5. **Webhook Delivery Success**

### Logging Requirements
- All payment initializations
- All verification attempts
- All webhook receipts
- All payment failures
- All refund requests

---

## Error Handling

### Common Errors

| Error Code | Description | Action |
|------------|-------------|--------|
| `INVALID_AMOUNT` | Amount validation failed | Check order total |
| `DUPLICATE_REFERENCE` | Reference already used | Generate new reference |
| `INVALID_CREDENTIALS` | API key invalid | Check environment variables |
| `NETWORK_ERROR` | Connection failed | Retry with exponential backoff |
| `PAYMENT_TIMEOUT` | Payment took too long | Allow customer to retry |

### User-Facing Messages
- Keep messages simple and actionable
- Provide support contact information
- Offer alternative payment methods
- Allow easy retry

---

## Prompt for Implementation

```
Implement Monnify payment integration for Wawa Garden Bar:

1. Create PaymentService in /services/payment-service.ts:
   - Initialize payment with Monnify API
   - Support four methods: CARD, ACCOUNT_TRANSFER, USSD, PHONE_NUMBER
   - Implement payment verification
   - Add transaction status checking
   - Use proper TypeScript interfaces

2. Create webhook handler at /app/api/webhooks/monnify/route.ts:
   - Verify Monnify webhook signature
   - Parse payment notification payload
   - Update order status in database
   - Send confirmation email via Server Action
   - Trigger Socket.io event for real-time updates

3. Create payment API routes:
   - /app/api/payments/initialize - Initialize payment
   - /app/api/payments/verify - Verify payment status
   - Use Server Actions where appropriate
   - Implement proper error handling

4. Build frontend components:
   - PaymentMethodSelector with four method cards
   - PaymentModal with Monnify checkout integration
   - PaymentStatus page with real-time updates
   - Use React Hook Form for payment forms
   - Wrap in Suspense with loading states

5. Add payment models and interfaces:
   - Payment interface in /interfaces
   - Payment Mongoose model in /models
   - Zod validation schemas

Follow these principles:
- Server-side payment verification only
- Minimal client-side payment logic
- Proper error handling and logging
- Mobile-first responsive design
- Accessibility best practices
```

---

## Support & Resources

- **Monnify Docs:** https://developers.monnify.com/docs
- **API Reference:** https://developers.monnify.com/api-reference
- **Support Email:** support@monnify.com
- **Sandbox Dashboard:** https://sandbox.monnify.com

---

*This guide should be updated as the Monnify API evolves or new features are added.*
