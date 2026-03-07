# SOP: Agentic API Order Lifecycle Management

**Document ID:** SOP-API-004
**Version:** 1.0
**Effective Date:** March 7, 2026
**Department:** Technical Integration
**Applies To:** AI Agents, Third-party Systems, KDS Integrations, Order Management Platforms

---

## Purpose

This Standard Operating Procedure (SOP) provides technical specifications and step-by-step API integration instructions for agentic systems to programmatically monitor orders, advance order status through kitchen and delivery workflows, cancel orders, and retrieve order analytics using the Wawa Garden Bar Public REST API.

This SOP serves as the API equivalent of SOP-WAITER-003 (order modifications and cancellations) and SOP-KITCHEN-001 (kitchen display operations).

---

## Scope

This SOP covers:
- API authentication and authorization for order lifecycle operations
- Order status flow and valid state transitions
- Monitoring and filtering orders
- Retrieving detailed order information
- Advancing order status through kitchen workflow stages
- Updating delivery statuses
- Cancelling orders with required notes
- Retrieving order analytics and summaries
- Error handling and business rule enforcement

---

## Prerequisites

- Valid API key with required scopes
- HTTPS-capable client
- JSON request/response handling capability
- Error handling and retry logic implementation
- Understanding of order status flow and valid transitions

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

- `orders:read` - List orders, retrieve order details, view statistics and summaries
- `orders:write` - Update order status, cancel orders

> **Role-Based Keys:** Select the **Customer** role when creating an API key (Admin Dashboard > Settings > API Keys) to automatically include all required scopes (`orders:read`, `orders:write`). Alternatively, use **Custom** to select individual scopes.

---

## Order Status Flow

### Standard Order Flow (Dine-in / Takeaway)

```
pending --> confirmed --> preparing --> ready --> completed
```

### Delivery Order Flow

```
pending --> confirmed --> preparing --> ready --> out-for-delivery --> delivered --> completed
```

### Cancellation Flow

```
pending ----> cancelled (note required)
confirmed --> cancelled (note required)
```

### Status Definitions

| Status | Description | Next Valid Statuses |
|--------|-------------|---------------------|
| `pending` | Order received, awaiting confirmation | `confirmed`, `cancelled` |
| `confirmed` | Order accepted by kitchen | `preparing`, `cancelled` |
| `preparing` | Kitchen is actively preparing the order | `ready` |
| `ready` | Order is ready for pickup or serving | `completed`, `out-for-delivery` |
| `out-for-delivery` | Order dispatched for delivery | `delivered` |
| `delivered` | Order delivered to customer | `completed` |
| `completed` | Order fulfilled, lifecycle complete | (terminal state) |
| `cancelled` | Order cancelled before preparation | (terminal state) |

### Cancellation Constraints

Orders can only be cancelled when ALL of the following are true:
- Status is `pending` or `confirmed`
- Order has not been paid
- Associated tab is not in `settling` status
- A cancellation note is provided

When an order is cancelled:
- Inventory is automatically restored
- Tab totals are automatically recalculated

---

## Procedure

### Part 1: Monitoring Orders

Use the order listing endpoint to monitor incoming orders, filter by status, and track order progress.

**Endpoint:** `GET /api/public/orders`
**Base URL:** `https://api.wawagardenbar.com`
**Scope Required:** `orders:read`

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `status` | string | Filter by order status | `"pending"`, `"preparing"`, `"ready"` |
| `orderType` | string | Filter by order type | `"dine-in"`, `"delivery"`, `"takeaway"` |
| `paymentStatus` | string | Filter by payment status | `"pending"`, `"paid"` |
| `startDate` | string | Filter orders from this date (ISO 8601) | `"2026-03-07T00:00:00Z"` |
| `endDate` | string | Filter orders until this date (ISO 8601) | `"2026-03-07T23:59:59Z"` |
| `customerId` | string | Filter by customer ObjectId | `"665a1b2c3d4e5f6a7b8c9d0e"` |
| `orderNumber` | string | Exact match by order number (404 if not found) | `"WGB-A1B2C3"` |
| `sort` | string | Sort field and direction | `"createdAt"`, `"-createdAt"` |
| `page` | number | Page number (default: 1) | `1` |
| `limit` | number | Items per page (default: 25, max: 100) | `10` |

