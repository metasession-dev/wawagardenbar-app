# SOP: Agentic API Admin User Management and System Configuration

**Document ID:** SOP-AGENTIC-010
**Version:** 1.0
**Effective Date:** March 7, 2026
**Department:** Technical Integration
**Applies To:** AI Agents, Admin Automation Systems, DevOps Tools

---

## Purpose

This Standard Operating Procedure (SOP) provides technical specifications and step-by-step API integration instructions for agentic systems to programmatically manage admin user accounts, control admin permissions, reset passwords, and configure system-wide settings (service fees, tax rates, loyalty points conversion) using the Wawa Garden Bar Public REST API.

This document is the API counterpart to SOP-MANUAL-ADMIN-006 (Manual Admin User Management).

---

## Scope

This SOP covers:
- API authentication and authorization for admin and settings endpoints
- Reading and updating system configuration settings
- Listing and searching admin users
- Retrieving admin user profiles
- Creating new admin users
- Updating admin status and permissions
- Soft-deleting admin users
- Resetting admin passwords

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

- `settings:read` - List admins, get admin details, read system settings
- `settings:write` - Create/update/delete admins, reset passwords, update system settings

> **Role-Based Keys:** Select the **Super-Admin** role when creating an API key (Admin Dashboard > Settings > API Keys) to automatically include both `settings:read` and `settings:write` scopes. Alternatively, use **Custom** to select individual scopes.

---

## Procedure

### Part 1: Reading System Settings

Retrieve the current system configuration including service fee, tax rate, points conversion rate, menu categories, and payment provider.

**Endpoint:** `GET /api/public/settings`
**Scope Required:** `settings:read`

#### curl Example

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/settings" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### JavaScript Example

```javascript
async function getSettings() {
  const response = await fetch('https://api.wawagardenbar.com/api/public/settings', {
    headers: { 'x-api-key': process.env.WAWA_API_KEY }
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch settings');
  }

  return result.data;
}

const settings = await getSettings();
console.log(`Service Fee: ${settings.serviceFee}%`);
console.log(`Tax Rate: ${settings.taxRate}%`);
console.log(`Points Conversion Rate: ${settings.pointsConversionRate} points = 1 NGN`);
console.log(`Payment Provider: ${settings.paymentProvider}`);
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "serviceFee": 5,
    "taxRate": 7.5,
    "pointsConversionRate": 100,
    "menuCategories": {
      "drinks": { "label": "Drinks", "slug": "drinks", "enabled": true },
      "food": { "label": "Food", "slug": "food", "enabled": true }
    },
    "paymentProvider": "monnify"
  },
  "meta": {
    "timestamp": "2026-03-07T10:00:00Z"
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `serviceFee` | number | Service fee percentage (e.g. `5` = 5%) |
| `taxRate` | number | Tax rate percentage (e.g. `7.5` = 7.5%) |
| `pointsConversionRate` | number | Points-to-NGN conversion rate (e.g. `100` = 100 points per 1 NGN) |
| `menuCategories` | object | Dynamic menu category configuration |
| `paymentProvider` | string | Active payment provider (`"monnify"` or `"paystack"`) |

---

### Part 2: Updating System Settings

Update system-wide configuration values. Only the provided fields are updated; omitted fields remain unchanged.

**Endpoint:** `PATCH /api/public/settings`
**Scope Required:** `settings:write`

#### Updatable Fields

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `serviceFee` | number | No | Service fee percentage | Must be between 0 and 100 |
| `taxRate` | number | No | Tax rate percentage | Must be between 0 and 100 |
| `pointsConversionRate` | number | No | Points-to-currency conversion rate | Must be a number |

> **Note:** At least one field must be provided. Menu categories and payment provider cannot be modified through this endpoint.

#### curl Example

```bash
curl -X PATCH "https://api.wawagardenbar.com/api/public/settings" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceFee": 7,
    "taxRate": 7.5,
    "pointsConversionRate": 150
  }'
