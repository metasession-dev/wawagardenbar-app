# SOP: Agentic API Customer Management

**Document ID:** SOP-API-008
**Version:** 1.0
**Effective Date:** March 7, 2026
**Department:** Technical Integration
**Applies To:** AI Agents, CRM Systems, Marketing Platforms, Analytics Tools

---

## Purpose

This Standard Operating Procedure (SOP) provides technical specifications and step-by-step API integration instructions for agentic systems to programmatically search, create, retrieve, and update customer records, view customer order history, and access customer analytics using the Wawa Garden Bar Public REST API.

This document is the API counterpart to SOP-ADMIN-007 (Customer Data Management).

---

## Scope

This SOP covers:
- API authentication and authorization for customer endpoints
- Searching and listing customers
- Creating new customer records
- Retrieving full customer profiles
- Updating customer information
- Viewing customer order history
- Accessing AI-optimized customer analytics summaries
- Privacy and data handling best practices

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

- `customers:read` - Search, list, and retrieve customer profiles and analytics
- `customers:write` - Create and update customer records
- `orders:read` - View customer order history (required in combination with `customers:read`)

> **Role-Based Keys:** Select the **CSR** role when creating an API key (Admin Dashboard > Settings > API Keys) to automatically include all required scopes (`customers:read`, `customers:write`, `orders:read`). For read-only access, select **Admin** (includes `customers:read` and `orders:read` but not `customers:write`). Alternatively, use **Custom** to select individual scopes.

---

## Procedure

### Part 1: Searching and Listing Customers

Search for customers by name, email, or phone, or list customers with filters.

**Endpoint:** `GET /api/public/customers`
**Scope Required:** `customers:read`

#### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `q` | string | No | Free-text search (min 3 characters) across name, email, phone | `"john"`, `"doe@email"`, `"+234"` |
| `role` | string | No | Filter by customer role | `"customer"`, `"vip"` |
| `status` | string | No | Filter by account status | `"active"`, `"suspended"`, `"deleted"` |
| `sort` | string | No | Sort field and direction | `"createdAt"`, `"-totalSpent"` |
| `page` | number | No | Page number (default: 1) | `1` |
| `limit` | number | No | Items per page (default: 25, max: 100) | `10` |

#### curl Example

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/customers?q=john&status=active&limit=10" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### JavaScript Example

```javascript
async function searchCustomers({ query, role, status, sort, page, limit }) {
  const url = new URL('https://api.wawagardenbar.com/api/public/customers');

  if (query) url.searchParams.append('q', query);
  if (role) url.searchParams.append('role', role);
  if (status) url.searchParams.append('status', status);
  if (sort) url.searchParams.append('sort', sort);
  if (page) url.searchParams.append('page', page.toString());
  if (limit) url.searchParams.append('limit', limit.toString());

  const response = await fetch(url, {
    headers: { 'x-api-key': process.env.WAWA_API_KEY }
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to search customers');
  }

  return result;
}

// Search by name
const results = await searchCustomers({ query: 'john', status: 'active', limit: 10 });
console.log(`Found ${results.meta.total} customers`);
results.data.forEach(c => {
  console.log(`  ${c.firstName} ${c.lastName} - ${c.email} - ${c.totalOrders} orders`);
});
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "_id": "665a1b2c3d4e5f6a7b8c9d0e",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "+2348012345678",
      "role": "customer",
      "accountStatus": "active",
      "totalSpent": 45000,
      "totalOrders": 12,
      "loyaltyPoints": 45000,
      "addresses": [],
      "createdAt": "2025-11-15T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1,
    "timestamp": "2026-03-07T10:00:00Z"
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Customer database ID |
| `firstName` | string | Customer first name |
| `lastName` | string | Customer last name |
| `email` | string | Customer email address |
| `phone` | string | Customer phone number |
| `role` | string | Customer role (e.g., `"customer"`, `"vip"`) |
| `accountStatus` | string | Account status (`"active"`, `"suspended"`, `"deleted"`) |
| `totalSpent` | number | Total amount spent in NGN |
| `totalOrders` | number | Total number of orders placed |
| `loyaltyPoints` | number | Current loyalty points balance |
| `addresses` | array | Customer delivery addresses |
| `createdAt` | string | ISO 8601 account creation date |

---

### Part 2: Creating Customer Records

Create a new customer record in the system.

**Endpoint:** `POST /api/public/customers`
**Scope Required:** `customers:write`

#### Request Body

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `email` | string | Yes | Customer email (must be unique) | `"jane.doe@example.com"` |
| `firstName` | string | No | Customer first name | `"Jane"` |
| `lastName` | string | No | Customer last name | `"Doe"` |
| `phone` | string | No | Customer phone number | `"+2348098765432"` |
| `preferences` | object | No | Customer preferences | See below |

**Preferences Object:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `dietaryRestrictions` | array | Dietary needs | `["vegetarian", "gluten-free"]` |
| `communicationPreferences` | object | Contact preferences | `{ "email": true, "sms": false }` |

#### curl Example

```bash
curl -X POST "https://api.wawagardenbar.com/api/public/customers" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane.doe@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "phone": "+2348098765432",
    "preferences": {
      "dietaryRestrictions": ["vegetarian"],
      "communicationPreferences": {
        "email": true,
        "sms": true
      }
    }
  }'