#### Step 1: List Pending Orders (KDS Polling)

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/orders?status=pending&sort=createdAt&limit=50" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### Step 2: Handle Response

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "order_abc123",
      "orderNumber": "WGB-A1B2C3",
      "status": "pending",
      "orderType": "dine-in",
      "items": [
        {
          "menuItemId": "item_123",
          "name": "Star Lager Beer",
          "quantity": 2,
          "portionSize": "full",
          "price": 800,
          "subtotal": 1600
        },
        {
          "menuItemId": "item_456",
          "name": "Jollof Rice",
          "quantity": 1,
          "portionSize": "full",
          "price": 3500,
          "subtotal": 3500
        }
      ],
      "customer": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+2348012345678"
      },
      "subtotal": 5100,
      "tax": 0,
      "total": 5100,
      "statusHistory": [
        {
          "status": "pending",
          "timestamp": "2026-03-07T12:00:00Z",
          "note": null
        }
      ],
      "createdAt": "2026-03-07T12:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 3,
    "totalPages": 1,
    "timestamp": "2026-03-07T12:01:00Z"
  }
}
```

#### Step 3: Filter by Multiple Criteria

```bash
# Today's delivery orders that are being prepared
curl -X GET "https://api.wawagardenbar.com/api/public/orders?status=preparing&orderType=delivery&startDate=2026-03-07T00:00:00Z&endDate=2026-03-07T23:59:59Z" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### Step 4: Look Up by Order Number

When `orderNumber` is provided, the API returns an exact match. If the order does not exist, a 404 is returned.

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/orders?orderNumber=WGB-A1B2C3" \
  -H "x-api-key: wawa_your_api_key_here"
```

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "error": "Order not found"
}
```

---

### Part 2: Retrieving Order Details

Use the order detail endpoint to retrieve full information about a single order, including items, customer data, payment details, status history, and financial metrics.

**Endpoint:** `GET /api/public/orders/{orderId}`
**Scope Required:** `orders:read`

#### Step 1: Send Request

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/orders/order_abc123" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### Step 2: Handle Response

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "_id": "order_abc123",
    "orderNumber": "WGB-A1B2C3",
    "status": "preparing",
    "orderType": "dine-in",
    "dineInDetails": {
      "tableNumber": "5"
    },
    "items": [
      {
        "menuItemId": "item_123",
        "name": "Star Lager Beer",
        "quantity": 2,
        "portionSize": "full",
        "price": 800,
        "subtotal": 1600,
        "customizations": [],
        "specialInstructions": null
      },
      {
        "menuItemId": "item_456",
        "name": "Jollof Rice",
        "quantity": 1,
        "portionSize": "full",
        "price": 3500,
        "subtotal": 3500,
        "customizations": [
          { "name": "Protein", "option": "Chicken", "price": 500 }
        ],
        "specialInstructions": "Extra spicy"
      }
    ],
    "customer": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+2348012345678"
    },
    "subtotal": 5100,
    "tax": 0,
    "deliveryFee": 0,
    "discount": 0,
    "total": 5100,
    "paymentStatus": "pending",
    "totalCost": 2800,
    "grossProfit": 2300,
    "profitMargin": 45.1,
    "specialInstructions": "Customer has peanut allergy",
    "estimatedWaitTime": 15,
    "statusHistory": [
      {
        "status": "pending",
        "timestamp": "2026-03-07T12:00:00Z",
        "note": null
      },
      {
        "status": "confirmed",
        "timestamp": "2026-03-07T12:01:00Z",
        "note": null
      },
      {
        "status": "preparing",
        "timestamp": "2026-03-07T12:02:00Z",
        "note": null
      }
    ],
    "createdAt": "2026-03-07T12:00:00Z",
    "updatedAt": "2026-03-07T12:02:00Z"
  },
  "meta": {
    "timestamp": "2026-03-07T12:05:00Z"
  }
}
```

**Key Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Order database ID |
| `orderNumber` | string | Human-readable order number |
| `status` | string | Current order status |
| `orderType` | string | `"dine-in"`, `"delivery"`, or `"takeaway"` |
| `items` | array | Order line items with details |
| `customer` | object | Customer name, email, phone |
| `paymentStatus` | string | `"pending"` or `"paid"` |
| `totalCost` | number | Cost of goods in NGN |
| `grossProfit` | number | Revenue minus cost in NGN |
| `profitMargin` | number | Profit margin percentage |
| `statusHistory` | array | Chronological status transitions |
| `estimatedWaitTime` | number | Estimated wait in minutes |

**Error Response (404 Not Found):**

```json
{
  "success": false,
  "error": "Order not found"
}
```

---

### Part 3: Advancing Order Status (Kitchen Workflow)

Use the order update endpoint to advance orders through the kitchen workflow: confirm, prepare, and mark as ready.

**Endpoint:** `PATCH /api/public/orders/{orderId}`
**Scope Required:** `orders:write`

#### Step 1: Confirm a Pending Order

```bash
curl -X PATCH "https://api.wawagardenbar.com/api/public/orders/order_abc123" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "confirmed"
  }'