```

#### JavaScript Example

```javascript
async function updateSettings(updates) {
  const response = await fetch('https://api.wawagardenbar.com/api/public/settings', {
    method: 'PATCH',
    headers: {
      'x-api-key': process.env.WAWA_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to update settings');
  }

  return result.data;
}

const updated = await updateSettings({
  serviceFee: 7,
  taxRate: 7.5,
  pointsConversionRate: 150
});
console.log('Updated settings:', updated);
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "serviceFee": 7,
    "taxRate": 7.5,
    "pointsConversionRate": 150
  },
  "meta": {
    "timestamp": "2026-03-07T10:05:00Z"
  }
}
```

#### Error Response (422 Unprocessable Entity)

```json
{
  "success": false,
  "error": "serviceFee must be a number between 0 and 100"
}
```

---

### Part 3: Listing Admin Users

List admin users with optional filtering, sorting, and pagination.

**Endpoint:** `GET /api/public/admins`
**Scope Required:** `settings:read`

#### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `search` | string | No | Search by username, email, first/last name | `"john"` |
| `role` | string | No | Filter by role | `"csr"`, `"admin"`, `"super-admin"` |
| `status` | string | No | Filter by status | `"active"`, `"suspended"`, `"deleted"` |
| `sortBy` | string | No | Sort field | `"username"`, `"role"`, `"lastLoginAt"`, `"createdAt"` |
| `sortOrder` | string | No | Sort direction | `"asc"`, `"desc"` |
| `page` | number | No | Page number (default: 1) | `1` |
| `limit` | number | No | Items per page (default: 25, max: 100) | `10` |

#### curl Example

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/admins?role=admin&status=active&sortBy=createdAt&sortOrder=desc&limit=10" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### JavaScript Example

```javascript
async function listAdmins({ search, role, status, sortBy, sortOrder, page, limit }) {
  const url = new URL('https://api.wawagardenbar.com/api/public/admins');

  if (search) url.searchParams.append('search', search);
  if (role) url.searchParams.append('role', role);
  if (status) url.searchParams.append('status', status);
  if (sortBy) url.searchParams.append('sortBy', sortBy);
  if (sortOrder) url.searchParams.append('sortOrder', sortOrder);
  if (page) url.searchParams.append('page', page.toString());
  if (limit) url.searchParams.append('limit', limit.toString());

  const response = await fetch(url, {
    headers: { 'x-api-key': process.env.WAWA_API_KEY }
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to list admins');
  }

  return result;
}

const results = await listAdmins({ role: 'admin', status: 'active', limit: 10 });
console.log(`Found ${results.meta.total} admins`);
results.data.forEach(a => {
  console.log(`  ${a.username} (${a.role}) - ${a.status}`);
});
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "_id": "665a1b2c3d4e5f6a7b8c9d0e",
      "username": "john.admin",
      "email": "john@wawagardenbar.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "admin",
      "status": "active",
      "isAdmin": true,
      "permissions": {
        "orderManagement": true,
        "menuManagement": true,
        "inventoryManagement": false,
        "rewardsAndLoyalty": true,
        "reportsAndAnalytics": true,
        "expensesManagement": false,
        "settingsAndConfiguration": false
      },
      "lastLoginAt": "2026-03-06T18:30:00Z",
      "createdAt": "2025-11-15T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "timestamp": "2026-03-07T10:00:00Z"
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Admin database ID (MongoDB ObjectId) |
| `username` | string | Unique admin username |
| `email` | string | Admin email address |
| `firstName` | string | Admin first name |
| `lastName` | string | Admin last name |
| `role` | string | Admin role (`"csr"`, `"admin"`, `"super-admin"`) |
| `status` | string | Account status (`"active"`, `"suspended"`, `"deleted"`) |
| `isAdmin` | boolean | Always `true` for admin users |
| `permissions` | object | Permission flags (see IAdminPermissions) |
| `lastLoginAt` | string | ISO 8601 timestamp of last login |
| `createdAt` | string | ISO 8601 account creation date |

---

### Part 4: Getting Admin Details

Retrieve a single admin user's full profile by their database ID. Sensitive fields (password, verification pin, session token) are excluded from the response.

**Endpoint:** `GET /api/public/admins/{adminId}`
**Scope Required:** `settings:read`

#### curl Example

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/admins/665a1b2c3d4e5f6a7b8c9d0e" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### JavaScript Example

```javascript
async function getAdmin(adminId) {
  const response = await fetch(
    `https://api.wawagardenbar.com/api/public/admins/${adminId}`,
    { headers: { 'x-api-key': process.env.WAWA_API_KEY } }
  );
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch admin');
  }

  return result.data;
}

