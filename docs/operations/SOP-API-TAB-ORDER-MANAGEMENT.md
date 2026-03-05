# SOP: Agentic API Tab and Order Management

**Document ID:** SOP-API-001  
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

- `orders:write` - Create and modify orders
- `orders:read` - Read order and tab information
- `customers:write` - Create/update customer information (optional)

---

## Procedure

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

```javascript
// Step 1: Fetch available menu items
async function getMenuItems(category = null) {
  const url = new URL('https://api.wawagardenbar.com/api/public/menu');
  if (category) {
    url.searchParams.append('category', category);
  }
  
  const response = await fetch(url, {
    headers: {
      'x-api-key': process.env.WAWA_API_KEY
    }
  });
  
  const result = await response.json();
  return result.data;
}

// Step 2: Create tab + first order when customer arrives
async function createTabWithOrder(tableNumber, items, customerName = "Walk-in Customer") {
  const response = await fetch('https://api.wawagardenbar.com/api/public/orders', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.WAWA_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      orderType: 'dine-in',
      useTab: 'new',
      customerName: customerName,
      items: items.map(item => ({
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        portionSize: item.portionSize || 'full',
        customizations: item.customizations || [],
        subtotal: item.price * item.quantity
      })),
      subtotal: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      tax: 0,
      deliveryFee: 0,
      discount: 0,
      total: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      dineInDetails: { tableNumber }
    })
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error);
  }
  
  return {
    tabId: result.data.tab._id,
    tabNumber: result.data.tab.tabNumber,
    orderId: result.data.order._id,
    orderNumber: result.data.order.orderNumber
  };
}

// Step 3: Add subsequent orders to existing tab
async function addOrderToTab(tableNumber, items, specialInstructions = null) {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const payload = {
    orderType: 'dine-in',
    useTab: 'existing',
    items: items.map(item => ({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      portionSize: item.portionSize || 'full',
      customizations: item.customizations || [],
      subtotal: item.price * item.quantity
    })),
    subtotal,
    tax: 0,
    deliveryFee: 0,
    discount: 0,
    total: subtotal,
    dineInDetails: { tableNumber },
    specialInstructions
  };
  
  const response = await fetch('https://api.wawagardenbar.com/api/public/orders', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.WAWA_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error);
  }
  
  return {
    orderId: result.data.order._id,
    orderNumber: result.data.order.orderNumber,
    orderTotal: result.data.order.total,
    tabTotal: result.data.tab.total,
    status: result.data.order.status
  };
}

// Step 4: Complete workflow
async function processCustomerOrder() {
  try {
    // 1. Get menu
    const menuItems = await getMenuItems('drinks');
    
    // 2. Create tab + first order
    const firstItems = [
      {
        id: menuItems[0]._id,
        name: menuItems[0].name,
        price: menuItems[0].price,
        quantity: 2,
        portionSize: 'full'
      }
    ];
    
    const tab = await createTabWithOrder('5', firstItems, 'John Doe');
    console.log(`Tab created: ${tab.tabNumber}`);
    console.log(`First order: ${tab.orderNumber}`);
    
    // 3. Customer orders more items later
    const moreItems = [
      {
        id: menuItems[1]._id,
        name: menuItems[1].name,
        price: menuItems[1].price,
        quantity: 1,
        portionSize: 'half'
      }
    ];
    
    const order = await addOrderToTab(
      '5',
      moreItems,
      'Customer has peanut allergy'
    );
    
    console.log(`Order created: ${order.orderNumber}`);
    console.log(`Order total: ₦${order.orderTotal}`);
    console.log(`Tab total: ₦${order.tabTotal}`);
    console.log(`Status: ${order.status}`);
    
    return { tab, order };
    
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
- SOP-WAITER-001: Manual Tab and Order Management

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|----------|
| 1.0 | March 4, 2026 | Technical Team | Initial release |
| 1.1 | March 5, 2026 | Technical Team | Updated field names to match actual API (`dineInDetails.tableNumber`, `customerName`, `guestName`). Added `tabId` direct attachment. Updated response examples. Added `tabs` endpoints to summary. |

---

## Support

**For technical support:**
- API Documentation: https://docs.wawagardenbar.com/api
- Developer Support: dev-support@wawagardenbar.com
- Status Page: https://status.wawagardenbar.com

**For API key requests:**
- Contact: admin@wawagardenbar.com
- Dashboard: https://wawagardenbar.com/dashboard/settings/api-keys