```

#### Step 2: Move to Preparing

```bash
curl -X PATCH "https://api.wawagardenbar.com/api/public/orders/order_abc123" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "preparing"
  }'
```

#### Step 3: Mark as Ready

```bash
curl -X PATCH "https://api.wawagardenbar.com/api/public/orders/order_abc123" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ready",
    "note": "All items plated and ready for service"
  }'
```

#### Step 4: Mark as Completed

```bash
curl -X PATCH "https://api.wawagardenbar.com/api/public/orders/order_abc123" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed"
  }'
```

#### Request Body Specification

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `status` | string | Yes | Target status | `"confirmed"`, `"preparing"`, `"ready"`, `"completed"` |
| `note` | string | No (required for cancellation) | Optional note for status transition | `"Priority order - VIP table"` |

#### Handle Response

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "_id": "order_abc123",
    "orderNumber": "WGB-A1B2C3",
    "status": "confirmed",
    "orderType": "dine-in",
    "items": [
      {
        "menuItemId": "item_123",
        "name": "Star Lager Beer",
        "quantity": 2,
        "price": 800,
        "subtotal": 1600
      }
    ],
    "subtotal": 5100,
    "total": 5100,
    "statusHistory": [
      {
        "status": "pending",
        "timestamp": "2026-03-07T12:00:00Z",
        "note": null
      },
      {
        "status": "confirmed",
        "timestamp": "2026-03-07T12:01:00Z",
        "note": null
      }
    ],
    "updatedAt": "2026-03-07T12:01:00Z"
  },
  "meta": {
    "timestamp": "2026-03-07T12:01:00Z"
  }
}
```

**Error Response (422 Unprocessable Entity):**

```json
{
  "success": false,
  "error": "Invalid status transition from 'pending' to 'ready'"
}
```

---

### Part 4: Delivery Status Updates

For delivery orders, additional status transitions are available between `ready` and `completed`.

**Endpoint:** `PATCH /api/public/orders/{orderId}`
**Scope Required:** `orders:write`

#### Step 1: Mark as Out for Delivery

```bash
curl -X PATCH "https://api.wawagardenbar.com/api/public/orders/order_del789" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "out-for-delivery",
    "note": "Dispatched with rider Emeka - ETA 25 minutes"
  }'
```

#### Step 2: Mark as Delivered

