# SOP: Agentic API Menu Management

**Document ID:** SOP-AGENTIC-009
**Version:** 1.0
**Effective Date:** March 7, 2026
**Department:** Technical Integration
**Applies To:** AI Agents, Menu Management Systems, Third-party Integrations

---

## Purpose

This Standard Operating Procedure (SOP) provides technical specifications and step-by-step API integration instructions for agentic systems to programmatically list, search, create, update, and delete menu items, as well as retrieve menu categories, using the Wawa Garden Bar Public REST API.

This document is the API counterpart to SOP-MANUAL-ADMIN-002 (Manual Menu Management).

---

## Scope

This SOP covers:
- API authentication and authorization for menu endpoints
- Listing and searching menu items with filters
- Retrieving menu categories grouped by main category
- Getting full details for a single menu item
- Creating new menu items
- Updating existing menu items
- Soft-deleting menu items

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

- `menu:read` - List, search, get menu items and categories
- `menu:write` - Create, update, delete menu items

> **Role-Based Keys:** Select the **Admin** role when creating an API key (Admin Dashboard > Settings > API Keys) to automatically include both `menu:read` and `menu:write` scopes. For read-only access, the **Customer** role includes `menu:read`. Alternatively, use **Custom** to select individual scopes.

---

## Procedure

### Part 1: Listing and Searching Menu Items

List all available menu items with stock status. Supports filtering by main category, sub-category, and free-text search.

**Endpoint:** `GET /api/public/menu`
**Scope Required:** `menu:read`
**Rate Limit:** 30 requests / minute

#### Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `mainCategory` | string | No | Filter by top-level category | `"drinks"`, `"food"` |
| `category` | string | No | Filter by sub-category slug | `"beer-local"`, `"starters"`, `"rice-dishes"` |
| `q` | string | No | Free-text search across name, description, and tags | `"jollof"`, `"beer"` |
| `page` | number | No | Page number (default: 1) | `1` |
| `limit` | number | No | Items per page (default: 25, max: 100) | `10` |

#### curl Example

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/menu?mainCategory=food&page=1&limit=10" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### JavaScript Example

