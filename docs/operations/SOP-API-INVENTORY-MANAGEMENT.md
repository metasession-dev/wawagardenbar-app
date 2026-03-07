# SOP: Agentic API Inventory Management

**Document ID:** SOP-API-006
**Version:** 1.0
**Effective Date:** March 7, 2026
**Department:** Technical Integration
**Applies To:** AI Agents, Inventory Systems, Supply Chain Integrations, Automated Restocking

---

## Purpose

This Standard Operating Procedure (SOP) provides technical specifications and step-by-step API integration instructions for agentic systems to programmatically monitor inventory levels, adjust stock quantities, receive deliveries, record waste, and respond to low-stock alerts using the Wawa Garden Bar Public REST API.

---

## Scope

This SOP covers:
- API authentication and authorization for inventory operations
- Listing inventory items with stock levels and status filters
- Retrieving AI-optimized inventory summaries and analytics
- Checking individual item details including waste stats and profit margins
- Adding stock (receiving deliveries) with full audit trail
- Recording deductions (sales, waste, damage, adjustments)
- Monitoring low-stock and out-of-stock alerts for automated restocking

---

## Prerequisites

- Valid API key with required scopes (`inventory:read`, `inventory:write`)
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

- `inventory:read` - View inventory items, summaries, analytics, and alerts
- `inventory:write` - Adjust stock levels (additions and deductions)

> **Role-Based Keys:** Select the **Super Admin** role when creating an API key (Admin Dashboard > Settings > API Keys) to automatically include all required scopes (`inventory:read`, `inventory:write`). For read-only inventory access, select **Admin** (includes `inventory:read` but not `inventory:write`). Alternatively, use **Custom** to select individual scopes.

---

## Procedure

### Part 1: Viewing Inventory Status

List inventory items with stock levels. Use the `status` filter to focus on items that need attention.

**Endpoint:** `GET /api/public/inventory`
**Base URL:** `https://api.wawagardenbar.com`
**Scope Required:** `inventory:read`

#### List All Inventory Items

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/inventory" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### Filter by Stock Status

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/inventory?status=low-stock&page=1&limit=25" \
  -H "x-api-key: wawa_your_api_key_here"
```

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `status` | string | Filter by stock status | `"in-stock"`, `"low-stock"`, `"out-of-stock"` |
| `page` | number | Page number (default: 1) | `1` |
| `limit` | number | Items per page (default: 25, max: 100) | `25` |

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "_id": "inv_abc123",
      "menuItemId": {
        "_id": "665a1b2c3d4e5f6a7b8c9d0e",
        "name": "Star Lager Beer",
        "price": 800
      },
      "currentStock": 12,
      "minimumStock": 20,
      "maximumStock": 100,
      "unit": "bottles",
      "status": "low-stock",
      "costPerUnit": 450,
      "supplier": "Nigerian Breweries PLC",
      "trackByLocation": true,
      "locations": [
        { "name": "Main Bar", "stock": 8 },
        { "name": "Outdoor Bar", "stock": 4 }
      ]
    }
  ],
  "meta": { "page": 1, "limit": 25, "total": 48, "totalPages": 2, "timestamp": "..." }
}
```

**Key fields:**

| Response Field | Description |
|----------------|-------------|
| `_id` | Inventory item database ID (used as `inventoryId` in other endpoints) |
| `menuItemId` | Populated object with menu item `name` and `price` |
| `currentStock` | Current quantity on hand |
| `minimumStock` | Reorder threshold -- triggers low-stock alert when `currentStock` falls below |
| `maximumStock` | Maximum storage capacity |
| `unit` | Unit of measurement (e.g., `"bottles"`, `"kg"`, `"plates"`, `"litres"`) |
| `status` | Computed status: `"in-stock"`, `"low-stock"`, or `"out-of-stock"` |
| `costPerUnit` | Cost price per unit in NGN |
| `supplier` | Primary supplier name |
| `trackByLocation` | Whether stock is tracked per physical location |
| `locations` | Per-location stock breakdown (when `trackByLocation` is `true`) |

#### Example: Fetch Low-Stock Items

```javascript
async function getLowStockItems() {
  const url = new URL('https://api.wawagardenbar.com/api/public/inventory');
  url.searchParams.append('status', 'low-stock');
  url.searchParams.append('limit', '100');

  const response = await fetch(url, {
    headers: { 'x-api-key': process.env.WAWA_API_KEY }
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch inventory');
  }

  return result.data;
}

const lowStockItems = await getLowStockItems();
console.log(`Found ${lowStockItems.length} items below minimum stock level`);
```

```python
import requests
import os

def get_low_stock_items():
    url = "https://api.wawagardenbar.com/api/public/inventory"
    headers = {"x-api-key": os.environ["WAWA_API_KEY"]}
    params = {"status": "low-stock", "limit": 100}

    response = requests.get(url, headers=headers, params=params)
    result = response.json()

    if not result.get("success"):
        raise Exception(result.get("error", "Failed to fetch inventory"))

    return result["data"]

low_stock_items = get_low_stock_items()
print(f"Found {len(low_stock_items)} items below minimum stock level")
```

