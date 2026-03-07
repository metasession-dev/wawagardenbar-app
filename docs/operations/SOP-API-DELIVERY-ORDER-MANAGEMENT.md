# SOP: Agentic API Delivery Order Management

**Document ID:** SOP-API-005
**Version:** 1.0
**Effective Date:** March 7, 2026
**Department:** Technical Integration
**Applies To:** AI Agents, Delivery Platforms, Third-party Logistics, Chatbot Integrations

---

## Purpose

This Standard Operating Procedure (SOP) provides technical specifications and step-by-step API integration instructions for agentic systems to programmatically create delivery orders, process payments, track delivery progress, and manage delivery statuses using the Wawa Garden Bar Public REST API.

This document is the API counterpart to SOP-CSR-001 (Customer Service Delivery Order Management).

---

## Scope

This SOP covers:
- API authentication and authorization
- Retrieving delivery fee configuration from settings
- Looking up menu items for delivery orders
- Creating delivery orders with address and delivery details
- Processing and verifying payments
- Tracking delivery progress and status history
- Updating delivery-specific statuses (out-for-delivery, delivered, completed)
- Cancelling delivery orders
- Address validation best practices
- Error handling and troubleshooting

---

## Prerequisites

- Valid API key with required scopes
- HTTPS-capable client
- JSON request/response handling capability
- Error handling and retry logic implementation
- Customer delivery address information

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

- `menu:read` - Look up menu items by name/category
- `settings:read` - Retrieve delivery fee configuration and settings
- `orders:write` - Create and modify orders
- `orders:read` - Read order details and track delivery progress
- `payments:write` - Initialize payment transactions
- `payments:read` - Verify payment status

---

## Delivery Fee Calculation

Delivery fees are calculated based on the order subtotal and configuration values retrieved from the settings endpoint.

### Fee Structure

| Condition | Delivery Fee |
|-----------|-------------|
| Subtotal below threshold (< ₦2,000) | ₦1,000 (base fee) |
| Subtotal at or above threshold (>= ₦2,000) | ₦500 (reduced fee) |

### Additional Delivery Costs

| Cost | Amount | Description |
|------|--------|-------------|
| Packaging cost | ₦100 | Applied to all delivery orders |
| Driver operational cost | 60% of delivery fee | Internal cost allocation for driver compensation |

### Estimated Delivery Time Formula

```
estimatedDeliveryTime = (5 min x itemCount) + (2 min x activeOrderCount) + 30 min delivery
```

- **5 minutes per item:** Base preparation time per item in the order
- **2 minutes per active order:** Queue delay based on current active orders in the system
- **30 minutes:** Fixed delivery transit time

---

## Procedure

### Part 1: Check Delivery Settings

Before creating a delivery order, retrieve the current delivery fee configuration, minimum order requirements, and delivery radius from the settings endpoint.

**Endpoint:** `GET /api/public/settings`
**Scope Required:** `settings:read`

#### curl Example

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/settings" \
  -H "x-api-key: wawa_your_api_key_here"
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "delivery": {
      "baseFee": 1000,
      "reducedFee": 500,
      "freeDeliveryThreshold": 2000,
      "packagingCost": 100,
      "driverCostPercentage": 60,
      "deliveryRadius": 15,
      "minimumOrderAmount": 1500,
      "estimatedBaseTime": 30,
      "prepTimePerItem": 5,
      "queueDelayPerOrder": 2,
      "isDeliveryEnabled": true
    }
  },
  "meta": { "timestamp": "..." }
}
```

**Key fields to extract:**

| Response Field | Description | Example |
|----------------|-------------|---------|
| `delivery.baseFee` | Standard delivery fee in ₦ | `1000` |
| `delivery.reducedFee` | Reduced fee when subtotal >= threshold | `500` |
| `delivery.freeDeliveryThreshold` | Subtotal threshold for reduced fee in ₦ | `2000` |
| `delivery.packagingCost` | Packaging surcharge for delivery orders in ₦ | `100` |
| `delivery.minimumOrderAmount` | Minimum subtotal to place a delivery order in ₦ | `1500` |
| `delivery.deliveryRadius` | Maximum delivery radius in km | `15` |
| `delivery.isDeliveryEnabled` | Whether delivery service is currently active | `true` |

#### JavaScript Example

```javascript
/**
 * Retrieve delivery settings and calculate the delivery fee for a given subtotal.
 * Returns null if delivery is disabled.
 */
