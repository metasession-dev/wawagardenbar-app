# SOP: Agentic API Tab and Order Management

**Document ID:** SOP-AGENTIC-001  
**Version:** 1.0  
**Effective Date:** March 4, 2026  
**Department:** Technical Integration / API Consumers  
**Applies To:** AI Agents, Third-party Systems, Automated Ordering Platforms

---

## Purpose

This Standard Operating Procedure (SOP) provides technical specifications and step-by-step API integration instructions for agentic systems to programmatically create tabs, add orders to tabs, and manage customer orders using the Wawa Garden Bar Public REST API.

---

## Scope

This SOP covers:
- API authentication and authorization
- Creating tabs via API
- Creating orders and adding them to tabs
- Minimum required payload fields
- Error handling and validation
- Best practices for automated systems

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

- `menu:read` - Look up menu items by name/category
- `orders:write` - Create and modify orders
- `orders:read` - Read order and tab information
- `tabs:read` - Look up tabs by table number or tab number
- `tabs:write` - Create standalone tabs (optional)
- `customers:write` - Create/update customer information (optional)

> **Role-Based Keys:** Select the **Customer** role when creating an API key (Admin Dashboard > Settings > API Keys) to automatically include all required scopes (`menu:read`, `orders:read`, `orders:write`, `tabs:read`). For optional `tabs:write` scope, select **CSR**; for optional `customers:write` scope, select **CSR**. Alternatively, use **Custom** to select individual scopes.

---

## Procedure

### Prerequisite A: Looking Up Menu Items by Name

Before creating an order, you need the `menuItemId`, `name`, and `price` for each item.
Use the menu search endpoint to find items by name.

**Endpoint:** `GET /api/public/menu`  
**Scope Required:** `menu:read`

#### Search by Item Name

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/menu?q=star+lager" \
  -H "x-api-key: wawa_your_api_key_here"
```

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `q` | string | Free-text search across name, description, and tags | `"star lager"`, `"jollof"`, `"chapman"` |
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
      "name": "Star Lager Beer",
      "mainCategory": "drinks",
      "category": "beer-local",
      "price": 800,
      "isAvailable": true,
      "stockStatus": "in-stock",
      "currentStock": 48,
      "preparationTime": 2,
      "portionOptions": { "allowHalf": false, "allowQuarter": false },
      "customizationOptions": []
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
| `isAvailable` | — | Check this is `true` before ordering |
| `stockStatus` | — | Ensure not `"out-of-stock"` |
| `portionOptions` | `portionSize` | Whether half/quarter portions are allowed |
| `customizationOptions` | `customizations` | Available add-ons and modifiers |

#### Example: Resolve Item Names to Order Items

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

// Usage: customer says "2 Star Lager and 1 Jollof Rice"
const starLager = await lookupMenuItem('Star Lager');
const jollofRice = await lookupMenuItem('Jollof Rice');

if (!starLager) throw new Error('Star Lager not found or unavailable');
if (!jollofRice) throw new Error('Jollof Rice not found or unavailable');

const orderItems = [
  { ...starLager, quantity: 2, subtotal: starLager.price * 2 },
  { ...jollofRice, quantity: 1, portionSize: 'half', subtotal: jollofRice.price / 2 }
];
```

---

### Prerequisite B: Looking Up a Tab by Table Number or Tab Number

When adding an order to an existing tab, you may need to find the tab's `_id` first.
Use the tabs list endpoint to look up a tab by table number or tab number.

**Endpoint:** `GET /api/public/tabs`  
**Scope Required:** `tabs:read`

#### Look Up by Table Number

Find the open tab for a specific table:

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/tabs?tableNumber=5&status=open" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### Look Up by Tab Number

Find a tab by its human-readable tab number (e.g. `TAB-5-123456`):

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/tabs?tabNumber=TAB-5-123456" \
  -H "x-api-key: wawa_your_api_key_here"