---

### Part 2: Getting Inventory Summary

Retrieve an AI-optimized aggregate summary of inventory status. Useful for dashboards, automated reporting, and identifying restock priorities.

**Endpoint:** `GET /api/public/inventory/summary`
**Base URL:** `https://api.wawagardenbar.com`
**Scope Required:** `inventory:read`

#### Get Full Summary

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/inventory/summary" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### Filter by Main Category

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/inventory/summary?mainCategory=drinks" \
  -H "x-api-key: wawa_your_api_key_here"
```

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `mainCategory` | string | Filter summary by top-level category | `"drinks"` or `"food"` |

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "totals": {
      "totalItems": 48,
      "totalStockUnits": 2340,
      "totalStockValue": 1053000,
      "averageCostPerUnit": 450
    },
    "byStatus": {
      "in-stock": 32,
      "low-stock": 12,
      "out-of-stock": 4
    },
    "byCategory": {
      "beer-local": { "count": 8, "totalStock": 480, "totalValue": 216000 },
      "beer-imported": { "count": 5, "totalStock": 120, "totalValue": 96000 },
      "spirits": { "count": 10, "totalStock": 200, "totalValue": 300000 },
      "main-courses": { "count": 12, "totalStock": 600, "totalValue": 210000 },
      "starters": { "count": 8, "totalStock": 400, "totalValue": 120000 },
      "cocktails": { "count": 5, "totalStock": 540, "totalValue": 111000 }
    },
    "needsRestock": [
      {
        "_id": "inv_abc123",
        "menuItemName": "Star Lager Beer",
        "currentStock": 12,
        "minimumStock": 20,
        "unit": "bottles",
        "supplier": "Nigerian Breweries PLC",
        "deficit": 8
      },
      {
        "_id": "inv_def456",
        "menuItemName": "Hennessy VS",
        "currentStock": 0,
        "minimumStock": 5,
        "unit": "bottles",
        "supplier": "Premium Spirits Ltd",
        "deficit": 5
      }
    ],
    "highValueItems": [
      {
        "_id": "inv_ghi789",
        "menuItemName": "Hennessy VSOP",
        "currentStock": 8,
        "costPerUnit": 25000,
        "totalValue": 200000,
        "unit": "bottles"
      }
    ]
  },
  "meta": { "timestamp": "..." }
}
```

**Key fields:**

| Response Field | Description |
|----------------|-------------|
| `totals` | Aggregate counts and values across all inventory |
| `totals.totalStockValue` | Total inventory value in NGN |
| `byStatus` | Count of items in each stock status |
| `byCategory` | Breakdown by menu sub-category |
| `needsRestock` | Items where `currentStock < minimumStock`, with computed `deficit` |
| `highValueItems` | Top 10 items by total value (`costPerUnit * currentStock`) |

#### Example: Generate Restock Report

```javascript
async function generateRestockReport(mainCategory) {
  const url = new URL('https://api.wawagardenbar.com/api/public/inventory/summary');
  if (mainCategory) {
    url.searchParams.append('mainCategory', mainCategory);
  }

  const response = await fetch(url, {
    headers: { 'x-api-key': process.env.WAWA_API_KEY }
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch inventory summary');
  }

  const { totals, byStatus, needsRestock } = result.data;

  console.log(`Inventory Summary:`);
  console.log(`  Total items: ${totals.totalItems}`);
  console.log(`  Total stock value: NGN ${totals.totalStockValue.toLocaleString()}`);
  console.log(`  In-stock: ${byStatus['in-stock']}, Low-stock: ${byStatus['low-stock']}, Out-of-stock: ${byStatus['out-of-stock']}`);
  console.log(`  Items needing restock: ${needsRestock.length}`);

  return result.data;
}
```

```python
def generate_restock_report(main_category=None):
    url = "https://api.wawagardenbar.com/api/public/inventory/summary"
    headers = {"x-api-key": os.environ["WAWA_API_KEY"]}
    params = {}
    if main_category:
        params["mainCategory"] = main_category

    response = requests.get(url, headers=headers, params=params)
    result = response.json()

    if not result.get("success"):
        raise Exception(result.get("error", "Failed to fetch summary"))

    data = result["data"]
    totals = data["totals"]
    by_status = data["byStatus"]

    print(f"Inventory Summary:")
    print(f"  Total items: {totals['totalItems']}")
    print(f"  Total stock value: NGN {totals['totalStockValue']:,}")
    print(f"  In-stock: {by_status['in-stock']}, Low-stock: {by_status['low-stock']}, Out-of-stock: {by_status['out-of-stock']}")
    print(f"  Items needing restock: {len(data['needsRestock'])}")

    return data
```

---

### Part 3: Checking Individual Items

Retrieve detailed information for a single inventory item, including location breakdown, waste statistics, and profit margin analysis.

**Endpoint:** `GET /api/public/inventory/{inventoryId}`
**Base URL:** `https://api.wawagardenbar.com`
**Scope Required:** `inventory:read`