const admin = await getAdmin('665a1b2c3d4e5f6a7b8c9d0e');
console.log(`${admin.username} (${admin.role})`);
console.log(`Status: ${admin.status}`);
console.log(`Permissions:`, admin.permissions);
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "_id": "665a1b2c3d4e5f6a7b8c9d0e",
    "username": "john.admin",
    "email": "john@wawagardenbar.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "admin",
    "status": "active",
    "isAdmin": true,
    "permissions": {
      "orderManagement": true,
      "menuManagement": true,
      "inventoryManagement": false,
      "rewardsAndLoyalty": true,
      "reportsAndAnalytics": true,
      "expensesManagement": false,
      "settingsAndConfiguration": false
    },
    "lastLoginAt": "2026-03-06T18:30:00Z",
    "createdAt": "2025-11-15T10:00:00Z"
  },
  "meta": {
    "timestamp": "2026-03-07T10:00:00Z"
  }
}
```

#### Error Response (404 Not Found)

```json
{
  "success": false,
  "error": "Admin not found"
}
```

---

### Part 5: Creating Admin Users

Create a new admin user with a specified role and optional permissions.

**Endpoint:** `POST /api/public/admins`
**Scope Required:** `settings:write`

#### Request Body

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `username` | string | Yes | Unique username | `"jane.csr"` |
| `password` | string | Yes | Password (must meet strength requirements) | `"SecureP@ss123!"` |
| `email` | string | No | Email address | `"jane@wawagardenbar.com"` |
| `firstName` | string | No | First name | `"Jane"` |
| `lastName` | string | No | Last name | `"Doe"` |
| `role` | string | Yes | Admin role: `"csr"`, `"admin"`, or `"super-admin"` | `"admin"` |
| `permissions` | object | No | Custom permissions (see IAdminPermissions below) | See below |

**IAdminPermissions Object:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `orderManagement` | boolean | varies by role | Access to order management features |
| `menuManagement` | boolean | varies by role | Access to menu management features |
| `inventoryManagement` | boolean | varies by role | Access to inventory management features |
| `rewardsAndLoyalty` | boolean | varies by role | Access to rewards and loyalty features |
| `reportsAndAnalytics` | boolean | varies by role | Access to reports and analytics |
| `expensesManagement` | boolean | varies by role | Access to expense management features |
| `settingsAndConfiguration` | boolean | varies by role | Access to system settings and configuration |

#### curl Example

```bash
curl -X POST "https://api.wawagardenbar.com/api/public/admins" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jane.csr",
    "password": "SecureP@ss123!",
    "email": "jane@wawagardenbar.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "role": "admin",
    "permissions": {
      "orderManagement": true,
      "menuManagement": true,
      "inventoryManagement": false,
      "rewardsAndLoyalty": true,
      "reportsAndAnalytics": true,
      "expensesManagement": false,
      "settingsAndConfiguration": false
    }
  }'
```

#### JavaScript Example

```javascript
async function createAdmin({ username, password, email, firstName, lastName, role, permissions }) {
  const response = await fetch('https://api.wawagardenbar.com/api/public/admins', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.WAWA_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password, email, firstName, lastName, role, permissions })
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to create admin');
  }

  return result.data;
}

