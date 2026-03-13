# SOP: Agentic API Customer Ordering

**Document ID:** SOP-AGENTIC-012
**Version:** 1.0
**Effective Date:** March 13, 2026
**Department:** Technical Integration
**Applies To:** AI Chatbots, WhatsApp Bots, Mobile App Backends, Customer-Facing Agents, Third-party Ordering Platforms

---

## Purpose

This Standard Operating Procedure (SOP) provides technical specifications and step-by-step API integration instructions for agentic systems to programmatically browse the menu, place orders (dine-in, pickup, delivery, pay now), manage tabs, process payments, track order status, and interact with the rewards system on behalf of customers using the Wawa Garden Bar Public REST API.

This document is the API counterpart to SOP-MANUAL-CUSTOMER-001 (Customer Ordering Guide).

---

## Scope

This SOP covers:
- API authentication and authorization for customer-facing agents
- Browsing the menu and resolving items by name
- Retrieving app settings (fees, delivery config, business hours)
- Creating orders for all four order types (dine-in, pickup, delivery, pay now)
- Opening and managing dine-in tabs
- Initializing and verifying online payments
- Tracking order status
- Querying and redeeming customer rewards
- Looking up customer profiles and order history
- Error handling and best practices for customer-facing agents

---

## Prerequisites

- Valid API key with required scopes (see below)
- HTTPS-capable client
- JSON request/response handling capability
- Error handling and retry logic implementation
- Understanding of the Wawa Garden Bar order types and tab system

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

| Scope | Purpose |
|-------|---------|
| `menu:read` | Browse menu items and categories |
| `orders:read` | View order status and history |
| `orders:write` | Create orders |
| `tabs:read` | Look up tabs by table number |
| `payments:read` | Verify payment status |
| `payments:write` | Initialize online payments |
| `rewards:read` | Query, validate, and redeem rewards |
| `settings:read` | Read app config (fees, delivery, hours) |
| `customers:read` | Look up customer profiles (optional) |

> **Role-Based Keys:** Select the **Customer** role when creating an API key (Admin Dashboard > Settings > API Keys) to automatically include the core scopes (`menu:read`, `orders:read`, `orders:write`, `payments:read`, `payments:write`, `rewards:read`, `tabs:read`). Add `settings:read` and `customers:read` via **Custom** selection if needed.

---

## App Settings & Fee Configuration

Before building checkout flows, retrieve the current fee configuration.

### Get App Settings

**Endpoint:** `GET /api/public/settings`
**Scope Required:** `settings:read`

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/settings" \
  -H "x-api-key: wawa_your_api_key_here"
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "serviceFeePercentage": 2,
    "taxPercentage": 7.5,
    "pointsConversionRate": 100,
    "minimumOrderAmount": 1000,
    "deliveryFee": 1000,
    "reducedDeliveryFee": 500,
    "freeDeliveryThreshold": 2000,
    "deliveryEnabled": true,
    "pickupEnabled": true,
    "dineInEnabled": true,
    "menuCategories": {
      "food": [...],
      "drinks": [...]
    },
    "paymentProvider": "monnify"
  },
  "meta": { "timestamp": "..." }
}
```

**Key fields for checkout calculations:**

| Field | Usage |
|-------|-------|
| `serviceFeePercentage` | Calculate service fee: `subtotal * (serviceFeePercentage / 100)` |
| `taxPercentage` | Calculate tax: `subtotal * (taxPercentage / 100)` (if enabled) |
| `minimumOrderAmount` | Validate cart meets minimum before checkout |
| `deliveryFee` / `reducedDeliveryFee` / `freeDeliveryThreshold` | Calculate delivery fee based on subtotal |
| `pointsConversionRate` | Points-to-Naira conversion (100 points = ₦1) |
| `deliveryEnabled` / `pickupEnabled` / `dineInEnabled` | Show/hide order types |

### JavaScript Helper: Calculate Fees

```javascript
function calculateFees(subtotal, settings, orderType) {
  const serviceFee = Math.round(subtotal * (settings.serviceFeePercentage / 100));
  const tax = settings.taxPercentage > 0
    ? Math.round(subtotal * (settings.taxPercentage / 100))
    : 0;
  let deliveryFee = 0;
  if (orderType === 'delivery') {
    if (subtotal >= settings.freeDeliveryThreshold) {
      deliveryFee = 0;
    } else if (subtotal >= settings.reducedDeliveryFee) {
      deliveryFee = settings.reducedDeliveryFee;
    } else {
      deliveryFee = settings.deliveryFee;
    }
  }
  const total = subtotal + serviceFee + tax + deliveryFee;
  return { subtotal, serviceFee, tax, deliveryFee, total };
}
```

---

## Procedure

### Part 1: Browsing the Menu

**Endpoint:** `GET /api/public/menu`
**Scope Required:** `menu:read`

#### 1.1 List All Available Items

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/menu?limit=100" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### 1.2 Browse by Category

```bash
# Food — Main Courses
curl -X GET "https://api.wawagardenbar.com/api/public/menu?mainCategory=food&category=main-courses" \
  -H "x-api-key: wawa_your_api_key_here"