#### Get Item Details

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/inventory/inv_abc123" \
  -H "x-api-key: wawa_your_api_key_here"
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "_id": "inv_abc123",
    "menuItemId": {
      "_id": "665a1b2c3d4e5f6a7b8c9d0e",
      "name": "Star Lager Beer",
      "price": 800
    },
    "currentStock": 12,
    "minimumStock": 20,
    "maximumStock": 100,
    "unit": "bottles",
    "status": "low-stock",
    "costPerUnit": 450,
    "supplier": "Nigerian Breweries PLC",
    "trackByLocation": true,
    "locationBreakdown": [
      { "name": "Main Bar", "stock": 8, "minimumStock": 10 },
      { "name": "Outdoor Bar", "stock": 4, "minimumStock": 5 }
    ],
    "wasteStats": {
      "totalWaste": 6,
      "wasteRate": 2.1
    },
    "profitMargin": {
      "costPerUnit": 450,
      "sellingPrice": 800,
      "margin": 350,
      "marginPercentage": 43.75
    }
  },
  "meta": { "timestamp": "..." }
}
```

**Key fields:**

| Response Field | Description |
|----------------|-------------|
| `locationBreakdown` | Per-location stock with individual minimum thresholds |
| `wasteStats.totalWaste` | Total units lost to waste over tracking period |
| `wasteStats.wasteRate` | Waste as percentage of total throughput |
| `profitMargin.costPerUnit` | Purchase cost per unit in NGN |
| `profitMargin.sellingPrice` | Menu selling price in NGN |
| `profitMargin.margin` | Profit per unit in NGN |
| `profitMargin.marginPercentage` | Profit margin as percentage |

#### Example: Check Item Profitability

```javascript
async function checkItemDetails(inventoryId) {
  const url = `https://api.wawagardenbar.com/api/public/inventory/${inventoryId}`;

  const response = await fetch(url, {
    headers: { 'x-api-key': process.env.WAWA_API_KEY }
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch inventory item');
  }

  const item = result.data;
  const { profitMargin, wasteStats } = item;

  console.log(`Item: ${item.menuItemId.name}`);
  console.log(`  Stock: ${item.currentStock} ${item.unit} (min: ${item.minimumStock}, max: ${item.maximumStock})`);
  console.log(`  Cost: NGN ${profitMargin.costPerUnit} | Sells for: NGN ${profitMargin.sellingPrice}`);
  console.log(`  Margin: NGN ${profitMargin.margin} (${profitMargin.marginPercentage}%)`);
  console.log(`  Waste: ${wasteStats.totalWaste} ${item.unit} (${wasteStats.wasteRate}% rate)`);

  return item;
}
```

```python
def check_item_details(inventory_id):
    url = f"https://api.wawagardenbar.com/api/public/inventory/{inventory_id}"
    headers = {"x-api-key": os.environ["WAWA_API_KEY"]}

    response = requests.get(url, headers=headers)
    result = response.json()

    if not result.get("success"):
        raise Exception(result.get("error", "Failed to fetch inventory item"))

    item = result["data"]
    margin = item["profitMargin"]
    waste = item["wasteStats"]

    print(f"Item: {item['menuItemId']['name']}")
    print(f"  Stock: {item['currentStock']} {item['unit']} (min: {item['minimumStock']}, max: {item['maximumStock']})")
    print(f"  Cost: NGN {margin['costPerUnit']} | Sells for: NGN {margin['sellingPrice']}")
    print(f"  Margin: NGN {margin['margin']} ({margin['marginPercentage']}%)")
    print(f"  Waste: {waste['totalWaste']} {item['unit']} ({waste['wasteRate']}% rate)")

    return item
```

---

### Part 4: Adding Stock / Receiving Deliveries

Record stock additions when deliveries arrive. Every adjustment creates an audit trail entry.

**Endpoint:** `PATCH /api/public/inventory/{inventoryId}`
**Base URL:** `https://api.wawagardenbar.com`
**Scope Required:** `inventory:write`

#### Step 1: Prepare Addition Payload

**MINIMUM REQUIRED FIELDS:**

```json
{
  "type": "addition",
  "quantity": 48,
  "reason": "Delivery received"
}
```

**Field Specifications:**

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `type` | string | Yes | Must be `"addition"` for stock additions | `"addition"` |
| `quantity` | number | Yes | Positive number of units to add | `48` |
| `reason` | string | Yes | Reason for adjustment (min 2 characters) | `"Delivery received"` |
| `location` | string | No | Target location (when `trackByLocation` is enabled) | `"Main Bar"` |
| `category` | string | No | Adjustment category | `"restock"` |
| `costPerUnit` | number | No | Cost per unit for this delivery in NGN (addition only) | `450` |
| `invoiceNumber` | string | No | Supplier invoice reference | `"INV-2026-0342"` |
| `supplier` | string | No | Supplier name for this delivery | `"Nigerian Breweries PLC"` |
| `notes` | string | No | Additional notes | `"Weekly delivery - 4 crates"` |

**OPTIONAL FIELDS for full delivery tracking:**

```json
{
  "type": "addition",
  "quantity": 48,
  "reason": "Weekly delivery received",
  "location": "Main Bar",
  "category": "restock",
  "costPerUnit": 450,
  "invoiceNumber": "INV-2026-0342",
  "supplier": "Nigerian Breweries PLC",
  "notes": "4 crates of 12 bottles each"
}
```

**Category Values:**

| Category | Use Case |
|----------|----------|
| `"restock"` | Regular supplier delivery |
| `"adjustment"` | Inventory correction / count reconciliation |
| `"other"` | Any other addition reason |

#### Step 2: Send API Request

```bash
curl -X PATCH "https://api.wawagardenbar.com/api/public/inventory/inv_abc123" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "addition",
    "quantity": 48,
    "reason": "Weekly delivery received",
    "location": "Main Bar",
    "category": "restock",
    "costPerUnit": 450,
    "invoiceNumber": "INV-2026-0342",
    "supplier": "Nigerian Breweries PLC",
    "notes": "4 crates of 12 bottles each"
  }'
```

#### Step 3: Handle Response

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "_id": "inv_abc123",
    "menuItemId": {
      "_id": "665a1b2c3d4e5f6a7b8c9d0e",
      "name": "Star Lager Beer",
      "price": 800
    },
    "currentStock": 60,
    "minimumStock": 20,
    "maximumStock": 100,
    "unit": "bottles",
    "status": "in-stock",
    "costPerUnit": 450,
    "supplier": "Nigerian Breweries PLC",
    "trackByLocation": true,
    "locations": [
      { "name": "Main Bar", "stock": 56 },
      { "name": "Outdoor Bar", "stock": 4 }
    ]
  },
  "meta": { "timestamp": "..." }
}
```

#### Step 4: Verify Updated Stock

Confirm that `currentStock` reflects the addition and that `status` has updated accordingly (e.g., from `"low-stock"` to `"in-stock"`).

---

### Part 5: Recording Deductions

Record stock deductions for waste, damage, adjustments, or other losses. Every deduction creates an audit trail entry.

**Endpoint:** `PATCH /api/public/inventory/{inventoryId}`
**Base URL:** `https://api.wawagardenbar.com`
**Scope Required:** `inventory:write`