```

#### JavaScript Example

```javascript
async function createCustomer({ email, firstName, lastName, phone, preferences }) {
  const response = await fetch('https://api.wawagardenbar.com/api/public/customers', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.WAWA_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, firstName, lastName, phone, preferences })
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to create customer');
  }

  return result.data;
}

try {
  const newCustomer = await createCustomer({
    email: 'jane.doe@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    phone: '+2348098765432',
    preferences: {
      dietaryRestrictions: ['vegetarian'],
      communicationPreferences: { email: true, sms: true }
    }
  });
  console.log(`Customer created: ${newCustomer._id}`);
} catch (error) {
  if (error.message.includes('already exists')) {
    console.log('Customer with this email already exists');
  }
}
```

#### Success Response (201 Created)

```json
{
  "success": true,
  "data": {
    "_id": "665b2c3d4e5f6a7b8c9d0f1a",
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane.doe@example.com",
    "phone": "+2348098765432",
    "role": "customer",
    "accountStatus": "active",
    "totalSpent": 0,
    "totalOrders": 0,
    "loyaltyPoints": 0,
    "preferences": {
      "dietaryRestrictions": ["vegetarian"],
      "communicationPreferences": {
        "email": true,
        "sms": true
      }
    },
    "addresses": [],
    "createdAt": "2026-03-07T10:15:00Z"
  },
  "meta": {
    "timestamp": "2026-03-07T10:15:00Z"
  }
}
```

#### Error Response (409 Conflict)

```json
{
  "success": false,
  "error": "Customer with this email already exists"
}
```

---

### Part 3: Retrieving Customer Profiles

Retrieve a single customer's full profile by their database ID.

**Endpoint:** `GET /api/public/customers/{customerId}`
**Scope Required:** `customers:read`

#### curl Example

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/customers/665a1b2c3d4e5f6a7b8c9d0e" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### JavaScript Example

```javascript
async function getCustomerProfile(customerId) {
  const response = await fetch(
    `https://api.wawagardenbar.com/api/public/customers/${customerId}`,
    { headers: { 'x-api-key': process.env.WAWA_API_KEY } }
  );
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch customer profile');
  }

  return result.data;
}

