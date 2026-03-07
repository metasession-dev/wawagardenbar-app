# SOP: Agentic API Rewards and Loyalty Management

**Document ID:** SOP-API-007
**Version:** 1.0
**Effective Date:** March 7, 2026
**Department:** Technical Integration
**Applies To:** AI Agents, Loyalty Platforms, Chatbot Integrations, CRM Systems

---

## Purpose

This Standard Operating Procedure (SOP) provides technical specifications and step-by-step API integration instructions for agentic systems to programmatically query customer rewards, validate reward codes, and redeem rewards against orders using the Wawa Garden Bar Public REST API.

This document is the API counterpart to SOP-ADMIN-005 (Rewards & Loyalty).

---

## Scope

This SOP covers:
- API authentication and authorization for rewards endpoints
- Retrieving global rewards statistics
- Querying a customer's earned rewards and loyalty points
- Validating reward codes before checkout
- Redeeming rewards against orders
- Points system and conversion rates
- Error handling and best practices

---

## Prerequisites

- Valid API key with `rewards:read` scope
- HTTPS-capable client
- JSON request/response handling capability
- Error handling and retry logic implementation
- Understanding of the Wawa Garden Bar points system

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

- `rewards:read` - Query rewards, validate codes, and redeem rewards

> **Role-Based Keys:** Select the **Customer** role when creating an API key (Admin Dashboard > Settings > API Keys) to automatically include the required `rewards:read` scope. Alternatively, use **Custom** to select individual scopes.

---

## Points System

The Wawa Garden Bar loyalty program uses a points-based system with the following conversion rate:

**100 points = 1 NGN (Nigerian Naira)**

| Points | Value (NGN) |
|--------|-------------|
| 100 | 1 |
| 1,000 | 10 |
| 10,000 | 100 |
| 100,000 | 1,000 |

Points are earned through purchases and can be accumulated over time. Rewards are issued based on loyalty rules configured by administrators and can include discounts, free items, or point bonuses.

---

## Procedure

### Part 1: Getting Global Rewards Stats

Retrieve system-wide rewards statistics without specifying a user. This is useful for dashboards and analytics.

**Endpoint:** `GET /api/public/rewards`
**Scope Required:** `rewards:read`

#### curl Example

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/rewards" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### JavaScript Example