#### Step 1: Prepare Deduction Payload

**MINIMUM REQUIRED FIELDS:**

```json
{
  "type": "deduction",
  "quantity": 3,
  "reason": "Expired stock removed"
}
```

**Field Specifications:**

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `type` | string | Yes | Must be `"deduction"` for stock removals | `"deduction"` |
| `quantity` | number | Yes | Positive number of units to deduct | `3` |
| `reason` | string | Yes | Reason for deduction (min 2 characters) | `"Expired stock removed"` |
| `location` | string | No | Source location (when `trackByLocation` is enabled) | `"Outdoor Bar"` |
| `category` | string | No | Deduction category | `"waste"`, `"damage"`, `"sale"`, `"adjustment"`, `"other"` |
| `notes` | string | No | Additional notes | `"Found during weekly stock check"` |

**Category Values for Deductions:**

| Category | Use Case |
|----------|----------|
| `"sale"` | Sold to customer (if not auto-deducted by order system) |
| `"waste"` | Expired, spoiled, or unusable stock |
| `"damage"` | Broken, spilled, or physically damaged |
| `"adjustment"` | Inventory count correction |
| `"other"` | Any other deduction reason |

#### Step 2: Send API Request

**Example: Recording Waste**

```bash
curl -X PATCH "https://api.wawagardenbar.com/api/public/inventory/inv_abc123" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "deduction",
    "quantity": 3,
    "reason": "Expired - past best before date",
    "location": "Outdoor Bar",
    "category": "waste",
    "notes": "Found during weekly stock audit"
  }'
```

**Example: Recording Damage**

```bash
curl -X PATCH "https://api.wawagardenbar.com/api/public/inventory/inv_abc123" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "deduction",
    "quantity": 2,
    "reason": "Bottles broken during handling",
    "location": "Main Bar",
    "category": "damage",
    "notes": "Crate dropped while restocking shelves"
  }'
```

**Example: Inventory Adjustment**

```bash
curl -X PATCH "https://api.wawagardenbar.com/api/public/inventory/inv_abc123" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "deduction",
    "quantity": 5,
    "reason": "Count reconciliation - physical count lower than system",
    "category": "adjustment",
    "notes": "Discrepancy found during end-of-day stock count"
  }'
```

#### Step 3: Handle Response

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "_id": "inv_abc123",
    "menuItemId": {
      "_id": "665a1b2c3d4e5f6a7b8c9d0e",
      "name": "Star Lager Beer",
      "price": 800
    },
    "currentStock": 57,
    "minimumStock": 20,
    "maximumStock": 100,
    "unit": "bottles",
    "status": "in-stock",
    "costPerUnit": 450,
    "supplier": "Nigerian Breweries PLC",
    "trackByLocation": true,
    "locations": [
      { "name": "Main Bar", "stock": 56 },
      { "name": "Outdoor Bar", "stock": 1 }
    ]
  },
  "meta": { "timestamp": "..." }
}
```

---

### Part 6: Monitoring Alerts

Retrieve real-time alerts for items that are below minimum stock levels or completely out of stock. Use this endpoint for automated restocking triggers.

**Endpoint:** `GET /api/public/inventory/alerts`
**Base URL:** `https://api.wawagardenbar.com`
**Scope Required:** `inventory:read`

