# SOP: Agentic API Tab Settlement and Payment Processing

**Document ID:** SOP-AGENTIC-003
**Version:** 1.0
**Effective Date:** March 7, 2026
**Department:** Technical Integration
**Applies To:** AI Agents, Third-party Systems, POS Integrations, Payment Processors

---

## Purpose

This Standard Operating Procedure (SOP) provides technical specifications and step-by-step API integration instructions for agentic systems to programmatically settle tabs, process payments (online and manual), add tips, delete empty tabs, and retrieve tab analytics using the Wawa Garden Bar Public REST API.

---

## Scope

This SOP covers:
- API authentication and authorization for settlement and payment endpoints
- Checking tab status before settlement
- Initializing online payments and verifying payment status
- Recording manual payments (cash, transfer, card)
- Closing tabs after payment
- Adding tips to tabs
- Deleting empty or cancelled tabs
- Retrieving tab analytics and summaries

---

## Prerequisites

- Valid API key with required scopes
- HTTPS-capable client
- JSON request/response handling capability
- Error handling and retry logic implementation

---

## API Authentication

### Required Headers

All API requests must include authentication:

```http
x-api-key: wawa_your_api_key_here
Content-Type: application/json
```

**OR**

```http
Authorization: Bearer wawa_your_api_key_here
Content-Type: application/json
```

### Required API Key Scopes

- `tabs:read` - Look up tabs and tab analytics
- `tabs:write` - Close, update, and delete tabs
- `payments:read` - Verify payment status
- `payments:write` - Initialize and record payments

> **Role-Based Keys:** Select the **CSR** role when creating an API key (Admin Dashboard > Settings > API Keys) to automatically include all required scopes (`tabs:read`, `tabs:write`, `payments:read`, `payments:write`). Alternatively, use **Custom** to select individual scopes.

---

## Procedure

### Part 1: Checking Tab Status Before Settlement

Before settling a tab, retrieve the tab details to confirm its current status, outstanding orders, and total amount due.

**Endpoint:** `GET /api/public/tabs/{tabId}`
**Scope Required:** `tabs:read`

#### curl Example

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/tabs/tab_abc123" \
  -H "x-api-key: wawa_your_api_key_here"
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "_id": "tab_abc123",
    "tabNumber": "TAB-5-123456",
    "tableNumber": "5",
    "status": "open",
    "customerName": "John Doe",
    "subtotal": 4150,
    "serviceFee": 415,
    "tax": 0,
    "tipAmount": 0,
    "total": 4565,
    "orders": [
      {
        "_id": "order_001",
        "orderNumber": "WGB-A1B2C3",
        "status": "completed",
        "paymentStatus": "pending",
        "total": 800
      },
      {
        "_id": "order_002",
        "orderNumber": "WGB-D4E5F6",
        "status": "completed",
        "paymentStatus": "pending",
        "total": 3350
      }
    ],
    "openedAt": "2026-03-07T12:00:00Z"
  },
  "meta": {
    "timestamp": "2026-03-07T14:30:00Z"
  }
}
```

**Key fields to check before settlement:**

| Response Field | Check | Description |
|----------------|-------|-------------|
| `status` | Must be `"open"` | Tab must be open to process payments |
| `orders` | Review each order | Identify orders that need payment |
| `orders[].paymentStatus` | `"pending"` means unpaid | Only pending orders need payment |
| `orders[].status` | Check for `"completed"` | Orders should be completed before payment |
| `total` | Total amount due | Full tab amount including service fee and tax |
| `tipAmount` | Current tip | Any tip already added to the tab |

#### JavaScript Example

```javascript
/**
 * Retrieve tab details and check readiness for settlement.
 * Returns the tab object or throws if not settleable.
 */