async function getDeliverySettings() {
  const response = await fetch('https://api.wawagardenbar.com/api/public/settings', {
    headers: { 'x-api-key': process.env.WAWA_API_KEY }
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error('Failed to retrieve settings');
  }

  const settings = result.data.delivery;
  if (!settings.isDeliveryEnabled) {
    return null; // Delivery is currently disabled
  }

  return settings;
}

/**
 * Calculate the delivery fee based on order subtotal and settings.
 */
function calculateDeliveryFee(subtotal, settings) {
  if (subtotal >= settings.freeDeliveryThreshold) {
    return settings.reducedFee;
  }
  return settings.baseFee;
}

// Usage
const settings = await getDeliverySettings();
if (!settings) throw new Error('Delivery service is currently unavailable');

const subtotal = 3500;
const deliveryFee = calculateDeliveryFee(subtotal, settings);
console.log(`Delivery fee for ₦${subtotal} order: ₦${deliveryFee}`);
// Output: Delivery fee for ₦3500 order: ₦500
```

---

### Part 2: Look Up Menu Items

Before creating a delivery order, you need the `menuItemId`, `name`, and `price` for each item. Use the menu search endpoint to find items by name.

**Endpoint:** `GET /api/public/menu`
**Scope Required:** `menu:read`

#### Search by Item Name

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/menu?q=jollof+rice" \
  -H "x-api-key: wawa_your_api_key_here"
```

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `q` | string | Free-text search across name, description, and tags | `"jollof rice"`, `"chapman"`, `"pepper soup"` |
| `mainCategory` | string | Filter by top-level category | `"drinks"` or `"food"` |
| `category` | string | Filter by sub-category slug | `"beer-local"`, `"main-courses"`, `"starters"` |
| `page` | number | Page number (default: 1) | `1` |
| `limit` | number | Items per page (default: 25, max: 100) | `10` |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "665a1b2c3d4e5f6a7b8c9d0e",
      "name": "Jollof Rice",
      "mainCategory": "food",
      "category": "main-courses",
      "price": 3500,
      "isAvailable": true,
      "stockStatus": "in-stock",
      "currentStock": 20,
      "preparationTime": 15,
      "portionOptions": { "allowHalf": true, "allowQuarter": false },
      "customizationOptions": [
        {
          "name": "Protein",
          "type": "single",
          "options": [
            { "name": "Chicken", "priceModifier": 500 },
            { "name": "Beef", "priceModifier": 500 }
          ]
        }
      ]
    }
  ],
  "meta": { "page": 1, "limit": 25, "total": 1, "totalPages": 1, "timestamp": "..." }
}
```

**Key fields to extract for order items:**

| Response Field | Maps to Order Field | Description |
|----------------|---------------------|-------------|
| `_id` | `menuItemId` | The item's database ID |
| `name` | `name` | Item display name |
| `price` | `price` | Unit price in ₦ |
| `isAvailable` | -- | Check this is `true` before ordering |
| `stockStatus` | -- | Ensure not `"out-of-stock"` |
| `portionOptions` | `portionSize` | Whether half/quarter portions are allowed |
| `customizationOptions` | `customizations` | Available add-ons and modifiers |

#### JavaScript Example: Resolve Item Names to Order Items

```javascript
/**
 * Look up a menu item by name and return the fields needed for an order.
 * Returns null if the item is not found or unavailable.
 */
async function lookupMenuItem(itemName) {
  const url = new URL('https://api.wawagardenbar.com/api/public/menu');
  url.searchParams.append('q', itemName);
  url.searchParams.append('limit', '5');

  const response = await fetch(url, {
    headers: { 'x-api-key': process.env.WAWA_API_KEY }
  });
  const result = await response.json();

  if (!result.success || result.data.length === 0) {
    return null; // Item not found
  }

  // Find best match (first available result)
  const item = result.data.find(i => i.isAvailable && i.stockStatus !== 'out-of-stock');
  if (!item) return null;

  return {
    menuItemId: item._id,
    name: item.name,
    price: item.price,
    portionOptions: item.portionOptions,
    customizationOptions: item.customizationOptions
  };
}

// Usage: customer orders "1 Jollof Rice and 2 Chapman"
const jollofRice = await lookupMenuItem('Jollof Rice');
const chapman = await lookupMenuItem('Chapman');

if (!jollofRice) throw new Error('Jollof Rice not found or unavailable');
if (!chapman) throw new Error('Chapman not found or unavailable');

const orderItems = [
  { ...jollofRice, quantity: 1, subtotal: jollofRice.price * 1 },
  { ...chapman, quantity: 2, subtotal: chapman.price * 2 }
];
```

---

### Part 3: Create Delivery Order

**Endpoint:** `POST /api/public/orders`
**Base URL:** `https://api.wawagardenbar.com`
**Scope Required:** `orders:write`

#### Step 1: Prepare Delivery Order Payload

**MINIMUM REQUIRED FIELDS:**

```json
{
  "orderType": "delivery",
  "items": [
    {
      "menuItemId": "item_123",
      "name": "Jollof Rice",
      "price": 3500,
      "quantity": 1,
      "subtotal": 3500
    },
    {
      "menuItemId": "item_456",
      "name": "Chapman",
      "price": 1500,
      "quantity": 2,
      "subtotal": 3000
    }
  ],
  "subtotal": 6500,
  "tax": 0,
  "deliveryFee": 500,
  "discount": 0,
  "total": 7000,
  "guestName": "Amara Obi",
  "guestPhone": "+2348012345678",
  "guestEmail": "amara@example.com",
  "deliveryDetails": {
    "address": {
      "street": "12 Admiralty Way",
      "city": "Lekki",
      "state": "Lagos",
      "country": "Nigeria"
    },
    "deliveryInstructions": "Call when at the gate. Apartment 4B, second floor."
  }
}
```

