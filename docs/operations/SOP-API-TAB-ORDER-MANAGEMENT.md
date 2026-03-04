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

### Part 1: Creating a New Tab

**Endpoint:** `POST /api/public/orders`  
**Base URL:** `https://api.wawagardenbar.com`

#### Step 1: Prepare Minimum Required Payload

**MINIMUM REQUIRED FIELDS:**

```json
{
  "orderType": "dine-in",
  "tableNumber": "5",
  "useTab": "new",
  "items": [],
  "customer": {
    "name": "Walk-in Customer"
  }
}
```

**Field Specifications:**

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `orderType` | string | ✅ Yes | Must be "dine-in" for tabs | `"dine-in"` |
| `tableNumber` | string | ✅ Yes | Physical table identifier | `"5"`, `"A3"`, `"12"` |
| `useTab` | string | ✅ Yes | Set to "new" to create tab | `"new"` |
| `items` | array | ✅ Yes | Can be empty array for tab creation | `[]` |
| `customer.name` | string | ✅ Yes | Customer identifier | `"John Doe"`, `"Walk-in Customer"` |

**OPTIONAL FIELDS:**

```json
{
  "customer": {
    "email": "customer@example.com",
    "phone": "+2348012345678"
  },
  "specialInstructions": "Customer prefers window seat"
}
```

#### Step 2: Send API Request

```bash
curl -X POST https://api.wawagardenbar.com/api/public/orders \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "orderType": "dine-in",
    "tableNumber": "5",
    "useTab": "new",
    "items": [],
    "customer": {
      "name": "Walk-in Customer"
    }
  }'
```

#### Step 3: Handle Response

**Success Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "order": {
      "_id": "67890abcdef",
      "orderNumber": "ORD-12345",
      "status": "pending",
      "orderType": "dine-in",
      "tableNumber": "5",
      "tabId": "TAB-67890",
      "customer": {
        "name": "Walk-in Customer"
      },
      "items": [],
      "total": 0,
      "createdAt": "2026-03-04T19:41:00Z"
    },
    "tab": {
      "_id": "tab_abc123",
      "tabNumber": "TAB-67890",
      "tableNumber": "5",
      "status": "open",
      "customerName": "Walk-in Customer",
      "subtotal": 0,
      "total": 0,
      "orders": ["67890abcdef"],
      "openedAt": "2026-03-04T19:41:00Z"
    }
  },
  "meta": {
    "timestamp": "2026-03-04T19:41:00Z"
  }
}
```

**Error Response (400 Bad Request):**

```json
{
  "success": false,
  "error": {
    "message": "Table 5 already has an open tab",
    "code": "TAB_ALREADY_EXISTS",
    "details": {
      "tableNumber": "5",
      "existingTabId": "TAB-11111"
    }
  }
}
```

#### Step 4: Store Tab Reference

**CRITICAL:** Store the following for subsequent operations:
- `tab._id` - Tab database ID
- `tab.tabNumber` - Human-readable tab number
- `order._id` - Order database ID
- `order.orderNumber` - Human-readable order number

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
  "tableNumber": "5",
  "useTab": "existing",
  "items": [
    {
      "menuItemId": "item_123",
      "quantity": 2,
      "portionSize": "full"
    },
    {
      "menuItemId": "item_456",
      "quantity": 1,
      "portionSize": "half",
      "customizations": {
        "Portion Size": "Half"
      }
    }
  ],
  "customer": {
    "name": "John Doe"
  }
}
```

**Field Specifications:**

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `orderType` | string | ✅ Yes | Must be "dine-in" | `"dine-in"` |
| `tableNumber` | string | ✅ Yes | Must match tab's table | `"5"` |
| `useTab` | string | ✅ Yes | Set to "existing" | `"existing"` |
| `items` | array | ✅ Yes | Must contain at least 1 item | See below |
| `customer.name` | string | ✅ Yes | Customer identifier | `"John Doe"` |

**Item Object Structure:**

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `menuItemId` | string | ✅ Yes | Menu item database ID | `"item_123"` |
| `quantity` | number | ✅ Yes | Quantity (min: 1) | `2` |
| `portionSize` | string | ✅ Yes | "full" or "half" | `"full"` |
| `customizations` | object | ❌ No | Item customizations | `{"Size": "Large"}` |
| `specialInstructions` | string | ❌ No | Item-specific notes | `"No onions"` |