```javascript
async function listMenuItems({ mainCategory, category, q, page, limit } = {}) {
  const url = new URL('https://api.wawagardenbar.com/api/public/menu');

  if (mainCategory) url.searchParams.append('mainCategory', mainCategory);
  if (category) url.searchParams.append('category', category);
  if (q) url.searchParams.append('q', q);
  if (page) url.searchParams.append('page', page.toString());
  if (limit) url.searchParams.append('limit', limit.toString());

  const response = await fetch(url, {
    headers: { 'x-api-key': process.env.WAWA_API_KEY }
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch menu items');
  }

  return result;
}

// List all food items
const foodItems = await listMenuItems({ mainCategory: 'food', limit: 10 });
console.log(`Found ${foodItems.meta.total} food items`);
foodItems.data.forEach(item => {
  console.log(`  ${item.name} - ${item.price} - ${item.stockStatus}`);
});

// Search by keyword
const searchResults = await listMenuItems({ q: 'jollof' });
console.log(`Search found ${searchResults.meta.total} items`);
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "_id": "665a1b2c3d4e5f6a7b8c9d0e",
      "name": "Jollof Rice",
      "description": "Classic Nigerian jollof rice with tomato and pepper base",
      "mainCategory": "food",
      "category": "rice-dishes",
      "price": 3500,
      "images": ["https://cdn.wawagardenbar.com/menu/jollof-rice.jpg"],
      "isAvailable": true,
      "preparationTime": 25,
      "stockStatus": "in-stock",
      "currentStock": 45,
      "customizations": [
        {
          "name": "Protein",
          "required": false,
          "options": [
            { "name": "Chicken", "price": 1500, "available": true },
            { "name": "Beef", "price": 1200, "available": true }
          ]
        }
      ],
      "portionOptions": {
        "halfPortionEnabled": true,
        "halfPortionSurcharge": 0,
        "quarterPortionEnabled": false,
        "quarterPortionSurcharge": 0
      },
      "nutritionalInfo": {
        "calories": 450,
        "spiceLevel": "medium"
      },
      "allergens": ["gluten"],
      "tags": ["rice", "jollof", "nigerian"]
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 24,
    "totalPages": 3,
    "timestamp": "2026-03-07T10:00:00Z"
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Menu item database ID |
| `name` | string | Item display name |
| `description` | string | Item description |
| `mainCategory` | string | Top-level category (`"drinks"` or `"food"`) |
| `category` | string | Sub-category slug |
| `price` | number | Price in NGN |
| `images` | array | Array of image URLs |
| `isAvailable` | boolean | Availability flag |
| `preparationTime` | number | Preparation time in minutes |
| `stockStatus` | string | `"in-stock"`, `"low-stock"`, or `"out-of-stock"` |
| `currentStock` | number | Current stock level (if inventory is tracked) |
| `customizations` | array | Available customization groups |
| `portionOptions` | object | Half/quarter portion configuration |
| `nutritionalInfo` | object | Nutritional data (calories, spice level, etc.) |
| `allergens` | array | Allergen warnings |
| `tags` | array | Search tags |

---

### Part 2: Getting Menu Categories

Retrieve available menu categories grouped by main category (drinks and food).

**Endpoint:** `GET /api/public/menu/categories`
**Scope Required:** `menu:read`
**Rate Limit:** 30 requests / minute

#### curl Example

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/menu/categories" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### JavaScript Example

```javascript
async function getMenuCategories() {
  const response = await fetch('https://api.wawagardenbar.com/api/public/menu/categories', {
    headers: { 'x-api-key': process.env.WAWA_API_KEY }
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch categories');
  }

  return result.data;
}

const categories = await getMenuCategories();
console.log('Drink categories:', categories.drinks.join(', '));
console.log('Food categories:', categories.food.join(', '));
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "drinks": ["beer-local", "beer-imported", "wine", "soft-drinks", "juice"],
    "food": ["starters", "rice-dishes", "soups", "small-chops", "desserts"]
  },
  "meta": {
    "timestamp": "2026-03-07T10:00:00Z"
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `drinks` | array | Drink sub-category slugs |
| `food` | array | Food sub-category slugs |

---

### Part 3: Getting a Single Menu Item

Retrieve a single menu item by its database ID with full details and stock status.

**Endpoint:** `GET /api/public/menu/{itemId}`
**Scope Required:** `menu:read`
**Rate Limit:** 30 requests / minute

#### curl Example

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/menu/665a1b2c3d4e5f6a7b8c9d0e" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### JavaScript Example

```javascript
async function getMenuItem(itemId) {
  const response = await fetch(
    `https://api.wawagardenbar.com/api/public/menu/${itemId}`,
    { headers: { 'x-api-key': process.env.WAWA_API_KEY } }
  );
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch menu item');
  }

  return result.data;
}