**Field Specifications:**

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `orderType` | string | Yes | Must be `"delivery"` | `"delivery"` |
| `items` | array | Yes | Must contain at least 1 item | See item specs |
| `subtotal` | number | Yes | Order subtotal in ₦ | `6500` |
| `tax` | number | Yes | Tax amount (can be 0) | `0` |
| `deliveryFee` | number | Yes | Calculated delivery fee in ₦ | `500` |
| `discount` | number | Yes | Discount amount (can be 0) | `0` |
| `total` | number | Yes | Final total in ₦ (subtotal + tax + deliveryFee - discount) | `7000` |
| `guestName` | string | Conditional | Required if no `userId` | `"Amara Obi"` |
| `guestPhone` | string | Conditional | Required if no `userId` | `"+2348012345678"` |
| `guestEmail` | string | Optional | Customer email for receipt | `"amara@example.com"` |
| `userId` | string | Conditional | Registered user ObjectId (alternative to guest fields) | `"665a..."` |
| `deliveryDetails.address.street` | string | Yes | Street address | `"12 Admiralty Way"` |
| `deliveryDetails.address.street2` | string | Optional | Apartment, suite, floor | `"Apartment 4B"` |
| `deliveryDetails.address.city` | string | Yes | City name | `"Lekki"` |
| `deliveryDetails.address.state` | string | Yes | State name | `"Lagos"` |
| `deliveryDetails.address.postalCode` | string | Optional | Postal/ZIP code | `"101245"` |
| `deliveryDetails.address.country` | string | Yes | Country name | `"Nigeria"` |
| `deliveryDetails.deliveryInstructions` | string | Optional | Special delivery instructions | `"Call when at the gate"` |

**Item Object Structure:**

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `menuItemId` | string | Yes | Menu item database ID | `"item_123"` |
| `name` | string | Yes | Item display name | `"Jollof Rice"` |
| `price` | number | Yes | Unit price in ₦ | `3500` |
| `quantity` | number | Yes | Quantity (min: 1) | `1` |
| `subtotal` | number | Yes | Line item subtotal | `3500` |
| `portionSize` | string | Optional | `"full"`, `"half"`, or `"quarter"` (default: `"full"`) | `"full"` |
| `customizations` | array | Optional | Array of `{ name, option, price }` | See example |
| `specialInstructions` | string | Optional | Item-specific notes | `"Extra spicy"` |

#### Step 2: Send API Request

```bash
curl -X POST https://api.wawagardenbar.com/api/public/orders \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "orderType": "delivery",
    "items": [
      {
        "menuItemId": "item_123",
        "name": "Jollof Rice",
        "price": 3500,
        "quantity": 1,
        "subtotal": 3500
      },
      {
        "menuItemId": "item_456",
        "name": "Chapman",
        "price": 1500,
        "quantity": 2,
        "subtotal": 3000
      }
    ],
    "subtotal": 6500,
    "tax": 0,
    "deliveryFee": 500,
    "discount": 0,
    "total": 7000,
    "guestName": "Amara Obi",
    "guestPhone": "+2348012345678",
    "guestEmail": "amara@example.com",
    "deliveryDetails": {
      "address": {
        "street": "12 Admiralty Way",
        "city": "Lekki",
        "state": "Lagos",
        "country": "Nigeria"
      },
      "deliveryInstructions": "Call when at the gate. Apartment 4B, second floor."
    }
  }'
```

#### Step 3: Handle Response

**Success Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "_id": "order_del_001",
    "orderNumber": "WGB-D1E2F3",
    "status": "pending",
    "orderType": "delivery",
    "items": [
      {
        "menuItemId": "item_123",
        "name": "Jollof Rice",
        "quantity": 1,
        "portionSize": "full",
        "price": 3500,
        "subtotal": 3500
      },
      {
        "menuItemId": "item_456",
        "name": "Chapman",
        "quantity": 2,
        "portionSize": "full",
        "price": 1500,
        "subtotal": 3000
      }
    ],
    "subtotal": 6500,
    "tax": 0,
    "deliveryFee": 500,
    "discount": 0,
    "total": 7000,
    "deliveryDetails": {
      "address": {
        "street": "12 Admiralty Way",
        "city": "Lekki",
        "state": "Lagos",
        "country": "Nigeria"
      },
      "deliveryInstructions": "Call when at the gate. Apartment 4B, second floor."
    },
    "estimatedWaitTime": 45,
    "statusHistory": [
      { "status": "pending", "timestamp": "2026-03-07T18:00:00Z" }
    ],
    "createdAt": "2026-03-07T18:00:00Z"
  },
  "meta": {
    "timestamp": "2026-03-07T18:00:00Z"
  }
}
```

**CRITICAL:** Store the following for subsequent operations:
- `data._id` -- Order database ID (for tracking, payment, and status updates)
- `data.orderNumber` -- Human-readable order number
- `data.estimatedWaitTime` -- Estimated time in minutes until delivery
- `data.total` -- Total amount for payment processing

**Error Responses:**

```json
// Missing delivery address (400)
{
  "success": false,
  "error": "deliveryDetails.address is required for delivery orders"
}