async function getTabForSettlement(tabId) {
  const response = await fetch(
    `https://api.wawagardenbar.com/api/public/tabs/${tabId}`,
    { headers: { 'x-api-key': process.env.WAWA_API_KEY } }
  );
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to retrieve tab');
  }

  const tab = result.data;

  if (tab.status !== 'open') {
    throw new Error(`Tab ${tab.tabNumber} is already ${tab.status}`);
  }

  const unpaidOrders = tab.orders.filter(o => o.paymentStatus === 'pending');
  console.log(`Tab ${tab.tabNumber} — Total: ${tab.total}, Unpaid orders: ${unpaidOrders.length}`);

  return { tab, unpaidOrders };
}
```

**Error Responses:**

```json
// Tab not found (404)
{
  "success": false,
  "error": "Tab not found"
}
```

---

### Part 2: Processing Payment for Tab Orders

There are two payment methods: **online payment** (via payment gateway) and **manual payment** (cash, transfer, or card recorded by staff). Each order on the tab must be paid individually.

#### Method A: Online Payment (Payment Gateway)

##### Step 1: Initialize Payment

**Endpoint:** `POST /api/public/payments`
**Scope Required:** `payments:write`

**Request Body:**

```json
{
  "orderId": "order_001",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "redirectUrl": "https://yourapp.com/payment/callback",
  "paymentMethods": ["card", "bank_transfer", "ussd"]
}
```

**Field Specifications:**

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `orderId` | string | Yes | Order database ID to pay for | `"order_001"` |
| `customerName` | string | Yes | Customer full name | `"John Doe"` |
| `customerEmail` | string | Yes | Customer email for receipt | `"john@example.com"` |
| `redirectUrl` | string | Yes | URL to redirect after payment | `"https://yourapp.com/payment/callback"` |
| `paymentMethods` | array | No | Allowed payment methods on checkout page | `["card", "bank_transfer"]` |

##### curl Example

```bash
curl -X POST https://api.wawagardenbar.com/api/public/payments \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order_001",
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "redirectUrl": "https://yourapp.com/payment/callback",
    "paymentMethods": ["card", "bank_transfer", "ussd"]
  }'
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.paystack.com/abc123xyz",
    "paymentReference": "PAY-WGB-A1B2C3-1709820600",
    "provider": "paystack",
    "orderNumber": "WGB-A1B2C3",
    "amount": 800
  },
  "meta": {
    "timestamp": "2026-03-07T14:30:00Z"
  }
}
```

**Key fields to store:**

| Response Field | Use For | Description |
|----------------|---------|-------------|
| `checkoutUrl` | Customer redirect | Send customer to this URL to complete payment |
| `paymentReference` | Verification | Use this to verify payment status later |
| `provider` | Logging | Payment gateway provider name |
| `amount` | Display | Amount in NGN (Naira) |

**Error Responses:**

```json
// Order not found (404)
{
  "success": false,
  "error": "Order not found"
}

// Already paid (409)
{
  "success": false,
  "error": "Order has already been paid"
}
```

##### Step 2: Verify Payment

After the customer completes payment (or after a timeout), verify the payment status.

**Endpoint:** `POST /api/public/payments/verify`
**Scope Required:** `payments:read`

**Request Body:**

```json
{
  "paymentReference": "PAY-WGB-A1B2C3-1709820600"
}
```

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `paymentReference` | string | Yes | Reference returned from payment initialization | `"PAY-WGB-A1B2C3-1709820600"` |

##### curl Example

```bash
curl -X POST https://api.wawagardenbar.com/api/public/payments/verify \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentReference": "PAY-WGB-A1B2C3-1709820600"
  }'
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "paymentReference": "PAY-WGB-A1B2C3-1709820600",
    "status": "success",
    "amount": 800,
    "paidAt": "2026-03-07T14:32:15Z",
    "transactionReference": "TXN-PSK-9876543210",
    "provider": "paystack"
  },
  "meta": {
    "timestamp": "2026-03-07T14:32:20Z"
  }
}
```

**Payment Status Values:**

| Status | Meaning | Action |
|--------|---------|--------|
| `success` | Payment completed | Proceed to close tab |
| `pending` | Payment in progress | Poll again after delay |
| `failed` | Payment failed | Retry or use manual payment |

##### JavaScript Example: Online Payment Flow

```javascript
/**
 * Initialize online payment for an order and return the checkout URL.
 */
async function initializePayment(orderId, customerName, customerEmail, redirectUrl) {
  const response = await fetch('https://api.wawagardenbar.com/api/public/payments', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.WAWA_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      orderId,
      customerName,
      customerEmail,
      redirectUrl
    })
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to initialize payment');
  }

  return result.data;
}

/**
 * Verify payment status by reference. Polls until resolved or max attempts reached.
 */