# Drinks — Beer (Local)
curl -X GET "https://api.wawagardenbar.com/api/public/menu?mainCategory=drinks&category=beer-local" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### 1.3 Search by Name

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/menu?q=jollof+rice" \
  -H "x-api-key: wawa_your_api_key_here"
```

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `q` | string | Free-text search across name, description, tags | `"jollof"`, `"star lager"` |
| `mainCategory` | string | Filter: `"food"` or `"drinks"` | `"food"` |
| `category` | string | Filter by subcategory slug | `"main-courses"`, `"beer-local"` |
| `page` | number | Page number (default: 1) | `1` |
| `limit` | number | Items per page (default: 25, max: 100) | `50` |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "665a1b2c3d4e5f6a7b8c9d0e",
      "name": "Jollof Rice",
      "mainCategory": "food",
      "category": "rice-dishes",
      "price": 3500,
      "description": "Classic Nigerian jollof rice with tomato sauce",
      "isAvailable": true,
      "stockStatus": "in-stock",
      "currentStock": 25,
      "preparationTime": 20,
      "portionOptions": { "allowHalf": true, "allowQuarter": false, "halfSurcharge": 0, "quarterSurcharge": 0 },
      "customizationOptions": [
        {
          "name": "Protein",
          "type": "single",
          "options": [
            { "name": "Chicken", "priceModifier": 500 },
            { "name": "Beef", "priceModifier": 500 },
            { "name": "Fish", "priceModifier": 800 }
          ]
        }
      ],
      "tags": ["popular", "spicy"],
      "allergens": [],
      "nutritionalInfo": { "calories": 450, "spiceLevel": 2 },
      "images": ["/uploads/menu-items/jollof-rice.webp"]
    }
  ],
  "meta": { "page": 1, "limit": 25, "total": 1, "totalPages": 1, "timestamp": "..." }
}
```

**Key fields to extract for ordering:**

| Response Field | Maps to Order Field | Description |
|----------------|---------------------|-------------|
| `_id` | `menuItemId` | Item database ID |
| `name` | `name` | Display name |
| `price` | `price` | Unit price in ₦ |
| `isAvailable` | — | Must be `true` to order |
| `stockStatus` | — | Must not be `"out-of-stock"` |
| `portionOptions` | `portionSize` | Whether half/quarter is allowed |
| `customizationOptions` | `customizations` | Available add-ons |

#### 1.4 Get Menu Categories

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/menu/categories" \
  -H "x-api-key: wawa_your_api_key_here"
```

Returns grouped categories (food and drinks subcategories) for building navigation.

#### JavaScript Helper: Resolve Item by Name

```javascript
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
```

---

### Part 2: Creating Orders

**Endpoint:** `POST /api/public/orders`
**Scope Required:** `orders:write`

All four order types use the same endpoint. The `orderType` field and presence of type-specific fields determine the flow.

#### 2.1 Common Required Fields (All Order Types)

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `orderType` | string | ✅ | `"dine-in"`, `"pickup"`, `"delivery"`, `"pay-now"` | `"delivery"` |
| `items` | array | ✅ | At least 1 item (see Item Object below) | See below |
| `subtotal` | number | ✅ | Order subtotal in ₦ | `3500` |
| `tax` | number | ✅ | Tax amount (can be 0) | `0` |
| `deliveryFee` | number | ✅ | Delivery fee (0 for non-delivery) | `0` |
| `discount` | number | ✅ | Discount amount (can be 0) | `0` |
| `total` | number | ✅ | Final total in ₦ | `3500` |

#### Common Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `guestName` | string | Customer name (for guest checkout) |
| `guestEmail` | string | Customer email |
| `guestPhone` | string | Customer phone |
| `userId` | string | Registered user ObjectId (if known) |
| `specialInstructions` | string | Order-level notes |
| `tipAmount` | number | Tip in ₦ |

#### Item Object Structure

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `menuItemId` | string | ✅ | Menu item database ID | `"665a1b..."` |
| `name` | string | ✅ | Item display name | `"Jollof Rice"` |
| `price` | number | ✅ | Unit price in ₦ | `3500` |
| `quantity` | number | ✅ | Quantity (min: 1) | `2` |
| `subtotal` | number | ✅ | Line item subtotal | `7000` |
| `portionSize` | string | ❌ | `"full"`, `"half"`, or `"quarter"` (default: `"full"`) | `"half"` |
| `customizations` | array | ❌ | Array of `{ name, option, price }` | See below |
| `specialInstructions` | string | ❌ | Item-specific notes | `"No onions"` |

**Customization Example:**

```json
{
  "menuItemId": "665a1b2c3d4e5f6a7b8c9d0e",
  "name": "Jollof Rice",
  "price": 4000,
  "quantity": 1,
  "portionSize": "full",
  "subtotal": 4000,
  "customizations": [
    { "name": "Protein", "option": "Chicken", "price": 500 }
  ],
  "specialInstructions": "Extra spicy"
}
```

---

#### 2.2 Pay Now Order (Simplest)

No table number, pickup time, or delivery address needed.

```bash
curl -X POST https://api.wawagardenbar.com/api/public/orders \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "orderType": "pay-now",
    "guestName": "Ada",
    "guestEmail": "ada@example.com",
    "items": [
      {
        "menuItemId": "item_beer_001",
        "name": "Star Lager Beer",
        "price": 800,
        "quantity": 2,
        "subtotal": 1600
      }
    ],
    "subtotal": 1600,
    "tax": 0,
    "deliveryFee": 0,
    "discount": 0,
    "total": 1600
  }'
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "_id": "order_abc123",
    "orderNumber": "WGB-X1Y2Z3",
    "status": "pending",
    "orderType": "pay-now",
    "items": [...],
    "subtotal": 1600,
    "total": 1600,
    "estimatedWaitTime": 5,
    "createdAt": "2026-03-13T13:00:00Z"
  },
  "meta": { "timestamp": "..." }
}
```

---

#### 2.3 Pickup Order

Requires `pickupDetails` with preferred pickup time.

```bash
curl -X POST https://api.wawagardenbar.com/api/public/orders \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "orderType": "pickup",
    "guestName": "Chidi Okafor",
    "guestEmail": "chidi@example.com",
    "guestPhone": "+2348012345678",
    "items": [
      {
        "menuItemId": "item_jollof",
        "name": "Jollof Rice",
        "price": 3500,
        "quantity": 1,
        "subtotal": 3500
      }
    ],
    "subtotal": 3500,
    "tax": 0,
    "deliveryFee": 0,
    "discount": 0,
    "total": 3500,
    "pickupDetails": {
      "preferredTime": "2026-03-13T14:30:00Z"
    }
  }'