const profile = await getCustomerProfile('665a1b2c3d4e5f6a7b8c9d0e');
console.log(`${profile.firstName} ${profile.lastName}`);
console.log(`Total spent: ${profile.totalSpent}`);
console.log(`Loyalty points: ${profile.loyaltyPoints}`);
console.log(`Rewards earned: ${profile.rewardsEarned}`);
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "_id": "665a1b2c3d4e5f6a7b8c9d0e",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+2348012345678",
    "role": "customer",
    "accountStatus": "active",
    "totalSpent": 45000,
    "totalOrders": 12,
    "loyaltyPoints": 45000,
    "rewardsEarned": 5,
    "preferences": {
      "dietaryRestrictions": ["no-peanuts"],
      "communicationPreferences": {
        "email": true,
        "sms": false
      }
    },
    "addresses": [
      {
        "label": "Home",
        "street": "12 Victoria Island",
        "city": "Lagos",
        "state": "Lagos",
        "isDefault": true
      }
    ],
    "createdAt": "2025-11-15T10:00:00Z"
  },
  "meta": {
    "timestamp": "2026-03-07T10:00:00Z"
  }
}
```

**Full Profile Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Customer database ID |
| `firstName` | string | Customer first name |
| `lastName` | string | Customer last name |
| `email` | string | Customer email address |
| `phone` | string | Customer phone number |
| `role` | string | Customer role |
| `accountStatus` | string | Account status |
| `totalSpent` | number | Lifetime spending in NGN |
| `totalOrders` | number | Lifetime order count |
| `loyaltyPoints` | number | Current loyalty points balance |
| `rewardsEarned` | number | Total rewards earned |
| `preferences` | object | Customer preferences (dietary, communication) |
| `addresses` | array | Saved delivery addresses |
| `createdAt` | string | ISO 8601 account creation date |

---

### Part 4: Updating Customer Information

Update a customer's profile. Only safe fields can be modified through the API.

**Endpoint:** `PATCH /api/public/customers/{customerId}`
**Scope Required:** `customers:write`

#### Updatable Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `firstName` | string | Customer first name | `"John"` |
| `lastName` | string | Customer last name | `"Doe"` |
| `phone` | string | Customer phone number | `"+2348012345678"` |
| `preferences.dietaryRestrictions` | array | Dietary restrictions | `["vegetarian", "no-peanuts"]` |
| `preferences.communicationPreferences` | object | Contact preferences | `{ "email": true, "sms": false }` |

> **Note:** Fields such as `email`, `role`, `accountStatus`, `totalSpent`, `totalOrders`, and `loyaltyPoints` cannot be modified through this endpoint. These are managed internally by the system.

#### curl Example

```bash
curl -X PATCH "https://api.wawagardenbar.com/api/public/customers/665a1b2c3d4e5f6a7b8c9d0e" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jonathan",
    "phone": "+2348012345999",
    "preferences": {
      "dietaryRestrictions": ["no-peanuts", "no-shellfish"],
      "communicationPreferences": {
        "email": true,
        "sms": true
      }
    }
  }'
```

#### JavaScript Example

```javascript
async function updateCustomer(customerId, updates) {
  const response = await fetch(
    `https://api.wawagardenbar.com/api/public/customers/${customerId}`,
    {
      method: 'PATCH',
      headers: {
        'x-api-key': process.env.WAWA_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }
  );
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to update customer');
  }

  return result.data;
}