```

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `tableNumber` | string | Filter by physical table identifier | `"5"`, `"A3"` |
| `tabNumber` | string | Filter by tab number | `"TAB-5-123456"` |
| `status` | string | Filter by tab status | `"open"`, `"settling"`, `"closed"` |
| `customerId` | string | Filter by user ObjectId | `"665a..."` |
| `paymentStatus` | string | Filter by payment status | `"pending"`, `"paid"` |
| `page` | number | Page number (default: 1) | `1` |
| `limit` | number | Items per page (default: 25, max: 100) | `1` |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "tab_abc123",
      "tabNumber": "TAB-5-123456",
      "tableNumber": "5",
      "status": "open",
      "customerName": "John Doe",
      "subtotal": 800,
      "serviceFee": 0,
      "tax": 0,
      "total": 800,
      "orders": [
        {
          "_id": "order_001",
          "orderNumber": "WGB-A1B2C3",
          "status": "completed",
          "total": 800
        }
      ],
      "openedAt": "2026-03-05T12:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 25, "total": 1, "totalPages": 1, "timestamp": "..." }
}
```

**Key fields to extract:**

| Response Field | Use For | Description |
|----------------|---------|-------------|
| `_id` | `tabId` in order payload | Tab database ID for direct attachment |
| `tabNumber` | Display / reference | Human-readable tab identifier |
| `tableNumber` | `dineInDetails.tableNumber` | Table number for `useTab: "existing"` |
| `status` | Validation | Must be `"open"` to add orders |
| `total` | Display | Current running tab total |
| `orders` | Reference | List of orders already on the tab |

#### Example: Resolve Tab from Table Number or Tab Number

```javascript
/**
 * Find the open tab for a table number or tab number.
 * Returns the tab object or null if not found.
 */
async function findTab({ tableNumber, tabNumber }) {
  const url = new URL('https://api.wawagardenbar.com/api/public/tabs');
  url.searchParams.append('status', 'open');
  url.searchParams.append('limit', '1');

  if (tabNumber) {
    url.searchParams.append('tabNumber', tabNumber);
  } else if (tableNumber) {
    url.searchParams.append('tableNumber', tableNumber);
  } else {
    throw new Error('Provide either tableNumber or tabNumber');
  }

  const response = await fetch(url, {
    headers: { 'x-api-key': process.env.WAWA_API_KEY }
  });
  const result = await response.json();

  if (!result.success || result.data.length === 0) {
    return null; // No open tab found
  }

  return result.data[0];
}

// Usage: look up by table number
const tab = await findTab({ tableNumber: '5' });
if (tab) {
  console.log(`Found tab ${tab.tabNumber} (${tab._id}) — current total: ₦${tab.total}`);
  // Use tab._id as tabId in the order payload
}

// Usage: look up by tab number
const tab2 = await findTab({ tabNumber: 'TAB-5-123456' });
```

#### Two Ways to Add an Order to a Found Tab

Once you have the tab, you can attach an order using **either** method:

**Method 1: Using `tabId` (direct attachment)**
```json
{
  "orderType": "dine-in",
  "tabId": "tab_abc123",
  "items": [...],
  "total": 1600,
  "dineInDetails": { "tableNumber": "5" }
}
```

**Method 2: Using `useTab: "existing"` (finds open tab by table number)**
```json
{
  "orderType": "dine-in",
  "useTab": "existing",
  "items": [...],
  "total": 1600,
  "dineInDetails": { "tableNumber": "5" }
}
```

> **Tip:** Use `tabId` when you already have the tab's `_id` from a previous lookup or creation.
> Use `useTab: "existing"` when you only know the table number and want the API to find the open tab automatically.

---

### Part 1: Creating a New Tab with Order

**Endpoint:** `POST /api/public/orders`  
**Base URL:** `https://api.wawagardenbar.com`  
**Scope Required:** `orders:write`

> **Note:** You can also create a standalone tab via `POST /api/public/tabs` (scope: `tabs:write`).
> Using the orders endpoint with `useTab: "new"` creates a tab *and* an order in a single call.

#### Step 1: Prepare Minimum Required Payload

**MINIMUM REQUIRED FIELDS:**