const item = await getMenuItem('665a1b2c3d4e5f6a7b8c9d0e');
console.log(`${item.name} - ${item.price} NGN`);
console.log(`Stock: ${item.stockStatus} (${item.currentStock})`);
console.log(`Prep time: ${item.preparationTime} minutes`);
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "_id": "665a1b2c3d4e5f6a7b8c9d0e",
    "name": "Jollof Rice",
    "description": "Classic Nigerian jollof rice with tomato and pepper base",
    "mainCategory": "food",
    "category": "rice-dishes",
    "price": 3500,
    "costPerUnit": 1200,
    "images": ["https://cdn.wawagardenbar.com/menu/jollof-rice.jpg"],
    "customizations": [
      {
        "name": "Protein",
        "required": false,
        "options": [
          { "name": "Chicken", "price": 1500, "available": true },
          { "name": "Beef", "price": 1200, "available": true }
        ]
      }
    ],
    "isAvailable": true,
    "preparationTime": 25,
    "stockStatus": "in-stock",
    "currentStock": 45,
    "portionOptions": {
      "halfPortionEnabled": true,
      "halfPortionSurcharge": 0,
      "quarterPortionEnabled": false,
      "quarterPortionSurcharge": 0
    },
    "nutritionalInfo": {
      "calories": 450,
      "spiceLevel": "medium"
    },
    "allergens": ["gluten"],
    "tags": ["rice", "jollof", "nigerian"]
  },
  "meta": {
    "timestamp": "2026-03-07T10:00:00Z"
  }
}
```

**Full Item Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Menu item database ID |
| `name` | string | Item display name |
| `description` | string | Item description |
| `mainCategory` | string | Top-level category (`"drinks"` or `"food"`) |
| `category` | string | Sub-category slug |
| `price` | number | Price in NGN |
| `costPerUnit` | number | Unit cost in NGN |
| `images` | array | Image URLs |
| `customizations` | array | Customization groups with name, required flag, and options |
| `isAvailable` | boolean | Menu availability flag |
| `preparationTime` | number | Preparation time in minutes |
| `stockStatus` | string | `"in-stock"`, `"low-stock"`, or `"out-of-stock"` |
| `currentStock` | number | Current stock level (if inventory is tracked) |
| `portionOptions` | object | Portion configuration (half/quarter enabled, surcharges) |
| `nutritionalInfo` | object | Nutritional data (calories, spice level, etc.) |
| `allergens` | array | Allergen warnings |
| `tags` | array | Search tags |

---

### Part 4: Creating Menu Items

Create a new menu item in the system.

**Endpoint:** `POST /api/public/menu`
**Scope Required:** `menu:write`
**Rate Limit:** 30 requests / minute

#### Request Body

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `name` | string | Yes | Item display name | `"Pepper Soup"` |
| `description` | string | Yes | Item description | `"Spicy traditional pepper soup"` |
| `mainCategory` | string | Yes | Must be `"drinks"` or `"food"` | `"food"` |
| `category` | string | Yes | Sub-category slug | `"soups"` |
| `price` | number | Yes | Price in NGN (>= 0) | `4500` |
| `costPerUnit` | number | Yes | Unit cost in NGN (>= 0) | `1500` |
| `preparationTime` | number | Yes | Prep time in minutes (>= 0) | `20` |
| `images` | array | No | Array of image URLs | `["https://cdn.example.com/soup.jpg"]` |
| `customizations` | array | No | Customization groups | See below |
| `isAvailable` | boolean | No | Availability flag (default: `true`) | `true` |
| `servingSize` | string | No | Serving size description | `"1 bowl"` |
| `tags` | array | No | Search tags | `["soup", "spicy", "nigerian"]` |
| `allergens` | array | No | Allergen warnings | `["shellfish"]` |
| `nutritionalInfo` | object | No | Nutritional data | `{ "calories": 350, "spiceLevel": "hot" }` |
| `slug` | string | No | URL-friendly slug | `"pepper-soup"` |
| `metaDescription` | string | No | SEO meta description | `"Traditional Nigerian pepper soup"` |
| `trackInventory` | boolean | No | Enable inventory tracking (default: `false`) | `true` |
| `pointsValue` | number | No | Loyalty points value | `4500` |
| `pointsRedeemable` | boolean | No | Allow points redemption (default: `false`) | `true` |
| `portionOptions` | object | No | Portion configuration | See below |
| `allowManualPriceOverride` | boolean | No | Allow manual price override (default: `false`) | `false` |

**Customizations Array:**

```json
[
  {
    "name": "Protein",
    "required": false,
    "options": [
      { "name": "Goat Meat", "price": 2000, "available": true },
      { "name": "Catfish", "price": 2500, "available": true }
    ]
  }
]
```

**Portion Options Object:**

```json
{
  "halfPortionEnabled": true,
  "halfPortionSurcharge": 0,
  "quarterPortionEnabled": false,
  "quarterPortionSurcharge": 0
}
```

#### curl Example

```bash
curl -X POST "https://api.wawagardenbar.com/api/public/menu" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pepper Soup",
    "description": "Spicy traditional pepper soup with assorted meat",
    "mainCategory": "food",
    "category": "soups",
    "price": 4500,
    "costPerUnit": 1500,
    "preparationTime": 20,
    "tags": ["soup", "spicy", "nigerian"],
    "allergens": ["shellfish"],
    "nutritionalInfo": {
      "calories": 350,
      "spiceLevel": "hot"
    },
    "trackInventory": true,
    "portionOptions": {
      "halfPortionEnabled": true,
      "halfPortionSurcharge": 0,
      "quarterPortionEnabled": false,
      "quarterPortionSurcharge": 0
    }
  }'