```bash
curl -X PATCH "https://api.wawagardenbar.com/api/public/orders/order_del789" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "delivered",
    "note": "Delivered to customer at gate"
  }'
```

#### Step 3: Complete the Delivery Order

```bash
curl -X PATCH "https://api.wawagardenbar.com/api/public/orders/order_del789" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed"
  }'
```

---

### Part 5: Cancelling Orders

Orders can only be cancelled from `pending` or `confirmed` status. A cancellation note is required.

**Endpoint:** `PATCH /api/public/orders/{orderId}`
**Scope Required:** `orders:write`

#### Step 1: Prepare Cancellation Request

A `note` field is **REQUIRED** when setting status to `cancelled`. The request will be rejected without it.

#### Step 2: Send Cancellation Request

```bash
curl -X PATCH "https://api.wawagardenbar.com/api/public/orders/order_abc123" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "cancelled",
    "note": "Customer changed mind before preparation started"
  }'
```

#### Step 3: Handle Response

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "_id": "order_abc123",
    "orderNumber": "WGB-A1B2C3",
    "status": "cancelled",
    "orderType": "dine-in",
    "items": [
      {
        "menuItemId": "item_123",
        "name": "Star Lager Beer",
        "quantity": 2,
        "price": 800,
        "subtotal": 1600
      }
    ],
    "subtotal": 5100,
    "total": 5100,
    "statusHistory": [
      {
        "status": "pending",
        "timestamp": "2026-03-07T12:00:00Z",
        "note": null
      },
      {
        "status": "cancelled",
        "timestamp": "2026-03-07T12:03:00Z",
        "note": "Customer changed mind before preparation started"
      }
    ],
    "updatedAt": "2026-03-07T12:03:00Z"
  },
  "meta": {
    "timestamp": "2026-03-07T12:03:00Z"
  }
}
```

**Side Effects of Cancellation:**
- Inventory for all items in the order is automatically restored
- If the order is attached to a tab, the tab totals are automatically recalculated

#### Cancellation Error Responses

**Missing note (422):**

```json
{
  "success": false,
  "error": "A note is required when cancelling an order"
}
```

**Order already preparing (422):**

```json
{
  "success": false,
  "error": "Invalid status transition from 'preparing' to 'cancelled'"
}
```

**Order already paid (422):**

```json
{
  "success": false,
  "error": "Cannot cancel a paid order"
}
```

**Tab is settling (422):**

```json
{
  "success": false,
  "error": "Cannot cancel an order on a settling tab"
}
```

---

### Part 6: Order Analytics

Use the statistics and summary endpoints to retrieve aggregate order data for reporting and AI analysis.

**Endpoint:** `GET /api/public/orders/stats`
**Scope Required:** `orders:read`

#### Query Parameters (Stats)

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `startDate` | string | Start of date range (ISO 8601) | `"2026-03-01T00:00:00Z"` |
| `endDate` | string | End of date range (ISO 8601) | `"2026-03-07T23:59:59Z"` |

#### Request: Order Statistics

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/orders/stats?startDate=2026-03-01T00:00:00Z&endDate=2026-03-07T23:59:59Z" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "totalOrders": 247,
    "totalRevenue": 1850000,
    "averageOrderValue": 7490,
    "byStatus": {
      "pending": 5,
      "confirmed": 3,
      "preparing": 8,
      "ready": 2,
      "completed": 215,
      "cancelled": 14
    },
    "byOrderType": {
      "dine-in": 180,
      "delivery": 42,
      "takeaway": 25
    }
  },
  "meta": {
    "timestamp": "2026-03-07T14:00:00Z"
  }
}
```

---

**Endpoint:** `GET /api/public/orders/summary`
**Scope Required:** `orders:read`

#### Query Parameters (Summary)

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `period` | string | Predefined period | `"today"`, `"week"`, `"month"` |
| `startDate` | string | Custom start date (ISO 8601) | `"2026-03-01T00:00:00Z"` |
| `endDate` | string | Custom end date (ISO 8601) | `"2026-03-07T23:59:59Z"` |
| `orderType` | string | Filter by order type | `"dine-in"`, `"delivery"`, `"takeaway"` |