```javascript
async function getGlobalRewardsStats() {
  const response = await fetch('https://api.wawagardenbar.com/api/public/rewards', {
    headers: { 'x-api-key': process.env.WAWA_API_KEY }
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch global rewards stats');
  }

  return result.data;
}

const stats = await getGlobalRewardsStats();
console.log(`Active rules: ${stats.totalRulesActive}`);
console.log(`Rewards issued: ${stats.totalRewardsIssued}`);
console.log(`Redemption rate: ${stats.redemptionRate}%`);
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "totalRulesActive": 5,
    "totalRewardsIssued": 1240,
    "totalRewardsRedeemed": 876,
    "redemptionRate": 70.6,
    "totalValueRedeemed": 435000
  },
  "meta": {
    "timestamp": "2026-03-07T10:00:00Z"
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `totalRulesActive` | number | Number of active reward rules in the system |
| `totalRewardsIssued` | number | Total rewards issued to all customers |
| `totalRewardsRedeemed` | number | Total rewards that have been redeemed |
| `redemptionRate` | number | Percentage of issued rewards that were redeemed |
| `totalValueRedeemed` | number | Total value of redeemed rewards in NGN |

---

### Part 2: Getting a Customer's Rewards

Retrieve a specific customer's rewards, loyalty points, and reward statistics by providing the `userId` query parameter.

**Endpoint:** `GET /api/public/rewards?userId={userId}`
**Scope Required:** `rewards:read`

#### curl Example

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/rewards?userId=665a1b2c3d4e5f6a7b8c9d0e" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### JavaScript Example

```javascript
async function getCustomerRewards(userId) {
  const url = new URL('https://api.wawagardenbar.com/api/public/rewards');
  url.searchParams.append('userId', userId);

  const response = await fetch(url, {
    headers: { 'x-api-key': process.env.WAWA_API_KEY }
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch customer rewards');
  }

  return result.data;
}

const customerRewards = await getCustomerRewards('665a1b2c3d4e5f6a7b8c9d0e');
console.log(`Loyalty points: ${customerRewards.stats.loyaltyPoints}`);
console.log(`Active rewards: ${customerRewards.stats.activeRewards}`);
console.log(`Total savings: ${customerRewards.stats.totalSavings}`);
```

#### Response (200 OK)

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
        "expiresAt": "2026-04-07T00:00:00Z",
        "createdAt": "2026-03-01T12:00:00Z"
      },
      {
        "_id": "reward_def456",
        "code": "FREESTAR-2026",
        "rewardType": "free_item",
        "rewardValue": 800,
        "status": "redeemed",
        "redeemedAt": "2026-03-05T14:30:00Z",
        "expiresAt": "2026-03-31T00:00:00Z",
        "createdAt": "2026-02-15T09:00:00Z"
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
  "meta": {
    "timestamp": "2026-03-07T10:00:00Z"
  }
}
```

**Stats Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `totalEarned` | number | Total rewards earned by this customer |
| `totalRedeemed` | number | Total rewards redeemed by this customer |
| `activeRewards` | number | Number of currently active (unredeemed) rewards |
| `totalSavings` | number | Total value saved through redeemed rewards in NGN |
| `loyaltyPoints` | number | Current loyalty points balance (100 points = 1 NGN) |

**Reward Object Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Reward database ID (used for redemption) |
| `code` | string | Human-readable reward code |
| `rewardType` | string | Type of reward (e.g., `"discount"`, `"free_item"`, `"points_bonus"`) |
| `rewardValue` | number | Value of the reward in NGN |
| `status` | string | Current status (`"active"`, `"redeemed"`, `"expired"`) |
| `expiresAt` | string | ISO 8601 expiration date |
| `createdAt` | string | ISO 8601 creation date |

---

### Part 3: Validating a Reward Code

Before applying a reward at checkout, validate that the code is legitimate and available for the customer.

**Endpoint:** `POST /api/public/rewards/validate`
**Scope Required:** `rewards:read`

#### curl Example

```bash
curl -X POST "https://api.wawagardenbar.com/api/public/rewards/validate" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "665a1b2c3d4e5f6a7b8c9d0e",
    "code": "LOYALTY-500OFF"
  }'
```

#### JavaScript Example

```javascript
async function validateRewardCode(userId, code) {
  const response = await fetch('https://api.wawagardenbar.com/api/public/rewards/validate', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.WAWA_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ userId, code })
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Validation request failed');
  }

  return result.data;
}

const validation = await validateRewardCode('665a1b2c3d4e5f6a7b8c9d0e', 'LOYALTY-500OFF');
if (validation.valid) {
  console.log(`Reward is valid: ${validation.reward.rewardType} worth ${validation.reward.rewardValue}`);
} else {
  console.log(`Reward invalid: ${validation.message}`);
}
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | string | Yes | Customer's database ID |
| `code` | string | Yes | Reward code to validate |

#### Success Response (200 OK) -- Valid Code

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
      "expiresAt": "2026-04-07T00:00:00Z"
    }
  },
  "meta": {
    "timestamp": "2026-03-07T10:05:00Z"
  }
}
```

#### Success Response (200 OK) -- Invalid Code

```json
{
  "success": true,
  "data": {
    "valid": false,
    "message": "Reward code has expired"
  },
  "meta": {
    "timestamp": "2026-03-07T10:05:00Z"
  }
}
```

**Possible `message` values when `valid` is `false`:**

| Message | Meaning |
|---------|---------|
| `"Reward code not found"` | The code does not exist in the system |
| `"Reward code has expired"` | The code has passed its expiration date |
| `"Reward has already been redeemed"` | The reward was already used |
| `"Reward does not belong to this user"` | The code is assigned to a different customer |

---

### Part 4: Redeeming a Reward at Checkout

After validating a reward, apply it to an order by redeeming it. This marks the reward as used and applies the discount or benefit.

**Endpoint:** `POST /api/public/rewards/redeem`
**Scope Required:** `rewards:read`

#### curl Example

```bash
curl -X POST "https://api.wawagardenbar.com/api/public/rewards/redeem" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "rewardId": "reward_abc123",
    "orderId": "67890abcdef"
  }'
```

#### JavaScript Example

```javascript
async function redeemReward(rewardId, orderId) {
  const response = await fetch('https://api.wawagardenbar.com/api/public/rewards/redeem', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.WAWA_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ rewardId, orderId })
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Redemption failed');
  }

  return result.data;
}

try {
  const redemption = await redeemReward('reward_abc123', '67890abcdef');
  console.log('Reward redeemed successfully');
} catch (error) {
  console.error('Redemption error:', error.message);
}
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rewardId` | string | Yes | Reward database ID (from validation or customer rewards list) |
| `orderId` | string | Yes | Order database ID to apply the reward against |

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "success": true
  },
  "meta": {
    "timestamp": "2026-03-07T10:10:00Z"
  }
}
```

#### Error Response (422 Unprocessable Entity)

```json
{
  "success": false,
  "error": "Reward is not in active status"
}
```

**Possible 422 Errors:**

| Error Message | Cause |
|---------------|-------|
| `"Reward is not in active status"` | Reward has already been redeemed or is otherwise inactive |
| `"Reward has expired"` | Reward passed its expiration date |
| `"Reward has already been redeemed"` | Reward was already applied to another order |

---

## Complete Workflow Example

### Scenario: AI Agent Applies a Reward at Checkout

This workflow demonstrates the full end-to-end flow: checking a customer's rewards, validating a reward code, and redeeming it against an order.

```javascript
const API_BASE = 'https://api.wawagardenbar.com';
const headers = {
  'x-api-key': process.env.WAWA_API_KEY,
  'Content-Type': 'application/json'
};