#### Get All Alerts

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/inventory/alerts" \
  -H "x-api-key: wawa_your_api_key_here"
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "lowStock": [
      {
        "_id": "inv_jkl012",
        "menuItemId": {
          "_id": "665a1b2c3d4e5f6a7b8c9d11",
          "name": "Guinness Foreign Extra",
          "price": 900
        },
        "currentStock": 8,
        "minimumStock": 15,
        "unit": "bottles",
        "supplier": "Guinness Nigeria PLC",
        "deficit": 7
      }
    ],
    "outOfStock": [
      {
        "_id": "inv_mno345",
        "menuItemId": {
          "_id": "665a1b2c3d4e5f6a7b8c9d22",
          "name": "Hennessy VS",
          "price": 5000
        },
        "currentStock": 0,
        "minimumStock": 5,
        "unit": "bottles",
        "supplier": "Premium Spirits Ltd",
        "deficit": 5
      }
    ],
    "locationAlerts": [
      {
        "_id": "inv_abc123",
        "menuItemId": {
          "_id": "665a1b2c3d4e5f6a7b8c9d0e",
          "name": "Star Lager Beer",
          "price": 800
        },
        "location": "Outdoor Bar",
        "currentStock": 1,
        "minimumStock": 5,
        "unit": "bottles"
      }
    ],
    "summary": {
      "lowStockCount": 1,
      "outOfStockCount": 1,
      "locationAlertCount": 1
    }
  },
  "meta": { "timestamp": "..." }
}
```

**Key fields:**

| Response Field | Description |
|----------------|-------------|
| `lowStock` | Items where `currentStock > 0` but below `minimumStock` |
| `outOfStock` | Items where `currentStock` is `0` |
| `locationAlerts` | Specific locations where stock is below that location's minimum |
| `summary` | Counts for quick assessment |
| `deficit` | Number of units needed to reach `minimumStock` |

#### Example: Automated Alert Monitor

```javascript
async function checkAlerts() {
  const url = 'https://api.wawagardenbar.com/api/public/inventory/alerts';

  const response = await fetch(url, {
    headers: { 'x-api-key': process.env.WAWA_API_KEY }
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch alerts');
  }

  const { lowStock, outOfStock, locationAlerts, summary } = result.data;

  if (summary.outOfStockCount > 0) {
    console.log(`CRITICAL: ${summary.outOfStockCount} item(s) out of stock`);
    outOfStock.forEach(item => {
      console.log(`  - ${item.menuItemId.name}: need ${item.deficit} ${item.unit} from ${item.supplier}`);
    });
  }

  if (summary.lowStockCount > 0) {
    console.log(`WARNING: ${summary.lowStockCount} item(s) low on stock`);
    lowStock.forEach(item => {
      console.log(`  - ${item.menuItemId.name}: ${item.currentStock}/${item.minimumStock} ${item.unit} (need ${item.deficit} more)`);
    });
  }

  if (summary.locationAlertCount > 0) {
    console.log(`LOCATION: ${summary.locationAlertCount} location-specific alert(s)`);
    locationAlerts.forEach(alert => {
      console.log(`  - ${alert.menuItemId.name} at ${alert.location}: ${alert.currentStock}/${alert.minimumStock} ${alert.unit}`);
    });
  }

  return result.data;
}
```

```python
def check_alerts():
    url = "https://api.wawagardenbar.com/api/public/inventory/alerts"
    headers = {"x-api-key": os.environ["WAWA_API_KEY"]}

    response = requests.get(url, headers=headers)
    result = response.json()

    if not result.get("success"):
        raise Exception(result.get("error", "Failed to fetch alerts"))

    data = result["data"]
    summary = data["summary"]

    if summary["outOfStockCount"] > 0:
        print(f"CRITICAL: {summary['outOfStockCount']} item(s) out of stock")
        for item in data["outOfStock"]:
            print(f"  - {item['menuItemId']['name']}: need {item['deficit']} {item['unit']} from {item['supplier']}")

    if summary["lowStockCount"] > 0:
        print(f"WARNING: {summary['lowStockCount']} item(s) low on stock")
        for item in data["lowStock"]:
            print(f"  - {item['menuItemId']['name']}: {item['currentStock']}/{item['minimumStock']} {item['unit']} (need {item['deficit']} more)")

    if summary["locationAlertCount"] > 0:
        print(f"LOCATION: {summary['locationAlertCount']} location-specific alert(s)")
        for alert in data["locationAlerts"]:
            print(f"  - {alert['menuItemId']['name']} at {alert['location']}: {alert['currentStock']}/{alert['minimumStock']} {alert['unit']}")

    return data
```

---

## Complete Workflow Examples

### Workflow 1: Automated Stock Monitoring and Restock List Generation

This workflow polls inventory alerts on a schedule, generates a consolidated restock list grouped by supplier, and calculates estimated restock costs.

```javascript
const API_BASE = 'https://api.wawagardenbar.com';
const headers = {
  'x-api-key': process.env.WAWA_API_KEY,
  'Content-Type': 'application/json'
};

// -- Helper: Fetch alerts --------------------------------------------------
async function fetchAlerts() {
  const response = await fetch(`${API_BASE}/api/public/inventory/alerts`, { headers });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Helper: Fetch item details for cost info ------------------------------
async function fetchItemDetails(inventoryId) {
  const response = await fetch(`${API_BASE}/api/public/inventory/${inventoryId}`, { headers });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Main: Generate restock purchase order ---------------------------------
async function generateRestockList() {
  const alerts = await fetchAlerts();
  const allItems = [...alerts.outOfStock, ...alerts.lowStock];

  if (allItems.length === 0) {
    console.log('All inventory levels are healthy. No restock needed.');
    return null;
  }

  // Group by supplier and calculate restock quantities
  const bySupplier = {};

  for (const item of allItems) {
    const details = await fetchItemDetails(item._id);
    const restockQuantity = details.maximumStock - details.currentStock;
    const estimatedCost = restockQuantity * details.costPerUnit;

    const supplier = item.supplier || 'Unknown Supplier';
    if (!bySupplier[supplier]) {
      bySupplier[supplier] = { items: [], totalCost: 0 };
    }

    bySupplier[supplier].items.push({
      inventoryId: item._id,
      name: item.menuItemId.name,
      currentStock: item.currentStock,
      minimumStock: item.minimumStock,
      maximumStock: details.maximumStock,
      restockQuantity,
      unit: item.unit,
      costPerUnit: details.costPerUnit,
      estimatedCost
    });
    bySupplier[supplier].totalCost += estimatedCost;
  }

  // Print restock report
  let grandTotal = 0;
  for (const [supplier, data] of Object.entries(bySupplier)) {
    console.log(`\nSupplier: ${supplier}`);
    console.log(`  Total estimated cost: NGN ${data.totalCost.toLocaleString()}`);
    data.items.forEach(item => {
      console.log(`  - ${item.name}: order ${item.restockQuantity} ${item.unit} (current: ${item.currentStock}, target: ${item.maximumStock}) -- NGN ${item.estimatedCost.toLocaleString()}`);
    });
    grandTotal += data.totalCost;
  }
  console.log(`\nGrand total estimated restock cost: NGN ${grandTotal.toLocaleString()}`);

  return bySupplier;
}

// Run on a schedule (e.g., every 30 minutes)
setInterval(generateRestockList, 30 * 60 * 1000);
```

```python
import time

API_BASE = "https://api.wawagardenbar.com"
HEADERS = {"x-api-key": os.environ["WAWA_API_KEY"], "Content-Type": "application/json"}

def fetch_alerts():
    response = requests.get(f"{API_BASE}/api/public/inventory/alerts", headers=HEADERS)
    result = response.json()
    if not result.get("success"):
        raise Exception(result.get("error"))
    return result["data"]

def fetch_item_details(inventory_id):
    response = requests.get(f"{API_BASE}/api/public/inventory/{inventory_id}", headers=HEADERS)
    result = response.json()
    if not result.get("success"):
        raise Exception(result.get("error"))
    return result["data"]

def generate_restock_list():
    alerts = fetch_alerts()
    all_items = alerts["outOfStock"] + alerts["lowStock"]

    if not all_items:
        print("All inventory levels are healthy. No restock needed.")
        return None

    by_supplier = {}

    for item in all_items:
        details = fetch_item_details(item["_id"])
        restock_qty = details["maximumStock"] - details["currentStock"]
        estimated_cost = restock_qty * details["costPerUnit"]

        supplier = item.get("supplier", "Unknown Supplier")
        if supplier not in by_supplier:
            by_supplier[supplier] = {"items": [], "totalCost": 0}

        by_supplier[supplier]["items"].append({
            "inventoryId": item["_id"],
            "name": item["menuItemId"]["name"],
            "currentStock": item["currentStock"],
            "restockQuantity": restock_qty,
            "unit": item["unit"],
            "costPerUnit": details["costPerUnit"],
            "estimatedCost": estimated_cost,
        })
        by_supplier[supplier]["totalCost"] += estimated_cost

    grand_total = 0
    for supplier, data in by_supplier.items():
        print(f"\nSupplier: {supplier}")
        print(f"  Total estimated cost: NGN {data['totalCost']:,}")
        for item in data["items"]:
            print(f"  - {item['name']}: order {item['restockQuantity']} {item['unit']} -- NGN {item['estimatedCost']:,}")
        grand_total += data["totalCost"]

    print(f"\nGrand total estimated restock cost: NGN {grand_total:,}")
    return by_supplier
```

---

### Workflow 2: Delivery Receiving with Invoice Tracking

This workflow processes a delivery by adding stock for multiple items with invoice and supplier tracking.

```javascript
async function receiveDelivery(deliveryItems) {
  const results = [];

  for (const item of deliveryItems) {
    const payload = {
      type: 'addition',
      quantity: item.quantity,
      reason: `Delivery received - ${item.invoiceNumber}`,
      category: 'restock',
      costPerUnit: item.costPerUnit,
      invoiceNumber: item.invoiceNumber,
      supplier: item.supplier,
      location: item.location,
      notes: item.notes || ''
    };

    const response = await fetch(`${API_BASE}/api/public/inventory/${item.inventoryId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (!result.success) {
      console.log(`Failed to add stock for ${item.inventoryId}: ${result.error}`);
      results.push({ inventoryId: item.inventoryId, success: false, error: result.error });
      continue;
    }

    console.log(`Added ${item.quantity} ${result.data.unit} to ${result.data.menuItemId.name} -- new stock: ${result.data.currentStock}`);
    results.push({ inventoryId: item.inventoryId, success: true, newStock: result.data.currentStock });
  }

  return results;
}

// Usage: Process a delivery from Nigerian Breweries
await receiveDelivery([
  {
    inventoryId: 'inv_abc123',
    quantity: 48,
    costPerUnit: 450,
    invoiceNumber: 'INV-2026-0342',
    supplier: 'Nigerian Breweries PLC',
    location: 'Main Bar',
    notes: '4 crates of Star Lager'
  },
  {
    inventoryId: 'inv_jkl012',
    quantity: 24,
    costPerUnit: 500,
    invoiceNumber: 'INV-2026-0342',
    supplier: 'Nigerian Breweries PLC',
    location: 'Main Bar',
    notes: '2 crates of Guinness'
  }
]);
```

```python
def receive_delivery(delivery_items):
    results = []

    for item in delivery_items:
        payload = {
            "type": "addition",
            "quantity": item["quantity"],
            "reason": f"Delivery received - {item['invoiceNumber']}",
            "category": "restock",
            "costPerUnit": item["costPerUnit"],
            "invoiceNumber": item["invoiceNumber"],
            "supplier": item["supplier"],
            "location": item.get("location"),
            "notes": item.get("notes", ""),
        }

        response = requests.patch(
            f"{API_BASE}/api/public/inventory/{item['inventoryId']}",
            headers=HEADERS,
            json=payload,
        )
        result = response.json()

        if not result.get("success"):
            print(f"Failed to add stock for {item['inventoryId']}: {result.get('error')}")
            results.append({"inventoryId": item["inventoryId"], "success": False, "error": result.get("error")})
            continue

        data = result["data"]
        print(f"Added {item['quantity']} {data['unit']} to {data['menuItemId']['name']} -- new stock: {data['currentStock']}")
        results.append({"inventoryId": item["inventoryId"], "success": True, "newStock": data["currentStock"]})

    return results

# Usage
receive_delivery([
    {
        "inventoryId": "inv_abc123",
        "quantity": 48,
        "costPerUnit": 450,
        "invoiceNumber": "INV-2026-0342",
        "supplier": "Nigerian Breweries PLC",
        "location": "Main Bar",
        "notes": "4 crates of Star Lager",
    },
])
```

---

### Workflow 3: Waste Logging

This workflow records waste deductions with categorization and detailed reasons for audit compliance.

```javascript
async function logWaste(wasteEntries) {
  const results = [];

  for (const entry of wasteEntries) {
    const payload = {
      type: 'deduction',
      quantity: entry.quantity,
      reason: entry.reason,
      category: 'waste',
      location: entry.location,
      notes: entry.notes || ''
    };

    const response = await fetch(`${API_BASE}/api/public/inventory/${entry.inventoryId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (!result.success) {
      console.log(`Failed to log waste for ${entry.inventoryId}: ${result.error}`);
      results.push({ inventoryId: entry.inventoryId, success: false, error: result.error });
      continue;
    }

    const item = result.data;
    console.log(`Waste logged: ${entry.quantity} ${item.unit} of ${item.menuItemId.name} -- remaining: ${item.currentStock}`);

    // Check if the deduction triggered a low-stock alert
    if (item.status === 'low-stock') {
      console.log(`  WARNING: ${item.menuItemId.name} is now low-stock (${item.currentStock}/${item.minimumStock} ${item.unit})`);
    } else if (item.status === 'out-of-stock') {
      console.log(`  CRITICAL: ${item.menuItemId.name} is now out of stock`);
    }

    results.push({ inventoryId: entry.inventoryId, success: true, newStock: item.currentStock, status: item.status });
  }

  return results;
}

// Usage: Log waste from weekly stock check
await logWaste([
  {
    inventoryId: 'inv_abc123',
    quantity: 3,
    reason: 'Expired - past best before date',
    location: 'Outdoor Bar',
    notes: 'Found during weekly stock audit on 2026-03-07'
  },
  {
    inventoryId: 'inv_pqr678',
    quantity: 1,
    reason: 'Spoiled - improper refrigeration',
    location: 'Main Bar',
    notes: 'Fridge temperature was too high overnight'
  }
]);
```

```python
def log_waste(waste_entries):
    results = []

    for entry in waste_entries:
        payload = {
            "type": "deduction",
            "quantity": entry["quantity"],
            "reason": entry["reason"],
            "category": "waste",
            "location": entry.get("location"),
            "notes": entry.get("notes", ""),
        }

        response = requests.patch(
            f"{API_BASE}/api/public/inventory/{entry['inventoryId']}",
            headers=HEADERS,
            json=payload,
        )
        result = response.json()

        if not result.get("success"):
            print(f"Failed to log waste for {entry['inventoryId']}: {result.get('error')}")
            results.append({"inventoryId": entry["inventoryId"], "success": False})
            continue

        item = result["data"]
        print(f"Waste logged: {entry['quantity']} {item['unit']} of {item['menuItemId']['name']} -- remaining: {item['currentStock']}")

        if item["status"] == "low-stock":
            print(f"  WARNING: {item['menuItemId']['name']} is now low-stock")
        elif item["status"] == "out-of-stock":
            print(f"  CRITICAL: {item['menuItemId']['name']} is now out of stock")

        results.append({"inventoryId": entry["inventoryId"], "success": True, "newStock": item["currentStock"]})

    return results

# Usage
log_waste([
    {
        "inventoryId": "inv_abc123",
        "quantity": 3,
        "reason": "Expired - past best before date",
        "location": "Outdoor Bar",
        "notes": "Found during weekly stock audit on 2026-03-07",
    },
])
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
function validateStockAdjustment(payload) {
  const errors = [];

  // Required fields
  if (!payload.type) errors.push('type is required');
  if (!['addition', 'deduction'].includes(payload.type)) errors.push('type must be "addition" or "deduction"');
  if (payload.quantity == null || payload.quantity <= 0) errors.push('quantity must be a positive number');
  if (!payload.reason || payload.reason.length < 2) errors.push('reason is required (min 2 characters)');

  // Addition-only fields
  if (payload.type === 'deduction' && payload.costPerUnit != null) {
    errors.push('costPerUnit is only valid for additions');
  }
  if (payload.type === 'deduction' && payload.invoiceNumber != null) {
    errors.push('invoiceNumber is only valid for additions');
  }

  // Category validation
  const validCategories = ['restock', 'sale', 'waste', 'damage', 'adjustment', 'other'];
  if (payload.category && !validCategories.includes(payload.category)) {
    errors.push(`category must be one of: ${validCategories.join(', ')}`);
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  return true;
}
```

---

## Quick Reference

### Endpoint Summary Table

| Endpoint | Method | Purpose | Required Scope |
|----------|--------|---------|----------------|
| `/api/public/inventory` | GET | List inventory items with stock levels | `inventory:read` |
| `/api/public/inventory/summary` | GET | AI-optimized aggregate summary | `inventory:read` |
| `/api/public/inventory/{inventoryId}` | GET | Single item with analytics | `inventory:read` |
| `/api/public/inventory/{inventoryId}` | PATCH | Adjust stock with audit trail | `inventory:write` |
| `/api/public/inventory/alerts` | GET | Low-stock and out-of-stock alerts | `inventory:read` |

### Minimum Payload: Add Stock

```json
{
  "type": "addition",
  "quantity": 48,
  "reason": "Delivery received"
}
```

### Full Payload: Add Stock with Delivery Tracking

```json
{
  "type": "addition",
  "quantity": 48,
  "reason": "Weekly delivery received",
  "location": "Main Bar",
  "category": "restock",
  "costPerUnit": 450,
  "invoiceNumber": "INV-2026-0342",
  "supplier": "Nigerian Breweries PLC",
  "notes": "4 crates of 12 bottles each"
}
```

### Minimum Payload: Deduct Stock

```json
{
  "type": "deduction",
  "quantity": 3,
  "reason": "Expired stock removed"
}
```

### Full Payload: Deduct Stock with Waste Tracking

```json
{
  "type": "deduction",
  "quantity": 3,
  "reason": "Expired - past best before date",
  "location": "Outdoor Bar",
  "category": "waste",
  "notes": "Found during weekly stock audit"
}
```

---

## Troubleshooting

### Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid API key | Verify API key is correct and active |
| `403 Forbidden` | Insufficient scopes | Request API key with `inventory:read` and/or `inventory:write` scopes |
| `404 Not Found` | Invalid `inventoryId` | Verify the inventory item ID exists via `GET /api/public/inventory` |
| `400` "quantity must be a positive number" | Zero or negative quantity | Ensure `quantity` is greater than 0 |
| `400` "reason is required" | Missing or too-short reason | Provide a `reason` string with at least 2 characters |
| `400` "costPerUnit is only valid for additions" | `costPerUnit` sent with deduction | Remove `costPerUnit` from deduction payloads |
| `422` "Insufficient stock" | Deduction exceeds available stock | Check `currentStock` before deducting; reduce quantity |
| `422` "Insufficient stock at location" | Location stock too low | Check location-specific stock via `GET /api/public/inventory/{id}` |
| `429 Too Many Requests` | Rate limit exceeded | Implement rate limiting and exponential backoff |

---

## Related Documentation

- API Reference: `/docs/api/public-api-reference.md`
- Authentication Guide: `/docs/api/authentication.md`
- Error Codes: `/docs/api/error-codes.md`
- SOP-ADMIN-003: Admin Inventory Management (manual counterpart)
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