```

**Additional Fields for Pickup:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pickupDetails.preferredTime` | string (ISO 8601) | ✅ | Preferred pickup time |

---

#### 2.4 Delivery Order

Requires `deliveryDetails` with address. Delivery fee applies based on subtotal.

```bash
curl -X POST https://api.wawagardenbar.com/api/public/orders \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "orderType": "delivery",
    "guestName": "Ngozi Adeyemi",
    "guestEmail": "ngozi@example.com",
    "guestPhone": "+2349087654321",
    "items": [
      {
        "menuItemId": "item_pepper_soup",
        "name": "Goat Pepper Soup",
        "price": 4500,
        "quantity": 1,
        "subtotal": 4500
      }
    ],
    "subtotal": 4500,
    "tax": 0,
    "deliveryFee": 0,
    "discount": 0,
    "total": 4500,
    "deliveryDetails": {
      "address": "15 Admiralty Way, Lekki Phase 1",
      "city": "Lagos",
      "state": "Lagos",
      "postalCode": "101245",
      "instructions": "Call when at the gate"
    }
  }'
```

**Additional Fields for Delivery:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `deliveryDetails.address` | string | ✅ | Street address |
| `deliveryDetails.city` | string | ✅ | City |
| `deliveryDetails.state` | string | ❌ | State |
| `deliveryDetails.postalCode` | string | ❌ | Postal code |
| `deliveryDetails.instructions` | string | ❌ | Delivery instructions |

---

#### 2.5 Dine-In Order (Without Tab — Pay Immediately)

```bash
curl -X POST https://api.wawagardenbar.com/api/public/orders \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "orderType": "dine-in",
    "guestName": "Emeka",
    "items": [
      {
        "menuItemId": "item_beer_001",
        "name": "Star Lager Beer",
        "price": 800,
        "quantity": 3,
        "subtotal": 2400
      }
    ],
    "subtotal": 2400,
    "tax": 0,
    "deliveryFee": 0,
    "discount": 0,
    "total": 2400,
    "dineInDetails": { "tableNumber": "7" }
  }'
```

**Additional Fields for Dine-in:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dineInDetails.tableNumber` | string | ✅ | Physical table identifier |

---

#### 2.6 Dine-In Order with New Tab

Opens a tab and places the first order in a single call. Tip and payment are deferred until tab closure.

```bash
curl -X POST https://api.wawagardenbar.com/api/public/orders \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "orderType": "dine-in",
    "useTab": "new",
    "customerName": "John Doe",
    "guestEmail": "john@example.com",
    "items": [
      {
        "menuItemId": "item_beer_001",
        "name": "Star Lager Beer",
        "price": 800,
        "quantity": 2,
        "subtotal": 1600
      }
    ],
    "subtotal": 1600,
    "tax": 0,
    "deliveryFee": 0,
    "discount": 0,
    "total": 1600,
    "dineInDetails": { "tableNumber": "5" }
  }'