try {
  const newAdmin = await createAdmin({
    username: 'jane.csr',
    password: 'SecureP@ss123!',
    email: 'jane@wawagardenbar.com',
    firstName: 'Jane',
    lastName: 'Doe',
    role: 'admin',
    permissions: {
      orderManagement: true,
      menuManagement: true,
      inventoryManagement: false,
      rewardsAndLoyalty: true,
      reportsAndAnalytics: true,
      expensesManagement: false,
      settingsAndConfiguration: false
    }
  });
  console.log(`Admin created: ${newAdmin._id} (${newAdmin.username})`);
} catch (error) {
  if (error.message.includes('already exists')) {
    console.log('Username already taken');
  }
}
```

#### Success Response (201 Created)

```json
{
  "success": true,
  "data": {
    "_id": "665b2c3d4e5f6a7b8c9d0f1a",
    "username": "jane.csr",
    "email": "jane@wawagardenbar.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "role": "admin",
    "status": "active",
    "isAdmin": true,
    "permissions": {
      "orderManagement": true,
      "menuManagement": true,
      "inventoryManagement": false,
      "rewardsAndLoyalty": true,
      "reportsAndAnalytics": true,
      "expensesManagement": false,
      "settingsAndConfiguration": false
    },
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
  "error": "Username already exists"
}
```

#### Error Response (422 Unprocessable Entity)

```json
{
  "success": false,
  "error": "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"
}
```

---

### Part 6: Updating Admin Users

Update an admin user's status and/or permissions. Only the provided fields are updated.

**Endpoint:** `PATCH /api/public/admins/{adminId}`
**Scope Required:** `settings:write`

#### Updatable Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `status` | string | New account status: `"active"` or `"suspended"` | `"suspended"` |
| `permissions` | object | New permissions object (IAdminPermissions) | See below |

> **Note:** At least one field (`status` or `permissions`) must be provided. Fields such as `username`, `email`, `role`, `firstName`, and `lastName` cannot be modified through this endpoint. Super-admin permissions cannot be modified.

#### curl Example

```bash
curl -X PATCH "https://api.wawagardenbar.com/api/public/admins/665a1b2c3d4e5f6a7b8c9d0e" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "suspended",
    "permissions": {
      "orderManagement": true,
      "menuManagement": false,
      "inventoryManagement": false,
      "rewardsAndLoyalty": false,
      "reportsAndAnalytics": true,
      "expensesManagement": false,
      "settingsAndConfiguration": false
    }
  }'
```

#### JavaScript Example

```javascript
async function updateAdmin(adminId, updates) {
  const response = await fetch(
    `https://api.wawagardenbar.com/api/public/admins/${adminId}`,
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
    throw new Error(result.error || 'Failed to update admin');
  }

  return result.data;
}

// Suspend an admin
const updated = await updateAdmin('665a1b2c3d4e5f6a7b8c9d0e', {
  status: 'suspended'
});
console.log(`Admin ${updated.username} status: ${updated.status}`);

// Update permissions only
const permUpdated = await updateAdmin('665a1b2c3d4e5f6a7b8c9d0e', {
  permissions: {
    orderManagement: true,
    menuManagement: false,
    inventoryManagement: false,
    rewardsAndLoyalty: false,
    reportsAndAnalytics: true,
    expensesManagement: false,
    settingsAndConfiguration: false
  }
});
console.log(`Permissions updated for ${permUpdated.username}`);
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "_id": "665a1b2c3d4e5f6a7b8c9d0e",
    "username": "john.admin",
    "email": "john@wawagardenbar.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "admin",
    "status": "suspended",
    "isAdmin": true,
    "permissions": {
      "orderManagement": true,
      "menuManagement": false,
      "inventoryManagement": false,
      "rewardsAndLoyalty": false,
      "reportsAndAnalytics": true,
      "expensesManagement": false,
      "settingsAndConfiguration": false
    },
    "lastLoginAt": "2026-03-06T18:30:00Z",
    "createdAt": "2025-11-15T10:00:00Z"
  },
  "meta": {
    "timestamp": "2026-03-07T10:20:00Z"
  }
}
```

#### Error Response (422 Unprocessable Entity)

```json
{
  "success": false,
  "error": "Cannot modify super-admin permissions"
}
```

---

### Part 7: Deleting Admin Users

Soft-delete an admin user. The admin's account status is set to `"deleted"` but their record is retained in the database for audit purposes.

**Endpoint:** `DELETE /api/public/admins/{adminId}`
**Scope Required:** `settings:write`

#### curl Example

```bash
curl -X DELETE "https://api.wawagardenbar.com/api/public/admins/665a1b2c3d4e5f6a7b8c9d0e" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### JavaScript Example

