# SOP: Agentic API Audit Log Review

**Document ID:** SOP-AGENTIC-011
**Version:** 1.0
**Effective Date:** March 7, 2026
**Department:** Technical Integration / Compliance
**Applies To:** AI Agents, Security Monitoring Systems, Compliance Tools

---

## Purpose

This Standard Operating Procedure (SOP) provides technical specifications and step-by-step API integration instructions for agentic systems to programmatically query, filter, and analyze audit log records and retrieve audit log statistics using the Wawa Garden Bar Public REST API.

This document is the API counterpart to SOP-MANUAL-ADMIN-007 (Manual Audit Log Review).

---

## Scope

This SOP covers:
- API authentication and authorization for audit log endpoints
- Listing and searching audit logs with filters
- Retrieving aggregated audit log statistics
- Common monitoring workflows (failed logins, settings changes, admin activity)
- Complete reference of all auditable actions

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

- `audit:read` - Query audit logs and view statistics

> **Role-Based Keys:** Select the **Admin** role when creating an API key (Admin Dashboard > Settings > API Keys) to automatically include the `audit:read` scope. **Super-Admin** also includes it. Alternatively, use **Custom** to select individual scopes.

---

## AuditAction Reference

The `action` filter parameter accepts any of the following values. Use these exact strings when filtering audit logs by action type.

### User Actions

| Action | Description |
|--------|-------------|
| `user.create` | New user account created |
| `user.update` | User profile updated |
| `user.delete` | User account deleted |
| `user.delete_request` | User deletion requested |
| `user.role-change` | User role changed |
| `user.password-reset` | User password reset initiated |
| `user.password-change` | User password changed |
| `user.status-change` | User account status changed |

### Menu Actions

| Action | Description |
|--------|-------------|
| `menu.create` | Menu item created |
| `menu.update` | Menu item updated |
| `menu.delete` | Menu item deleted |

### Order Actions

| Action | Description |
|--------|-------------|
| `order.update` | Order updated |
| `order.cancel` | Order cancelled |
| `order.manual_payment` | Manual payment recorded for order |
| `order.price_override` | Order price overridden |

### Tab Actions

| Action | Description |
|--------|-------------|
| `tab.manual_payment` | Manual payment recorded for tab |
| `tab.delete` | Tab deleted |

### Inventory Actions

| Action | Description |
|--------|-------------|
| `inventory.update` | Inventory updated |
| `inventory.snapshot_submitted` | Inventory snapshot submitted |
| `inventory.snapshot_edited` | Inventory snapshot edited |
| `inventory.snapshot_approved` | Inventory snapshot approved |
| `inventory.snapshot_rejected` | Inventory snapshot rejected |
| `inventory.stock_transferred` | Stock transferred between locations |
| `inventory.batch_transfer` | Batch stock transfer performed |
| `inventory.location_tracking_enabled` | Location tracking enabled |
| `inventory.stock_added_to_location` | Stock added to location |
| `inventory.stock_deducted_from_location` | Stock deducted from location |

### Reward Actions

| Action | Description |
|--------|-------------|
| `reward.create` | Reward created |
| `reward.update` | Reward updated |
| `reward.delete` | Reward deleted |

### Settings Actions

| Action | Description |
|--------|-------------|
| `settings.update` | System settings updated |
| `settings.inventory_locations_updated` | Inventory locations configuration updated |

### Admin Actions

| Action | Description |
|--------|-------------|
| `admin.create` | Admin account created |
| `admin.login` | Admin logged in |
| `admin.logout` | Admin logged out |
| `admin.login-failed` | Admin login attempt failed |
| `admin.account-locked` | Admin account locked |
| `admin.permissions-updated` | Admin permissions updated |

### Expense Actions

| Action | Description |
|--------|-------------|
| `expense.create` | Expense created |
| `expense.update` | Expense updated |
| `expense.delete` | Expense deleted |
| `expense.uploaded_expense_updated` | Uploaded expense updated |
| `expense.uploaded_expense_approved` | Uploaded expense approved |
| `expense.uploaded_expense_rejected` | Uploaded expense rejected |
| `expense.uploaded_expense_deleted` | Uploaded expense deleted |
| `expense.uploaded_expenses_bulk_deleted` | Uploaded expenses bulk deleted |

---

## Procedure

### Part 1: Listing and Searching Audit Logs