```

**Tab-Specific Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `useTab` | string | ✅ for tab | `"new"` to create tab, `"existing"` to add to open tab |
| `customerName` | string | ❌ | Name for the tab |
| `tabId` | string | ❌ | Alternative to `useTab`: attach directly to a known tab ID |

**Success Response (201 Created) — with tab:**

```json
{
  "success": true,
  "data": {
    "order": {
      "_id": "order_abc123",
      "orderNumber": "WGB-X1Y2Z3",
      "status": "pending",
      "orderType": "dine-in",
      "items": [...],
      "total": 1600,
      "estimatedWaitTime": 5
    },
    "tab": {
      "_id": "tab_def456",
      "tabNumber": "TAB-5-789012",
      "tableNumber": "5",
      "status": "open",
      "customerName": "John Doe",
      "subtotal": 1600,
      "serviceFee": 32,
      "tax": 0,
      "total": 1632,
      "orders": ["order_abc123"]
    }
  },
  "meta": { "timestamp": "..." }
}
```

> **CRITICAL:** Store `data.tab._id` and `data.tab.tabNumber` for subsequent operations.

**Error — Table already has a tab (409):**

```json
{
  "success": false,
  "error": "Table 5 already has an open tab"
}
```

---

#### 2.7 Dine-In Order Added to Existing Tab

```bash
curl -X POST https://api.wawagardenbar.com/api/public/orders \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "orderType": "dine-in",
    "useTab": "existing",
    "items": [
      {
        "menuItemId": "item_jollof",
        "name": "Jollof Rice",
        "price": 3500,
        "quantity": 1,
        "portionSize": "half",
        "subtotal": 1750
      }
    ],
    "subtotal": 1750,
    "tax": 0,
    "deliveryFee": 0,
    "discount": 0,
    "total": 1750,
    "dineInDetails": { "tableNumber": "5" }
  }'
```

The API automatically finds the open tab for the given table number. Alternatively, use `"tabId": "tab_def456"` instead of `"useTab": "existing"` if you have the tab ID.

**Error — No open tab found (422):**

```json
{
  "success": false,
  "error": "No open tab found for table 5"
}
```

---

### Part 3: Tab Management

#### 3.1 Check for Existing Open Tab

**Endpoint:** `GET /api/public/tabs`
**Scope Required:** `tabs:read`

Before allowing a customer to open a new tab, check if they already have one.

```bash
# By table number
curl -X GET "https://api.wawagardenbar.com/api/public/tabs?tableNumber=5&status=open&limit=1" \
  -H "x-api-key: wawa_your_api_key_here"

# By customer ID
curl -X GET "https://api.wawagardenbar.com/api/public/tabs?customerId=665a1b2c...&status=open&limit=1" \
  -H "x-api-key: wawa_your_api_key_here"
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `tableNumber` | string | Filter by table |
| `tabNumber` | string | Filter by tab number (e.g., `TAB-5-123456`) |
| `customerId` | string | Filter by user ObjectId |
| `status` | string | `"open"`, `"settling"`, `"closed"` |
| `page` / `limit` | number | Pagination |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "tab_def456",
      "tabNumber": "TAB-5-789012",
      "tableNumber": "5",
      "status": "open",
      "customerName": "John Doe",
      "subtotal": 3350,
      "serviceFee": 67,
      "tax": 0,
      "total": 3417,
      "orders": [
        { "_id": "order_001", "orderNumber": "WGB-X1Y2Z3", "status": "completed", "total": 1600 },
        { "_id": "order_002", "orderNumber": "WGB-A4B5C6", "status": "preparing", "total": 1750 }
      ],
      "openedAt": "2026-03-13T12:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 1, "total": 1, "totalPages": 1, "timestamp": "..." }
}
```

#### 3.2 Get Tab Details

**Endpoint:** `GET /api/public/tabs/{tabId}`
**Scope Required:** `tabs:read`

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/tabs/tab_def456" \
  -H "x-api-key: wawa_your_api_key_here"
```

Returns full tab with populated orders.

#### 3.3 Tab Constraints (Agent Logic)

Enforce these rules in your agent's decision logic:

```javascript
async function resolveTabOption(tableNumber, customerId) {
  // Check for existing open tab
  const url = new URL(`${API_BASE}/api/public/tabs`);
  url.searchParams.append('status', 'open');
  url.searchParams.append('limit', '1');
  if (customerId) url.searchParams.append('customerId', customerId);
  else url.searchParams.append('tableNumber', tableNumber);

  const response = await fetch(url, { headers });
  const result = await response.json();

  if (result.success && result.data.length > 0) {
    const existingTab = result.data[0];
    // Customer HAS an open tab — MUST add to it
    return {
      action: 'add-to-existing',
      tabId: existingTab._id,
      tabNumber: existingTab.tabNumber,
      currentTotal: existingTab.total,
      message: `You have an open tab (${existingTab.tabNumber}) at table ${existingTab.tableNumber}. Your order will be added to this tab.`
    };
  }

  // No open tab — customer can choose
  return {
    action: 'choose',
    options: ['new-tab', 'pay-now'],
    message: 'Would you like to open a tab (pay later) or pay now?'
  };
}
```