async function verifyPayment(paymentReference, maxAttempts = 10) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch('https://api.wawagardenbar.com/api/public/payments/verify', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.WAWA_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ paymentReference })
    });
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to verify payment');
    }

    if (result.data.status === 'success') {
      return result.data;
    }

    if (result.data.status === 'failed') {
      throw new Error('Payment failed');
    }

    // Status is pending — wait and retry
    await new Promise(resolve => setTimeout(resolve, 3000 * attempt));
  }

  throw new Error('Payment verification timed out');
}
```

---

#### Method B: Manual Payment (Cash / Transfer / Card)

For payments handled in person (cash at register, bank transfer, or card swipe), record the payment directly.

**Endpoint:** `POST /api/public/payments/{orderId}/manual`
**Scope Required:** `payments:write`

**Request Body:**

```json
{
  "paymentType": "cash",
  "paymentReference": "CASH-20260307-001",
  "comments": "Paid in full at register"
}
```

**Field Specifications:**

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `paymentType` | string | Yes | Payment method: `"cash"`, `"transfer"`, or `"card"` | `"cash"` |
| `paymentReference` | string | Yes | Unique reference for this payment | `"CASH-20260307-001"` |
| `comments` | string | No | Optional notes about the payment | `"Paid in full at register"` |

##### curl Example: Cash Payment

```bash
curl -X POST https://api.wawagardenbar.com/api/public/payments/order_001/manual \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentType": "cash",
    "paymentReference": "CASH-20260307-001",
    "comments": "Paid in full at register"
  }'
```

##### curl Example: Bank Transfer Payment

```bash
curl -X POST https://api.wawagardenbar.com/api/public/payments/order_002/manual \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentType": "transfer",
    "paymentReference": "TRF-GTB-20260307-5678"
  }'
```

##### curl Example: Card Payment

```bash
curl -X POST https://api.wawagardenbar.com/api/public/payments/order_002/manual \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentType": "card",
    "paymentReference": "POS-TERM-20260307-9012",
    "comments": "POS terminal receipt #9012"
  }'
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "_id": "order_001",
    "orderNumber": "WGB-A1B2C3",
    "status": "completed",
    "paymentStatus": "paid",
    "paymentType": "cash",
    "paymentReference": "CASH-20260307-001",
    "total": 800,
    "paidAt": "2026-03-07T14:35:00Z"
  },
  "meta": {
    "timestamp": "2026-03-07T14:35:00Z"
  }
}
```

##### JavaScript Example: Manual Payment

```javascript
/**
 * Record a manual payment for an order.
 * @param {string} orderId - Order database ID
 * @param {"cash"|"transfer"|"card"} paymentType - Payment method
 * @param {string} paymentReference - Unique payment reference
 * @param {string} [comments] - Optional payment notes
 */
async function recordManualPayment(orderId, paymentType, paymentReference, comments) {
  const body = { paymentType, paymentReference };
  if (comments) body.comments = comments;

  const response = await fetch(
    `https://api.wawagardenbar.com/api/public/payments/${orderId}/manual`,
    {
      method: 'POST',
      headers: {
        'x-api-key': process.env.WAWA_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to record manual payment');
  }

  return result.data;
}
```

---

### Part 3: Closing the Tab

After all orders on the tab have been paid, close the tab to finalize the session.

**Endpoint:** `PATCH /api/public/tabs/{tabId}`
**Scope Required:** `tabs:write`

**Request Body:**

```json
{
  "action": "close"
}
```

#### curl Example

```bash
curl -X PATCH https://api.wawagardenbar.com/api/public/tabs/tab_abc123 \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "close"
  }'
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "_id": "tab_abc123",
    "tabNumber": "TAB-5-123456",
    "tableNumber": "5",
    "status": "closed",
    "customerName": "John Doe",
    "subtotal": 4150,
    "serviceFee": 415,
    "tax": 0,
    "tipAmount": 0,
    "total": 4565,
    "orders": ["order_001", "order_002"],
    "openedAt": "2026-03-07T12:00:00Z",
    "closedAt": "2026-03-07T14:40:00Z"
  },
  "meta": {
    "timestamp": "2026-03-07T14:40:00Z"
  }
}
```

**Error Responses:**

```json
// Tab not found (404)
{
  "success": false,
  "error": "Tab not found"
}

// Cannot close tab with unpaid orders (422)
{
  "success": false,
  "error": "Cannot close tab with unpaid orders"
}
```

#### JavaScript Example

```javascript
/**
 * Close a tab after all orders are paid.
 */