```

#### JavaScript Example

```javascript
async function createMenuItem(itemData) {
  const response = await fetch('https://api.wawagardenbar.com/api/public/menu', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.WAWA_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(itemData)
  });
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to create menu item');
  }

  return result.data;
}

try {
  const newItem = await createMenuItem({
    name: 'Pepper Soup',
    description: 'Spicy traditional pepper soup with assorted meat',
    mainCategory: 'food',
    category: 'soups',
    price: 4500,
    costPerUnit: 1500,
    preparationTime: 20,
    tags: ['soup', 'spicy', 'nigerian'],
    allergens: ['shellfish'],
    nutritionalInfo: { calories: 350, spiceLevel: 'hot' },
    trackInventory: true
  });
  console.log(`Menu item created: ${newItem._id} - ${newItem.name}`);
} catch (error) {
  console.error('Failed to create menu item:', error.message);
}
```

#### Success Response (201 Created)

```json
{
  "success": true,
  "data": {
    "_id": "665b2c3d4e5f6a7b8c9d0f1a",
    "name": "Pepper Soup",
    "description": "Spicy traditional pepper soup with assorted meat",
    "mainCategory": "food",
    "category": "soups",
    "price": 4500,
    "costPerUnit": 1500,
    "images": [],
    "customizations": [],
    "isAvailable": true,
    "preparationTime": 20,
    "tags": ["soup", "spicy", "nigerian"],
    "allergens": ["shellfish"],
    "nutritionalInfo": {
      "calories": 350,
      "spiceLevel": "hot"
    },
    "trackInventory": true,
    "pointsRedeemable": false,
    "allowManualPriceOverride": false,
    "createdAt": "2026-03-07T10:15:00Z"
  },
  "meta": {
    "timestamp": "2026-03-07T10:15:00Z"
  }
}
```

#### Error Response (400 Bad Request)

```json
{
  "success": false,
  "error": "name is required"
}
```

---

### Part 5: Updating Menu Items

Update an existing menu item. Only provided fields are modified; omitted fields remain unchanged. Price changes are automatically tracked in price history.

**Endpoint:** `PATCH /api/public/menu/{itemId}`
**Scope Required:** `menu:write`
**Rate Limit:** 30 requests / minute

#### Updatable Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `name` | string | Item display name | `"Pepper Soup Deluxe"` |
| `description` | string | Item description | `"Premium pepper soup"` |
| `mainCategory` | string | Must be `"drinks"` or `"food"` | `"food"` |
| `category` | string | Sub-category slug | `"soups"` |
| `price` | number | Price in NGN (>= 0) | `5000` |
| `costPerUnit` | number | Unit cost in NGN (>= 0) | `1800` |
| `images` | array | Image URLs | `["https://cdn.example.com/soup.jpg"]` |
| `customizations` | array | Customization groups | See Part 4 |
| `isAvailable` | boolean | Availability flag | `true` |
| `preparationTime` | number | Prep time in minutes (>= 0) | `25` |
| `servingSize` | string | Serving size description | `"1 large bowl"` |
| `tags` | array | Search tags | `["soup", "premium"]` |
| `allergens` | array | Allergen warnings | `["shellfish", "pepper"]` |
| `nutritionalInfo` | object | Nutritional data | `{ "calories": 400 }` |
| `slug` | string | URL-friendly slug | `"pepper-soup-deluxe"` |
| `metaDescription` | string | SEO meta description | `"Premium pepper soup"` |
| `trackInventory` | boolean | Enable inventory tracking | `true` |
| `pointsValue` | number | Loyalty points value | `5000` |
| `pointsRedeemable` | boolean | Allow points redemption | `true` |
| `portionOptions` | object | Portion configuration | See Part 4 |
| `allowManualPriceOverride` | boolean | Allow manual price override | `false` |

> **Note:** When the `price` field is updated, the system automatically creates a price history record and closes the previous price period. This enables price trend analysis over time.

#### curl Example

```bash
curl -X PATCH "https://api.wawagardenbar.com/api/public/menu/665b2c3d4e5f6a7b8c9d0f1a" \
  -H "x-api-key: wawa_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 5000,
    "description": "Premium spicy traditional pepper soup with assorted meat",
    "tags": ["soup", "spicy", "nigerian", "premium"]
  }'