---

### Part 4: Processing Payments

For orders that are NOT on a tab (pay-now, pickup, delivery, or dine-in without tab), payment must be processed after order creation.

#### 4.1 Initialize Online Payment

**Endpoint:** `POST /api/public/payments`
**Scope Required:** `payments:write`

```bash
curl -X POST https://api.wawagardenbar.com/api/public/payments \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order_abc123",
    "customerName": "Ada Obi",
    "customerEmail": "ada@example.com",
    "redirectUrl": "https://yourbot.com/payment/callback",
    "paymentMethods": ["card", "bank_transfer", "ussd"]
  }'
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `orderId` | string | ✅ | Order database ID |
| `customerName` | string | ✅ | Customer full name |
| `customerEmail` | string | ✅ | Email for receipt |
| `redirectUrl` | string | ✅ | URL to redirect after payment |
| `paymentMethods` | array | ❌ | Allowed payment methods |

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.monnify.com/abc123xyz",
    "paymentReference": "PAY-WGB-X1Y2Z3-1710334800",
    "provider": "monnify",
    "orderNumber": "WGB-X1Y2Z3",
    "amount": 1600
  },
  "meta": { "timestamp": "..." }
}
```

**Agent action:** Send `checkoutUrl` to the customer (e.g., as a link in chat or redirect in a web view).

**Errors:**

| Status | Error | Cause |
|--------|-------|-------|
| 404 | `"Order not found"` | Invalid orderId |
| 409 | `"Order has already been paid"` | Duplicate payment attempt |

#### 4.2 Verify Payment

**Endpoint:** `POST /api/public/payments/verify`
**Scope Required:** `payments:read`

After the customer completes payment (or after a callback/timeout), verify status.

```bash
curl -X POST https://api.wawagardenbar.com/api/public/payments/verify \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentReference": "PAY-WGB-X1Y2Z3-1710334800"
  }'
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "paymentReference": "PAY-WGB-X1Y2Z3-1710334800",
    "status": "success",
    "amount": 1600,
    "paidAt": "2026-03-13T13:05:30Z",
    "transactionReference": "TXN-MFY-1234567890",
    "provider": "monnify"
  },
  "meta": { "timestamp": "..." }
}
```

**Payment Status Values:**

| Status | Meaning | Agent Action |
|--------|---------|--------------|
| `success` | Payment completed | Confirm to customer, proceed to tracking |
| `pending` | Payment in progress | Poll again after 3-5 seconds |
| `failed` | Payment failed | Offer to retry or try a different method |

#### JavaScript Helper: Payment Flow with Polling

```javascript
async function processPayment(orderId, customerName, customerEmail, redirectUrl) {
  // Step 1: Initialize
  const initResponse = await fetch(`${API_BASE}/api/public/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ orderId, customerName, customerEmail, redirectUrl })
  });
  const initResult = await initResponse.json();
  if (!initResult.success) throw new Error(initResult.error);

  const { checkoutUrl, paymentReference } = initResult.data;

  // Step 2: Send checkout URL to customer
  // (agent-specific: send as chat message, open web view, etc.)

  // Step 3: Poll for verification (after customer completes payment)
  return { checkoutUrl, paymentReference };
}

async function pollPaymentStatus(paymentReference, maxAttempts = 10) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(`${API_BASE}/api/public/payments/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ paymentReference })
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.error);

    if (result.data.status === 'success') return result.data;
    if (result.data.status === 'failed') throw new Error('Payment failed');

    // Pending — wait and retry with exponential backoff
    await new Promise(resolve => setTimeout(resolve, 3000 * attempt));
  }
  throw new Error('Payment verification timed out');
}
```

---

### Part 5: Tracking Orders

#### 5.1 Get Order Details

**Endpoint:** `GET /api/public/orders/{orderId}`
**Scope Required:** `orders:read`

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/orders/order_abc123" \
  -H "x-api-key: wawa_your_api_key_here"
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "_id": "order_abc123",
    "orderNumber": "WGB-X1Y2Z3",
    "status": "preparing",
    "orderType": "pay-now",
    "items": [
      {
        "menuItemId": "item_beer_001",
        "name": "Star Lager Beer",
        "quantity": 2,
        "portionSize": "full",
        "price": 800,
        "subtotal": 1600
      }
    ],
    "subtotal": 1600,
    "serviceFee": 32,
    "tax": 0,
    "total": 1632,
    "paymentStatus": "paid",
    "paymentMethod": "card",
    "statusHistory": [
      { "status": "pending", "timestamp": "2026-03-13T13:00:00Z" },
      { "status": "confirmed", "timestamp": "2026-03-13T13:01:15Z" },
      { "status": "preparing", "timestamp": "2026-03-13T13:02:30Z" }
    ],
    "estimatedWaitTime": 5,
    "createdAt": "2026-03-13T13:00:00Z"
  },
  "meta": { "timestamp": "..." }
}
```

**Status Flow for Customer Display:**

| Status | Customer-Friendly Message |
|--------|--------------------------|
| `pending` | "Your order has been received." |
| `confirmed` | "Your order has been confirmed by the kitchen." |
| `preparing` | "Your order is being prepared." |
| `ready` | "Your order is ready!" |
| `out-for-delivery` | "Your order is on the way." |
| `delivered` | "Your order has been delivered." |
| `completed` | "Order complete. Thank you!" |
| `cancelled` | "Your order was cancelled." |

#### 5.2 List Customer Orders (History)

**Endpoint:** `GET /api/public/orders`
**Scope Required:** `orders:read`

```bash
# By customer ID
curl -X GET "https://api.wawagardenbar.com/api/public/orders?customerId=665a1b2c...&sort=-createdAt&limit=10" \
  -H "x-api-key: wawa_your_api_key_here"