// Subtotal below minimum (422)
{
  "success": false,
  "error": "Minimum order amount for delivery is ₦1,500"
}

// Delivery not available (422)
{
  "success": false,
  "error": "Delivery service is currently unavailable"
}
```

---

### Part 4: Process Payment

After creating a delivery order, initialize payment and verify it.

#### Step 1: Initialize Payment

**Endpoint:** `POST /api/public/payments`
**Scope Required:** `payments:write`

```bash
curl -X POST https://api.wawagardenbar.com/api/public/payments \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order_del_001",
    "amount": 7000,
    "email": "amara@example.com",
    "paymentMethod": "card"
  }'
```

**Request Body:**

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `orderId` | string | Yes | Order database ID | `"order_del_001"` |
| `amount` | number | Yes | Payment amount in ₦ (must match order total) | `7000` |
| `email` | string | Yes | Customer email for payment receipt | `"amara@example.com"` |
| `paymentMethod` | string | Optional | Payment method | `"card"`, `"bank_transfer"` |

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "reference": "PAY-WGB-D1E2F3-1709834400",
    "authorizationUrl": "https://checkout.paystack.com/abc123xyz",
    "accessCode": "abc123xyz",
    "amount": 7000
  },
  "meta": { "timestamp": "..." }
}
```

Direct the customer to `authorizationUrl` to complete payment, or use the `reference` for server-side payment processing.

#### Step 2: Verify Payment

**Endpoint:** `POST /api/public/payments/verify`
**Scope Required:** `payments:read`

```bash
curl -X POST https://api.wawagardenbar.com/api/public/payments/verify \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "reference": "PAY-WGB-D1E2F3-1709834400"
  }'
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "reference": "PAY-WGB-D1E2F3-1709834400",
    "status": "success",
    "amount": 7000,
    "paidAt": "2026-03-07T18:05:00Z",
    "orderId": "order_del_001",
    "orderStatus": "confirmed"
  },
  "meta": { "timestamp": "..." }
}
```

Once payment is verified, the order status automatically transitions from `pending` to `confirmed`.

---

### Part 5: Track Delivery Progress

Use the order detail endpoint to monitor delivery progress and view the full status history.

**Endpoint:** `GET /api/public/orders/{orderId}`
**Scope Required:** `orders:read`

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/orders/order_del_001" \
  -H "x-api-key: wawa_your_api_key_here"
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "_id": "order_del_001",
    "orderNumber": "WGB-D1E2F3",
    "status": "out-for-delivery",
    "orderType": "delivery",
    "items": [
      {
        "menuItemId": "item_123",
        "name": "Jollof Rice",
        "quantity": 1,
        "price": 3500,
        "subtotal": 3500
      },
      {
        "menuItemId": "item_456",
        "name": "Chapman",
        "quantity": 2,
        "price": 1500,
        "subtotal": 3000
      }
    ],
    "subtotal": 6500,
    "deliveryFee": 500,
    "total": 7000,
    "deliveryDetails": {
      "address": {
        "street": "12 Admiralty Way",
        "city": "Lekki",
        "state": "Lagos",
        "country": "Nigeria"
      },
      "deliveryInstructions": "Call when at the gate. Apartment 4B, second floor."
    },
    "estimatedWaitTime": 45,
    "statusHistory": [
      { "status": "pending", "timestamp": "2026-03-07T18:00:00Z" },
      { "status": "confirmed", "timestamp": "2026-03-07T18:05:00Z" },
      { "status": "preparing", "timestamp": "2026-03-07T18:06:00Z" },
      { "status": "ready", "timestamp": "2026-03-07T18:20:00Z", "note": "Order packed and sealed" },
      { "status": "out-for-delivery", "timestamp": "2026-03-07T18:25:00Z", "note": "Driver departed at 6:25 PM" }
    ],
    "paymentStatus": "paid",
    "createdAt": "2026-03-07T18:00:00Z",
    "updatedAt": "2026-03-07T18:25:00Z"
  },
  "meta": { "timestamp": "..." }
}
```

**Delivery Status Flow:**

```
pending --> confirmed --> preparing --> ready --> out-for-delivery --> delivered --> completed
```

| Status | Description |
|--------|-------------|
| `pending` | Order created, awaiting payment |
| `confirmed` | Payment verified, order accepted |
| `preparing` | Kitchen is preparing the order |
| `ready` | Order is packed and ready for pickup by driver |
| `out-for-delivery` | Driver has picked up and is en route |
| `delivered` | Driver has arrived and handed off the order |
| `completed` | Delivery confirmed complete |

#### JavaScript Example: Poll for Delivery Status

```javascript
/**
 * Poll for delivery status updates until the order reaches a terminal state.
 */