List and search audit logs with filtering and pagination.

**Endpoint:** `GET /api/public/audit-logs`
**Scope Required:** `audit:read`

#### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `userId` | string | No | Filter by user MongoDB ObjectId | `"665a1b2c3d4e5f6a7b8c9d0e"` |
| `action` | string | No | Filter by action type (see AuditAction Reference) | `"admin.login-failed"` |
| `resource` | string | No | Filter by resource type | `"admin"`, `"menu"`, `"order"` |
| `startDate` | string | No | ISO 8601 inclusive start date | `"2026-03-01"` |
| `endDate` | string | No | ISO 8601 inclusive end date | `"2026-03-07"` |
| `page` | number | No | Page number, 1-indexed (default: 1) | `1` |
| `limit` | number | No | Items per page (default: 50, max: 100) | `25` |

#### curl Example

```bash
# List recent audit logs (default: page 1, 50 per page)
curl -X GET "https://api.wawagardenbar.com/api/public/audit-logs" \
  -H "x-api-key: wawa_your_api_key_here"

# Filter by action and date range
curl -X GET "https://api.wawagardenbar.com/api/public/audit-logs?action=admin.login-failed&startDate=2026-03-01&endDate=2026-03-07&limit=25" \
  -H "x-api-key: wawa_your_api_key_here"

# Filter by user ID
curl -X GET "https://api.wawagardenbar.com/api/public/audit-logs?userId=665a1b2c3d4e5f6a7b8c9d0e&limit=20" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### JavaScript Example

```javascript
async function getAuditLogs({ userId, action, resource, startDate, endDate, page, limit } = {}) {
  const url = new URL('https://api.wawagardenbar.com/api/public/audit-logs');

  if (userId) url.searchParams.append('userId', userId);
  if (action) url.searchParams.append('action', action);
  if (resource) url.searchParams.append('resource', resource);
  if (startDate) url.searchParams.append('startDate', startDate);
  if (endDate) url.searchParams.append('endDate', endDate);
  if (page) url.searchParams.append('page', page.toString());
  if (limit) url.searchParams.append('limit', limit.toString());

  const response = await fetch(url, {
    headers: { 'x-api-key': process.env.WAWA_API_KEY }
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch audit logs');
  }

  return result;
}

// Fetch failed login attempts from the past week
const logs = await getAuditLogs({
  action: 'admin.login-failed',
  startDate: '2026-03-01',
  endDate: '2026-03-07',
  limit: 50
});
console.log(`Found ${logs.meta.total} failed login attempts`);
logs.data.forEach(log => {
  console.log(`  ${log.userEmail} at ${log.createdAt} from ${log.ipAddress}`);
});
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "_id": "665c3d4e5f6a7b8c9d0e1f2a",
      "userId": "665a1b2c3d4e5f6a7b8c9d0e",
      "userEmail": "admin@wawagardenbar.com",
      "userRole": "super-admin",
      "action": "settings.update",
      "resource": "settings",
      "resourceId": "global",
      "details": {
        "field": "operatingHours",
        "oldValue": "09:00-22:00",
        "newValue": "09:00-23:00"
      },
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0 ...",
      "createdAt": "2026-03-07T14:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 142,
    "timestamp": "2026-03-07T15:00:00Z"
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Audit log entry database ID |
| `userId` | string | MongoDB ObjectId of the user who performed the action |
| `userEmail` | string | Email address of the user who performed the action |
| `userRole` | string | Role of the user at the time of the action |
| `action` | string | The action performed (see AuditAction Reference) |
| `resource` | string | The resource type that was acted upon |
| `resourceId` | string | The specific resource ID (optional, may be absent) |
| `details` | object | Additional context about the action (optional, may be absent) |
| `ipAddress` | string | IP address of the request (optional, may be absent) |
| `userAgent` | string | User-Agent header of the request (optional, may be absent) |
| `createdAt` | string | ISO 8601 timestamp of when the action occurred |

---

### Part 2: Getting Audit Log Statistics

Retrieve aggregated audit log statistics including totals, breakdowns by action, resource, and top users.

**Endpoint:** `GET /api/public/audit-logs/summary`
**Scope Required:** `audit:read`

#### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `startDate` | string | No | ISO 8601 inclusive start date | `"2026-03-01"` |
| `endDate` | string | No | ISO 8601 inclusive end date | `"2026-03-07"` |

#### curl Example

```bash
# Get all-time statistics
curl -X GET "https://api.wawagardenbar.com/api/public/audit-logs/summary" \
  -H "x-api-key: wawa_your_api_key_here"

# Get statistics for a specific date range
curl -X GET "https://api.wawagardenbar.com/api/public/audit-logs/summary?startDate=2026-03-01&endDate=2026-03-07" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### JavaScript Example

```javascript
async function getAuditLogStatistics({ startDate, endDate } = {}) {
  const url = new URL('https://api.wawagardenbar.com/api/public/audit-logs/summary');

  if (startDate) url.searchParams.append('startDate', startDate);
  if (endDate) url.searchParams.append('endDate', endDate);

  const response = await fetch(url, {
    headers: { 'x-api-key': process.env.WAWA_API_KEY }
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch audit log statistics');
  }

  return result.data;
}

// Get statistics for the past week
const stats = await getAuditLogStatistics({
  startDate: '2026-03-01',
  endDate: '2026-03-07'
});
console.log(`Total log entries: ${stats.totalLogs}`);

console.log('Actions breakdown:');
Object.entries(stats.logsByAction).forEach(([action, count]) => {
  console.log(`  ${action}: ${count}`);
});

console.log('Resources breakdown:');
Object.entries(stats.logsByResource).forEach(([resource, count]) => {
  console.log(`  ${resource}: ${count}`);
});

console.log('Top 10 users by activity:');
stats.logsByUser.forEach(user => {
  console.log(`  ${user.userEmail}: ${user.count} actions`);
});
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "totalLogs": 1542,
    "logsByAction": {
      "admin.login": 320,
      "admin.logout": 285,
      "admin.login-failed": 18,
      "order.update": 450,
      "menu.update": 95,
      "settings.update": 12,
      "user.create": 45,
      "inventory.update": 210,
      "expense.create": 107
    },
    "logsByResource": {
      "admin": 623,
      "order": 450,
      "menu": 95,
      "settings": 12,
      "user": 45,
      "inventory": 210,
      "expense": 107
    },
    "logsByUser": [
      {
        "userId": "665a1b2c3d4e5f6a7b8c9d0e",
        "userEmail": "admin@wawagardenbar.com",
        "count": 520
      },
      {
        "userId": "665b2c3d4e5f6a7b8c9d0f1a",
        "userEmail": "manager@wawagardenbar.com",
        "count": 380
      }
    ]
  },
  "meta": {
    "timestamp": "2026-03-07T15:00:00Z"
  }
}
```

**Summary Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `totalLogs` | number | Total number of audit log entries matching the filter |
| `logsByAction` | object | Counts keyed by action type (e.g., `"admin.login": 320`) |
| `logsByResource` | object | Counts keyed by resource type (e.g., `"order": 450`) |
| `logsByUser` | array | Top 10 users by log count, each with `userId`, `userEmail`, and `count` |

---

### Part 3: Common Monitoring Workflows

#### Workflow 1: Detecting Failed Login Attempts

Monitor for brute-force attacks or unauthorized access attempts by querying for failed login events.

```javascript
async function detectFailedLogins(thresholdCount = 5, hoursBack = 24) {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - hoursBack);

  // Step 1: Get all failed login attempts in the time window
  const logs = await getAuditLogs({
    action: 'admin.login-failed',
    startDate: startDate.toISOString(),
    endDate: new Date().toISOString(),
    limit: 100
  });

  // Step 2: Group by user email to find repeat offenders
  const failuresByUser = {};
  logs.data.forEach(log => {
    if (!failuresByUser[log.userEmail]) {
      failuresByUser[log.userEmail] = [];
    }
    failuresByUser[log.userEmail].push({
      timestamp: log.createdAt,
      ipAddress: log.ipAddress
    });
  });

  // Step 3: Alert on users exceeding the threshold
  const alerts = [];
  Object.entries(failuresByUser).forEach(([email, failures]) => {
    if (failures.length >= thresholdCount) {
      alerts.push({
        userEmail: email,
        failureCount: failures.length,
        timestamps: failures.map(f => f.timestamp),
        ipAddresses: [...new Set(failures.map(f => f.ipAddress))]
      });
    }
  });

  // Step 4: Check for account lockouts
  const lockouts = await getAuditLogs({
    action: 'admin.account-locked',
    startDate: startDate.toISOString(),
    endDate: new Date().toISOString()
  });

  return {
    totalFailedAttempts: logs.meta.total,
    alerts,
    accountsLocked: lockouts.data.map(l => l.userEmail)
  };
}