#### Request: AI-Optimized Summary

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/orders/summary?period=today" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "totals": {
      "orders": 42,
      "revenue": 315000,
      "averageOrderValue": 7500
    },
    "byType": {
      "dine-in": { "orders": 28, "revenue": 224000 },
      "delivery": { "orders": 9, "revenue": 63000 },
      "takeaway": { "orders": 5, "revenue": 28000 }
    },
    "byStatus": {
      "pending": 3,
      "confirmed": 2,
      "preparing": 5,
      "ready": 1,
      "completed": 29,
      "cancelled": 2
    },
    "byPaymentMethod": {
      "cash": { "orders": 15, "revenue": 112500 },
      "card": { "orders": 20, "revenue": 157500 },
      "transfer": { "orders": 7, "revenue": 45000 }
    },
    "peakHours": [
      { "hour": 12, "orders": 8 },
      { "hour": 13, "orders": 7 },
      { "hour": 19, "orders": 9 },
      { "hour": 20, "orders": 6 }
    ],
    "dailySeries": [
      { "date": "2026-03-07", "orders": 42, "revenue": 315000 }
    ]
  },
  "meta": {
    "timestamp": "2026-03-07T14:00:00Z"
  }
}
```

---

## Complete Workflow Examples

### Workflow 1: KDS Automation (Kitchen Display System)

This workflow demonstrates automated kitchen order management: polling for new orders, confirming them, and advancing through preparation stages.

```javascript
const API_BASE = 'https://api.wawagardenbar.com';
const headers = {
  'x-api-key': process.env.WAWA_API_KEY,
  'Content-Type': 'application/json'
};

// -- Helper: Fetch orders by status ------------------------------------------
async function fetchOrdersByStatus(status, limit = 50) {
  const url = new URL(`${API_BASE}/api/public/orders`);
  url.searchParams.append('status', status);
  url.searchParams.append('sort', 'createdAt');
  url.searchParams.append('limit', String(limit));

  const response = await fetch(url, { headers });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch orders');
  }

  return result.data;
}

// -- Helper: Update order status ---------------------------------------------
async function updateOrderStatus(orderId, status, note) {
  const body = { status };
  if (note) body.note = note;

  const response = await fetch(`${API_BASE}/api/public/orders/${orderId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body)
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to update order status');
  }

  return result.data;
}

// -- KDS Polling Loop --------------------------------------------------------
async function kdsPollingLoop(intervalMs = 10000) {
  console.log('KDS polling started...');

  setInterval(async () => {
    try {
      // 1. Fetch all pending orders
      const pendingOrders = await fetchOrdersByStatus('pending');

      for (const order of pendingOrders) {
        console.log(`New order: ${order.orderNumber} - ${order.items.length} items`);

        // 2. Auto-confirm each pending order
        const confirmed = await updateOrderStatus(order._id, 'confirmed');
        console.log(`Confirmed: ${confirmed.orderNumber}`);
      }
    } catch (error) {
      console.error('KDS polling error:', error.message);
    }
  }, intervalMs);
}

// -- Kitchen Stage Advancement -----------------------------------------------
async function advanceToNextStage(orderId) {
  // Fetch current order details
  const response = await fetch(`${API_BASE}/api/public/orders/${orderId}`, {
    headers
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch order');
  }

  const order = result.data;
  const transitions = {
    'confirmed': 'preparing',
    'preparing': 'ready',
    'ready': 'completed'
  };

  const nextStatus = transitions[order.status];
  if (!nextStatus) {
    throw new Error(`No valid transition from status '${order.status}'`);
  }

  const updated = await updateOrderStatus(orderId, nextStatus);
  console.log(`Order ${updated.orderNumber}: ${order.status} -> ${nextStatus}`);
  return updated;
}

// -- Run KDS Automation ------------------------------------------------------
async function runKdsWorkflow() {
  // Start polling for new orders
  kdsPollingLoop(10000);

  // Example: manually advance a specific order through stages
  // const order = await advanceToNextStage('order_abc123'); // confirmed -> preparing
  // const order2 = await advanceToNextStage('order_abc123'); // preparing -> ready
  // const order3 = await advanceToNextStage('order_abc123'); // ready -> completed
}
```

### Workflow 2: Delivery Tracking

This workflow demonstrates managing the delivery lifecycle from ready to delivered.

```javascript
const API_BASE = 'https://api.wawagardenbar.com';
const headers = {
  'x-api-key': process.env.WAWA_API_KEY,
  'Content-Type': 'application/json'
};

// -- Helper: Update order status with note -----------------------------------
async function updateOrderStatus(orderId, status, note) {
  const body = { status };
  if (note) body.note = note;

  const response = await fetch(`${API_BASE}/api/public/orders/${orderId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body)
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to update order status');
  }

  return result.data;
}