const updated = await updateCustomer('665a1b2c3d4e5f6a7b8c9d0e', {
  firstName: 'Jonathan',
  phone: '+2348012345999',
  preferences: {
    dietaryRestrictions: ['no-peanuts', 'no-shellfish'],
    communicationPreferences: { email: true, sms: true }
  }
});
console.log(`Customer updated: ${updated.firstName} ${updated.lastName}`);
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "_id": "665a1b2c3d4e5f6a7b8c9d0e",
    "firstName": "Jonathan",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+2348012345999",
    "role": "customer",
    "accountStatus": "active",
    "totalSpent": 45000,
    "totalOrders": 12,
    "loyaltyPoints": 45000,
    "preferences": {
      "dietaryRestrictions": ["no-peanuts", "no-shellfish"],
      "communicationPreferences": {
        "email": true,
        "sms": true
      }
    },
    "createdAt": "2025-11-15T10:00:00Z"
  },
  "meta": {
    "timestamp": "2026-03-07T10:20:00Z"
  }
}
```

---

### Part 5: Viewing Customer Order History

Retrieve the order history for a specific customer with optional status filtering and pagination.

**Endpoint:** `GET /api/public/customers/{customerId}/orders`
**Scope Required:** `customers:read` + `orders:read`

#### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `status` | string | No | Filter by order status | `"completed"`, `"pending"`, `"cancelled"` |
| `page` | number | No | Page number (default: 1) | `1` |
| `limit` | number | No | Items per page (default: 25, max: 100) | `10` |

#### curl Example

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/customers/665a1b2c3d4e5f6a7b8c9d0e/orders?status=completed&limit=5" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### JavaScript Example

```javascript
async function getCustomerOrders(customerId, { status, page, limit } = {}) {
  const url = new URL(
    `https://api.wawagardenbar.com/api/public/customers/${customerId}/orders`
  );

  if (status) url.searchParams.append('status', status);
  if (page) url.searchParams.append('page', page.toString());
  if (limit) url.searchParams.append('limit', limit.toString());

  const response = await fetch(url, {
    headers: { 'x-api-key': process.env.WAWA_API_KEY }
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch customer orders');
  }

  return result;
}

const orders = await getCustomerOrders('665a1b2c3d4e5f6a7b8c9d0e', {
  status: 'completed',
  limit: 5
});
console.log(`Total orders: ${orders.meta.total}`);
orders.data.forEach(order => {
  console.log(`  ${order.orderNumber}: ${order.total} (${order.status})`);
});
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "_id": "order_abc123",
      "orderNumber": "WGB-A1B2C3",
      "orderType": "dine-in",
      "status": "completed",
      "items": [
        {
          "name": "Jollof Rice",
          "quantity": 1,
          "price": 3500,
          "subtotal": 3500
        },
        {
          "name": "Star Lager Beer",
          "quantity": 2,
          "price": 800,
          "subtotal": 1600
        }
      ],
      "subtotal": 5100,
      "tax": 0,
      "total": 5100,
      "createdAt": "2026-03-05T14:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 5,
    "total": 12,
    "totalPages": 3,
    "timestamp": "2026-03-07T10:00:00Z"
  }
}
```

---

### Part 6: Customer Analytics (Summary Endpoint)

Retrieve an AI-optimized customer analytics summary with totals, top spenders, role breakdowns, and acquisition trends.

**Endpoint:** `GET /api/public/customers/summary`
**Scope Required:** `customers:read`

#### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `period` | string | No | Predefined period | `"7d"`, `"30d"`, `"90d"`, `"1y"` |
| `startDate` | string | No | Custom period start (ISO 8601) | `"2026-01-01"` |
| `endDate` | string | No | Custom period end (ISO 8601) | `"2026-03-07"` |

#### curl Example

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/customers/summary?period=30d" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### JavaScript Example

```javascript
async function getCustomerSummary({ period, startDate, endDate } = {}) {
  const url = new URL('https://api.wawagardenbar.com/api/public/customers/summary');

  if (period) url.searchParams.append('period', period);
  if (startDate) url.searchParams.append('startDate', startDate);
  if (endDate) url.searchParams.append('endDate', endDate);

  const response = await fetch(url, {
    headers: { 'x-api-key': process.env.WAWA_API_KEY }
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch customer summary');
  }

  return result.data;
}

const summary = await getCustomerSummary({ period: '30d' });
console.log(`Total customers: ${summary.totals.totalCustomers}`);
console.log(`New customers (period): ${summary.totals.newCustomersInPeriod}`);
console.log(`Total spent: ${summary.totals.totalSpent}`);
console.log(`Average spent: ${summary.totals.averageSpent}`);

console.log('Top spenders:');
summary.topSpenders.forEach(s => {
  console.log(`  ${s.firstName} ${s.lastName}: ${s.totalSpent}`);
});
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "totals": {
      "totalCustomers": 320,
      "newCustomersInPeriod": 45,
      "totalSpent": 2850000,
      "averageSpent": 8906,
      "totalLoyaltyPoints": 2850000
    },
    "topSpenders": [
      {
        "_id": "665a1b2c3d4e5f6a7b8c9d0e",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "totalSpent": 125000,
        "totalOrders": 28
      },
      {
        "_id": "665b2c3d4e5f6a7b8c9d0f1a",
        "firstName": "Jane",
        "lastName": "Doe",
        "email": "jane.doe@example.com",
        "totalSpent": 98000,
        "totalOrders": 22
      }
    ],
    "byRole": {
      "customer": 290,
      "vip": 25,
      "staff": 5
    },
    "acquisitionSeries": [
      { "date": "2026-02-05", "count": 3 },
      { "date": "2026-02-06", "count": 1 },
      { "date": "2026-02-07", "count": 5 },
      { "date": "2026-02-08", "count": 2 }
    ]
  },
  "meta": {
    "timestamp": "2026-03-07T10:00:00Z"
  }
}
```

**Summary Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `totals.totalCustomers` | number | Total registered customers |
| `totals.newCustomersInPeriod` | number | New customers in the queried period |
| `totals.totalSpent` | number | Total revenue from all customers in NGN |
| `totals.averageSpent` | number | Average spending per customer in NGN |
| `totals.totalLoyaltyPoints` | number | Total loyalty points across all customers |
| `topSpenders` | array | Top spending customers with profile summary |
| `byRole` | object | Customer count broken down by role |
| `acquisitionSeries` | array | Daily new customer counts for trend analysis |

---

## Complete Workflow Example

### Scenario: AI Agent Manages a Customer Interaction

This workflow demonstrates the full end-to-end flow: searching for or creating a customer, viewing their profile, checking order history, and updating preferences.

```javascript
const API_BASE = 'https://api.wawagardenbar.com';
const headers = {
  'x-api-key': process.env.WAWA_API_KEY,
  'Content-Type': 'application/json'
};