```javascript
async function deleteAdmin(adminId) {
  const response = await fetch(
    `https://api.wawagardenbar.com/api/public/admins/${adminId}`,
    {
      method: 'DELETE',
      headers: { 'x-api-key': process.env.WAWA_API_KEY }
    }
  );
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to delete admin');
  }

  return result.data;
}

try {
  const result = await deleteAdmin('665a1b2c3d4e5f6a7b8c9d0e');
  console.log(`Admin deleted: ${result.deleted}`);
} catch (error) {
  if (error.message.includes('last super-admin')) {
    console.log('Cannot delete the last super-admin account');
  }
}
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "deleted": true
  },
  "meta": {
    "timestamp": "2026-03-07T10:25:00Z"
  }
}
```

#### Error Response (422 Unprocessable Entity)

```json
{
  "success": false,
  "error": "Cannot delete the last super-admin"
}
```

#### Error Response (404 Not Found)

```json
{
  "success": false,
  "error": "Admin not found"
}
```

---

### Part 8: Resetting Admin Passwords

Reset an admin user's password and receive a temporary password. The admin will be required to change their password on next login.

**Endpoint:** `POST /api/public/admins/{adminId}/reset-password`
**Scope Required:** `settings:write`

#### curl Example

```bash
curl -X POST "https://api.wawagardenbar.com/api/public/admins/665a1b2c3d4e5f6a7b8c9d0e/reset-password" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### JavaScript Example

```javascript
async function resetAdminPassword(adminId) {
  const response = await fetch(
    `https://api.wawagardenbar.com/api/public/admins/${adminId}/reset-password`,
    {
      method: 'POST',
      headers: { 'x-api-key': process.env.WAWA_API_KEY }
    }
  );
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to reset password');
  }

  return result.data;
}

try {
  const result = await resetAdminPassword('665a1b2c3d4e5f6a7b8c9d0e');
  console.log(`Temporary password: ${result.tempPassword}`);
  console.log('The admin must change this password on next login.');
} catch (error) {
  if (error.message.includes('not found')) {
    console.log('Admin user not found');
  }
}
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "tempPassword": "TempP@ss2026!abc"
  },
  "meta": {
    "timestamp": "2026-03-07T10:30:00Z"
  }
}
```

> **Security Notice:** The temporary password is returned only once. Store or relay it securely to the admin user. It cannot be retrieved again after this response.

#### Error Response (404 Not Found)

```json
{
  "success": false,
  "error": "Admin not found"
}
```

---

## Complete Workflow Example

### Scenario: AI Agent Provisions and Manages Admin Accounts

This workflow demonstrates the full end-to-end flow: reading system settings, creating an admin, updating permissions, and resetting a password.

```javascript
const API_BASE = 'https://api.wawagardenbar.com';
const headers = {
  'x-api-key': process.env.WAWA_API_KEY,
  'Content-Type': 'application/json'
};

// -- Helper: Get settings -----------------------------------------------
async function getSettings() {
  const response = await fetch(`${API_BASE}/api/public/settings`, { headers });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Helper: Update settings --------------------------------------------
async function updateSettings(updates) {
  const response = await fetch(`${API_BASE}/api/public/settings`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updates)
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Helper: List admins ------------------------------------------------
async function listAdmins(filters = {}) {
  const url = new URL(`${API_BASE}/api/public/admins`);
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.append(key, value.toString());
  });

  const response = await fetch(url, { headers });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result;
}