const securityReport = await detectFailedLogins(5, 24);
if (securityReport.alerts.length > 0) {
  console.log('SECURITY ALERT: Excessive failed login attempts detected');
  securityReport.alerts.forEach(alert => {
    console.log(`  ${alert.userEmail}: ${alert.failureCount} failures from IPs: ${alert.ipAddresses.join(', ')}`);
  });
}
```

#### Workflow 2: Tracking Settings Changes

Monitor for configuration changes that could affect system behavior.

```javascript
async function trackSettingsChanges(daysBack = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const logs = await getAuditLogs({
    action: 'settings.update',
    startDate: startDate.toISOString(),
    endDate: new Date().toISOString(),
    limit: 100
  });

  console.log(`Settings changes in the last ${daysBack} days: ${logs.meta.total}`);
  logs.data.forEach(log => {
    console.log(`  [${log.createdAt}] ${log.userEmail} changed ${log.resource}`);
    if (log.details) {
      console.log(`    Field: ${log.details.field || 'N/A'}`);
      console.log(`    Old value: ${JSON.stringify(log.details.oldValue)}`);
      console.log(`    New value: ${JSON.stringify(log.details.newValue)}`);
    }
  });

  return logs.data;
}
```

#### Workflow 3: Monitoring Admin Activity

Generate an activity report for a specific admin user over a given period.

```javascript
async function monitorAdminActivity(userId, daysBack = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  // Step 1: Get all logs for this user
  const logs = await getAuditLogs({
    userId,
    startDate: startDate.toISOString(),
    endDate: new Date().toISOString(),
    limit: 100
  });

  // Step 2: Get overall statistics for context
  const stats = await getAuditLogStatistics({
    startDate: startDate.toISOString(),
    endDate: new Date().toISOString()
  });

  // Step 3: Categorize the user's actions
  const actionCounts = {};
  logs.data.forEach(log => {
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
  });

  const report = {
    userId,
    userEmail: logs.data.length > 0 ? logs.data[0].userEmail : 'Unknown',
    period: `${daysBack} days`,
    totalActions: logs.meta.total,
    actionBreakdown: actionCounts,
    systemTotalActions: stats.totalLogs,
    activityPercentage: ((logs.meta.total / stats.totalLogs) * 100).toFixed(1)
  };

  console.log(`Admin Activity Report for ${report.userEmail}`);
  console.log(`  Total actions: ${report.totalActions} (${report.activityPercentage}% of system total)`);
  Object.entries(report.actionBreakdown).forEach(([action, count]) => {
    console.log(`  ${action}: ${count}`);
  });

  return report;
}
```

---

## Complete Workflow Example

### Scenario: Daily Security Audit Report

This workflow demonstrates a complete daily audit: checking for suspicious login activity, reviewing settings changes, and generating a summary report.

```javascript
const API_BASE = 'https://api.wawagardenbar.com';
const headers = {
  'x-api-key': process.env.WAWA_API_KEY,
  'Content-Type': 'application/json'
};