// -- Helper: Search for customer -------------------------------------
async function searchCustomers(query) {
  const url = new URL(`${API_BASE}/api/public/customers`);
  url.searchParams.append('q', query);
  url.searchParams.append('status', 'active');
  url.searchParams.append('limit', '5');

  const response = await fetch(url, { headers });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Helper: Create customer -----------------------------------------
async function createCustomer(customerData) {
  const response = await fetch(`${API_BASE}/api/public/customers`, {
    method: 'POST',
    headers,
    body: JSON.stringify(customerData)
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Helper: Get customer profile ------------------------------------
async function getCustomerProfile(customerId) {
  const response = await fetch(`${API_BASE}/api/public/customers/${customerId}`, {
    headers
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Helper: Get customer orders -------------------------------------
async function getCustomerOrders(customerId, options = {}) {
  const url = new URL(`${API_BASE}/api/public/customers/${customerId}/orders`);
  if (options.status) url.searchParams.append('status', options.status);
  if (options.limit) url.searchParams.append('limit', options.limit.toString());

  const response = await fetch(url, { headers });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result;
}

// -- Helper: Update customer -----------------------------------------
async function updateCustomer(customerId, updates) {
  const response = await fetch(`${API_BASE}/api/public/customers/${customerId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updates)
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Step 1: Find or create the customer -----------------------------
async function findOrCreateCustomer(email, customerInfo) {
  // 1a. Search for existing customer
  const existing = await searchCustomers(email);

  if (existing.length > 0) {
    const customer = existing.find(c => c.email === email);
    if (customer) {
      console.log(`Found existing customer: ${customer.firstName} ${customer.lastName}`);
      return customer;
    }
  }

  // 1b. Create new customer if not found
  console.log('Customer not found, creating new record');
  const newCustomer = await createCustomer({
    email,
    firstName: customerInfo.firstName,
    lastName: customerInfo.lastName,
    phone: customerInfo.phone,
    preferences: customerInfo.preferences
  });
  console.log(`Customer created: ${newCustomer._id}`);
  return newCustomer;
}

// -- Step 2: View profile and order history --------------------------
async function reviewCustomerHistory(customerId) {
  // 2a. Get full profile
  const profile = await getCustomerProfile(customerId);
  console.log(`Customer: ${profile.firstName} ${profile.lastName}`);
  console.log(`Total spent: ${profile.totalSpent}`);
  console.log(`Loyalty points: ${profile.loyaltyPoints}`);
  console.log(`Rewards earned: ${profile.rewardsEarned}`);

  // 2b. Check dietary restrictions
  if (profile.preferences?.dietaryRestrictions?.length > 0) {
    console.log(`Dietary restrictions: ${profile.preferences.dietaryRestrictions.join(', ')}`);
  }

  // 2c. Get recent order history
  const orders = await getCustomerOrders(customerId, {
    status: 'completed',
    limit: 5
  });
  console.log(`Recent orders (${orders.meta.total} total):`);
  orders.data.forEach(order => {
    console.log(`  ${order.orderNumber}: ${order.total} on ${order.createdAt}`);
  });

  return { profile, orders: orders.data };
}

// -- Step 3: Update preferences --------------------------------------
async function updateCustomerPreferences(customerId, preferences) {
  const updated = await updateCustomer(customerId, { preferences });
  console.log('Customer preferences updated');
  return updated;
}

// -- Run the complete workflow ---------------------------------------
async function processCustomerInteraction() {
  try {
    // Step 1: Find or create customer
    const customer = await findOrCreateCustomer('john.doe@example.com', {
      firstName: 'John',
      lastName: 'Doe',
      phone: '+2348012345678',
      preferences: {
        dietaryRestrictions: ['no-peanuts'],
        communicationPreferences: { email: true, sms: false }
      }
    });

    // Step 2: Review their history
    const { profile, orders } = await reviewCustomerHistory(customer._id);

    // Step 3: Update preferences if needed
    await updateCustomerPreferences(customer._id, {
      dietaryRestrictions: ['no-peanuts', 'no-shellfish'],
      communicationPreferences: { email: true, sms: true }
    });

    return { customer, profile, orders };
  } catch (error) {
    console.error('Error processing customer interaction:', error.message);
    throw error;
  }
}
```

---

## Privacy and Data Handling Best Practices

### 1. Data Minimization
- Only request and store the customer data you need
- Do not cache sensitive customer data longer than necessary
- Use the `q` search parameter to find specific customers rather than downloading entire lists

### 2. Consent and Communication
- Respect `communicationPreferences` when contacting customers
- Only send marketing communications to customers who have opted in
- Provide customers with the ability to update their preferences

### 3. Access Control
- Use separate API keys with minimal required scopes for different integrations
- Marketing platforms should use `customers:read` only (not `customers:write`)
- Log all customer data access for audit purposes

### 4. Data Retention
- Do not store customer data in external systems beyond what is necessary
- Implement data deletion procedures that align with privacy regulations
- Respect the `"deleted"` account status and exclude those records from processing

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
      if (response.status === 400 || response.status === 404 || response.status === 409) {
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

### Validate Before Sending

```javascript
function validateCreateCustomerPayload(payload) {
  const errors = [];

  if (!payload.email) errors.push('email is required');
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    errors.push('email must be a valid email address');
  }
  if (payload.phone && !/^\+?[0-9]{10,15}$/.test(payload.phone)) {
    errors.push('phone must be a valid phone number');
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  return true;
}

function validateUpdateCustomerPayload(payload) {
  const errors = [];
  const allowedFields = ['firstName', 'lastName', 'phone', 'preferences'];
  const providedFields = Object.keys(payload);

  providedFields.forEach(field => {
    if (!allowedFields.includes(field)) {
      errors.push(`Field "${field}" is not updatable through the API`);
    }
  });

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  return true;
}
```

---

## Quick Reference

### Search Customers

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/customers?q=john&status=active" \
  -H "x-api-key: wawa_your_api_key_here"
```

### Create Customer

```json
POST /api/public/customers
{
  "email": "jane.doe@example.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "phone": "+2348098765432"
}
```

### Get Customer Profile

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/customers/665a1b2c3d4e5f6a7b8c9d0e" \
  -H "x-api-key: wawa_your_api_key_here"
```

### Update Customer

```json
PATCH /api/public/customers/{customerId}
{
  "firstName": "Jonathan",
  "phone": "+2348012345999",
  "preferences": {
    "dietaryRestrictions": ["no-peanuts"],
    "communicationPreferences": { "email": true, "sms": true }
  }
}
```

### Get Customer Orders

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/customers/665a1b2c3d4e5f6a7b8c9d0e/orders?status=completed&limit=5" \
  -H "x-api-key: wawa_your_api_key_here"
```

### Get Customer Analytics Summary

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/customers/summary?period=30d" \
  -H "x-api-key: wawa_your_api_key_here"
```

---

## API Endpoints Summary

| Endpoint | Method | Purpose | Required Scopes |
|----------|--------|---------|-----------------|
| `/api/public/customers` | GET | List/search customers | `customers:read` |
| `/api/public/customers` | POST | Create new customer | `customers:write` |
| `/api/public/customers/{customerId}` | GET | Get customer profile | `customers:read` |
| `/api/public/customers/{customerId}` | PATCH | Update customer profile | `customers:write` |
| `/api/public/customers/{customerId}/orders` | GET | Get customer order history | `customers:read` + `orders:read` |
| `/api/public/customers/summary` | GET | AI-optimized customer analytics | `customers:read` |

---

## Troubleshooting

### Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid API key | Verify API key is correct and active |
| `403 Forbidden` | Insufficient scopes | Request API key with `customers:read` and/or `customers:write` scopes |
| `429 Too Many Requests` | Rate limit exceeded | Implement rate limiting and retry logic |
| `409` "Customer with this email already exists" | Duplicate email on creation | Search for existing customer first, then update if needed |
| `404` "Customer not found" | Invalid customerId | Verify the customer ID exists using the search endpoint |
| `400` "Search query must be at least 3 characters" | Query too short | Provide at least 3 characters in the `q` parameter |
| `400` Missing required fields | `email` not provided on creation | Ensure email is included in the POST request body |
| `403` "Cannot modify protected fields" | Attempted to update restricted field | Only update allowed fields: firstName, lastName, phone, preferences |

---

## Related Documentation

- API Reference: `/docs/api/public-api-reference.md`
- Authentication Guide: `/docs/api/authentication.md`
- Error Codes: `/docs/api/error-codes.md`
- SOP-ADMIN-007: Customer Data Management (Admin Panel)
- SOP-API-001: Agentic API Tab and Order Management
- SOP-API-007: Agentic API Rewards and Loyalty Management

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|----------|
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