async function closeTab(tabId) {
  const response = await fetch(
    `https://api.wawagardenbar.com/api/public/tabs/${tabId}`,
    {
      method: 'PATCH',
      headers: {
        'x-api-key': process.env.WAWA_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'close' })
    }
  );
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to close tab');
  }

  console.log(`Tab ${result.data.tabNumber} closed at ${result.data.closedAt}`);
  return result.data;
}
```

---

### Part 4: Adding Tips

Add a tip to a tab before or after closing. The tip amount is in NGN.

**Endpoint:** `PATCH /api/public/tabs/{tabId}`
**Scope Required:** `tabs:write`

**Request Body:**

```json
{
  "tipAmount": 500
}
```

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `tipAmount` | number | Yes | Tip amount in NGN | `500` |

#### curl Example

```bash
curl -X PATCH https://api.wawagardenbar.com/api/public/tabs/tab_abc123 \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "tipAmount": 500
  }'
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "_id": "tab_abc123",
    "tabNumber": "TAB-5-123456",
    "tableNumber": "5",
    "status": "open",
    "customerName": "John Doe",
    "subtotal": 4150,
    "serviceFee": 415,
    "tax": 0,
    "tipAmount": 500,
    "total": 5065,
    "orders": ["order_001", "order_002"],
    "openedAt": "2026-03-07T12:00:00Z",
    "updatedAt": "2026-03-07T14:38:00Z"
  },
  "meta": {
    "timestamp": "2026-03-07T14:38:00Z"
  }
}
```

#### JavaScript Example

```javascript
/**
 * Add a tip to a tab.
 * @param {string} tabId - Tab database ID
 * @param {number} tipAmount - Tip amount in NGN
 */
async function addTip(tabId, tipAmount) {
  const response = await fetch(
    `https://api.wawagardenbar.com/api/public/tabs/${tabId}`,
    {
      method: 'PATCH',
      headers: {
        'x-api-key': process.env.WAWA_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tipAmount })
    }
  );
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to add tip');
  }

  console.log(`Tip of ${tipAmount} added to tab ${result.data.tabNumber}. New total: ${result.data.total}`);
  return result.data;
}
```

---

### Part 5: Renaming a Tab

Rename a tab to assign a custom label for identification.

**Endpoint:** `PATCH /api/public/tabs/{tabId}`
**Scope Required:** `tabs:write`

**Request Body:**

```json
{
  "customName": "VIP Table"
}
```

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `customName` | string | Yes | Custom display name for the tab | `"VIP Table"` |

#### curl Example

```bash
curl -X PATCH https://api.wawagardenbar.com/api/public/tabs/tab_abc123 \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "customName": "VIP Table"
  }'
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "_id": "tab_abc123",
    "tabNumber": "TAB-5-123456",
    "tableNumber": "5",
    "customName": "VIP Table",
    "status": "open",
    "customerName": "John Doe",
    "subtotal": 4150,
    "serviceFee": 415,
    "tax": 0,
    "tipAmount": 0,
    "total": 4565,
    "orders": ["order_001", "order_002"],
    "openedAt": "2026-03-07T12:00:00Z",
    "updatedAt": "2026-03-07T14:36:00Z"
  },
  "meta": {
    "timestamp": "2026-03-07T14:36:00Z"
  }
}
```

#### JavaScript Example

```javascript
/**
 * Rename a tab with a custom label.
 * @param {string} tabId - Tab database ID
 * @param {string} customName - New display name for the tab
 */
async function renameTab(tabId, customName) {
  const response = await fetch(
    `https://api.wawagardenbar.com/api/public/tabs/${tabId}`,
    {
      method: 'PATCH',
      headers: {
        'x-api-key': process.env.WAWA_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ customName })
    }
  );
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to rename tab');
  }

  console.log(`Tab ${result.data.tabNumber} renamed to "${customName}"`);
  return result.data;
}
```

---

### Part 6: Deleting Empty Tabs

Delete a tab that has no active orders. The tab must be open and all orders on it must be cancelled.

**Endpoint:** `DELETE /api/public/tabs/{tabId}`
**Scope Required:** `tabs:write`

#### curl Example

```bash
curl -X DELETE https://api.wawagardenbar.com/api/public/tabs/tab_abc123 \
  -H "x-api-key: wawa_your_api_key_here"
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "deleted": true,
    "tabId": "tab_abc123"
  },
  "meta": {
    "timestamp": "2026-03-07T14:45:00Z"
  }
}
```

**Error Responses:**

```json
// Cannot delete tab with active orders (422)
{
  "success": false,
  "error": "Cannot delete tab with active orders"
}