# By email (for guest customers)
curl -X GET "https://api.wawagardenbar.com/api/public/orders?customerEmail=ada@example.com&sort=-createdAt&limit=10" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### 5.3 Poll for Status Changes

```javascript
async function waitForStatus(orderId, targetStatus, maxAttempts = 30) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(`${API_BASE}/api/public/orders/${orderId}`, { headers });
    const result = await response.json();
    if (!result.success) throw new Error(result.error);

    const currentStatus = result.data.status;
    if (currentStatus === targetStatus) return result.data;
    if (currentStatus === 'cancelled') throw new Error('Order was cancelled');

    // Poll every 10 seconds
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  throw new Error('Status polling timed out');
}

// Usage: wait for order to be ready
const readyOrder = await waitForStatus('order_abc123', 'ready');
console.log('Order is ready for pickup!');
```

---

### Part 6: Rewards and Loyalty

#### 6.1 Get Customer Rewards

**Endpoint:** `GET /api/public/rewards?userId={userId}`
**Scope Required:** `rewards:read`

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/rewards?userId=665a1b2c3d4e5f6a7b8c9d0e" \
  -H "x-api-key: wawa_your_api_key_here"
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "rewards": [
      {
        "_id": "reward_abc123",
        "code": "LOYALTY-500OFF",
        "rewardType": "discount",
        "rewardValue": 500,
        "status": "active",
        "expiresAt": "2026-04-13T00:00:00Z"
      }
    ],
    "stats": {
      "totalEarned": 12,
      "totalRedeemed": 8,
      "activeRewards": 3,
      "totalSavings": 6500,
      "loyaltyPoints": 45000
    }
  },
  "meta": { "timestamp": "..." }
}
```

**Points conversion:** 100 points = ₦1. So `45000` points = ₦450.

#### 6.2 Validate a Reward Code

**Endpoint:** `POST /api/public/rewards/validate`
**Scope Required:** `rewards:read`

```bash
curl -X POST "https://api.wawagardenbar.com/api/public/rewards/validate" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "665a1b2c3d4e5f6a7b8c9d0e",
    "code": "LOYALTY-500OFF"
  }'
```

**Response — Valid:**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "reward": {
      "_id": "reward_abc123",
      "code": "LOYALTY-500OFF",
      "rewardType": "discount",
      "rewardValue": 500,
      "expiresAt": "2026-04-13T00:00:00Z"
    }
  }
}
```

**Response — Invalid:**

```json
{
  "success": true,
  "data": {
    "valid": false,
    "message": "Reward code has expired"
  }
}
```

#### 6.3 Redeem a Reward Against an Order

**Endpoint:** `POST /api/public/rewards/redeem`
**Scope Required:** `rewards:read`

```bash
curl -X POST "https://api.wawagardenbar.com/api/public/rewards/redeem" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "rewardId": "reward_abc123",
    "orderId": "order_abc123"
  }'
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": { "success": true },
  "meta": { "timestamp": "..." }
}
```

> **Important:** Redeem rewards **before** initializing payment so the order total reflects the discount.

---

### Part 7: Customer Profile Lookup (Optional)

If your agent has `customers:read` scope, you can look up returning customers.

#### 7.1 Search Customers

**Endpoint:** `GET /api/public/customers`
**Scope Required:** `customers:read`

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/customers?q=ada@example.com" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### 7.2 Get Customer Profile

**Endpoint:** `GET /api/public/customers/{customerId}`
**Scope Required:** `customers:read`

Returns profile (name, email, phone, loyalty points). Sensitive fields (passwords, PINs, sessions) are stripped server-side.

#### 7.3 Get Customer Order History