// -- Dispatch order for delivery ---------------------------------------------
async function dispatchOrder(orderId, riderName, estimatedMinutes) {
  const note = `Dispatched with rider ${riderName} - ETA ${estimatedMinutes} minutes`;
  const updated = await updateOrderStatus(orderId, 'out-for-delivery', note);
  console.log(`Order ${updated.orderNumber} dispatched: ${note}`);
  return updated;
}

// -- Mark order as delivered -------------------------------------------------
async function markDelivered(orderId, deliveryNote) {
  const updated = await updateOrderStatus(orderId, 'delivered', deliveryNote);
  console.log(`Order ${updated.orderNumber} delivered`);
  return updated;
}

// -- Complete delivery order -------------------------------------------------
async function completeDelivery(orderId) {
  const updated = await updateOrderStatus(orderId, 'completed');
  console.log(`Order ${updated.orderNumber} completed`);
  return updated;
}

// -- Full delivery lifecycle -------------------------------------------------
async function processDelivery(orderId, riderName) {
  try {
    // Step 1: Dispatch
    await dispatchOrder(orderId, riderName, 30);

    // Step 2: Mark delivered (when rider confirms)
    await markDelivered(orderId, 'Delivered to customer at front gate');

    // Step 3: Complete
    await completeDelivery(orderId);

    console.log('Delivery lifecycle complete');
  } catch (error) {
    console.error('Delivery error:', error.message);
    throw error;
  }
}

// -- Monitor ready delivery orders -------------------------------------------
async function getReadyDeliveryOrders() {
  const url = new URL(`${API_BASE}/api/public/orders`);
  url.searchParams.append('status', 'ready');
  url.searchParams.append('orderType', 'delivery');
  url.searchParams.append('sort', 'createdAt');

  const response = await fetch(url, { headers });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch orders');
  }

  return result.data;
}
```

### Workflow 3: Bulk Status Processing

This workflow demonstrates advancing multiple orders through a status transition in sequence.

```javascript
const API_BASE = 'https://api.wawagardenbar.com';
const headers = {
  'x-api-key': process.env.WAWA_API_KEY,
  'Content-Type': 'application/json'
};