// -- Helper: Create admin -----------------------------------------------
async function createAdmin(adminData) {
  const response = await fetch(`${API_BASE}/api/public/admins`, {
    method: 'POST',
    headers,
    body: JSON.stringify(adminData)
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Helper: Update admin -----------------------------------------------
async function updateAdmin(adminId, updates) {
  const response = await fetch(`${API_BASE}/api/public/admins/${adminId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updates)
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Helper: Reset password ---------------------------------------------
async function resetPassword(adminId) {
  const response = await fetch(
    `${API_BASE}/api/public/admins/${adminId}/reset-password`,
    { method: 'POST', headers }
  );
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Run the complete workflow ------------------------------------------
async function provisionAndManageAdmin() {
  try {
    // Step 1: Check current system settings
    const settings = await getSettings();
    console.log(`Current service fee: ${settings.serviceFee}%`);
    console.log(`Current tax rate: ${settings.taxRate}%`);

    // Step 2: Create a new admin user
    const newAdmin = await createAdmin({
      username: 'new.cashier',
      password: 'SecureP@ss123!',
      email: 'cashier@wawagardenbar.com',
      firstName: 'New',
      lastName: 'Cashier',
      role: 'csr',
      permissions: {
        orderManagement: true,
        menuManagement: false,
        inventoryManagement: false,
        rewardsAndLoyalty: false,
        reportsAndAnalytics: false,
        expensesManagement: false,
        settingsAndConfiguration: false
      }
    });
    console.log(`Admin created: ${newAdmin._id}`);

    // Step 3: List all active admins
    const admins = await listAdmins({ status: 'active', sortBy: 'createdAt', sortOrder: 'desc' });
    console.log(`Total active admins: ${admins.meta.total}`);

    // Step 4: Update permissions for the new admin
    const updated = await updateAdmin(newAdmin._id, {
      permissions: {
        orderManagement: true,
        menuManagement: true,
        inventoryManagement: false,
        rewardsAndLoyalty: true,
        reportsAndAnalytics: false,
        expensesManagement: false,
        settingsAndConfiguration: false
      }
    });
    console.log(`Permissions updated for ${updated.username}`);

    // Step 5: Reset password if needed
    const resetResult = await resetPassword(newAdmin._id);
    console.log(`Temporary password issued: ${resetResult.tempPassword}`);

    return { admin: newAdmin, settings };
  } catch (error) {
    console.error('Error in admin provisioning workflow:', error.message);
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
      if (response.status === 400 || response.status === 404 || response.status === 409 || response.status === 422) {
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
function validateCreateAdminPayload(payload) {
  const errors = [];

  if (!payload.username) errors.push('username is required');
  if (!payload.password) errors.push('password is required');
  if (!payload.role) errors.push('role is required');
  if (payload.role && !['csr', 'admin', 'super-admin'].includes(payload.role)) {
    errors.push('role must be one of: csr, admin, super-admin');
  }
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    errors.push('email must be a valid email address');
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  return true;
}

function validateUpdateAdminPayload(payload) {
  const errors = [];
  const allowedFields = ['status', 'permissions'];
  const providedFields = Object.keys(payload);

  providedFields.forEach(field => {
    if (!allowedFields.includes(field)) {
      errors.push(`Field "${field}" is not updatable through this endpoint`);
    }
  });

  if (payload.status && !['active', 'suspended'].includes(payload.status)) {
    errors.push('status must be one of: active, suspended');
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  return true;
}
```

---

## Quick Reference

### Read Settings

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/settings" \
  -H "x-api-key: wawa_your_api_key_here"
```

### Update Settings

```json
PATCH /api/public/settings
{
  "serviceFee": 7,
  "taxRate": 7.5,
  "pointsConversionRate": 150
}
```

### List Admins

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/admins?role=admin&status=active" \
  -H "x-api-key: wawa_your_api_key_here"
```

### Get Admin Details

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/admins/665a1b2c3d4e5f6a7b8c9d0e" \
  -H "x-api-key: wawa_your_api_key_here"
```

### Create Admin

```json
POST /api/public/admins
{
  "username": "jane.csr",
  "password": "SecureP@ss123!",
  "role": "admin",
  "email": "jane@wawagardenbar.com",
  "firstName": "Jane",
  "lastName": "Doe"
}
```

### Update Admin

```json
PATCH /api/public/admins/{adminId}
{
  "status": "suspended",
  "permissions": {
    "orderManagement": true,
    "menuManagement": false,
    "inventoryManagement": false,
    "rewardsAndLoyalty": false,
    "reportsAndAnalytics": true,
    "expensesManagement": false,
    "settingsAndConfiguration": false
  }
}
```

### Delete Admin

```bash
curl -X DELETE "https://api.wawagardenbar.com/api/public/admins/665a1b2c3d4e5f6a7b8c9d0e" \
  -H "x-api-key: wawa_your_api_key_here"
```

### Reset Admin Password

```bash
curl -X POST "https://api.wawagardenbar.com/api/public/admins/665a1b2c3d4e5f6a7b8c9d0e/reset-password" \
  -H "x-api-key: wawa_your_api_key_here"
```

---

## API Endpoints Summary

| Endpoint | Method | Purpose | Required Scopes |
|----------|--------|---------|-----------------|
| `/api/public/settings` | GET | Read system settings | `settings:read` |
| `/api/public/settings` | PATCH | Update system settings | `settings:write` |
| `/api/public/admins` | GET | List/search admin users | `settings:read` |
| `/api/public/admins` | POST | Create new admin user | `settings:write` |
| `/api/public/admins/{adminId}` | GET | Get admin user details | `settings:read` |
| `/api/public/admins/{adminId}` | PATCH | Update admin status/permissions | `settings:write` |
| `/api/public/admins/{adminId}` | DELETE | Soft-delete admin user | `settings:write` |
| `/api/public/admins/{adminId}/reset-password` | POST | Reset admin password | `settings:write` |

---

## Troubleshooting

### Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid API key | Verify API key is correct and active |
| `403 Forbidden` | Insufficient scopes | Request API key with `settings:read` and/or `settings:write` scopes |
| `429 Too Many Requests` | Rate limit exceeded (30 req/min) | Implement rate limiting and retry logic |
| `409` "Username already exists" | Duplicate username on creation | Search for existing admin first or choose a different username |
| `404` "Admin not found" | Invalid adminId or non-admin user | Verify the admin ID exists using the list endpoint |
| `400` "Invalid adminId format" | adminId is not a valid MongoDB ObjectId | Provide a valid 24-character hex ObjectId |
| `400` "username is required" | Missing required field on creation | Ensure username, password, and role are provided |
| `400` "At least one field must be provided" | Empty update request | Include at least `status` or `permissions` in PATCH body |
| `422` "Password must..." | Password does not meet strength requirements | Use a password with uppercase, lowercase, number, and special character |
| `422` "Cannot modify super-admin permissions" | Attempted to change super-admin permissions | Super-admin permissions are fixed and cannot be altered |
| `422` "Cannot delete the last super-admin" | Attempted to delete the only super-admin | Ensure at least one super-admin account remains |
| `422` "serviceFee must be a number between 0 and 100" | Invalid settings value | Provide valid numeric values within allowed ranges |

---

## Related Documentation

- API Reference: `/docs/api/public-api-reference.md`
- Authentication Guide: `/docs/api/authentication.md`
- Error Codes: `/docs/api/error-codes.md`
- SOP-MANUAL-ADMIN-006: Manual Admin User Management (Admin Panel)
- SOP-AGENTIC-011: Agentic API Audit Logs

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