```

#### JavaScript Example

```javascript
async function updateMenuItem(itemId, updates) {
  const response = await fetch(
    `https://api.wawagardenbar.com/api/public/menu/${itemId}`,
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
    throw new Error(result.error || 'Failed to update menu item');
  }

  return result.data;
}

const updated = await updateMenuItem('665b2c3d4e5f6a7b8c9d0f1a', {
  price: 5000,
  description: 'Premium spicy traditional pepper soup with assorted meat',
  tags: ['soup', 'spicy', 'nigerian', 'premium']
});
console.log(`Updated: ${updated.name} - new price: ${updated.price}`);
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "_id": "665b2c3d4e5f6a7b8c9d0f1a",
    "name": "Pepper Soup",
    "description": "Premium spicy traditional pepper soup with assorted meat",
    "mainCategory": "food",
    "category": "soups",
    "price": 5000,
    "costPerUnit": 1500,
    "isAvailable": true,
    "preparationTime": 20,
    "tags": ["soup", "spicy", "nigerian", "premium"],
    "allergens": ["shellfish"],
    "createdAt": "2026-03-07T10:15:00Z"
  },
  "meta": {
    "timestamp": "2026-03-07T10:30:00Z"
  }
}
```

#### Error Response (404 Not Found)

```json
{
  "success": false,
  "error": "Menu item not found"
}
```

---

### Part 6: Deleting Menu Items (Soft Delete)

Delete a menu item. This performs a soft delete by setting `isAvailable` to `false`. The item remains in the database but is no longer available for ordering.

**Endpoint:** `DELETE /api/public/menu/{itemId}`
**Scope Required:** `menu:write`
**Rate Limit:** 30 requests / minute

#### curl Example

```bash
curl -X DELETE "https://api.wawagardenbar.com/api/public/menu/665b2c3d4e5f6a7b8c9d0f1a" \
  -H "x-api-key: wawa_your_api_key_here"
```

#### JavaScript Example

```javascript
async function deleteMenuItem(itemId) {
  const response = await fetch(
    `https://api.wawagardenbar.com/api/public/menu/${itemId}`,
    {
      method: 'DELETE',
      headers: { 'x-api-key': process.env.WAWA_API_KEY }
    }
  );
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to delete menu item');
  }

  return result.data;
}

try {
  const result = await deleteMenuItem('665b2c3d4e5f6a7b8c9d0f1a');
  console.log(result.message);
} catch (error) {
  console.error('Failed to delete menu item:', error.message);
}
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "message": "Menu item has been soft-deleted (isAvailable set to false)",
    "itemId": "665b2c3d4e5f6a7b8c9d0f1a"
  },
  "meta": {
    "timestamp": "2026-03-07T10:45:00Z"
  }
}
```

> **Important:** Soft-deleted items can be restored by updating the item with `isAvailable: true` using the PATCH endpoint (Part 5). All actions are recorded in the audit log.

---

## Complete Workflow Example

### Scenario: AI Agent Manages Menu Updates

This workflow demonstrates the full end-to-end flow: listing categories, searching items, creating a new item, updating pricing, and removing a discontinued item.

```javascript
const API_BASE = 'https://api.wawagardenbar.com';
const headers = {
  'x-api-key': process.env.WAWA_API_KEY,
  'Content-Type': 'application/json'
};