// Tab not found (404)
{
  "success": false,
  "error": "Tab not found"
}
```

#### JavaScript Example

```javascript
/**
 * Delete an empty tab (all orders must be cancelled).
 * @param {string} tabId - Tab database ID
 */
async function deleteTab(tabId) {
  const response = await fetch(
    `https://api.wawagardenbar.com/api/public/tabs/${tabId}`,
    {
      method: 'DELETE',
      headers: { 'x-api-key': process.env.WAWA_API_KEY }
    }
  );
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to delete tab');
  }

  console.log(`Tab ${tabId} deleted successfully`);
  return result.data;
}
```

---

### Part 7: Tab Analytics

Retrieve aggregated tab analytics for a given time period, including totals, status breakdowns, payment breakdowns, table usage, and daily series.

**Endpoint:** `GET /api/public/tabs/summary`
**Scope Required:** `tabs:read`

**Query Parameters:**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `period` | string | No | Predefined period | `"today"`, `"custom"` |
| `startDate` | string | Conditional | Start date (required when period is `"custom"`) | `"2026-03-01"` |
| `endDate` | string | Conditional | End date (required when period is `"custom"`) | `"2026-03-07"` |

#### curl Example: Today's Summary

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/tabs/summary?period=today" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### curl Example: Custom Date Range

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/tabs/summary?period=custom&startDate=2026-03-01&endDate=2026-03-07" \
  -H "x-api-key: wawa_your_api_key_here"
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "totals": {
      "tabCount": 42,
      "orderCount": 128,
      "revenue": 485000,
      "tips": 24500,
      "serviceFees": 48500,
      "averageTabValue": 11548
    },
    "byStatus": {
      "open": 5,
      "settling": 2,
      "closed": 35
    },
    "byPayment": {
      "paid": 112,
      "pending": 16,
      "cash": 45,
      "transfer": 30,
      "card": 25,
      "online": 12
    },
    "tableUsage": [
      { "tableNumber": "5", "tabCount": 8, "revenue": 92000 },
      { "tableNumber": "3", "tabCount": 6, "revenue": 78000 },
      { "tableNumber": "A1", "tabCount": 5, "revenue": 65000 }
    ],
    "dailySeries": [
      { "date": "2026-03-01", "tabCount": 6, "revenue": 68000 },
      { "date": "2026-03-02", "tabCount": 7, "revenue": 72000 },
      { "date": "2026-03-03", "tabCount": 5, "revenue": 55000 },
      { "date": "2026-03-04", "tabCount": 8, "revenue": 85000 },
      { "date": "2026-03-05", "tabCount": 6, "revenue": 70000 },
      { "date": "2026-03-06", "tabCount": 4, "revenue": 52000 },
      { "date": "2026-03-07", "tabCount": 6, "revenue": 83000 }
    ]
  },
  "meta": {
    "timestamp": "2026-03-07T15:00:00Z"
  }
}
```

#### JavaScript Example

```javascript
/**
 * Retrieve tab analytics for a given period.
 * @param {Object} options - Query options
 * @param {string} [options.period] - "today" or "custom"
 * @param {string} [options.startDate] - Start date (YYYY-MM-DD) for custom period
 * @param {string} [options.endDate] - End date (YYYY-MM-DD) for custom period
 */
async function getTabSummary({ period, startDate, endDate } = {}) {
  const url = new URL('https://api.wawagardenbar.com/api/public/tabs/summary');
  if (period) url.searchParams.append('period', period);
  if (startDate) url.searchParams.append('startDate', startDate);
  if (endDate) url.searchParams.append('endDate', endDate);

  const response = await fetch(url, {
    headers: { 'x-api-key': process.env.WAWA_API_KEY }
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to retrieve tab summary');
  }

  return result.data;
}

// Usage
const todaySummary = await getTabSummary({ period: 'today' });
console.log(`Today: ${todaySummary.totals.tabCount} tabs, revenue ${todaySummary.totals.revenue}`);

const weekSummary = await getTabSummary({
  period: 'custom',
  startDate: '2026-03-01',
  endDate: '2026-03-07'
});
```