async function trackDelivery(orderId, onStatusChange) {
  let lastStatus = null;
  const terminalStatuses = ['delivered', 'completed', 'cancelled'];

  const poll = async () => {
    const response = await fetch(
      `https://api.wawagardenbar.com/api/public/orders/${orderId}`,
      { headers: { 'x-api-key': process.env.WAWA_API_KEY } }
    );
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error);
    }

    const order = result.data;
    if (order.status !== lastStatus) {
      lastStatus = order.status;
      onStatusChange(order);
    }

    if (terminalStatuses.includes(order.status)) {
      return order;
    }

    // Poll every 30 seconds
    await new Promise(resolve => setTimeout(resolve, 30000));
    return poll();
  };

  return poll();
}

// Usage
trackDelivery('order_del_001', (order) => {
  console.log(`Status update: ${order.status}`);
  const latestHistory = order.statusHistory[order.statusHistory.length - 1];
  if (latestHistory.note) {
    console.log(`Note: ${latestHistory.note}`);
  }
});
```

---

### Part 6: Update Delivery Status

Use the PATCH endpoint to advance the delivery through its lifecycle.

**Endpoint:** `PATCH /api/public/orders/{orderId}`
**Scope Required:** `orders:write`

#### Update to "out-for-delivery"

```bash
curl -X PATCH "https://api.wawagardenbar.com/api/public/orders/order_del_001" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "out-for-delivery",
    "note": "Driver departed at 6:25 PM"
  }'
```

#### Update to "delivered"

```bash
curl -X PATCH "https://api.wawagardenbar.com/api/public/orders/order_del_001" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "delivered",
    "note": "Delivered to reception at 6:50 PM"
  }'
```

#### Update to "completed"

```bash
curl -X PATCH "https://api.wawagardenbar.com/api/public/orders/order_del_001" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "note": "Customer confirmed receipt"
  }'
```

**Request Body:**

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `status` | string | Yes | New delivery status | `"out-for-delivery"`, `"delivered"`, `"completed"` |
| `note` | string | Optional | Status update note for tracking | `"Driver departed at 6:25 PM"` |

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "_id": "order_del_001",
    "orderNumber": "WGB-D1E2F3",
    "status": "delivered",
    "statusHistory": [
      { "status": "pending", "timestamp": "2026-03-07T18:00:00Z" },
      { "status": "confirmed", "timestamp": "2026-03-07T18:05:00Z" },
      { "status": "preparing", "timestamp": "2026-03-07T18:06:00Z" },
      { "status": "ready", "timestamp": "2026-03-07T18:20:00Z", "note": "Order packed and sealed" },
      { "status": "out-for-delivery", "timestamp": "2026-03-07T18:25:00Z", "note": "Driver departed at 6:25 PM" },
      { "status": "delivered", "timestamp": "2026-03-07T18:50:00Z", "note": "Delivered to reception at 6:50 PM" }
    ],
    "updatedAt": "2026-03-07T18:50:00Z"
  },
  "meta": { "timestamp": "..." }
}
```

---

### Part 7: Cancel Delivery Order

Delivery orders can only be cancelled if they are in `pending` or `confirmed` status. Once preparation has begun, cancellation is not permitted.

**Endpoint:** `PATCH /api/public/orders/{orderId}`
**Scope Required:** `orders:write`

```bash
curl -X PATCH "https://api.wawagardenbar.com/api/public/orders/order_del_001" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "cancelled",
    "note": "Customer requested cancellation - address unreachable"
  }'
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "_id": "order_del_001",
    "orderNumber": "WGB-D1E2F3",
    "status": "cancelled",
    "statusHistory": [
      { "status": "pending", "timestamp": "2026-03-07T18:00:00Z" },
      { "status": "cancelled", "timestamp": "2026-03-07T18:02:00Z", "note": "Customer requested cancellation - address unreachable" }
    ],
    "updatedAt": "2026-03-07T18:02:00Z"
  },
  "meta": { "timestamp": "..." }
}
```

**Error Response (422 -- order already in progress):**

```json
{
  "success": false,
  "error": "Cannot cancel order in 'preparing' status. Only pending or confirmed orders can be cancelled."
}
```

---

## Complete Workflow Example

### Scenario: AI Agent Processes a Delivery Order

This workflow demonstrates the full end-to-end flow: checking delivery settings, looking up items by name, creating a delivery order, processing payment, tracking delivery progress, and updating statuses through to completion.