// -- Bulk confirm all pending orders -----------------------------------------
async function bulkConfirmPendingOrders() {
  // 1. Fetch all pending orders
  const url = new URL(`${API_BASE}/api/public/orders`);
  url.searchParams.append('status', 'pending');
  url.searchParams.append('limit', '100');

  const response = await fetch(url, { headers });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch pending orders');
  }

  const pendingOrders = result.data;
  console.log(`Found ${pendingOrders.length} pending orders`);

  // 2. Confirm each order sequentially (respecting rate limits)
  const results = [];
  for (const order of pendingOrders) {
    try {
      const updateResponse = await fetch(
        `${API_BASE}/api/public/orders/${order._id}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ status: 'confirmed' })
        }
      );
      const updateResult = await updateResponse.json();

      if (updateResult.success) {
        results.push({ orderNumber: order.orderNumber, status: 'confirmed', success: true });
        console.log(`Confirmed: ${order.orderNumber}`);
      } else {
        results.push({ orderNumber: order.orderNumber, error: updateResult.error, success: false });
        console.error(`Failed to confirm ${order.orderNumber}: ${updateResult.error}`);
      }
    } catch (error) {
      results.push({ orderNumber: order.orderNumber, error: error.message, success: false });
    }

    // Rate limit: wait 2 seconds between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 3. Summary
  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`Bulk confirm complete: ${succeeded} succeeded, ${failed} failed`);
  return results;
}

// -- Bulk cancel with reason -------------------------------------------------
async function bulkCancelOrders(orderIds, reason) {
  const results = [];

  for (const orderId of orderIds) {
    try {
      const response = await fetch(
        `${API_BASE}/api/public/orders/${orderId}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ status: 'cancelled', note: reason })
        }
      );
      const result = await response.json();

      if (result.success) {
        results.push({ orderId, success: true, orderNumber: result.data.orderNumber });
      } else {
        results.push({ orderId, success: false, error: result.error });
      }
    } catch (error) {
      results.push({ orderId, success: false, error: error.message });
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
}
```

---

## Error Handling

### HTTP Status Codes

| Status Code | Meaning | Action |
|-------------|---------|--------|
| `200 OK` | Request succeeded | Process response data |
| `400 Bad Request` | Invalid request body or parameters | Fix request and retry |
| `401 Unauthorized` | Invalid or missing API key | Verify API key |
| `403 Forbidden` | Insufficient scopes | Request API key with required scopes |
| `404 Not Found` | Order not found | Verify order ID or order number |
| `422 Unprocessable Entity` | Business rule violation | Check error message for details |
| `429 Too Many Requests` | Rate limit exceeded | Wait and retry with backoff |
| `500 Internal Server Error` | Server error | Retry with exponential backoff |

### Error Response Format

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Human-readable error description"
}
```

### Common Error Responses

**Invalid status transition (422):**

```json
{
  "success": false,
  "error": "Invalid status transition from 'pending' to 'ready'"
}
```

**Missing cancellation note (422):**

```json
{
  "success": false,
  "error": "A note is required when cancelling an order"
}
```

**Cannot cancel paid order (422):**

```json
{
  "success": false,
  "error": "Cannot cancel a paid order"
}
```

**Cannot cancel order on settling tab (422):**

```json
{
  "success": false,
  "error": "Cannot cancel an order on a settling tab"
}
```

**Cannot cancel order already in preparation (422):**

```json
{
  "success": false,
  "error": "Invalid status transition from 'preparing' to 'cancelled'"
}
```

**Order not found (404):**

```json
{
  "success": false,
  "error": "Order not found"
}
```

**Unauthorized (401):**

```json
{
  "success": false,
  "error": "Invalid API key"
}
```

**Forbidden (403):**

```json
{
  "success": false,
  "error": "API key does not have the required scope: orders:write"
}
```

**Rate limited (429):**