```json
{
  "orderType": "dine-in",
  "useTab": "new",
  "customerName": "Walk-in Customer",
  "items": [
    {
      "menuItemId": "item_123",
      "name": "Star Lager Beer",
      "price": 800,
      "quantity": 1,
      "subtotal": 800
    }
  ],
  "subtotal": 800,
  "tax": 0,
  "deliveryFee": 0,
  "discount": 0,
  "total": 800,
  "dineInDetails": {
    "tableNumber": "5"
  }
}
```

**Field Specifications:**

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|----------|
| `orderType` | string | ✅ Yes | Must be `"dine-in"` for tabs | `"dine-in"` |
| `useTab` | string | ✅ For tab | `"new"` to create tab, `"existing"` to add to open tab | `"new"` |
| `customerName` | string | ❌ Optional | Customer name for tab (defaults to `guestName` or `"Walk-in Customer"`) | `"John Doe"` |
| `items` | array | ✅ Yes | Must contain at least 1 item | See item specs |
| `subtotal` | number | ✅ Yes | Order subtotal in ₦ | `800` |
| `tax` | number | ✅ Yes | Tax amount (can be 0) | `0` |
| `deliveryFee` | number | ✅ Yes | Delivery fee (0 for dine-in) | `0` |
| `discount` | number | ✅ Yes | Discount amount (can be 0) | `0` |
| `total` | number | ✅ Yes | Final total in ₦ | `800` |
| `dineInDetails.tableNumber` | string | ✅ Yes | Physical table identifier | `"5"`, `"A3"`, `"T12"` |

**OPTIONAL FIELDS:**

```json
{
  "guestName": "John Doe",
  "guestEmail": "customer@example.com",
  "guestPhone": "+2348012345678",
  "userId": "registered_user_object_id",
  "specialInstructions": "Customer prefers window seat"
}
```

**Alternative: Attach to existing tab by ID:**

Instead of `useTab`, you can provide `tabId` directly:

```json
{
  "orderType": "dine-in",
  "tabId": "existing_tab_object_id",
  "items": [...],
  ...
}
```

#### Step 2: Send API Request

```bash
curl -X POST https://api.wawagardenbar.com/api/public/orders \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "orderType": "dine-in",
    "useTab": "new",
    "customerName": "Walk-in Customer",
    "items": [
      {
        "menuItemId": "item_123",
        "name": "Star Lager Beer",
        "price": 800,
        "quantity": 1,
        "subtotal": 800
      }
    ],
    "subtotal": 800,
    "tax": 0,
    "deliveryFee": 0,
    "discount": 0,
    "total": 800,
    "dineInDetails": { "tableNumber": "5" }
  }'
```

#### Step 3: Handle Response

**Success Response (201 Created):**

When `useTab` or `tabId` is provided, the response wraps both `order` and `tab`:

```json
{
  "success": true,
  "data": {
    "order": {
      "_id": "67890abcdef",
      "orderNumber": "WGB-A1B2C3",
      "status": "pending",
      "orderType": "dine-in",
      "dineInDetails": {
        "tableNumber": "5"
      },
      "items": [
        {
          "menuItemId": "item_123",
          "name": "Star Lager Beer",
          "quantity": 1,
          "portionSize": "full",
          "price": 800,
          "subtotal": 800
        }
      ],
      "subtotal": 800,
      "tax": 0,
      "total": 800,
      "estimatedWaitTime": 5,
      "createdAt": "2026-03-04T19:41:00Z"
    },
    "tab": {
      "_id": "tab_abc123",
      "tabNumber": "TAB-5-123456",
      "tableNumber": "5",
      "status": "open",
      "customerName": "Walk-in Customer",
      "subtotal": 800,
      "serviceFee": 0,
      "tax": 0,
      "total": 800,
      "orders": ["67890abcdef"],
      "openedAt": "2026-03-04T19:41:00Z"
    }
  },
  "meta": {
    "timestamp": "2026-03-04T19:41:00Z"
  }
}
```

**Without tab fields:** The response returns the order directly (flat, no wrapping):

```json
{
  "success": true,
  "data": {
    "_id": "67890abcdef",
    "orderNumber": "WGB-A1B2C3",
    "status": "pending",
    ...
  },
  "meta": { "timestamp": "..." }
}
```

**Error Response (409 Conflict — tab already exists):**

```json
{
  "success": false,
  "error": "Table 5 already has an open tab"
}
```