**Endpoint:** `GET /api/public/customers/{customerId}/orders`
**Scope Required:** `customers:read` + `orders:read`

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/customers/665a1b2c.../orders?limit=5&sort=-createdAt" \
  -H "x-api-key: wawa_your_api_key_here"
```

Useful for "reorder" flows or providing order history context to the customer.

---

## Complete Workflow Examples

### Flow 1: Quick Pay-Now Order (Bar Drink)

```
Customer: "I'd like 2 Star Lagers"

1. lookupMenuItem("Star Lager")           → { menuItemId, name, price: 800 }
2. Build items: [{ ...starLager, qty: 2, subtotal: 1600 }]
3. createOrder({ orderType: "pay-now", items, total: 1600, guestName: "Customer" })
   → { orderId, orderNumber }
4. initializePayment(orderId, ...)        → { checkoutUrl }
5. Send checkoutUrl to customer
6. pollPaymentStatus(paymentReference)    → { status: "success" }
7. "Your order WGB-X1Y2Z3 is confirmed! It will be ready shortly."
```

### Flow 2: Dine-In with Tab (Multi-Order Visit)

```
Customer arrives at Table 5:

1. resolveTabOption("5")                  → { action: "choose" } (no existing tab)
2. Customer says "Open a tab, 2 Star Lagers and Pepper Soup"
3. lookupMenuItem("Star Lager")           → resolve
4. lookupMenuItem("Pepper Soup")          → resolve
5. createOrder({ orderType: "dine-in", useTab: "new", tableNumber: "5", ... })
   → { order, tab: { _id: "tab_def456", tabNumber: "TAB-5-789012" } }
6. "Tab opened! Your order is being prepared."

Later, customer wants more:

7. resolveTabOption("5")                  → { action: "add-to-existing", tabId: "tab_def456" }
8. Customer says "Add a Jollof Rice, half portion"
9. lookupMenuItem("Jollof Rice")          → resolve
10. createOrder({ orderType: "dine-in", tabId: "tab_def456", portionSize: "half", ... })
    → { order, tab: { total: updated } }
11. "Added to your tab. Current tab total: ₦5,117"

Customer ready to leave:

12. getCustomerRewards(userId)            → check for active rewards
13. If reward available: validateRewardCode + redeemReward
14. "Your tab total is ₦5,117 (₦500 discount applied). Ready to pay?"
15. Close tab via SOP-AGENTIC-003 (Tab Settlement)
```

### Flow 3: Delivery Order with Reward

```
Customer: "Deliver a Goat Pepper Soup to 15 Admiralty Way, Lekki"

1. lookupMenuItem("Goat Pepper Soup")     → { price: 4500 }
2. getSettings()                          → { deliveryFee: 0 (above ₦2000 threshold) }
3. getCustomerRewards(userId)             → active reward: 10% discount
4. validateRewardCode(userId, code)       → valid
5. Calculate: subtotal=4500, discount=450 (10%), total=4050
6. createOrder({ orderType: "delivery", deliveryDetails: {...}, discount: 450, total: 4050 })
7. redeemReward(rewardId, orderId)
8. initializePayment(orderId, ...)        → checkoutUrl
9. Customer pays
10. pollPaymentStatus(ref)                → success
11. "Your order is confirmed! Estimated delivery: 30-45 minutes."
12. waitForStatus(orderId, "out-for-delivery")
13. "Your order is on the way!"
14. waitForStatus(orderId, "delivered")
15. "Your order has been delivered. Enjoy!"
```

### Flow 4: Returning Customer — Quick Reorder

```
Customer: "I want the same as last time"