```json
{
  "success": false,
  "error": "Rate limit exceeded. Try again in 60 seconds."
}
```

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
      if (response.status === 400 || response.status === 404 || response.status === 422) {
        throw new Error(result.error);
      }

      // Server errors (retry)
      if (response.status >= 500) {
        lastError = new Error(result.error);
        await sleep(1000 * attempt); // Exponential backoff
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

---

## Quick Reference

### API Endpoints Summary

| Endpoint | Method | Purpose | Required Scopes |
|----------|--------|---------|-----------------|
| `/api/public/orders` | GET | List and filter orders | `orders:read` |
| `/api/public/orders/{orderId}` | GET | Get full order details | `orders:read` |
| `/api/public/orders/{orderId}` | PATCH | Update order status | `orders:write` |
| `/api/public/orders/stats` | GET | Aggregate order statistics | `orders:read` |
| `/api/public/orders/summary` | GET | AI-optimized period summary | `orders:read` |

### Valid Status Transitions

| From | To | Notes |
|------|----|-------|
| `pending` | `confirmed` | Kitchen accepts order |
| `pending` | `cancelled` | Note required |
| `confirmed` | `preparing` | Kitchen begins preparation |
| `confirmed` | `cancelled` | Note required |
| `preparing` | `ready` | Food/drinks prepared |
| `ready` | `completed` | Dine-in/takeaway fulfilled |
| `ready` | `out-for-delivery` | Delivery orders only |
| `out-for-delivery` | `delivered` | Delivery orders only |
| `delivered` | `completed` | Delivery lifecycle complete |

### PATCH Request Body

```json
{
  "status": "confirmed|preparing|ready|out-for-delivery|delivered|completed|cancelled",
  "note": "Optional note (REQUIRED for cancellation)"
}
```

### Quick curl: Confirm an Order

```bash
curl -X PATCH "https://api.wawagardenbar.com/api/public/orders/{orderId}" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"status": "confirmed"}'
```

### Quick curl: Cancel an Order

```bash
curl -X PATCH "https://api.wawagardenbar.com/api/public/orders/{orderId}" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"status": "cancelled", "note": "Customer requested cancellation"}'
```

### Quick curl: Get Today's Stats

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/orders/stats?startDate=2026-03-07T00:00:00Z&endDate=2026-03-07T23:59:59Z" \
  -H "x-api-key: wawa_your_api_key_here"
```

### Quick curl: Get AI Summary

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/orders/summary?period=today" \
  -H "x-api-key: wawa_your_api_key_here"
```

---

## Troubleshooting

### Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid API key | Verify API key is correct and active |
| `403 Forbidden` | Insufficient scopes | Request API key with `orders:read` and/or `orders:write` scopes |
| `404 Not Found` | Order ID or order number does not exist | Verify the order ID; use `GET /api/public/orders` to search |
| `422` "Invalid status transition" | Attempted to skip a status or move backwards | Follow the valid transition path (see Status Flow above) |
| `422` "A note is required when cancelling" | Cancellation sent without `note` field | Include a `note` in the request body |
| `422` "Cannot cancel a paid order" | Order has already been paid | Paid orders cannot be cancelled via API; handle refunds separately |
| `422` "Cannot cancel an order on a settling tab" | Tab is in `settling` status | Wait for tab settlement to complete or resolve manually |
| `429 Too Many Requests` | Rate limit exceeded (30 req/min) | Implement rate limiting, request queuing, and exponential backoff |
| Empty `data` array on `GET /orders` | No orders match filter criteria | Broaden filters; check date range and status values |
| `out-for-delivery` rejected | Order type is not `delivery` | This status is only valid for delivery-type orders |

### Debugging Checklist

1. Verify API key is included in `x-api-key` header or `Authorization: Bearer` header
2. Confirm the API key has the required scopes (`orders:read`, `orders:write`)
3. Check that the order ID in the URL path is a valid ObjectId
4. For status updates, verify the current order status allows the requested transition
5. For cancellations, ensure the request body includes the `note` field
6. For delivery status updates, ensure the order type is `delivery`
7. Monitor `X-RateLimit-Remaining` response header to avoid rate limiting
8. Use `GET /api/public/orders/{orderId}` to inspect the current order state before attempting updates

---

## Related Documentation

- SOP-API-001: Agentic API Tab and Order Management (creating tabs and orders)
- SOP-WAITER-003: Order Modifications and Cancellations (manual equivalent)
- SOP-KITCHEN-001: Kitchen Display Operations (manual equivalent)
- API Reference: `/docs/api/public-api-reference.md`
- Authentication Guide: `/docs/api/authentication.md`
- Error Codes: `/docs/api/error-codes.md`

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