#### Step 4: Store Tab Reference

**CRITICAL:** Store the following for subsequent operations:
- `data.tab._id` — Tab database ID (for `tabId` in future requests)
- `data.tab.tabNumber` — Human-readable tab number
- `data.order._id` — Order database ID
- `data.order.orderNumber` — Human-readable order number

---

### Part 2: Adding Order to Existing Tab

**Endpoint:** `POST /api/public/orders`  
**Method:** Same endpoint, different payload

#### Step 1: Retrieve Menu Items

**Endpoint:** `GET /api/public/menu`

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/menu?category=drinks" \
  -H "x-api-key: wawa_your_api_key_here"
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "item_123",
      "name": "Star Lager Beer",
      "category": "beer-local",
      "price": 800,
      "available": true,
      "customizationOptions": []
    },
    {
      "_id": "item_456",
      "name": "Jollof Rice",
      "category": "main-courses",
      "price": 3500,
      "available": true,
      "customizationOptions": [
        {
          "name": "Portion Size",
          "type": "single",
          "options": [
            { "name": "Full", "priceModifier": 0 },
            { "name": "Half", "priceModifier": -1750 }
          ]
        }
      ]
    }
  ]
}
```

#### Step 2: Prepare Order Payload with Items

**MINIMUM REQUIRED FIELDS:**

```json
{
  "orderType": "dine-in",
  "useTab": "existing",
  "items": [
    {
      "menuItemId": "item_123",
      "name": "Star Lager Beer",
      "price": 800,
      "quantity": 2,
      "portionSize": "full",
      "subtotal": 1600
    },
    {
      "menuItemId": "item_456",
      "name": "Jollof Rice",
      "price": 1750,
      "quantity": 1,
      "portionSize": "half",
      "subtotal": 1750,
      "customizations": [
        { "name": "Portion Size", "option": "Half", "price": 0 }
      ]
    }
  ],
  "subtotal": 3350,
  "tax": 0,
  "deliveryFee": 0,
  "discount": 0,
  "total": 3350,
  "guestName": "John Doe",
  "dineInDetails": {
    "tableNumber": "5"
  }
}
```

**Field Specifications:**

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|----------|
| `orderType` | string | ✅ Yes | Must be `"dine-in"` | `"dine-in"` |
| `useTab` | string | ✅ Yes | Set to `"existing"` to find open tab for the table | `"existing"` |
| `dineInDetails.tableNumber` | string | ✅ Yes | Must match tab's table | `"5"` |
| `items` | array | ✅ Yes | Must contain at least 1 item | See below |
| `subtotal` | number | ✅ Yes | Order subtotal in ₦ | `3350` |
| `tax` | number | ✅ Yes | Tax amount (can be 0) | `0` |
| `deliveryFee` | number | ✅ Yes | Delivery fee (0 for dine-in) | `0` |
| `discount` | number | ✅ Yes | Discount amount (can be 0) | `0` |
| `total` | number | ✅ Yes | Final total in ₦ | `3350` |

**Item Object Structure:**

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|----------|
| `menuItemId` | string | ✅ Yes | Menu item database ID | `"item_123"` |
| `name` | string | ✅ Yes | Item display name | `"Star Lager Beer"` |
| `price` | number | ✅ Yes | Unit price in ₦ | `800` |
| `quantity` | number | ✅ Yes | Quantity (min: 1) | `2` |
| `subtotal` | number | ✅ Yes | Line item subtotal | `1600` |
| `portionSize` | string | ❌ Optional | `"full"`, `"half"`, or `"quarter"` (default: `"full"`) | `"full"` |
| `customizations` | array | ❌ Optional | Array of `{ name, option, price }` | See example |
| `specialInstructions` | string | ❌ Optional | Item-specific notes | `"No onions"` |

#### Step 3: Send API Request

```bash
curl -X POST https://api.wawagardenbar.com/api/public/orders \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "orderType": "dine-in",
    "useTab": "existing",
    "items": [
      {
        "menuItemId": "item_123",
        "name": "Star Lager Beer",
        "price": 800,
        "quantity": 2,
        "portionSize": "full",
        "subtotal": 1600
      },
      {
        "menuItemId": "item_456",
        "name": "Jollof Rice",
        "price": 1750,
        "quantity": 1,
        "portionSize": "half",
        "subtotal": 1750,
        "customizations": [
          { "name": "Portion Size", "option": "Half", "price": 0 }
        ]
      }
    ],
    "subtotal": 3350,
    "tax": 0,
    "deliveryFee": 0,
    "discount": 0,
    "total": 3350,
    "guestName": "John Doe",
    "dineInDetails": { "tableNumber": "5" },
    "specialInstructions": "Customer has peanut allergy"
  }'