// -- Helper: Get categories ---------------------------------------------
async function getCategories() {
  const response = await fetch(`${API_BASE}/api/public/menu/categories`, { headers });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Helper: Search menu items ------------------------------------------
async function searchMenu(query) {
  const url = new URL(`${API_BASE}/api/public/menu`);
  url.searchParams.append('q', query);
  url.searchParams.append('limit', '10');

  const response = await fetch(url, { headers });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result;
}

// -- Helper: Get single item --------------------------------------------
async function getMenuItem(itemId) {
  const response = await fetch(`${API_BASE}/api/public/menu/${itemId}`, { headers });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Helper: Create menu item -------------------------------------------
async function createMenuItem(itemData) {
  const response = await fetch(`${API_BASE}/api/public/menu`, {
    method: 'POST',
    headers,
    body: JSON.stringify(itemData)
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Helper: Update menu item -------------------------------------------
async function updateMenuItem(itemId, updates) {
  const response = await fetch(`${API_BASE}/api/public/menu/${itemId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(updates)
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Helper: Delete menu item -------------------------------------------
async function deleteMenuItem(itemId) {
  const response = await fetch(`${API_BASE}/api/public/menu/${itemId}`, {
    method: 'DELETE',
    headers
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result.data;
}

// -- Run the complete workflow ------------------------------------------
async function manageMenuUpdates() {
  try {
    // Step 1: Check available categories
    const categories = await getCategories();
    console.log('Available food categories:', categories.food.join(', '));
    console.log('Available drink categories:', categories.drinks.join(', '));

    // Step 2: Search for existing items before adding
    const existing = await searchMenu('pepper soup');
    if (existing.meta.total > 0) {
      console.log('Pepper soup already exists on the menu');
      return;
    }

    // Step 3: Create a new menu item
    const newItem = await createMenuItem({
      name: 'Pepper Soup',
      description: 'Spicy traditional pepper soup with assorted meat',
      mainCategory: 'food',
      category: 'soups',
      price: 4500,
      costPerUnit: 1500,
      preparationTime: 20,
      tags: ['soup', 'spicy', 'nigerian'],
      allergens: ['pepper'],
      trackInventory: true
    });
    console.log(`Created: ${newItem.name} (${newItem._id})`);

    // Step 4: Update the price after review
    const updated = await updateMenuItem(newItem._id, {
      price: 5000,
      description: 'Premium spicy traditional pepper soup with assorted meat'
    });
    console.log(`Updated price: ${updated.price}`);

    // Step 5: Soft-delete a discontinued item
    const discontinued = await deleteMenuItem('665c3d4e5f6a7b8c9d0e1f2b');
    console.log(discontinued.message);

    return { created: newItem, updated, discontinued };
  } catch (error) {
    console.error('Error managing menu:', error.message);
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

### Validate Before Sending

```javascript
function validateCreateMenuItemPayload(payload) {
  const errors = [];

  if (!payload.name || typeof payload.name !== 'string') {
    errors.push('name is required and must be a string');
  }
  if (!payload.description || typeof payload.description !== 'string') {
    errors.push('description is required and must be a string');
  }
  if (!payload.mainCategory || !['drinks', 'food'].includes(payload.mainCategory)) {
    errors.push('mainCategory must be "drinks" or "food"');
  }
  if (!payload.category || typeof payload.category !== 'string') {
    errors.push('category is required and must be a string');
  }
  if (payload.price === undefined || typeof payload.price !== 'number' || payload.price < 0) {
    errors.push('price must be a number >= 0');
  }
  if (payload.costPerUnit === undefined || typeof payload.costPerUnit !== 'number' || payload.costPerUnit < 0) {
    errors.push('costPerUnit must be a number >= 0');
  }
  if (payload.preparationTime === undefined || typeof payload.preparationTime !== 'number' || payload.preparationTime < 0) {
    errors.push('preparationTime must be a number >= 0');
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  return true;
}

function validateUpdateMenuItemPayload(payload) {
  const errors = [];
  const allowedFields = [
    'name', 'description', 'mainCategory', 'category', 'price', 'costPerUnit',
    'images', 'customizations', 'isAvailable', 'preparationTime', 'servingSize',
    'tags', 'allergens', 'nutritionalInfo', 'slug', 'metaDescription',
    'trackInventory', 'pointsValue', 'pointsRedeemable', 'portionOptions',
    'allowManualPriceOverride'
  ];
  const providedFields = Object.keys(payload);

  providedFields.forEach(field => {
    if (!allowedFields.includes(field)) {
      errors.push(`Field "${field}" is not an allowed update field`);
    }
  });

  if (payload.price !== undefined && (typeof payload.price !== 'number' || payload.price < 0)) {
    errors.push('price must be a number >= 0');
  }
  if (payload.costPerUnit !== undefined && (typeof payload.costPerUnit !== 'number' || payload.costPerUnit < 0)) {
    errors.push('costPerUnit must be a number >= 0');
  }
  if (payload.mainCategory !== undefined && !['drinks', 'food'].includes(payload.mainCategory)) {
    errors.push('mainCategory must be "drinks" or "food"');
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  return true;
}
```

---

## Quick Reference

### List Menu Items

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/menu?mainCategory=food&limit=10" \
  -H "x-api-key: wawa_your_api_key_here"
```

### Get Categories

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/menu/categories" \
  -H "x-api-key: wawa_your_api_key_here"
```

### Get Single Item

```bash
curl -X GET "https://api.wawagardenbar.com/api/public/menu/665a1b2c3d4e5f6a7b8c9d0e" \
  -H "x-api-key: wawa_your_api_key_here"
```

### Create Menu Item

```json
POST /api/public/menu
{
  "name": "Pepper Soup",
  "description": "Spicy traditional pepper soup",
  "mainCategory": "food",
  "category": "soups",
  "price": 4500,
  "costPerUnit": 1500,
  "preparationTime": 20
}
```

### Update Menu Item

```json
PATCH /api/public/menu/{itemId}
{
  "price": 5000,
  "tags": ["soup", "spicy", "premium"]
}
```

### Delete Menu Item (Soft Delete)

```bash
curl -X DELETE "https://api.wawagardenbar.com/api/public/menu/665b2c3d4e5f6a7b8c9d0f1a" \
  -H "x-api-key: wawa_your_api_key_here"
```

---

## API Endpoints Summary

| Endpoint | Method | Purpose | Required Scopes |
|----------|--------|---------|-----------------|
| `/api/public/menu` | GET | List/search menu items | `menu:read` |
| `/api/public/menu` | POST | Create new menu item | `menu:write` |
| `/api/public/menu/categories` | GET | Get menu categories | `menu:read` |
| `/api/public/menu/{itemId}` | GET | Get single menu item | `menu:read` |
| `/api/public/menu/{itemId}` | PATCH | Update menu item | `menu:write` |
| `/api/public/menu/{itemId}` | DELETE | Soft-delete menu item | `menu:write` |

---

## Troubleshooting

### Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid API key | Verify API key is correct and active |
| `403 Forbidden` | Insufficient scopes | Request API key with `menu:read` and/or `menu:write` scopes |
| `429 Too Many Requests` | Rate limit exceeded (30 req/min) | Implement rate limiting and retry logic with backoff |
| `400` "name is required" | Missing required field on creation | Ensure all required fields are included: name, description, mainCategory, category, price, costPerUnit, preparationTime |
| `400` "mainCategory must be \"drinks\" or \"food\"" | Invalid main category value | Use only `"drinks"` or `"food"` for mainCategory |
| `400` "price must be a number >= 0" | Invalid price value | Provide a non-negative number for price |
| `400` "Invalid item ID" | Malformed MongoDB ObjectId | Verify the itemId is a valid 24-character hex string |
| `400` "Invalid JSON body" | Malformed request body | Ensure the request body is valid JSON with correct Content-Type header |
| `404` "Menu item not found" | Invalid itemId | Verify the item ID exists using the list endpoint |
| `500` "Failed to create menu item" | Server-side error | Retry the request; contact support if persistent |

---

## Related Documentation

- API Reference: `/docs/api/public-api-reference.md`
- Authentication Guide: `/docs/api/authentication.md`
- Error Codes: `/docs/api/error-codes.md`
- SOP-MANUAL-ADMIN-002: Manual Menu Management (Admin Panel)
- SOP-AGENTIC-006: Agentic API Inventory Management

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