---

## Complete Workflow Example

### Scenario: AI Agent Settles a Customer Tab

This workflow demonstrates the full end-to-end settlement flow: looking up the tab, paying each unpaid order, optionally adding a tip, and closing the tab.

```javascript
const API_BASE = 'https://api.wawagardenbar.com';
const headers = {
  'x-api-key': process.env.WAWA_API_KEY,
  'Content-Type': 'application/json'
};

// -- Helper: Fetch tab details --------------------------------------------------
async function getTab(tabId) {
  const response = await fetch(`${API_BASE}/api/public/tabs/${tabId}`, { headers });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Helper: Find open tab by table number --------------------------------------
async function findOpenTab(tableNumber) {
  const url = new URL(`${API_BASE}/api/public/tabs`);
  url.searchParams.append('tableNumber', tableNumber);
  url.searchParams.append('status', 'open');
  url.searchParams.append('limit', '1');

  const response = await fetch(url, { headers });
  const result = await response.json();
  if (!result.success || result.data.length === 0) return null;
  return result.data[0];
}

// -- Helper: Record manual payment for an order ---------------------------------
async function recordManualPayment(orderId, paymentType, paymentReference, comments) {
  const body = { paymentType, paymentReference };
  if (comments) body.comments = comments;

  const response = await fetch(`${API_BASE}/api/public/payments/${orderId}/manual`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Helper: Initialize online payment ------------------------------------------
async function initializePayment(orderId, customerName, customerEmail, redirectUrl) {
  const response = await fetch(`${API_BASE}/api/public/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ orderId, customerName, customerEmail, redirectUrl })
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Helper: Verify payment by reference ----------------------------------------
async function verifyPayment(paymentReference) {
  const response = await fetch(`${API_BASE}/api/public/payments/verify`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ paymentReference })
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Helper: Add tip to tab -----------------------------------------------------
async function addTip(tabId, tipAmount) {
  const response = await fetch(`${API_BASE}/api/public/tabs/${tabId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ tipAmount })
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Helper: Close tab ----------------------------------------------------------
async function closeTab(tabId) {
  const response = await fetch(`${API_BASE}/api/public/tabs/${tabId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ action: 'close' })
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Complete Settlement Workflow ------------------------------------------------
async function settleTabByTableNumber(tableNumber, tipAmount) {
  try {
    // Step 1: Find the open tab for the table
    const tab = await findOpenTab(tableNumber);
    if (!tab) throw new Error(`No open tab for table ${tableNumber}`);
    console.log(`Found tab ${tab.tabNumber} — Total: ${tab.total}`);

    // Step 2: Identify unpaid orders
    const unpaidOrders = tab.orders.filter(o => o.paymentStatus === 'pending');
    if (unpaidOrders.length === 0) {
      console.log('All orders already paid');
    } else {
      console.log(`${unpaidOrders.length} unpaid order(s) to process`);
    }

    // Step 3: Pay each unpaid order (using manual cash payment in this example)
    for (const order of unpaidOrders) {
      const ref = `CASH-${Date.now()}-${order._id.slice(-4)}`;
      const paid = await recordManualPayment(
        order._id,
        'cash',
        ref,
        `Settlement for tab ${tab.tabNumber}`
      );
      console.log(`Order ${paid.orderNumber} paid — ${paid.total}`);
    }

    // Step 4: Add tip if provided
    if (tipAmount && tipAmount > 0) {
      const updated = await addTip(tab._id, tipAmount);
      console.log(`Tip of ${tipAmount} added. New total: ${updated.total}`);
    }

    // Step 5: Close the tab
    const closed = await closeTab(tab._id);
    console.log(`Tab ${closed.tabNumber} closed at ${closed.closedAt}`);

    return closed;
  } catch (error) {
    console.error('Settlement error:', error.message);
    throw error;
  }
}

// -- Run the settlement workflow ------------------------------------------------
// Settle table 5 with a 500 NGN tip
settleTabByTableNumber('5', 500)
  .then(tab => console.log('Settlement complete:', tab.tabNumber))
  .catch(err => console.error('Failed:', err.message));
```

---

## Error Handling Best Practices

### Implement Retry Logic

```javascript
async function apiRequestWithRetry(url, options, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      const result = await response.json();

      // Success
      if (result.success) {
        return result;
      }

      // Business logic errors (don't retry)
      if (response.status === 404 || response.status === 409 || response.status === 422) {
        throw new Error(result.error);
      }

      // Server errors (retry)
      if (response.status >= 500) {
        lastError = new Error(result.error);
        await sleep(1000 * attempt);
        continue;
      }

      throw new Error(result.error);

    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) break;
      await sleep(1000 * attempt);
    }
  }

  throw lastError;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### All Error Responses