```

#### Step 4: Handle Response

**Success Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "order": {
      "_id": "order_789",
      "orderNumber": "WGB-D4E5F6",
      "status": "pending",
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
          "subtotal": 1600
        },
        {
          "menuItemId": "item_456",
          "name": "Jollof Rice",
          "quantity": 1,
          "portionSize": "half",
          "price": 1750,
          "subtotal": 1750
        }
      ],
      "subtotal": 3350,
      "total": 3350,
      "estimatedWaitTime": 15,
      "specialInstructions": "Customer has peanut allergy",
      "createdAt": "2026-03-04T19:45:00Z"
    },
    "tab": {
      "_id": "tab_abc123",
      "tabNumber": "TAB-5-123456",
      "tableNumber": "5",
      "status": "open",
      "customerName": "Walk-in Customer",
      "subtotal": 4150,
      "serviceFee": 415,
      "tax": 0,
      "total": 4565,
      "orders": ["67890abcdef", "order_789"],
      "openedAt": "2026-03-04T19:41:00Z",
      "updatedAt": "2026-03-04T19:45:00Z"
    }
  },
  "meta": {
    "timestamp": "2026-03-04T19:45:00Z"
  }
}
```

**Error Responses:**

```json
// No open tab found (422)
{
  "success": false,
  "error": "No open tab found for table 5"
}

// Business logic error (422)
{
  "success": false,
  "error": "Failed to create order"
}
```

---

## Complete Workflow Example

### Scenario: AI Agent Takes Customer Order

This workflow demonstrates the full end-to-end flow: looking up items by name,
creating a tab with the first order, looking up the tab later, and adding a
second order to it.

```javascript
const API_BASE = 'https://api.wawagardenbar.com';
const headers = {
  'x-api-key': process.env.WAWA_API_KEY,
  'Content-Type': 'application/json'
};

// ── Helper: Look up a menu item by name ──────────────────────────
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

// ── Helper: Find an open tab by table number or tab number ───────
async function findTab({ tableNumber, tabNumber }) {
  const url = new URL(`${API_BASE}/api/public/tabs`);
  url.searchParams.append('status', 'open');
  url.searchParams.append('limit', '1');
  if (tabNumber) url.searchParams.append('tabNumber', tabNumber);
  else if (tableNumber) url.searchParams.append('tableNumber', tableNumber);
  else throw new Error('Provide either tableNumber or tabNumber');

  const response = await fetch(url, { headers });
  const result = await response.json();
  if (!result.success || result.data.length === 0) return null;
  return result.data[0];
}

// ── Helper: Build order items from resolved menu items ───────────
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

// ── Helper: Create order (with optional tab) ─────────────────────
async function createOrder(payload) {
  const response = await fetch(`${API_BASE}/api/public/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// ── Step 1: Customer arrives at table 5, orders by item name ─────
async function handleNewCustomer() {
  // 1a. Resolve item names to menuItemIds
  const starLager = await lookupMenuItem('Star Lager');
  const pepperSoup = await lookupMenuItem('Pepper Soup');
  if (!starLager) throw new Error('Star Lager not found or unavailable');
  if (!pepperSoup) throw new Error('Pepper Soup not found or unavailable');

  // 1b. Build order items
  const items = buildOrderItems([
    { ...starLager, quantity: 2 },
    { ...pepperSoup, quantity: 1 }
  ]);
  const total = items.reduce((sum, i) => sum + i.subtotal, 0);

  // 1c. Create tab + first order in a single call
  const data = await createOrder({
    orderType: 'dine-in',
    useTab: 'new',
    customerName: 'John Doe',
    items,
    subtotal: total,
    tax: 0,
    deliveryFee: 0,
    discount: 0,
    total,
    dineInDetails: { tableNumber: '5' }
  });

  console.log(`Tab created: ${data.tab.tabNumber}`);
  console.log(`First order: ${data.order.orderNumber} — ₦${data.order.total}`);
  return data;
}