// -- Helper: Get customer rewards ------------------------------------
async function getCustomerRewards(userId) {
  const url = new URL(`${API_BASE}/api/public/rewards`);
  url.searchParams.append('userId', userId);

  const response = await fetch(url, { headers });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Helper: Validate a reward code ----------------------------------
async function validateRewardCode(userId, code) {
  const response = await fetch(`${API_BASE}/api/public/rewards/validate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId, code })
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Helper: Redeem a reward -----------------------------------------
async function redeemReward(rewardId, orderId) {
  const response = await fetch(`${API_BASE}/api/public/rewards/redeem`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ rewardId, orderId })
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Step 1: Check customer's available rewards ----------------------
async function checkAndApplyReward(userId, rewardCode, orderId) {
  // 1a. Retrieve customer rewards and loyalty points
  const customerData = await getCustomerRewards(userId);
  console.log(`Customer has ${customerData.stats.loyaltyPoints} loyalty points`);
  console.log(`Active rewards: ${customerData.stats.activeRewards}`);

  // 1b. List active rewards
  const activeRewards = customerData.rewards.filter(r => r.status === 'active');
  if (activeRewards.length === 0) {
    console.log('No active rewards available');
    return null;
  }

  console.log('Available rewards:');
  activeRewards.forEach(r => {
    console.log(`  - ${r.code}: ${r.rewardType} worth ${r.rewardValue} (expires ${r.expiresAt})`);
  });

  // 2. Validate the provided reward code
  const validation = await validateRewardCode(userId, rewardCode);
  if (!validation.valid) {
    console.log(`Reward code "${rewardCode}" is not valid: ${validation.message}`);
    return null;
  }

  console.log(`Reward "${rewardCode}" validated: ${validation.reward.rewardType} worth ${validation.reward.rewardValue}`);

  // 3. Redeem the reward against the order
  const redemption = await redeemReward(validation.reward._id, orderId);
  console.log('Reward redeemed successfully');

  return {
    rewardCode,
    rewardType: validation.reward.rewardType,
    rewardValue: validation.reward.rewardValue,
    orderId
  };
}

// -- Run the complete workflow ---------------------------------------
async function processRewardAtCheckout() {
  try {
    const result = await checkAndApplyReward(
      '665a1b2c3d4e5f6a7b8c9d0e',  // userId
      'LOYALTY-500OFF',              // reward code
      '67890abcdef'                  // orderId
    );

    if (result) {
      console.log(`Applied ${result.rewardType} of ${result.rewardValue} to order ${result.orderId}`);
    }

    return result;
  } catch (error) {
    console.error('Error processing reward:', error.message);
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
      if (response.status === 400 || response.status === 404 || response.status === 422) {
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
function validateRewardRedemptionPayload(payload) {
  const errors = [];

  if (!payload.rewardId) errors.push('rewardId is required');
  if (!payload.orderId) errors.push('orderId is required');

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  return true;
}

function validateRewardCodePayload(payload) {
  const errors = [];

  if (!payload.userId) errors.push('userId is required');
  if (!payload.code) errors.push('code is required');

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  return true;
}
```

---

## Quick Reference

### Get Global Rewards Stats

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/rewards" \
  -H "x-api-key: wawa_your_api_key_here"
```

### Get Customer Rewards

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/rewards?userId=665a1b2c3d4e5f6a7b8c9d0e" \
  -H "x-api-key: wawa_your_api_key_here"
```

### Validate Reward Code

```json
POST /api/public/rewards/validate
{
  "userId": "665a1b2c3d4e5f6a7b8c9d0e",
  "code": "LOYALTY-500OFF"
}
```

### Redeem Reward

```json
POST /api/public/rewards/redeem
{
  "rewardId": "reward_abc123",
  "orderId": "67890abcdef"
}
```

---

## API Endpoints Summary

| Endpoint | Method | Purpose | Required Scopes |
|----------|--------|---------|-----------------|
| `/api/public/rewards` | GET | Get global rewards stats (no userId) or customer rewards (with userId) | `rewards:read` |
| `/api/public/rewards/validate` | POST | Validate a reward code for a customer | `rewards:read` |
| `/api/public/rewards/redeem` | POST | Redeem a reward against an order | `rewards:read` |

---

## Troubleshooting

### Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid API key | Verify API key is correct and active |
| `403 Forbidden` | Insufficient scopes | Request API key with `rewards:read` scope |
| `429 Too Many Requests` | Rate limit exceeded | Implement rate limiting and retry logic |
| `422` "Reward is not in active status" | Reward already redeemed or inactive | Check reward status before attempting redemption |
| `422` "Reward has expired" | Reward past expiration date | Validate the reward code first to check expiry |
| `422` "Reward has already been redeemed" | Duplicate redemption attempt | Use validate endpoint to confirm status before redeeming |
| `200` with `valid: false` | Code not found, expired, or wrong user | Check the `message` field for the specific reason |
| `400` Missing required fields | `userId` or `code` not provided | Ensure all required fields are included in the request body |

---

## Related Documentation

- API Reference: `/docs/api/public-api-reference.md`
- Authentication Guide: `/docs/api/authentication.md`
- Error Codes: `/docs/api/error-codes.md`
- SOP-ADMIN-005: Rewards & Loyalty (Admin Panel)
- SOP-API-001: Agentic API Tab and Order Management

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