// -- Helper: Get audit logs ------------------------------------------------
async function getAuditLogs(filters = {}) {
  const url = new URL(`${API_BASE}/api/public/audit-logs`);

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value.toString());
    }
  });

  const response = await fetch(url, { headers });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result;
}

// -- Helper: Get statistics ------------------------------------------------
async function getAuditLogStatistics(filters = {}) {
  const url = new URL(`${API_BASE}/api/public/audit-logs/summary`);

  if (filters.startDate) url.searchParams.append('startDate', filters.startDate);
  if (filters.endDate) url.searchParams.append('endDate', filters.endDate);

  const response = await fetch(url, { headers });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Daily Security Audit --------------------------------------------------
async function runDailySecurityAudit() {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const startDate = yesterday.toISOString();
  const endDate = now.toISOString();

  try {
    // Step 1: Get overall statistics for the past 24 hours
    const stats = await getAuditLogStatistics({ startDate, endDate });
    console.log(`=== Daily Audit Report (${startDate} to ${endDate}) ===`);
    console.log(`Total events: ${stats.totalLogs}`);

    // Step 2: Check for failed logins
    const failedLogins = await getAuditLogs({
      action: 'admin.login-failed',
      startDate,
      endDate,
      limit: 100
    });
    console.log(`Failed login attempts: ${failedLogins.meta.total}`);

    // Step 3: Check for account lockouts
    const lockouts = await getAuditLogs({
      action: 'admin.account-locked',
      startDate,
      endDate
    });
    console.log(`Account lockouts: ${lockouts.meta.total}`);

    // Step 4: Check for settings changes
    const settingsChanges = await getAuditLogs({
      action: 'settings.update',
      startDate,
      endDate
    });
    console.log(`Settings changes: ${settingsChanges.meta.total}`);
    settingsChanges.data.forEach(log => {
      console.log(`  ${log.userEmail}: ${JSON.stringify(log.details)}`);
    });

    // Step 5: Check for permission changes
    const permChanges = await getAuditLogs({
      action: 'admin.permissions-updated',
      startDate,
      endDate
    });
    console.log(`Permission changes: ${permChanges.meta.total}`);

    // Step 6: Identify most active users
    console.log('Most active users:');
    stats.logsByUser.forEach(user => {
      console.log(`  ${user.userEmail}: ${user.count} actions`);
    });

    return {
      period: { startDate, endDate },
      totalEvents: stats.totalLogs,
      failedLogins: failedLogins.meta.total,
      accountLockouts: lockouts.meta.total,
      settingsChanges: settingsChanges.meta.total,
      permissionChanges: permChanges.meta.total,
      topUsers: stats.logsByUser,
      actionBreakdown: stats.logsByAction,
      resourceBreakdown: stats.logsByResource
    };

  } catch (error) {
    console.error('Error running daily security audit:', error.message);
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

### Handle Pagination for Large Result Sets

```javascript
async function getAllAuditLogs(filters = {}) {
  const allLogs = [];
  let page = 1;
  const limit = 100;
  let totalPages = 1;

  while (page <= totalPages) {
    const result = await getAuditLogs({ ...filters, page, limit });
    allLogs.push(...result.data);

    totalPages = Math.ceil(result.meta.total / limit);
    page++;

    // Rate limiting: brief pause between pages
    if (page <= totalPages) {
      await sleep(200);
    }
  }

  return allLogs;
}
```

---

## Quick Reference

### List Audit Logs

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/audit-logs?action=admin.login-failed&startDate=2026-03-01&limit=25" \
  -H "x-api-key: wawa_your_api_key_here"
```

### Filter by User

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/audit-logs?userId=665a1b2c3d4e5f6a7b8c9d0e" \
  -H "x-api-key: wawa_your_api_key_here"
```

### Filter by Resource

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/audit-logs?resource=settings&startDate=2026-03-01" \
  -H "x-api-key: wawa_your_api_key_here"
```

### Get Statistics

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/audit-logs/summary?startDate=2026-03-01&endDate=2026-03-07" \
  -H "x-api-key: wawa_your_api_key_here"
```

---

## API Endpoints Summary

| Endpoint | Method | Purpose | Required Scopes |
|----------|--------|---------|-----------------|
| `/api/public/audit-logs` | GET | List and search audit logs with filters | `audit:read` |
| `/api/public/audit-logs/summary` | GET | Get aggregated audit log statistics | `audit:read` |

---

## Troubleshooting

### Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid API key | Verify API key is correct and active |
| `403 Forbidden` | Insufficient scopes | Request API key with `audit:read` scope (Admin or Super-Admin role) |
| `429 Too Many Requests` | Rate limit exceeded | Implement rate limiting and retry logic |
| `500 Internal Server Error` | Server-side failure | Retry with exponential backoff; contact support if persistent |
| Empty `data` array | No logs match filters | Verify filter values; check date range; confirm actions have occurred |
| Invalid `action` filter | Unrecognized action string | Use exact values from the AuditAction Reference table |
| Invalid `userId` format | Malformed MongoDB ObjectId | Ensure userId is a valid 24-character hex string |

---

## Related Documentation

- API Reference: `/docs/api/public-api-reference.md`
- Authentication Guide: `/docs/api/authentication.md`
- Error Codes: `/docs/api/error-codes.md`
- SOP-MANUAL-ADMIN-007: Manual Audit Log Review (Admin Panel)
- SOP-AGENTIC-010: Admin User Management

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