```javascript
const API_BASE = 'https://api.wawagardenbar.com';
const headers = {
  'x-api-key': process.env.WAWA_API_KEY,
  'Content-Type': 'application/json'
};

// -- Helper: Retrieve delivery settings -----------------------------------
async function getDeliverySettings() {
  const response = await fetch(`${API_BASE}/api/public/settings`, { headers });
  const result = await response.json();
  if (!result.success) throw new Error('Failed to retrieve settings');

  const settings = result.data.delivery;
  if (!settings.isDeliveryEnabled) {
    throw new Error('Delivery service is currently unavailable');
  }
  return settings;
}

// -- Helper: Calculate delivery fee based on subtotal and settings --------
function calculateDeliveryFee(subtotal, settings) {
  if (subtotal >= settings.freeDeliveryThreshold) {
    return settings.reducedFee;
  }
  return settings.baseFee;
}

// -- Helper: Look up a menu item by name ----------------------------------
async function lookupMenuItem(itemName) {
  const url = new URL(`${API_BASE}/api/public/menu`);
  url.searchParams.append('q', itemName);
  url.searchParams.append('limit', '5');

  const response = await fetch(url, { headers });
  const result = await response.json();
  if (!result.success || result.data.length === 0) return null;

  const item = result.data.find(i => i.isAvailable && i.stockStatus !== 'out-of-stock');
  if (!item) return null;

  return {
    menuItemId: item._id,
    name: item.name,
    price: item.price,
    portionOptions: item.portionOptions,
    customizationOptions: item.customizationOptions
  };
}

// -- Helper: Build order items from resolved menu items -------------------
function buildOrderItems(resolvedItems) {
  return resolvedItems.map(item => ({
    menuItemId: item.menuItemId,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    portionSize: item.portionSize || 'full',
    customizations: item.customizations || [],
    subtotal: item.price * item.quantity
  }));
}

// -- Helper: Create a delivery order --------------------------------------
async function createDeliveryOrder(payload) {
  const response = await fetch(`${API_BASE}/api/public/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Helper: Initialize payment -------------------------------------------
async function initializePayment(orderId, amount, email) {
  const response = await fetch(`${API_BASE}/api/public/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ orderId, amount, email, paymentMethod: 'card' })
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Helper: Verify payment -----------------------------------------------
async function verifyPayment(reference) {
  const response = await fetch(`${API_BASE}/api/public/payments/verify`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ reference })
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Helper: Get order status ---------------------------------------------
async function getOrder(orderId) {
  const response = await fetch(`${API_BASE}/api/public/orders/${orderId}`, { headers });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Helper: Update order status ------------------------------------------
async function updateOrderStatus(orderId, status, note) {
  const response = await fetch(`${API_BASE}/api/public/orders/${orderId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status, note })
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Step 1: Check delivery settings and availability ---------------------
async function processDeliveryOrder() {
  // 1a. Retrieve delivery settings
  const settings = await getDeliverySettings();
  console.log(`Delivery enabled. Base fee: ₦${settings.baseFee}, Reduced fee: ₦${settings.reducedFee}`);
  console.log(`Minimum order: ₦${settings.minimumOrderAmount}`);

  // -- Step 2: Resolve menu items by name ---------------------------------
  const jollofRice = await lookupMenuItem('Jollof Rice');
  const chapman = await lookupMenuItem('Chapman');
  const pepperSoup = await lookupMenuItem('Pepper Soup');

  if (!jollofRice) throw new Error('Jollof Rice not found or unavailable');
  if (!chapman) throw new Error('Chapman not found or unavailable');
  if (!pepperSoup) throw new Error('Pepper Soup not found or unavailable');

  // -- Step 3: Build order items and calculate totals ---------------------
  const items = buildOrderItems([
    { ...jollofRice, quantity: 1 },
    { ...chapman, quantity: 2 },
    { ...pepperSoup, quantity: 1 }
  ]);
  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);

  // Validate minimum order amount
  if (subtotal < settings.minimumOrderAmount) {
    throw new Error(`Order subtotal ₦${subtotal} is below minimum ₦${settings.minimumOrderAmount}`);
  }

  // Calculate delivery fee
  const deliveryFee = calculateDeliveryFee(subtotal, settings);
  const tax = 0;
  const discount = 0;
  const total = subtotal + tax + deliveryFee - discount;

  console.log(`Subtotal: ₦${subtotal}, Delivery fee: ₦${deliveryFee}, Total: ₦${total}`);

  // -- Step 4: Create the delivery order ----------------------------------
  const order = await createDeliveryOrder({
    orderType: 'delivery',
    items,
    subtotal,
    tax,
    deliveryFee,
    discount,
    total,
    guestName: 'Amara Obi',
    guestPhone: '+2348012345678',
    guestEmail: 'amara@example.com',
    deliveryDetails: {
      address: {
        street: '12 Admiralty Way',
        city: 'Lekki',
        state: 'Lagos',
        country: 'Nigeria'
      },
      deliveryInstructions: 'Call when at the gate. Apartment 4B, second floor.'
    }
  });

  console.log(`Order created: ${order.orderNumber} (${order._id})`);
  console.log(`Estimated delivery time: ${order.estimatedWaitTime} minutes`);

  // -- Step 5: Process payment --------------------------------------------
  const payment = await initializePayment(order._id, total, 'amara@example.com');
  console.log(`Payment URL: ${payment.authorizationUrl}`);
  console.log(`Reference: ${payment.reference}`);

  // ... Customer completes payment via authorizationUrl ...

  // Verify payment after customer completes it
  const verification = await verifyPayment(payment.reference);
  console.log(`Payment status: ${verification.status}`);
  console.log(`Order status after payment: ${verification.orderStatus}`);

  // -- Step 6: Track delivery progress ------------------------------------
  const trackedOrder = await getOrder(order._id);
  console.log(`Current status: ${trackedOrder.status}`);
  console.log(`Status history: ${trackedOrder.statusHistory.length} entries`);

  // -- Step 7: Update delivery statuses -----------------------------------
  // Mark as out-for-delivery when driver departs
  const outForDelivery = await updateOrderStatus(
    order._id,
    'out-for-delivery',
    'Driver departed at 6:25 PM'
  );
  console.log(`Updated to: ${outForDelivery.status}`);

  // Mark as delivered when driver arrives
  const delivered = await updateOrderStatus(
    order._id,
    'delivered',
    'Delivered to reception at 6:50 PM'
  );
  console.log(`Updated to: ${delivered.status}`);

  // Mark as completed after customer confirms receipt
  const completed = await updateOrderStatus(
    order._id,
    'completed',
    'Customer confirmed receipt'
  );
  console.log(`Updated to: ${completed.status}`);

  return completed;
}

