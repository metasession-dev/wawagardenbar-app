# Testing Monnify Payment Confirmation on Localhost

This guide explains how to test the Monnify payment integration locally during development.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Testing Methods](#testing-methods)
- [Test Cards & Data](#test-cards--data)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

1. **Node.js & npm** - Already installed with the project
2. **ngrok** - For exposing localhost to receive webhooks
   - Download: https://ngrok.com/download
   - Sign up for free account to get auth token
3. **tsx** - TypeScript execution (install as dev dependency)
   ```bash
   npm install -D tsx
   ```

### Monnify Account Setup

1. Create a Monnify Sandbox account: https://sandbox.monnify.com
2. Get your credentials:
   - API Key
   - Secret Key
   - Contract Code
3. Configure in `.env.local`:
   ```env
   MONNIFY_BASE_URL=https://sandbox.monnify.com
   MONNIFY_API_KEY=your_api_key
   MONNIFY_SECRET_KEY=your_secret_key
   MONNIFY_CONTRACT_CODE=your_contract_code
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

---

## Environment Setup

### 1. Start Development Server

```bash
npm run dev
```

Server runs on `http://localhost:3000`

### 2. Setup ngrok Tunnel

```bash
# Authenticate ngrok (first time only)
ngrok config add-authtoken YOUR_NGROK_TOKEN

# Start tunnel
ngrok http 3000
```

You'll get a public URL like: `https://abc123.ngrok-free.app`

### 3. Configure Monnify Webhook

1. Login to Monnify Sandbox Dashboard
2. Navigate to **Settings → API Settings → Webhooks**
3. Set webhook URL to: `https://your-ngrok-url.ngrok-free.app/api/webhooks/monnify`
4. Save configuration

**Note:** Update this URL each time you restart ngrok (free tier generates new URLs)

---

## Testing Methods

### Method 1: Full End-to-End Flow (Recommended)

This simulates the complete user journey from checkout to payment confirmation.

#### Steps:

1. **Start both servers:**
   ```bash
   # Terminal 1
   npm run dev
   
   # Terminal 2
   ngrok http 3000
   ```

2. **Update Monnify webhook URL** with your ngrok URL

3. **Navigate to checkout:**
   ```
   http://localhost:3000/menu?type=dine-in&table=1
   ```

4. **Add items to cart and proceed to checkout**

5. **Fill out checkout form:**
   - Customer Info: Any valid email/phone
   - Order Details: Select order type
   - Payment Method: Choose any method

6. **Complete payment on Monnify:**
   - Use test card: `5061020000000000094`
   - CVV: `123`
   - Expiry: Any future date (e.g., `12/25`)
   - PIN: `1234`

7. **Verify results:**
   - You'll be redirected to `/orders/[orderId]`
   - Check console logs for webhook processing
   - Order status should show "confirmed"

#### Expected Console Output:

```
Monnify webhook received: {
  paymentReference: 'WAWA-...',
  status: 'PAID',
  amount: 5000
}
Order confirmed: 673123abc456
```

---

### Method 2: Simulate Webhook Locally

Test webhook processing without going through the full payment flow.

#### Steps:

1. **Create an order** (through UI or directly in database)
   - Note the `orderId` and `paymentReference`

2. **Run the webhook test script:**
   ```bash
   npx tsx scripts/test-webhook.ts <orderId> <paymentReference>
   ```

   **Example:**
   ```bash
   npx tsx scripts/test-webhook.ts 673123abc456 WAWA-673123abc456-1234567890-ABC123
   ```

3. **Check the response:**
   ```json
   {
     "success": true,
     "message": "Webhook processed successfully"
   }
   ```

4. **Verify order status:**
   - Navigate to `/orders/[orderId]`
   - Status should be "confirmed"
   - Payment status should be "paid"

#### Script Details:

The `test-webhook.ts` script:
- Generates a realistic Monnify webhook payload
- Creates proper HMAC signature for authentication
- Sends POST request to your local webhook endpoint
- Simulates successful payment by default

**Modify for different scenarios:**
```typescript
// In scripts/test-webhook.ts, change paymentStatus:
paymentStatus: 'PAID',      // Success
paymentStatus: 'FAILED',    // Failed payment
paymentStatus: 'PENDING',   // Pending payment
```

---

### Method 3: Manual Payment Verification

Verify payment status after completing payment on Monnify.

#### Steps:

1. **Complete a payment** on Monnify (Method 1, steps 1-6)

2. **Note the payment reference** from the order

3. **Run verification script:**
   ```bash
   npx tsx scripts/verify-payment.ts <paymentReference>
   ```

   **Example:**
   ```bash
   npx tsx scripts/verify-payment.ts WAWA-673123abc456-1234567890-ABC123
   ```

4. **Review verification result:**
   ```json
   {
     "success": true,
     "data": {
       "transactionReference": "MNFY|20231115|...",
       "paymentReference": "WAWA-...",
       "amountPaid": 5000,
       "paymentStatus": "PAID",
       "paymentMethod": "CARD",
       "paidOn": "2023-11-15T10:30:00Z"
     }
   }
   ```

#### Use Cases:

- Debugging payment issues
- Checking payment status without webhooks
- Manual order confirmation
- Testing verification logic

---

### Method 4: API Testing with cURL

Test individual API endpoints directly.

#### Test Webhook Endpoint Health:

```bash
curl http://localhost:3000/api/webhooks/monnify
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "Monnify webhook endpoint is active"
}
```

#### Test Payment Verification Endpoint:

```bash
curl -X POST http://localhost:3000/api/payment/verify \
  -H "Content-Type: application/json" \
  -d '{"paymentReference": "WAWA-673123abc456-1234567890-ABC123"}'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "transactionReference": "MNFY|...",
    "paymentReference": "WAWA-...",
    "amountPaid": 5000,
    "paymentStatus": "PAID",
    "paymentMethod": "CARD",
    "paidOn": "2023-11-15T10:30:00Z"
  }
}
```

---

## Test Cards & Data

### Monnify Sandbox Test Cards

#### Successful Payment:
```
Card Number: 5061020000000000094
CVV: 123
Expiry: 12/25 (any future date)
PIN: 1234
```

#### Failed Payment (Insufficient Funds):
```
Card Number: 5060990580000217499
CVV: 123
Expiry: 12/25
PIN: 1234
```

#### Other Test Cards:
```
Card Number: 5399838383838381 (Mastercard)
Card Number: 4111111111111111 (Visa)
CVV: 123
Expiry: Any future date
PIN: 1234
```

### Test Customer Data

```json
{
  "customerName": "Test Customer",
  "customerEmail": "test@example.com",
  "customerPhone": "+2348012345678"
}
```

### Test Order Data

```json
{
  "orderType": "dine-in",
  "tableNumber": "T12",
  "items": [
    {
      "id": "menu_item_id",
      "name": "Jollof Rice",
      "price": 2500,
      "quantity": 2
    }
  ]
}
```

---

## Troubleshooting

### Webhook Not Received

**Problem:** Webhook endpoint not receiving notifications from Monnify.

**Solutions:**

1. **Check ngrok is running:**
   ```bash
   # Should show forwarding URL
   ngrok http 3000
   ```

2. **Verify webhook URL in Monnify:**
   - Must be the ngrok HTTPS URL
   - Must include `/api/webhooks/monnify` path
   - Example: `https://abc123.ngrok-free.app/api/webhooks/monnify`

3. **Check ngrok web interface:**
   - Visit: `http://localhost:4040`
   - View incoming requests and responses

4. **Verify webhook signature:**
   - Check `MONNIFY_SECRET_KEY` in `.env.local`
   - Ensure it matches Monnify dashboard

### Payment Verification Fails

**Problem:** `verifyPayment` returns error or "not found".

**Solutions:**

1. **Check payment reference format:**
   ```
   Correct: WAWA-673123abc456-1234567890-ABC123
   Incorrect: 673123abc456 (missing prefix)
   ```

2. **Verify Monnify credentials:**
   - API Key and Secret Key must be from sandbox
   - Check `.env.local` configuration

3. **Check MongoDB connection:**
   ```bash
   # In console, look for:
   MongooseServerSelectionError: connect ECONNREFUSED
   ```
   - Start MongoDB: `sudo systemctl start mongod`

4. **Check order exists:**
   - Query database for order with payment reference
   - Verify `paymentReference` field is set

### Order Status Not Updating

**Problem:** Order remains "pending" after successful payment.

**Solutions:**

1. **Check webhook processing logs:**
   ```
   Look for: "Order confirmed: [orderId]"
   ```

2. **Verify status mapping:**
   ```typescript
   // In webhook handler
   'PAID' → 'paid' (payment status)
   'paid' → 'confirmed' (order status)
   ```

3. **Check database directly:**
   ```javascript
   // In MongoDB shell or Compass
   db.orders.findOne({ _id: ObjectId("...") })
   ```

4. **Verify statusHistory update:**
   - Should have entry with status: "confirmed"
   - Timestamp should match payment time

### ngrok Session Expired

**Problem:** ngrok tunnel stops working after 2 hours (free tier).

**Solutions:**

1. **Restart ngrok:**
   ```bash
   # Stop current session (Ctrl+C)
   # Start new session
   ngrok http 3000
   ```

2. **Update Monnify webhook URL** with new ngrok URL

3. **Consider ngrok paid plan** for persistent URLs

4. **Alternative: Use localtunnel:**
   ```bash
   npx localtunnel --port 3000
   ```

### Database Connection Issues

**Problem:** MongoDB connection errors.

**Solutions:**

1. **Start MongoDB:**
   ```bash
   sudo systemctl start mongod
   sudo systemctl status mongod
   ```

2. **Check connection string:**
   ```env
   # In .env.local
   MONGODB_URI=mongodb://localhost:27017/wawagardenbar
   ```

3. **Verify MongoDB is running:**
   ```bash
   mongosh
   # Should connect successfully
   ```

### CORS Errors

**Problem:** CORS errors when testing from different origin.

**Solutions:**

1. **Use same origin** (localhost:3000)

2. **Configure CORS** in `next.config.js` if needed

3. **Use ngrok URL** for both app and webhooks

---

## Testing Checklist

### Before Testing:

- [ ] MongoDB is running
- [ ] `.env.local` has all Monnify credentials
- [ ] Dev server is running (`npm run dev`)
- [ ] ngrok tunnel is active (for webhook testing)
- [ ] Monnify webhook URL is configured

### During Testing:

- [ ] Cart has items before checkout
- [ ] All form fields are filled correctly
- [ ] Test card details are entered correctly
- [ ] Console logs show webhook received
- [ ] Order status updates to "confirmed"
- [ ] Payment status updates to "paid"

### After Testing:

- [ ] Check order in database
- [ ] Verify statusHistory is updated
- [ ] Confirm paidAt timestamp is set
- [ ] Test order details page displays correctly

---

## Advanced Testing Scenarios

### Test Different Payment Methods

```typescript
// Modify checkout form to test:
paymentMethod: 'CARD'              // Card payment
paymentMethod: 'ACCOUNT_TRANSFER'  // Bank transfer
paymentMethod: 'USSD'              // USSD code
paymentMethod: 'PHONE_NUMBER'      // Phone number
```

### Test Different Order Types

```typescript
// Test each order type:
orderType: 'dine-in'    // Table number required
orderType: 'pickup'     // Pickup time required
orderType: 'delivery'   // Delivery address required
```

### Test Edge Cases

1. **Duplicate webhook:**
   - Send same webhook twice
   - Order should not duplicate

2. **Late webhook:**
   - Complete payment
   - Wait 5 minutes
   - Send webhook manually
   - Should still update order

3. **Invalid signature:**
   - Modify webhook payload
   - Should return 401 Unauthorized

4. **Unknown payment reference:**
   - Use non-existent reference
   - Should return 404 Not Found

---

## Monitoring & Debugging

### Console Logs to Watch

```bash
# Successful webhook processing:
Monnify webhook received: { paymentReference: '...', status: 'PAID', amount: 5000 }
Order confirmed: 673123abc456

# Failed webhook:
Invalid webhook signature
Order not found for payment reference: ...

# Payment verification:
Verifying payment: WAWA-...
Payment verified successfully
```

### Database Queries

```javascript
// Check order status
db.orders.findOne({ _id: ObjectId("673123abc456") })

// Find orders by payment reference
db.orders.find({ paymentReference: "WAWA-..." })

// Check recent orders
db.orders.find().sort({ createdAt: -1 }).limit(5)

// Check payment status distribution
db.orders.aggregate([
  { $group: { _id: "$paymentStatus", count: { $sum: 1 } } }
])
```

### ngrok Web Interface

Access `http://localhost:4040` to see:
- All HTTP requests to your tunnel
- Request/response headers and bodies
- Replay requests for debugging
- Request timing and status codes

---

## Best Practices

1. **Always use sandbox environment** for testing
2. **Never commit** `.env.local` with real credentials
3. **Clear test data** regularly from database
4. **Use descriptive order numbers** for easy identification
5. **Log all webhook events** for debugging
6. **Test all payment methods** before production
7. **Verify webhook signature** in production
8. **Handle webhook retries** gracefully
9. **Set up monitoring** for failed payments
10. **Document any custom test scenarios**

---

## Quick Reference

### Start Testing (Full Flow)

```bash
# Terminal 1: Dev server
npm run dev

# Terminal 2: ngrok
ngrok http 3000

# Terminal 3: Watch logs
npm run dev | grep -i "monnify\|payment\|order"
```

### Test Webhook Manually

```bash
npx tsx scripts/test-webhook.ts <orderId> <paymentReference>
```

### Verify Payment

```bash
npx tsx scripts/verify-payment.ts <paymentReference>
```

### Check Webhook Health

```bash
curl http://localhost:3000/api/webhooks/monnify
```

---

## Additional Resources

- **Monnify Documentation:** https://developers.monnify.com/docs
- **ngrok Documentation:** https://ngrok.com/docs
- **Next.js API Routes:** https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- **Webhook Best Practices:** https://webhooks.fyi/best-practices/

---

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review Monnify sandbox logs
3. Check ngrok request inspector
4. Review application console logs
5. Verify database state

---

**Last Updated:** November 2025  
**Version:** 1.0.0