| HTTP Status | Error | Endpoint | Cause |
|-------------|-------|----------|-------|
| `401` | `Unauthorized` | All | Invalid or missing API key |
| `403` | `Forbidden` | All | API key lacks required scope |
| `404` | `Tab not found` | `GET /tabs/{tabId}`, `PATCH /tabs/{tabId}`, `DELETE /tabs/{tabId}` | Tab ID does not exist |
| `404` | `Order not found` | `POST /payments` | Order ID does not exist |
| `409` | `Order has already been paid` | `POST /payments` | Duplicate payment attempt |
| `422` | `Cannot close tab with unpaid orders` | `PATCH /tabs/{tabId}` (close) | One or more orders still unpaid |
| `422` | `Cannot delete tab with active orders` | `DELETE /tabs/{tabId}` | Tab has non-cancelled orders |
| `429` | `Too Many Requests` | All | Rate limit exceeded |
| `500` | `Internal Server Error` | All | Server-side failure (retry) |

---

## Quick Reference

### Endpoint Summary

| Endpoint | Method | Purpose | Required Scopes |
|----------|--------|---------|-----------------|
| `/api/public/tabs/{tabId}` | GET | Get tab details | `tabs:read` |
| `/api/public/tabs/{tabId}` | PATCH | Close tab, add tip, or rename tab | `tabs:write` |
| `/api/public/tabs/{tabId}` | DELETE | Delete empty tab | `tabs:write` |
| `/api/public/payments` | POST | Initialize online payment | `payments:write` |
| `/api/public/payments/{orderId}/manual` | POST | Record manual payment | `payments:write` |
| `/api/public/payments/verify` | POST | Verify payment status | `payments:read` |
| `/api/public/tabs/summary` | GET | Get tab analytics | `tabs:read` |

---

## Troubleshooting

### Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid API key | Verify API key is correct and active |
| `403 Forbidden` | Insufficient scopes | Request API key with `tabs:write`, `payments:write`, or `payments:read` scopes as needed |
| `404` "Tab not found" | Tab ID does not exist or was deleted | Verify the tab ID by listing tabs with `GET /api/public/tabs` |
| `404` "Order not found" | Order ID does not exist | Verify the order ID from the tab's orders array |
| `409` "Order has already been paid" | Duplicate payment attempt | Check payment status before initializing; skip already-paid orders |
| `422` "Cannot close tab with unpaid orders" | Attempting to close tab before all orders are paid | Pay all pending orders before calling close |
| `422` "Cannot delete tab with active orders" | Tab has orders that are not cancelled | Cancel all orders first, or close the tab instead |
| `429 Too Many Requests` | Rate limit exceeded (30 requests/minute) | Implement rate limiting, request queuing, and exponential backoff |
| Payment verification returns `"pending"` | Customer has not completed checkout | Poll the verify endpoint with exponential backoff; set a timeout |
| Payment verification returns `"failed"` | Customer cancelled or payment was declined | Retry with a new payment initialization or use manual payment |
| Tab total does not match expected amount | Service fee or tax applied automatically | Retrieve tab details to see the full breakdown including serviceFee, tax, and tipAmount |

---

## Related Documentation

- API Reference: `/docs/api/public-api-reference.md`
- Authentication Guide: `/docs/api/authentication.md`
- Error Codes: `/docs/api/error-codes.md`
- SOP-AGENTIC-001: Agentic API Tab and Order Management
- SOP-MANUAL-WAITER-001: Manual Tab and Order Management

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | March 7, 2026 | Technical Team | Initial release |

---

## Support

**For technical support:**
- API Documentation: https://docs.wawagardenbar.com/api
- Developer Support: dev-support@wawagardenbar.com
- Status Page: https://status.wawagardenbar.com

**For API key requests:**
- Contact: admin@wawagardenbar.com
- Dashboard: https://wawagardenbar.com/dashboard/settings/api-keys