// -- Run the complete delivery workflow -----------------------------------
async function main() {
  try {
    const result = await processDeliveryOrder();
    console.log(`Delivery complete: ${result.orderNumber}`);
  } catch (error) {
    console.error('Error processing delivery order:', error.message);
    throw error;
  }
}
```

---

## Address Validation Best Practices

### 1. Required Fields

Always validate that the following address fields are present before submitting:

```javascript
function validateDeliveryAddress(address) {
  const errors = [];

  if (!address.street || address.street.trim().length === 0) {
    errors.push('Street address is required');
  }
  if (!address.city || address.city.trim().length === 0) {
    errors.push('City is required');
  }
  if (!address.state || address.state.trim().length === 0) {
    errors.push('State is required');
  }
  if (!address.country || address.country.trim().length === 0) {
    errors.push('Country is required');
  }

  if (errors.length > 0) {
    throw new Error(`Address validation failed: ${errors.join(', ')}`);
  }

  return true;
}
```

### 2. Formatting Guidelines

- **Street:** Include house/building number and street name. Use `street2` for apartment, suite, or floor details.
- **City:** Use the recognized city or local government area name (e.g., `"Lekki"`, `"Victoria Island"`, `"Ikeja"`).
- **State:** Use the full state name (e.g., `"Lagos"`, `"Abuja"`, `"Rivers"`).
- **Country:** Use the full country name (e.g., `"Nigeria"`).
- **Postal Code:** Optional but recommended where available.

### 3. Delivery Radius Check

Before submitting, verify that the delivery address is within the configured delivery radius. If the API returns a radius error, inform the customer that the address is outside the delivery area.

### 4. Delivery Instructions

Encourage customers to provide detailed delivery instructions, especially for:
- Gated communities (gate codes, security procedures)
- Multi-unit buildings (floor, apartment number)
- Landmark references for hard-to-find locations
- Preferred handoff method (leave at door, hand to customer, call on arrival)

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

### Validate Before Sending

```javascript
function validateDeliveryOrderPayload(payload) {
  const errors = [];

  // Required fields
  if (payload.orderType !== 'delivery') errors.push('orderType must be "delivery"');
  if (!payload.items || payload.items.length === 0) errors.push('items must contain at least 1 item');
  if (payload.subtotal == null) errors.push('subtotal is required');
  if (payload.tax == null) errors.push('tax is required');
  if (payload.deliveryFee == null) errors.push('deliveryFee is required');
  if (payload.total == null) errors.push('total is required');

  // Customer identification
  if (!payload.userId && !payload.guestName) {
    errors.push('Either userId or guestName is required');
  }
  if (!payload.userId && !payload.guestPhone) {
    errors.push('Either userId or guestPhone is required for delivery orders');
  }

  // Delivery details
  if (!payload.deliveryDetails) {
    errors.push('deliveryDetails is required for delivery orders');
  } else {
    const addr = payload.deliveryDetails.address;
    if (!addr) {
      errors.push('deliveryDetails.address is required');
    } else {
      if (!addr.street) errors.push('deliveryDetails.address.street is required');
      if (!addr.city) errors.push('deliveryDetails.address.city is required');
      if (!addr.state) errors.push('deliveryDetails.address.state is required');
      if (!addr.country) errors.push('deliveryDetails.address.country is required');
    }
  }

  // Total validation
  const expectedTotal = (payload.subtotal || 0) + (payload.tax || 0)
    + (payload.deliveryFee || 0) - (payload.discount || 0);
  if (payload.total != null && payload.total !== expectedTotal) {
    errors.push(`total (${payload.total}) does not match calculated total (${expectedTotal})`);
  }

  // Items validation
  payload.items?.forEach((item, index) => {
    if (!item.menuItemId) errors.push(`items[${index}].menuItemId is required`);
    if (!item.name) errors.push(`items[${index}].name is required`);
    if (item.price == null) errors.push(`items[${index}].price is required`);
    if (!item.quantity || item.quantity < 1) errors.push(`items[${index}].quantity must be >= 1`);
    if (item.subtotal == null) errors.push(`items[${index}].subtotal is required`);
  });

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  return true;
}
```

---

## Quick Reference

### Minimum Payload: Create Delivery Order (Guest)

```json
{
  "orderType": "delivery",
  "items": [
    { "menuItemId": "item_123", "name": "Jollof Rice", "price": 3500, "quantity": 1, "subtotal": 3500 }
  ],
  "subtotal": 3500, "tax": 0, "deliveryFee": 500, "discount": 0, "total": 4000,
  "guestName": "Amara Obi", "guestPhone": "+2348012345678",
  "deliveryDetails": {
    "address": { "street": "12 Admiralty Way", "city": "Lekki", "state": "Lagos", "country": "Nigeria" }
  }
}
```

### Minimum Payload: Create Delivery Order (Registered User)

```json
{
  "orderType": "delivery",
  "userId": "665a1b2c3d4e5f6a7b8c9d0e",
  "items": [
    { "menuItemId": "item_123", "name": "Jollof Rice", "price": 3500, "quantity": 1, "subtotal": 3500 }
  ],
  "subtotal": 3500, "tax": 0, "deliveryFee": 500, "discount": 0, "total": 4000,
  "deliveryDetails": {
    "address": { "street": "12 Admiralty Way", "city": "Lekki", "state": "Lagos", "country": "Nigeria" },
    "deliveryInstructions": "Call when at the gate"
  }
}
```

### Minimum Payload: Initialize Payment

```json
{
  "orderId": "order_del_001",
  "amount": 4000,
  "email": "amara@example.com"
}
```

### Minimum Payload: Verify Payment

```json
{
  "reference": "PAY-WGB-D1E2F3-1709834400"
}
```

### Minimum Payload: Update Delivery Status

```json
{
  "status": "out-for-delivery",
  "note": "Driver departed at 6:25 PM"
}
```

### Minimum Payload: Cancel Delivery Order

```json
{
  "status": "cancelled",
  "note": "Customer requested cancellation"
}
```

---

## API Endpoints Summary

| Endpoint | Method | Purpose | Required Scopes |
|----------|--------|---------|-----------------|
| `/api/public/settings` | GET | Get delivery fee configuration | `settings:read` |
| `/api/public/menu` | GET | List and search menu items | `menu:read` |
| `/api/public/orders` | POST | Create delivery order | `orders:write` |
| `/api/public/orders/{id}` | GET | Get order details / track delivery | `orders:read` |
| `/api/public/orders/{id}` | PATCH | Update delivery status / cancel order | `orders:write` |
| `/api/public/payments` | POST | Initialize payment transaction | `payments:write` |
| `/api/public/payments/verify` | POST | Verify payment status | `payments:read` |

---

## Troubleshooting

### Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid API key | Verify API key is correct and active |
| `403 Forbidden` | Insufficient scopes | Request API key with required scopes (`orders:write`, `payments:write`, etc.) |
| `429 Too Many Requests` | Rate limit exceeded | Implement rate limiting and retry logic with exponential backoff |
| `400` "deliveryDetails.address is required" | Missing delivery address | Include complete `deliveryDetails.address` object with required fields |
| `400` "street is required" | Missing street in address | Provide `deliveryDetails.address.street` |
| `422` "Minimum order amount for delivery is ₦X" | Subtotal below minimum | Add more items to meet the minimum order amount |
| `422` "Delivery service is currently unavailable" | Delivery disabled | Check `GET /api/public/settings` -- delivery may be temporarily disabled |
| `422` "Address is outside delivery radius" | Address too far | Inform customer the address is outside the delivery area |
| `422` "Cannot cancel order in 'preparing' status" | Order already in progress | Only `pending` and `confirmed` orders can be cancelled |
| `400` "total does not match calculated amount" | Incorrect total calculation | Verify total = subtotal + tax + deliveryFee - discount |

### Delivery Fee Calculation Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| Fee is ₦1,000 when expected ₦500 | Subtotal below ₦2,000 threshold | Verify subtotal >= `freeDeliveryThreshold` from settings |
| Fee amount does not match expected | Settings changed | Always fetch fresh settings via `GET /api/public/settings` before calculating fees |
| Fee rejected by API | Client-calculated fee differs from server | Use the fee values from the settings endpoint; do not hardcode fee amounts |

### Address Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| "Address is outside delivery radius" | Customer too far from venue | Check delivery radius in settings; suggest pickup as alternative |
| Order created but driver cannot find address | Incomplete or vague address | Request specific street address, landmarks, and detailed delivery instructions |
| Delivery delayed | Missing delivery instructions | Encourage customers to include gate codes, floor numbers, and contact instructions |

---

## Related Documentation

- API Reference: `/docs/api/public-api-reference.md`
- Authentication Guide: `/docs/api/authentication.md`
- Error Codes: `/docs/api/error-codes.md`
- SOP-CSR-001: Customer Service Delivery Order Management
- SOP-API-001: Agentic API Tab and Order Management

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