#### Step 3: Send API Request

```bash
curl -X POST https://api.wawagardenbar.com/api/public/orders \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "orderType": "dine-in",
    "tableNumber": "5",
    "useTab": "existing",
    "items": [
      {
        "menuItemId": "item_123",
        "quantity": 2,
        "portionSize": "full"
      },
      {
        "menuItemId": "item_456",
        "quantity": 1,
        "portionSize": "half",
        "customizations": {
          "Portion Size": "Half"
        }
      }
    ],
    "customer": {
      "name": "John Doe"
    },
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
      "orderNumber": "ORD-12346",
      "status": "pending",
      "orderType": "dine-in",
      "tableNumber": "5",
      "tabId": "TAB-67890",
      "customer": {
        "name": "John Doe"
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
      "specialInstructions": "Customer has peanut allergy",
      "createdAt": "2026-03-04T19:45:00Z"
    },
    "tab": {
      "_id": "tab_abc123",
      "tabNumber": "TAB-67890",
      "tableNumber": "5",
      "status": "open",
      "customerName": "John Doe",
      "subtotal": 3350,
      "serviceFee": 335,
      "tax": 268,
      "total": 3953,
      "orders": ["67890abcdef", "order_789"],
      "openedAt": "2026-03-04T19:41:00Z",
      "updatedAt": "2026-03-04T19:45:00Z"
    }
  }
}
```

**Error Responses:**

```json
// No open tab found
{
  "success": false,
  "error": {
    "message": "No open tab found for table 5",
    "code": "TAB_NOT_FOUND"
  }
}

// Menu item unavailable
{
  "success": false,
  "error": {
    "message": "Menu item 'item_123' is currently unavailable",
    "code": "ITEM_UNAVAILABLE",
    "details": {
      "unavailableItems": ["item_123"]
    }
  }
}

// Insufficient stock
{
  "success": false,
  "error": {
    "message": "Insufficient stock for 'Star Lager Beer'",
    "code": "INSUFFICIENT_STOCK",
    "details": {
      "itemId": "item_123",
      "requested": 10,
      "available": 5
    }
  }
}
```

---

## Complete Workflow Example

### Scenario: AI Agent Takes Customer Order

```javascript
// Step 1: Create tab when customer arrives
async function createTabForCustomer(tableNumber, customerName = "Walk-in Customer") {
  const response = await fetch('https://api.wawagardenbar.com/api/public/orders', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.WAWA_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      orderType: 'dine-in',
      tableNumber: tableNumber,
      useTab: 'new',
      items: [],
      customer: {
        name: customerName
      }
    })
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error.message);
  }
  
  return {
    tabId: result.data.tab._id,
    tabNumber: result.data.tab.tabNumber,
    orderId: result.data.order._id
  };
}

// Step 2: Fetch available menu items
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

// Step 3: Add order to existing tab
async function addOrderToTab(tableNumber, items, customerName, specialInstructions = null) {
  const payload = {
    orderType: 'dine-in',
    tableNumber: tableNumber,
    useTab: 'existing',
    items: items.map(item => ({
      menuItemId: item.id,
      quantity: item.quantity,
      portionSize: item.portionSize || 'full',
      customizations: item.customizations || {},
      specialInstructions: item.notes || null
    })),
    customer: {
      name: customerName
    }
  };
  
  if (specialInstructions) {
    payload.specialInstructions = specialInstructions;
  }
  
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
    throw new Error(result.error.message);
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
    // 1. Create tab
    const tab = await createTabForCustomer('5', 'John Doe');
    console.log(`Tab created: ${tab.tabNumber}`);
    
    // 2. Get menu
    const menuItems = await getMenuItems('drinks');
    
    // 3. Customer orders
    const orderItems = [
      {
        id: menuItems[0]._id, // Star Lager Beer
        quantity: 2,
        portionSize: 'full'
      },
      {
        id: menuItems[1]._id, // Another item
        quantity: 1,
        portionSize: 'half',
        customizations: { 'Portion Size': 'Half' },
        notes: 'Extra ice'
      }
    ];
    
    // 4. Add order to tab
    const order = await addOrderToTab(
      '5',
      orderItems,
      'John Doe',
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
        throw new Error(result.error.message);
      }
      
      // Server errors (retry)
      if (response.status >= 500) {
        lastError = new Error(result.error.message);
        await sleep(1000 * attempt); // Exponential backoff
        continue;
      }
      
      throw new Error(result.error.message);
      
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
  if (!payload.tableNumber) errors.push('tableNumber is required');
  if (!payload.useTab) errors.push('useTab is required');
  if (!payload.customer?.name) errors.push('customer.name is required');
  
  // Items validation (for existing tab)
  if (payload.useTab === 'existing') {
    if (!payload.items || payload.items.length === 0) {
      errors.push('items array must contain at least 1 item');
    }
    
    payload.items?.forEach((item, index) => {
      if (!item.menuItemId) errors.push(`items[${index}].menuItemId is required`);
      if (!item.quantity || item.quantity < 1) errors.push(`items[${index}].quantity must be >= 1`);
      if (!item.portionSize) errors.push(`items[${index}].portionSize is required`);
    });
  }
  
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
// Test 1: Create tab successfully
async function testCreateTab() {
  const result = await createTabForCustomer('TEST-1', 'Test Customer');
  assert(result.tabId, 'Tab ID should be returned');
  assert(result.tabNumber, 'Tab number should be returned');
  console.log('✅ Create tab test passed');
}

// Test 2: Handle duplicate tab error
async function testDuplicateTab() {
  try {
    await createTabForCustomer('TEST-1', 'Test Customer');
    await createTabForCustomer('TEST-1', 'Test Customer'); // Should fail
    console.log('❌ Should have thrown error');
  } catch (error) {
    assert(error.message.includes('already has an open tab'));
    console.log('✅ Duplicate tab test passed');
  }
}

// Test 3: Add order with items
async function testAddOrder() {
  const menuItems = await getMenuItems();
  const order = await addOrderToTab('TEST-1', [
    { id: menuItems[0]._id, quantity: 1, portionSize: 'full' }
  ], 'Test Customer');
  
  assert(order.orderId, 'Order ID should be returned');
  assert(order.orderTotal > 0, 'Order total should be greater than 0');
  console.log('✅ Add order test passed');
}
```