// ── Step 2: Customer orders more items later ─────────────────────
async function handleFollowUpOrder() {
  // 2a. Look up the existing tab by table number
  const tab = await findTab({ tableNumber: '5' });
  if (!tab) throw new Error('No open tab for table 5');
  console.log(`Found tab ${tab.tabNumber} — current total: ₦${tab.total}`);

  // 2b. Resolve new items by name
  const jollofRice = await lookupMenuItem('Jollof Rice');
  if (!jollofRice) throw new Error('Jollof Rice not found or unavailable');

  // 2c. Build order items
  const items = buildOrderItems([
    { ...jollofRice, quantity: 1, portionSize: 'half' }
  ]);
  const total = items.reduce((sum, i) => sum + i.subtotal, 0);

  // 2d. Add order to existing tab using tabId
  const data = await createOrder({
    orderType: 'dine-in',
    tabId: tab._id,
    items,
    subtotal: total,
    tax: 0,
    deliveryFee: 0,
    discount: 0,
    total,
    dineInDetails: { tableNumber: '5' },
    specialInstructions: 'Customer has peanut allergy'
  });

  console.log(`Order added: ${data.order.orderNumber} — ₦${data.order.total}`);
  console.log(`Updated tab total: ₦${data.tab.total}`);
  return data;
}

// ── Step 3: Alternative — add to tab using tab number ────────────
async function handleOrderByTabNumber(tabNumberStr) {
  // 3a. Look up the tab by its human-readable tab number
  const tab = await findTab({ tabNumber: tabNumberStr });
  if (!tab) throw new Error(`Tab ${tabNumberStr} not found or not open`);

  // 3b. Resolve items and build order (same pattern)
  const chapman = await lookupMenuItem('Chapman');
  if (!chapman) throw new Error('Chapman not found or unavailable');

  const items = buildOrderItems([{ ...chapman, quantity: 2 }]);
  const total = items.reduce((sum, i) => sum + i.subtotal, 0);

  // 3c. Add order using the resolved tabId
  const data = await createOrder({
    orderType: 'dine-in',
    tabId: tab._id,
    items,
    subtotal: total,
    tax: 0,
    deliveryFee: 0,
    discount: 0,
    total,
    dineInDetails: { tableNumber: tab.tableNumber }
  });

  return data;
}