1. listCustomers(q="ada@example.com")     → customerId
2. getCustomerOrders(customerId, limit=1) → last order items
3. Verify each item is still available via lookupMenuItem
4. Present: "Last time you ordered: 1x Jollof Rice, 2x Star Lager. Shall I place the same order?"
5. Customer confirms → proceed with order creation flow
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
      if (result.success) return result;

      // Don't retry business logic errors
      if ([400, 404, 409, 422].includes(response.status)) {
        throw new Error(result.error);
      }
      // Retry server errors
      if (response.status >= 500) {
        lastError = new Error(result.error);
        await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }
      throw new Error(result.error);
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) break;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  throw lastError;
}
```

### Customer-Friendly Error Messages

| API Error | Customer Message |
|-----------|-----------------|
| `"Table 5 already has an open tab"` | "Table 5 already has an open tab. I'll add your order to it." |
| `"No open tab found for table 5"` | "There's no open tab for this table. Would you like to open one?" |
| `"Order has already been paid"` | "This order has already been paid." |
| Item `isAvailable: false` | "Sorry, [Item Name] is currently unavailable. Can I suggest something else?" |
| Item `stockStatus: "out-of-stock"` | "Sorry, [Item Name] is out of stock right now." |
| `minimumOrderAmount` not met | "The minimum order is ₦1,000. Would you like to add anything else?" |
| `429 Too Many Requests` | "We're processing your request. Please wait a moment." |
| `500 Server Error` | "Something went wrong on our end. Let me try again." |

### Validate Before Sending

```javascript
function validateOrderPayload(payload, settings) {
  const errors = [];
  if (!payload.orderType) errors.push('Order type is required');
  if (!payload.items || payload.items.length === 0) errors.push('At least one item is required');
  if (payload.total == null) errors.push('Total is required');
  if (payload.total < settings.minimumOrderAmount) {
    errors.push(`Minimum order is ₦${settings.minimumOrderAmount}`);
  }
  if (payload.orderType === 'dine-in' && !payload.dineInDetails?.tableNumber) {
    errors.push('Table number is required for dine-in orders');
  }
  if (payload.orderType === 'delivery' && !payload.deliveryDetails?.address) {
    errors.push('Delivery address is required');
  }
  payload.items?.forEach((item, i) => {
    if (!item.menuItemId) errors.push(`Item ${i + 1}: menuItemId is required`);
    if (!item.name) errors.push(`Item ${i + 1}: name is required`);
    if (item.price == null) errors.push(`Item ${i + 1}: price is required`);
    if (!item.quantity || item.quantity < 1) errors.push(`Item ${i + 1}: quantity must be >= 1`);
  });
  return errors;
}
```

---

## Rate Limiting

- **Rate:** 30 requests per minute per API key (moderate tier)
- **Max page size:** 100 items, default 25
- **Response header:** `X-RateLimit-Remaining`

**Best practices:**
1. Cache menu data (it changes infrequently)
2. Cache settings (check once per session)
3. Use `/summary` endpoints over paginating raw records where available
4. Implement exponential backoff on 429 responses

---

## API Endpoints Summary

| Endpoint | Method | Purpose | Scope |
|----------|--------|---------|-------|
| `/api/public/settings` | GET | App configuration (fees, hours, toggles) | `settings:read` |
| `/api/public/menu` | GET | List/search menu items | `menu:read` |
| `/api/public/menu/categories` | GET | Menu categories | `menu:read` |
| `/api/public/menu/{itemId}` | GET | Single item detail | `menu:read` |
| `/api/public/orders` | GET | List orders (with filters) | `orders:read` |
| `/api/public/orders` | POST | Create order | `orders:write` |
| `/api/public/orders/{orderId}` | GET | Order details + status | `orders:read` |
| `/api/public/tabs` | GET | List tabs (with filters) | `tabs:read` |
| `/api/public/tabs/{tabId}` | GET | Tab details + orders | `tabs:read` |
| `/api/public/payments` | POST | Initialize online payment | `payments:write` |
| `/api/public/payments/verify` | POST | Verify payment status | `payments:read` |
| `/api/public/rewards` | GET | Customer rewards + stats | `rewards:read` |
| `/api/public/rewards/validate` | POST | Validate reward code | `rewards:read` |
| `/api/public/rewards/redeem` | POST | Redeem reward | `rewards:read` |
| `/api/public/customers` | GET | Search customers | `customers:read` |
| `/api/public/customers/{id}` | GET | Customer profile | `customers:read` |
| `/api/public/customers/{id}/orders` | GET | Customer order history | `customers:read` + `orders:read` |

---

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid or missing API key | Verify key is correct and active |
| `403 Forbidden` | Key lacks required scope | Request key with correct scopes |
| `404 Not Found` | Invalid resource ID | Verify the ID from a prior API call |
| `409 Conflict` | Duplicate (tab exists, already paid) | Read `error` message for specifics |
| `422 Unprocessable` | Business rule violation | Read `error` message; adjust payload |
| `429 Too Many Requests` | Rate limit exceeded | Back off, retry after `Retry-After` header |
| `500 Internal Server Error` | Server issue | Retry with exponential backoff |

---

## Related Documentation

- **SOP-MANUAL-CUSTOMER-001:** Customer Ordering Guide (UI walkthrough)
- **SOP-AGENTIC-001:** Tab and Order Management (detailed tab API)
- **SOP-AGENTIC-003:** Tab Settlement and Payment (tab closure/payment)
- **SOP-AGENTIC-004:** Order Lifecycle Management (status transitions)
- **SOP-AGENTIC-007:** Rewards and Loyalty (detailed rewards API)
- **Agent Tooling Guide:** `/docs/api/AGENT-TOOLING-GUIDE.md`
- **Agent Tooling Flows:** `/docs/api/AGENT-TOOLING-FLOWS.md`

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | March 13, 2026 | Technical Team | Initial release |

---

## Support

**For technical support:**
- API Documentation: https://docs.wawagardenbar.com/api
- Developer Support: dev-support@wawagardenbar.com

**For API key requests:**
- Contact: admin@wawagardenbar.com
- Dashboard: https://wawagardenbar.com/dashboard/settings/api-keys