---

## Quick Reference

### Minimum Payload: Create Tab

```json
{
  "orderType": "dine-in",
  "tableNumber": "5",
  "useTab": "new",
  "items": [],
  "customer": { "name": "Walk-in Customer" }
}
```

### Minimum Payload: Add Order to Tab

```json
{
  "orderType": "dine-in",
  "tableNumber": "5",
  "useTab": "existing",
  "items": [
    {
      "menuItemId": "item_123",
      "quantity": 1,
      "portionSize": "full"
    }
  ],
  "customer": { "name": "John Doe" }
}
```

---

## API Endpoints Summary

| Endpoint | Method | Purpose | Required Scopes |
|----------|--------|---------|-----------------|
| `/api/public/menu` | GET | List menu items | `menu:read` |
| `/api/public/menu/{id}` | GET | Get menu item details | `menu:read` |
| `/api/public/orders` | POST | Create order/tab | `orders:write` |
| `/api/public/orders/{id}` | GET | Get order details | `orders:read` |
| `/api/public/orders/{id}` | PATCH | Update order status | `orders:write` |

---

## Troubleshooting

### Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid API key | Verify API key is correct and active |
| `403 Forbidden` | Insufficient scopes | Request API key with `orders:write` scope |
| `429 Too Many Requests` | Rate limit exceeded | Implement rate limiting and retry logic |
| `TAB_ALREADY_EXISTS` | Table has open tab | Add to existing tab or close current tab |
| `TAB_NOT_FOUND` | No open tab for table | Create new tab first |
| `ITEM_UNAVAILABLE` | Menu item not available | Check item availability before ordering |
| `INSUFFICIENT_STOCK` | Not enough inventory | Reduce quantity or choose different item |

---

## Related Documentation

- API Reference: `/docs/api/public-api-reference.md`
- Authentication Guide: `/docs/api/authentication.md`
- Error Codes: `/docs/api/error-codes.md`
- SOP-WAITER-001: Manual Tab and Order Management

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | March 4, 2026 | Technical Team | Initial release |

---

## Support

**For technical support:**
- API Documentation: https://docs.wawagardenbar.com/api
- Developer Support: dev-support@wawagardenbar.com
- Status Page: https://status.wawagardenbar.com

**For API key requests:**
- Contact: admin@wawagardenbar.com
- Dashboard: https://wawagardenbar.com/dashboard/settings/api-keys