// ── Run the complete workflow ─────────────────────────────────────
async function processCustomerVisit() {
  try {
    const first = await handleNewCustomer();
    const second = await handleFollowUpOrder();
    // Or: const byTab = await handleOrderByTabNumber('TAB-5-123456');
    return { first, second };
  } catch (error) {
    console.error('Error processing order:', error.message);
    throw error;
  }
}
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
      if (response.status === 400 || response.status === 404) {
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
function validateOrderPayload(payload) {
  const errors = [];
  
  // Required fields
  if (!payload.orderType) errors.push('orderType is required');
  if (!payload.items || payload.items.length === 0) errors.push('items must contain at least 1 item');
  if (payload.total == null) errors.push('total is required');
  
  // Tab-specific validation
  if (payload.useTab && !['new', 'existing'].includes(payload.useTab)) {
    errors.push('useTab must be "new" or "existing"');
  }
  if (payload.useTab && !payload.dineInDetails?.tableNumber) {
    errors.push('dineInDetails.tableNumber is required when using useTab');
  }
  if ((payload.useTab || payload.tabId) && payload.orderType !== 'dine-in') {
    errors.push('Tab support is only available for dine-in orders');
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

## Rate Limiting

**API Rate Limits:**
- **Moderate Tier:** 30 requests per minute
- **Response Header:** `X-RateLimit-Remaining`

**Best Practices:**
1. Implement request queuing
2. Monitor rate limit headers
3. Implement exponential backoff
4. Cache menu data (updates infrequently)

```javascript
class RateLimitedClient {
  constructor(apiKey, requestsPerMinute = 30) {
    this.apiKey = apiKey;
    this.queue = [];
    this.requestsPerMinute = requestsPerMinute;
    this.interval = 60000 / requestsPerMinute; // ms between requests
  }
  
  async request(url, options) {
    return new Promise((resolve, reject) => {
      this.queue.push({ url, options, resolve, reject });
      this.processQueue();
    });
  }
  
  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    const { url, options, resolve, reject } = this.queue.shift();
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'x-api-key': this.apiKey
        }
      });
      const result = await response.json();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      setTimeout(() => {
        this.processing = false;
        this.processQueue();
      }, this.interval);
    }
  }
}
```

---

## Security Considerations

### 1. API Key Management
- ✅ Store API keys in environment variables
- ✅ Never commit keys to version control
- ✅ Rotate keys periodically
- ✅ Use separate keys for dev/staging/production

### 2. Data Validation
- ✅ Validate all input before sending
- ✅ Sanitize customer-provided data
- ✅ Validate menu item IDs exist
- ✅ Check quantity limits

### 3. Error Information
- ✅ Log errors securely (don't expose API keys)
- ✅ Don't expose internal system details to end users
- ✅ Implement proper error tracking

---

## Monitoring and Logging

### Recommended Logging

```javascript
const logger = {
  info: (message, data) => {
    console.log(JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      message,
      data: sanitizeData(data)
    }));
  },
  
  error: (message, error, data) => {
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      message,
      error: {
        message: error.message,
        stack: error.stack
      },
      data: sanitizeData(data)
    }));
  }
};

function sanitizeData(data) {
  // Remove sensitive information
  const sanitized = { ...data };
  delete sanitized.apiKey;
  delete sanitized.password;
  return sanitized;
}

// Usage
logger.info('Tab created successfully', { tabNumber: 'TAB-67890', tableNumber: '5' });
logger.error('Failed to create order', error, { tableNumber: '5', itemCount: 3 });
```

---

## Testing

### Test Cases

```javascript
// Test 1: Create tab + order successfully
async function testCreateTabWithOrder() {
  const menuItems = await getMenuItems();
  const result = await createTabWithOrder('TEST-1', [
    { id: menuItems[0]._id, name: menuItems[0].name, price: menuItems[0].price, quantity: 1 }
  ], 'Test Customer');
  assert(result.tabId, 'Tab ID should be returned');
  assert(result.tabNumber, 'Tab number should be returned');
  assert(result.orderId, 'Order ID should be returned');
  console.log('✅ Create tab + order test passed');
}

// Test 2: Handle duplicate tab error
async function testDuplicateTab() {
  const menuItems = await getMenuItems();
  const items = [{ id: menuItems[0]._id, name: menuItems[0].name, price: menuItems[0].price, quantity: 1 }];
  try {
    await createTabWithOrder('TEST-1', items, 'Test Customer');
    await createTabWithOrder('TEST-1', items, 'Test Customer'); // Should fail (409)
    console.log('❌ Should have thrown error');
  } catch (error) {
    assert(error.message.includes('already has an open tab'));
    console.log('✅ Duplicate tab test passed');
  }
}

// Test 3: Add order to existing tab
async function testAddOrder() {
  const menuItems = await getMenuItems();
  const order = await addOrderToTab('TEST-1', [
    { id: menuItems[0]._id, name: menuItems[0].name, price: menuItems[0].price, quantity: 2 }
  ]);
  
  assert(order.orderId, 'Order ID should be returned');
  assert(order.orderTotal > 0, 'Order total should be greater than 0');
  console.log('✅ Add order to tab test passed');
}
```

---

## Quick Reference

### Minimum Payload: Create Tab + Order

```json
{
  "orderType": "dine-in",
  "useTab": "new",
  "customerName": "Walk-in Customer",
  "items": [
    { "menuItemId": "item_123", "name": "Star Lager Beer", "price": 800, "quantity": 1, "subtotal": 800 }
  ],
  "subtotal": 800, "tax": 0, "deliveryFee": 0, "discount": 0, "total": 800,
  "dineInDetails": { "tableNumber": "5" }
}
```

### Minimum Payload: Add Order to Existing Tab

```json
{
  "orderType": "dine-in",
  "useTab": "existing",
  "items": [
    { "menuItemId": "item_123", "name": "Star Lager Beer", "price": 800, "quantity": 1, "subtotal": 800 }
  ],
  "subtotal": 800, "tax": 0, "deliveryFee": 0, "discount": 0, "total": 800,
  "dineInDetails": { "tableNumber": "5" }
}
```

### Minimum Payload: Attach Order to Tab by ID

```json
{
  "orderType": "dine-in",
  "tabId": "existing_tab_object_id",
  "items": [
    { "menuItemId": "item_123", "name": "Star Lager Beer", "price": 800, "quantity": 1, "subtotal": 800 }
  ],
  "subtotal": 800, "tax": 0, "deliveryFee": 0, "discount": 0, "total": 800,
  "dineInDetails": { "tableNumber": "5" }
}
```

---

## API Endpoints Summary

| Endpoint | Method | Purpose | Required Scopes |
|----------|--------|---------|-----------------|
| `/api/public/menu` | GET | List menu items | `menu:read` |
| `/api/public/menu/{id}` | GET | Get menu item details | `menu:read` |
| `/api/public/orders` | POST | Create order (optionally with tab) | `orders:write` |
| `/api/public/orders/{id}` | GET | Get order details | `orders:read` |
| `/api/public/orders/{id}` | PATCH | Update order status | `orders:write` |
| `/api/public/tabs` | GET | List tabs | `tabs:read` |
| `/api/public/tabs` | POST | Create standalone tab | `tabs:write` |
| `/api/public/tabs/{id}` | GET | Get tab details | `tabs:read` |
| `/api/public/tabs/{id}` | PATCH | Update/close tab | `tabs:write` |
| `/api/public/tabs/{id}` | DELETE | Delete tab | `tabs:write` |

---

## Troubleshooting

### Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid API key | Verify API key is correct and active |
| `403 Forbidden` | Insufficient scopes | Request API key with `orders:write` scope |
| `429 Too Many Requests` | Rate limit exceeded | Implement rate limiting and retry logic |
| `409` "Table X already has an open tab" | Table has open tab | Use `useTab: "existing"` or `tabId` instead |
| `422` "No open tab found for table X" | No open tab for table | Use `useTab: "new"` to create one |
| `400` "Tab support is only available for dine-in" | Non-dine-in order with tab | Remove `useTab`/`tabId` or set `orderType: "dine-in"` |
| `400` "dineInDetails.tableNumber is required" | Missing table number | Include `dineInDetails.tableNumber` |

---

## Related Documentation

- API Reference: `/docs/api/public-api-reference.md`
- Authentication Guide: `/docs/api/authentication.md`
- Error Codes: `/docs/api/error-codes.md`
- SOP-MANUAL-WAITER-001: Manual Tab and Order Management

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|----------|
| 1.0 | March 4, 2026 | Technical Team | Initial release |
| 1.1 | March 5, 2026 | Technical Team | Updated field names to match actual API (`dineInDetails.tableNumber`, `customerName`, `guestName`). Added `tabId` direct attachment. Updated response examples. Added `tabs` endpoints to summary. |
| 1.2 | March 5, 2026 | Technical Team | Added Prerequisite A: menu item name lookup (`GET /api/public/menu?q=`). Added Prerequisite B: tab lookup by table number or tab number (`GET /api/public/tabs?tableNumber=` / `tabNumber=`). Added `tabNumber` filter to tabs API. Updated Complete Workflow Example with `lookupMenuItem`, `findTab`, and `handleOrderByTabNumber` helpers. |

---

## Support

**For technical support:**
- API Documentation: https://docs.wawagardenbar.com/api
- Developer Support: dev-support@wawagardenbar.com
- Status Page: https://status.wawagardenbar.com

**For API key requests:**
- Contact: admin@wawagardenbar.com
- Dashboard: https://wawagardenbar.com/dashboard/settings/api-keys
