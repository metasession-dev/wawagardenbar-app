/**
 * Public API documentation specification.
 * Drives the /docs/api page rendering.
 */

export interface ApiParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
  default?: string;
}

export interface ApiStatusCode {
  code: number;
  description: string;
}

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  summary: string;
  description: string;
  scopes: string[];
  pathParams?: ApiParam[];
  queryParams?: ApiParam[];
  requestBody?: ApiParam[];
  responseFields: ApiParam[];
  statusCodes: ApiStatusCode[];
  requestExample?: string;
  responseExample: string;
}

export interface ApiSection {
  title: string;
  slug: string;
  description: string;
  endpoints: ApiEndpoint[];
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  POST: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  PATCH: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  PUT: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  DELETE: 'bg-red-500/15 text-red-700 dark:text-red-400',
};

export { METHOD_COLORS };

export const API_BASE_URL = '/api/public';

export const API_AUTH_INFO = {
  header: 'x-api-key',
  alternativeHeader: 'Authorization: Bearer wawa_...',
  keyFormat: 'wawa_{prefix}_{randomHex}',
  rateLimit: '30 requests / minute',
};

export const API_SECTIONS: ApiSection[] = [
  // ─── Health ────────────────────────────────────────
  {
    title: 'Health',
    slug: 'health',
    description: 'Service availability and uptime checks. No authentication required.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/public/health',
        summary: 'Health check',
        description: 'Returns service status, version, uptime, and current timestamp. No authentication required. Useful for monitoring, load balancers, and availability probes.',
        scopes: [],
        responseFields: [
          { name: 'data.status', type: 'string', required: true, description: '"healthy"' },
          { name: 'data.service', type: 'string', required: true, description: 'Service identifier' },
          { name: 'data.version', type: 'string', required: true, description: 'API version' },
          { name: 'data.uptime', type: 'number', required: true, description: 'Process uptime in seconds' },
          { name: 'data.timestamp', type: 'string', required: true, description: 'ISO 8601 timestamp' },
        ],
        statusCodes: [{ code: 200, description: 'Service is healthy' }],
        responseExample: `{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "wawa-garden-bar-api",
    "version": "1.0.0",
    "uptime": 84523.45,
    "timestamp": "2025-06-01T12:00:00.000Z"
  }
}`,
      },
    ],
  },

  // ─── Menu ──────────────────────────────────────────
  {
    title: 'Menu',
    slug: 'menu',
    description: 'Browse menu items, categories, and individual item details with stock status.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/public/menu',
        summary: 'List menu items',
        description: 'List all available menu items with stock status. Supports filtering by mainCategory, category, and free-text search.',
        scopes: ['menu:read'],
        queryParams: [
          { name: 'mainCategory', type: 'string', required: false, description: '"drinks" | "food"' },
          { name: 'category', type: 'string', required: false, description: 'Sub-category slug (e.g. "beer-local", "starters")' },
          { name: 'q', type: 'string', required: false, description: 'Free-text search across name, description, tags' },
          { name: 'page', type: 'number', required: false, description: 'Page number (1-indexed)', default: '1' },
          { name: 'limit', type: 'number', required: false, description: 'Items per page (max 100)', default: '25' },
        ],
        responseFields: [
          { name: 'data[]._id', type: 'string', required: true, description: 'Menu item ID' },
          { name: 'data[].name', type: 'string', required: true, description: 'Display name' },
          { name: 'data[].mainCategory', type: 'string', required: true, description: '"drinks" | "food"' },
          { name: 'data[].category', type: 'string', required: true, description: 'Sub-category slug' },
          { name: 'data[].price', type: 'number', required: true, description: 'Price in ₦' },
          { name: 'data[].isAvailable', type: 'boolean', required: true, description: 'Availability flag' },
          { name: 'data[].stockStatus', type: 'string', required: true, description: '"in-stock" | "low-stock" | "out-of-stock"' },
          { name: 'data[].preparationTime', type: 'number', required: true, description: 'Prep time in minutes' },
          { name: 'meta.page', type: 'number', required: true, description: 'Current page' },
          { name: 'meta.total', type: 'number', required: true, description: 'Total matching items' },
          { name: 'meta.totalPages', type: 'number', required: true, description: 'Total pages' },
        ],
        statusCodes: [
          { code: 200, description: 'Success with paginated menu items' },
          { code: 401, description: 'Missing or invalid API key' },
          { code: 403, description: 'API key lacks menu:read scope' },
          { code: 429, description: 'Rate limit exceeded' },
          { code: 500, description: 'Internal server error' },
        ],
        responseExample: `{
  "success": true,
  "data": [
    {
      "_id": "665a...",
      "name": "Jollof Rice",
      "mainCategory": "food",
      "category": "rice-dishes",
      "price": 3500,
      "stockStatus": "in-stock",
      "isAvailable": true,
      "preparationTime": 15
    }
  ],
  "meta": { "page": 1, "limit": 25, "total": 24, "totalPages": 1, "timestamp": "..." }
}`,
      },
      {
        method: 'GET',
        path: '/api/public/menu/categories',
        summary: 'List menu categories',
        description: 'List available menu categories grouped by main category. Returns enabled categories from system settings.',
        scopes: ['menu:read'],
        responseFields: [
          { name: 'data.drinks', type: 'string[]', required: true, description: 'Drink sub-category slugs' },
          { name: 'data.food', type: 'string[]', required: true, description: 'Food sub-category slugs' },
        ],
        statusCodes: [
          { code: 200, description: 'Success' },
          { code: 401, description: 'Missing or invalid API key' },
          { code: 403, description: 'API key lacks menu:read scope' },
        ],
        responseExample: `{
  "success": true,
  "data": {
    "drinks": ["beer-local", "beer-imported", "wine", "soft-drinks"],
    "food": ["starters", "rice-dishes", "soups", "desserts"]
  },
  "meta": { "timestamp": "2025-06-01T12:00:00.000Z" }
}`,
      },
      {
        method: 'GET',
        path: '/api/public/menu/{itemId}',
        summary: 'Get menu item',
        description: 'Get a single menu item by ID with full details, customizations, portion options, nutritional info, and stock status.',
        scopes: ['menu:read'],
        pathParams: [
          { name: 'itemId', type: 'string', required: true, description: 'MongoDB ObjectId of the menu item' },
        ],
        responseFields: [
          { name: 'data._id', type: 'string', required: true, description: 'Menu item ID' },
          { name: 'data.name', type: 'string', required: true, description: 'Display name' },
          { name: 'data.price', type: 'number', required: true, description: 'Price in ₦' },
          { name: 'data.customizations', type: 'Object[]', required: true, description: 'Customization groups with options' },
          { name: 'data.portionOptions', type: 'Object', required: true, description: 'Half/quarter portion config' },
          { name: 'data.stockStatus', type: 'string', required: true, description: '"in-stock" | "low-stock" | "out-of-stock"' },
          { name: 'data.nutritionalInfo', type: 'Object', required: false, description: 'Calories, spice level, etc.' },
          { name: 'data.allergens', type: 'string[]', required: true, description: 'Allergen warnings' },
        ],
        statusCodes: [
          { code: 200, description: 'Success' },
          { code: 404, description: 'Menu item not found' },
        ],
        responseExample: `{
  "success": true,
  "data": {
    "_id": "665a...",
    "name": "Jollof Rice",
    "mainCategory": "food",
    "price": 3500,
    "stockStatus": "in-stock",
    "customizations": [
      { "name": "Protein", "required": false, "options": [{ "name": "Chicken", "price": 500 }] }
    ],
    "portionOptions": { "halfPortionEnabled": true, "halfPortionSurcharge": 0 }
  },
  "meta": { "timestamp": "..." }
}`,
      },
    ],
  },

  // ─── Inventory ─────────────────────────────────────
  {
    title: 'Inventory',
    slug: 'inventory',
    description: 'Manage stock levels, view location breakdowns, and monitor low-stock alerts.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/public/inventory',
        summary: 'List inventory items',
        description: 'List all inventory items with stock levels, linked menu item info, and status. Supports filtering by stock status.',
        scopes: ['inventory:read'],
        queryParams: [
          { name: 'status', type: 'string', required: false, description: '"in-stock" | "low-stock" | "out-of-stock"' },
          { name: 'page', type: 'number', required: false, description: 'Page number', default: '1' },
          { name: 'limit', type: 'number', required: false, description: 'Items per page (max 100)', default: '25' },
        ],
        responseFields: [
          { name: 'data[]._id', type: 'string', required: true, description: 'Inventory record ID' },
          { name: 'data[].menuItemId', type: 'Object', required: true, description: 'Populated menu item (name, price, category)' },
          { name: 'data[].currentStock', type: 'number', required: true, description: 'Current stock quantity' },
          { name: 'data[].minimumStock', type: 'number', required: true, description: 'Low-stock threshold' },
          { name: 'data[].unit', type: 'string', required: true, description: 'Unit of measure (bottles, portions, kg)' },
          { name: 'data[].status', type: 'string', required: true, description: '"in-stock" | "low-stock" | "out-of-stock"' },
          { name: 'data[].costPerUnit', type: 'number', required: true, description: 'Cost per unit in ₦' },
        ],
        statusCodes: [
          { code: 200, description: 'Success with paginated inventory' },
          { code: 401, description: 'Missing or invalid API key' },
          { code: 403, description: 'API key lacks inventory:read scope' },
        ],
        responseExample: `{
  "success": true,
  "data": [
    {
      "_id": "665b...",
      "menuItemId": { "_id": "665a...", "name": "Star Lager", "price": 800 },
      "currentStock": 48,
      "minimumStock": 10,
      "unit": "bottles",
      "status": "in-stock",
      "costPerUnit": 450
    }
  ],
  "meta": { "page": 1, "limit": 25, "total": 15, "totalPages": 1, "timestamp": "..." }
}`,
      },
      {
        method: 'GET',
        path: '/api/public/inventory/{inventoryId}',
        summary: 'Get inventory item detail',
        description: 'Get a single inventory item with full details, location breakdown, waste statistics, and profit margin analytics.',
        scopes: ['inventory:read'],
        pathParams: [
          { name: 'inventoryId', type: 'string', required: true, description: 'MongoDB ObjectId of the inventory record' },
        ],
        responseFields: [
          { name: 'data.currentStock', type: 'number', required: true, description: 'Current stock quantity' },
          { name: 'data.locationBreakdown', type: 'Object', required: true, description: 'Per-location stock detail' },
          { name: 'data.wasteStats', type: 'Object', required: true, description: 'Waste analytics' },
          { name: 'data.profitMargin', type: 'Object', required: true, description: 'Profit analytics (costPerUnit, margin%)' },
        ],
        statusCodes: [
          { code: 200, description: 'Success with full detail' },
          { code: 404, description: 'Inventory item not found' },
        ],
        responseExample: `{
  "success": true,
  "data": {
    "_id": "665b...",
    "menuItemId": { "name": "Star Lager", "price": 800 },
    "currentStock": 48,
    "status": "in-stock",
    "locationBreakdown": { "trackByLocation": true, "totalStock": 48, "locations": [...] },
    "wasteStats": { "totalWaste": 3, "wasteRate": 0.06 },
    "profitMargin": { "costPerUnit": 450, "sellingPrice": 800, "marginPercentage": 43.75 }
  },
  "meta": { "timestamp": "..." }
}`,
      },
      {
        method: 'PATCH',
        path: '/api/public/inventory/{inventoryId}',
        summary: 'Adjust stock',
        description: 'Adjust stock for an inventory item — add (restock) or deduct (sale, waste, etc.). Records full audit trail.',
        scopes: ['inventory:write'],
        pathParams: [
          { name: 'inventoryId', type: 'string', required: true, description: 'MongoDB ObjectId of the inventory record' },
        ],
        requestBody: [
          { name: 'type', type: 'string', required: true, description: '"addition" | "deduction"' },
          { name: 'quantity', type: 'number', required: true, description: 'Positive quantity to add/deduct' },
          { name: 'reason', type: 'string', required: true, description: 'Human-readable reason (min 2 chars)' },
          { name: 'location', type: 'string', required: false, description: 'Location ID (defaults to "default")' },
          { name: 'category', type: 'string', required: false, description: '"sale" | "waste" | "damage" | "adjustment" | "other"' },
          { name: 'costPerUnit', type: 'number', required: false, description: 'Cost per unit (addition only)' },
          { name: 'supplier', type: 'string', required: false, description: 'Supplier name (addition only)' },
          { name: 'invoiceNumber', type: 'string', required: false, description: 'Invoice reference (addition only)' },
        ],
        responseFields: [
          { name: 'data', type: 'Object', required: true, description: 'Updated inventory item' },
        ],
        statusCodes: [
          { code: 200, description: 'Stock adjusted, updated item returned' },
          { code: 400, description: 'Invalid body' },
          { code: 422, description: 'Business error (e.g. insufficient stock)' },
        ],
        requestExample: `{
  "type": "addition",
  "quantity": 24,
  "reason": "Weekly restock from supplier",
  "costPerUnit": 450,
  "supplier": "Star Brewery",
  "invoiceNumber": "INV-2025-0042"
}`,
        responseExample: `{
  "success": true,
  "data": {
    "_id": "665b...",
    "currentStock": 72,
    "status": "in-stock",
    ...
  },
  "meta": { "timestamp": "..." }
}`,
      },
      {
        method: 'GET',
        path: '/api/public/inventory/alerts',
        summary: 'Get stock alerts',
        description: 'Get low-stock and out-of-stock alerts across all inventory, including location-level alerts.',
        scopes: ['inventory:read'],
        responseFields: [
          { name: 'data.lowStock', type: 'Object[]', required: true, description: 'Items with "low-stock" status' },
          { name: 'data.outOfStock', type: 'Object[]', required: true, description: 'Items with "out-of-stock" status' },
          { name: 'data.locationAlerts', type: 'Object[]', required: true, description: 'Per-location critical alerts' },
          { name: 'data.summary', type: 'Object', required: true, description: 'Aggregate counts' },
        ],
        statusCodes: [
          { code: 200, description: 'Success with alert data' },
        ],
        responseExample: `{
  "success": true,
  "data": {
    "lowStock": [{ "menuItemId": { "name": "Star Lager" }, "currentStock": 5, ... }],
    "outOfStock": [{ "menuItemId": { "name": "Hennessy VS" }, "currentStock": 0, ... }],
    "locationAlerts": [{ "location": "bar-1", "currentStock": 0, "severity": "critical" }],
    "summary": { "lowStockCount": 4, "outOfStockCount": 1, "locationAlertCount": 2 }
  },
  "meta": { "timestamp": "..." }
}`,
      },
      {
        method: 'GET',
        path: '/api/public/inventory/summary',
        summary: 'Inventory summary',
        description: 'Aggregate inventory summary with totals, stock value, status distribution, category breakdowns, restock needs, and high-value items. Optimized for AI agent dashboards.',
        scopes: ['inventory:read'],
        queryParams: [
          { name: 'mainCategory', type: 'string', required: false, description: '"drinks" | "food" — filter by main category' },
        ],
        responseFields: [
          { name: 'data.totals.totalItems', type: 'number', required: true, description: 'Total inventory items' },
          { name: 'data.totals.totalStockUnits', type: 'number', required: true, description: 'Sum of all current stock' },
          { name: 'data.totals.totalStockValue', type: 'number', required: true, description: 'Total stock value in ₦' },
          { name: 'data.totals.averageCostPerUnit', type: 'number', required: true, description: 'Avg cost per unit in ₦' },
          { name: 'data.byStatus', type: 'Object', required: true, description: '{ inStock, lowStock, outOfStock } counts' },
          { name: 'data.byCategory', type: 'Object[]', required: true, description: '{ mainCategory, category, itemCount, totalStock, totalValue }' },
          { name: 'data.needsRestock', type: 'Object[]', required: true, description: 'Items where currentStock ≤ minimumStock' },
          { name: 'data.highValueItems', type: 'Object[]', required: true, description: 'Top 10 by stock value' },
        ],
        statusCodes: [{ code: 200, description: 'Summary returned' }],
        responseExample: `{
  "success": true,
  "data": {
    "totals": { "totalItems": 87, "totalStockUnits": 1240, "totalStockValue": 558000, "averageCostPerUnit": 450 },
    "byStatus": { "inStock": 72, "lowStock": 10, "outOfStock": 5 },
    "byCategory": [{ "mainCategory": "drinks", "category": "beer-local", "itemCount": 8, "totalStock": 240, "totalValue": 108000 }],
    "needsRestock": [{ "name": "Star Lager", "currentStock": 3, "minimumStock": 10, "unit": "bottles", "deficit": 7 }],
    "highValueItems": [{ "name": "Hennessy VS", "currentStock": 6, "costPerUnit": 15000, "totalValue": 90000, "unit": "bottles" }]
  },
  "meta": { "timestamp": "..." }
}`,
      },
    ],
  },

  // ─── Orders ────────────────────────────────────────
  {
    title: 'Orders',
    slug: 'orders',
    description: 'Create, list, update, and track orders with full lifecycle management.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/public/orders',
        summary: 'List orders',
        description: 'List orders with rich filtering, sorting, and pagination. If orderNumber is provided, returns a single order directly.',
        scopes: ['orders:read'],
        queryParams: [
          { name: 'status', type: 'string', required: false, description: '"pending" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled"' },
          { name: 'orderType', type: 'string', required: false, description: '"dine-in" | "pickup" | "delivery" | "pay-now"' },
          { name: 'paymentStatus', type: 'string', required: false, description: '"pending" | "paid" | "failed" | "cancelled" | "refunded"' },
          { name: 'startDate', type: 'string', required: false, description: 'ISO 8601 start date' },
          { name: 'endDate', type: 'string', required: false, description: 'ISO 8601 end date' },
          { name: 'customerId', type: 'string', required: false, description: 'Filter by user MongoDB ObjectId' },
          { name: 'orderNumber', type: 'string', required: false, description: 'Exact order number lookup' },
          { name: 'sort', type: 'string', required: false, description: '"createdAt" | "-createdAt" | "total" | "-total"', default: '-createdAt' },
          { name: 'page', type: 'number', required: false, description: 'Page number', default: '1' },
          { name: 'limit', type: 'number', required: false, description: 'Items per page (max 100)', default: '25' },
        ],
        responseFields: [
          { name: 'data[].orderNumber', type: 'string', required: true, description: 'e.g. "WGB-A1B2C3"' },
          { name: 'data[].orderType', type: 'string', required: true, description: 'Order type' },
          { name: 'data[].status', type: 'string', required: true, description: 'Current status' },
          { name: 'data[].items', type: 'Object[]', required: true, description: 'Line items' },
          { name: 'data[].total', type: 'number', required: true, description: 'Total in ₦' },
          { name: 'data[].paymentStatus', type: 'string', required: false, description: 'Payment status' },
          { name: 'data[].userId', type: 'Object', required: false, description: 'Populated user info' },
        ],
        statusCodes: [
          { code: 200, description: 'Paginated orders' },
          { code: 404, description: 'Order not found (orderNumber lookup)' },
        ],
        responseExample: `{
  "success": true,
  "data": [
    {
      "orderNumber": "WGB-A1B2C3",
      "orderType": "dine-in",
      "status": "completed",
      "items": [{ "name": "Jollof Rice", "quantity": 2, "subtotal": 7000 }],
      "total": 7350,
      "paymentStatus": "paid"
    }
  ],
  "meta": { "page": 1, "limit": 25, "total": 42, "totalPages": 2, "timestamp": "..." }
}`,
      },
      {
        method: 'POST',
        path: '/api/public/orders',
        summary: 'Create order',
        description: 'Create a new order. Items must reference valid menu item IDs. Generates order number, calculates wait time, and optionally deducts inventory.',
        scopes: ['orders:write'],
        requestBody: [
          { name: 'orderType', type: 'string', required: true, description: '"dine-in" | "pickup" | "delivery" | "pay-now"' },
          { name: 'items', type: 'Object[]', required: true, description: 'Line items (min 1)' },
          { name: 'items[].menuItemId', type: 'string', required: true, description: 'Menu item MongoDB ObjectId' },
          { name: 'items[].name', type: 'string', required: true, description: 'Item display name' },
          { name: 'items[].price', type: 'number', required: true, description: 'Unit price in ₦' },
          { name: 'items[].quantity', type: 'number', required: true, description: 'Quantity' },
          { name: 'items[].subtotal', type: 'number', required: true, description: 'Line item subtotal' },
          { name: 'items[].portionSize', type: 'string', required: false, description: '"full" | "half" | "quarter"', default: 'full' },
          { name: 'total', type: 'number', required: true, description: 'Final total in ₦' },
          { name: 'subtotal', type: 'number', required: false, description: 'Order subtotal' },
          { name: 'tax', type: 'number', required: false, description: 'Tax amount' },
          { name: 'deliveryFee', type: 'number', required: false, description: 'Delivery fee (0 if not delivery)' },
          { name: 'discount', type: 'number', required: false, description: 'Discount amount' },
          { name: 'userId', type: 'string', required: false, description: 'Registered user ObjectId' },
          { name: 'guestEmail', type: 'string', required: false, description: 'Guest email' },
          { name: 'guestName', type: 'string', required: false, description: 'Guest name' },
          { name: 'dineInDetails', type: 'Object', required: false, description: '{ tableNumber: string } — required for dine-in' },
          { name: 'deliveryDetails', type: 'Object', required: false, description: '{ address: {...} } — required for delivery' },
          { name: 'pickupDetails', type: 'Object', required: false, description: '{ preferredPickupTime: ISO } — required for pickup' },
        ],
        responseFields: [
          { name: 'data._id', type: 'string', required: true, description: 'Order ID' },
          { name: 'data.orderNumber', type: 'string', required: true, description: 'Generated order number' },
          { name: 'data.status', type: 'string', required: true, description: '"pending"' },
          { name: 'data.estimatedWaitTime', type: 'number', required: true, description: 'Minutes' },
        ],
        statusCodes: [
          { code: 201, description: 'Order created' },
          { code: 400, description: 'Invalid body' },
          { code: 422, description: 'Business error' },
        ],
        requestExample: `{
  "orderType": "dine-in",
  "items": [
    {
      "menuItemId": "665a...",
      "name": "Jollof Rice",
      "price": 3500,
      "quantity": 2,
      "subtotal": 7000
    }
  ],
  "subtotal": 7000,
  "tax": 350,
  "deliveryFee": 0,
  "discount": 0,
  "total": 7350,
  "guestName": "Ada Obi",
  "dineInDetails": { "tableNumber": "T5" }
}`,
        responseExample: `{
  "success": true,
  "data": {
    "_id": "665d...",
    "orderNumber": "WGB-A1B2C3",
    "status": "pending",
    "estimatedWaitTime": 15,
    "total": 7350,
    ...
  },
  "meta": { "timestamp": "..." }
}`,
      },
      {
        method: 'GET',
        path: '/api/public/orders/{orderId}',
        summary: 'Get order detail',
        description: 'Get a single order by ID with full details including items, customer info, payment data, status history, and financials.',
        scopes: ['orders:read'],
        pathParams: [
          { name: 'orderId', type: 'string', required: true, description: 'MongoDB ObjectId of the order' },
        ],
        responseFields: [
          { name: 'data.orderNumber', type: 'string', required: true, description: 'Order number' },
          { name: 'data.status', type: 'string', required: true, description: 'Current status' },
          { name: 'data.items', type: 'Object[]', required: true, description: 'Line items with full detail' },
          { name: 'data.total', type: 'number', required: true, description: 'Final total in ₦' },
          { name: 'data.statusHistory', type: 'Object[]', required: true, description: 'Status change log' },
          { name: 'data.grossProfit', type: 'number', required: true, description: 'Gross profit in ₦' },
        ],
        statusCodes: [
          { code: 200, description: 'Success' },
          { code: 404, description: 'Order not found' },
        ],
        responseExample: `{
  "success": true,
  "data": {
    "orderNumber": "WGB-A1B2C3",
    "orderType": "dine-in",
    "status": "preparing",
    "items": [...],
    "total": 7350,
    "paymentStatus": "paid",
    "statusHistory": [{ "status": "pending", "timestamp": "..." }, ...]
  },
  "meta": { "timestamp": "..." }
}`,
      },
      {
        method: 'PATCH',
        path: '/api/public/orders/{orderId}',
        summary: 'Update order status',
        description: 'Update order status. Supports the full lifecycle: pending → confirmed → preparing → ready → completed. Setting "cancelled" uses the cancellation flow.',
        scopes: ['orders:write'],
        pathParams: [
          { name: 'orderId', type: 'string', required: true, description: 'MongoDB ObjectId of the order' },
        ],
        requestBody: [
          { name: 'status', type: 'string', required: true, description: '"pending" | "confirmed" | "preparing" | "ready" | "out-for-delivery" | "delivered" | "completed" | "cancelled"' },
          { name: 'note', type: 'string', required: false, description: 'Optional note (recommended)' },
        ],
        responseFields: [
          { name: 'data', type: 'Object', required: true, description: 'Updated order' },
        ],
        statusCodes: [
          { code: 200, description: 'Status updated' },
          { code: 400, description: 'Invalid status' },
          { code: 404, description: 'Order not found' },
          { code: 422, description: 'Invalid transition' },
        ],
        requestExample: `{ "status": "preparing", "note": "Kitchen started" }`,
        responseExample: `{
  "success": true,
  "data": { "orderNumber": "WGB-A1B2C3", "status": "preparing", ... },
  "meta": { "timestamp": "..." }
}`,
      },
      {
        method: 'GET',
        path: '/api/public/orders/stats',
        summary: 'Get order statistics',
        description: 'Get aggregate order statistics including totals, revenue, average order value, and breakdowns by status and type.',
        scopes: ['orders:read'],
        queryParams: [
          { name: 'startDate', type: 'string', required: false, description: 'ISO 8601 start date' },
          { name: 'endDate', type: 'string', required: false, description: 'ISO 8601 end date' },
        ],
        responseFields: [
          { name: 'data.totalOrders', type: 'number', required: true, description: 'Total orders' },
          { name: 'data.totalRevenue', type: 'number', required: true, description: 'Sum of totals in ₦' },
          { name: 'data.averageOrderValue', type: 'number', required: true, description: 'Average in ₦' },
          { name: 'data.byStatus', type: 'Object', required: true, description: 'Count by status' },
          { name: 'data.byOrderType', type: 'Object', required: true, description: 'Count by type' },
        ],
        statusCodes: [{ code: 200, description: 'Statistics returned' }],
        responseExample: `{
  "success": true,
  "data": {
    "totalOrders": 342,
    "totalRevenue": 1250000,
    "averageOrderValue": 3655,
    "byStatus": { "completed": 280, "cancelled": 12, "pending": 5 },
    "byOrderType": { "dine-in": 180, "pickup": 90, "delivery": 72 }
  },
  "meta": { "timestamp": "..." }
}`,
      },
      {
        method: 'GET',
        path: '/api/public/orders/summary',
        summary: 'Period-based order summary',
        description: 'Rich order summary with period presets (today, this-week, this-month, this-quarter, this-year, last-7-days, last-30-days, last-90-days, custom). Returns revenue, averages, type distribution, payment method breakdown, peak hours, and daily time-series. Optimized for AI agent dashboards.',
        scopes: ['orders:read'],
        queryParams: [
          { name: 'period', type: 'string', required: false, description: '"today" | "yesterday" | "this-week" | "last-week" | "this-month" | "last-month" | "this-quarter" | "last-quarter" | "this-year" | "last-year" | "last-7-days" | "last-30-days" | "last-90-days" | "custom"', default: 'today' },
          { name: 'startDate', type: 'string', required: false, description: 'ISO 8601 start date (required when period is "custom")' },
          { name: 'endDate', type: 'string', required: false, description: 'ISO 8601 end date (required when period is "custom")' },
          { name: 'orderType', type: 'string', required: false, description: '"dine-in" | "pickup" | "delivery" | "pay-now"' },
        ],
        responseFields: [
          { name: 'data.period', type: 'Object', required: true, description: '{ label, startDate, endDate }' },
          { name: 'data.totals', type: 'Object', required: true, description: '{ totalOrders, totalRevenue, averageOrderValue, completedOrders, cancelledOrders, cancellationRate }' },
          { name: 'data.byType', type: 'Object', required: true, description: '{ "dine-in": { count, revenue }, ... }' },
          { name: 'data.byStatus', type: 'Object', required: true, description: '{ pending, confirmed, preparing, ... }' },
          { name: 'data.byPaymentMethod', type: 'Object', required: true, description: '{ cash: { count, revenue }, card: { count, revenue }, ... }' },
          { name: 'data.peakHours', type: 'Object[]', required: true, description: '[{ hour: 0-23, orderCount, revenue }] sorted desc' },
          { name: 'data.dailySeries', type: 'Object[]', required: true, description: '[{ date, orderCount, revenue, avgValue }]' },
        ],
        statusCodes: [{ code: 200, description: 'Summary returned' }],
        responseExample: `{
  "success": true,
  "data": {
    "period": { "label": "This Week", "startDate": "2025-06-02T00:00:00.000Z", "endDate": "2025-06-08T23:59:59.999Z" },
    "totals": { "totalOrders": 85, "totalRevenue": 425000, "averageOrderValue": 5000, "completedOrders": 72, "cancelledOrders": 3, "cancellationRate": 3.53 },
    "byType": { "dine-in": { "count": 50, "revenue": 280000 }, "pickup": { "count": 20, "revenue": 90000 } },
    "byStatus": { "completed": 72, "pending": 5, "preparing": 3 },
    "byPaymentMethod": { "card": { "count": 40, "revenue": 200000 }, "cash": { "count": 25, "revenue": 125000 } },
    "peakHours": [{ "hour": 19, "orderCount": 15, "revenue": 75000 }, { "hour": 13, "orderCount": 12, "revenue": 60000 }],
    "dailySeries": [{ "date": "2025-06-02", "orderCount": 12, "revenue": 60000, "avgValue": 5000 }]
  },
  "meta": { "timestamp": "..." }
}`,
      },
    ],
  },

  // ─── Payments ──────────────────────────────────────
  {
    title: 'Payments',
    slug: 'payments',
    description: 'Initialize, verify, and record payments for orders.',
    endpoints: [
      {
        method: 'POST',
        path: '/api/public/payments',
        summary: 'Initialize payment',
        description: 'Initialize a payment transaction for an existing order. Returns a checkout URL for the active payment provider (Monnify or Paystack).',
        scopes: ['payments:write'],
        requestBody: [
          { name: 'orderId', type: 'string', required: true, description: 'Order MongoDB ObjectId' },
          { name: 'customerName', type: 'string', required: true, description: 'Full customer name' },
          { name: 'customerEmail', type: 'string', required: true, description: 'Customer email' },
          { name: 'redirectUrl', type: 'string', required: true, description: 'URL to redirect after payment' },
          { name: 'paymentMethods', type: 'string[]', required: false, description: 'Restrict methods e.g. ["CARD","ACCOUNT_TRANSFER"]' },
        ],
        responseFields: [
          { name: 'data.checkoutUrl', type: 'string', required: true, description: 'Payment gateway checkout URL' },
          { name: 'data.paymentReference', type: 'string', required: true, description: 'Payment reference for verification' },
          { name: 'data.provider', type: 'string', required: true, description: '"monnify" | "paystack"' },
          { name: 'data.amount', type: 'number', required: true, description: 'Amount in ₦' },
        ],
        statusCodes: [
          { code: 201, description: 'Payment initialized' },
          { code: 400, description: 'Missing required fields' },
          { code: 404, description: 'Order not found' },
          { code: 409, description: 'Order already paid' },
          { code: 422, description: 'Gateway error' },
        ],
        requestExample: `{
  "orderId": "665d1e2f3a4b5c6d7e8f9a0b",
  "customerName": "Ada Obi",
  "customerEmail": "ada@example.com",
  "redirectUrl": "https://myapp.com/payment/callback"
}`,
        responseExample: `{
  "success": true,
  "data": {
    "checkoutUrl": "https://checkout.monnify.com/...",
    "paymentReference": "PAY-665d-1719500000-AB1C2D",
    "provider": "monnify",
    "orderNumber": "WGB-A1B2C3",
    "amount": 7350
  },
  "meta": { "timestamp": "..." }
}`,
      },
      {
        method: 'POST',
        path: '/api/public/payments/verify',
        summary: 'Verify payment',
        description: 'Verify payment status by reference. Queries the active payment provider. Automatically updates the order on success.',
        scopes: ['payments:read'],
        requestBody: [
          { name: 'paymentReference', type: 'string', required: true, description: 'Payment reference from initialization' },
        ],
        responseFields: [
          { name: 'data.status', type: 'string', required: true, description: '"PAID" | "PENDING" | "FAILED"' },
          { name: 'data.amount', type: 'number', required: true, description: 'Amount in ₦' },
          { name: 'data.paidAt', type: 'string', required: false, description: 'ISO 8601 payment timestamp' },
          { name: 'data.provider', type: 'string', required: true, description: 'Payment provider used' },
        ],
        statusCodes: [
          { code: 200, description: 'Verification result' },
          { code: 400, description: 'Missing reference' },
          { code: 422, description: 'Gateway error' },
        ],
        requestExample: `{ "paymentReference": "PAY-665d-1719500000-AB1C2D" }`,
        responseExample: `{
  "success": true,
  "data": {
    "paymentReference": "PAY-665d-1719500000-AB1C2D",
    "status": "PAID",
    "amount": 7350,
    "paidAt": "2025-06-01T12:05:30.000Z",
    "provider": "monnify"
  },
  "meta": { "timestamp": "..." }
}`,
      },
      {
        method: 'POST',
        path: '/api/public/payments/{orderId}/manual',
        summary: 'Record manual payment',
        description: 'Record a manual (cash / bank transfer / POS card) payment. Marks the order as paid.',
        scopes: ['payments:write'],
        pathParams: [
          { name: 'orderId', type: 'string', required: true, description: 'Order MongoDB ObjectId' },
        ],
        requestBody: [
          { name: 'paymentType', type: 'string', required: true, description: '"cash" | "transfer" | "card"' },
          { name: 'paymentReference', type: 'string', required: true, description: 'Receipt/reference (min 3 chars)' },
          { name: 'comments', type: 'string', required: false, description: 'Staff comments' },
        ],
        responseFields: [
          { name: 'data', type: 'Object', required: true, description: 'Updated order with paymentStatus: "paid"' },
        ],
        statusCodes: [
          { code: 200, description: 'Payment recorded' },
          { code: 400, description: 'Invalid body' },
          { code: 422, description: 'Business error' },
        ],
        requestExample: `{
  "paymentType": "cash",
  "paymentReference": "CASH-20250601-001",
  "comments": "Paid at counter"
}`,
        responseExample: `{
  "success": true,
  "data": {
    "orderNumber": "WGB-A1B2C3",
    "paymentStatus": "paid",
    "paymentMethod": "cash",
    "paidAt": "2025-06-01T12:10:00.000Z",
    ...
  },
  "meta": { "timestamp": "..." }
}`,
      },
    ],
  },

  // ─── Sales Summary ──────────────────────────────────
  {
    title: 'Sales Summary',
    slug: 'sales',
    description: 'Comprehensive sales analytics with period presets, revenue breakdown, COGS, profit, top items, and daily time-series. Designed for AI agent dashboards and reporting automation.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/public/sales/summary',
        summary: 'Sales summary',
        description: 'Comprehensive, period-based sales summary. Supports preset periods (today, this-week, this-month, this-quarter, this-year, rolling windows) and custom date ranges. Returns revenue split by food/drinks, COGS, gross & net profit, payment breakdowns, top-selling items, and daily time-series.',
        scopes: ['analytics:read'],
        queryParams: [
          { name: 'period', type: 'string', required: false, description: '"today" | "yesterday" | "this-week" | "last-week" | "this-month" | "last-month" | "this-quarter" | "last-quarter" | "this-year" | "last-year" | "last-7-days" | "last-30-days" | "last-90-days" | "custom"', default: 'today' },
          { name: 'startDate', type: 'string', required: false, description: 'ISO 8601 start date (required when period is "custom")' },
          { name: 'endDate', type: 'string', required: false, description: 'ISO 8601 end date (required when period is "custom")' },
        ],
        responseFields: [
          { name: 'data.period', type: 'Object', required: true, description: '{ label, startDate, endDate }' },
          { name: 'data.revenue', type: 'Object', required: true, description: '{ total, food, drinks, serviceFees, tax, tips, discounts }' },
          { name: 'data.costs', type: 'Object', required: true, description: '{ totalCOGS, foodCOGS, drinksCOGS }' },
          { name: 'data.profit', type: 'Object', required: true, description: '{ grossProfit, grossMargin, operatingExpenses, netProfit, netMargin }' },
          { name: 'data.orders', type: 'Object', required: true, description: '{ total, completed, cancelled, averageValue, byType, byStatus }' },
          { name: 'data.payments', type: 'Object', required: true, description: '{ byMethod, byStatus }' },
          { name: 'data.topItems', type: 'Object[]', required: true, description: 'Top 10 items [{ name, category, quantity, revenue }]' },
          { name: 'data.dailySeries', type: 'Object[]', required: true, description: '[{ date, revenue, orderCount, averageOrderValue }]' },
        ],
        statusCodes: [
          { code: 200, description: 'Summary returned' },
          { code: 400, description: 'Invalid period or missing custom dates' },
        ],
        responseExample: `{
  "success": true,
  "data": {
    "period": { "label": "This Week", "startDate": "2025-06-02T00:00:00.000Z", "endDate": "2025-06-08T23:59:59.999Z" },
    "revenue": { "total": 425000, "food": 250000, "drinks": 175000, "serviceFees": 21250, "tax": 31875, "tips": 8500, "discounts": 5000 },
    "costs": { "totalCOGS": 170000, "foodCOGS": 100000, "drinksCOGS": 70000 },
    "profit": { "grossProfit": 255000, "grossMargin": 60.0, "operatingExpenses": 45000, "netProfit": 210000, "netMargin": 49.41 },
    "orders": { "total": 85, "completed": 72, "cancelled": 3, "averageValue": 5000, "byType": { "dine-in": 50 }, "byStatus": { "completed": 72 } },
    "payments": { "byMethod": { "card": { "count": 40, "revenue": 200000 } }, "byStatus": { "paid": 72 } },
    "topItems": [{ "name": "Jollof Rice", "category": "rice-dishes", "quantity": 45, "revenue": 157500 }],
    "dailySeries": [{ "date": "2025-06-02", "revenue": 60000, "orderCount": 12, "averageOrderValue": 5000 }]
  },
  "meta": { "timestamp": "..." }
}`,
      },
    ],
  },

  // ─── Tabs ───────────────────────────────────────────
  {
    title: 'Tabs',
    slug: 'tabs',
    description: 'Manage dine-in tabs: list, create, update, close, delete, and view aggregate summaries. Tabs allow customers to open a running bill for a table and pay once at the end.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/public/tabs',
        summary: 'List tabs',
        description: 'List tabs with filtering by status, table number, customer, payment status, and date range. Supports sorting and pagination.',
        scopes: ['tabs:read'],
        queryParams: [
          { name: 'status', type: 'string', required: false, description: '"open" | "settling" | "closed"' },
          { name: 'tableNumber', type: 'string', required: false, description: 'Filter by table number' },
          { name: 'customerId', type: 'string', required: false, description: 'Filter by user ObjectId' },
          { name: 'paymentStatus', type: 'string', required: false, description: '"pending" | "paid" | "failed"' },
          { name: 'startDate', type: 'string', required: false, description: 'ISO 8601 start date (openedAt >=)' },
          { name: 'endDate', type: 'string', required: false, description: 'ISO 8601 end date (openedAt <=)' },
          { name: 'sort', type: 'string', required: false, description: '"openedAt" | "-openedAt" | "total" | "-total"', default: '-openedAt' },
          { name: 'page', type: 'number', required: false, description: 'Page number', default: '1' },
          { name: 'limit', type: 'number', required: false, description: 'Items per page (max 100)', default: '25' },
        ],
        responseFields: [
          { name: 'data[].tabNumber', type: 'string', required: true, description: 'Unique tab identifier e.g. "TAB-T5-123456"' },
          { name: 'data[].tableNumber', type: 'string', required: true, description: 'Table identifier' },
          { name: 'data[].status', type: 'string', required: true, description: '"open" | "settling" | "closed"' },
          { name: 'data[].subtotal', type: 'number', required: true, description: 'Subtotal in ₦' },
          { name: 'data[].total', type: 'number', required: true, description: 'Total incl. fees & tax in ₦' },
          { name: 'data[].paymentStatus', type: 'string', required: true, description: '"pending" | "paid" | "failed"' },
          { name: 'data[].orders', type: 'Object[]', required: true, description: 'Populated order objects' },
          { name: 'data[].openedAt', type: 'string', required: true, description: 'ISO 8601 timestamp' },
        ],
        statusCodes: [
          { code: 200, description: 'Paginated tabs' },
          { code: 401, description: 'Missing or invalid API key' },
          { code: 403, description: 'Insufficient scope' },
        ],
        responseExample: `{
  "success": true,
  "data": [
    {
      "tabNumber": "TAB-T5-123456",
      "tableNumber": "T5",
      "status": "open",
      "subtotal": 12000,
      "total": 13200,
      "paymentStatus": "pending",
      "orders": [{ "orderNumber": "WGB-A1B2C3", "total": 7000 }],
      "openedAt": "2025-06-01T18:30:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 25, "total": 8, "totalPages": 1, "timestamp": "..." }
}`,
      },
      {
        method: 'POST',
        path: '/api/public/tabs',
        summary: 'Create tab',
        description: 'Create a new tab for a table. Fails if the table already has an open tab (409 Conflict).',
        scopes: ['tabs:write'],
        requestBody: [
          { name: 'tableNumber', type: 'string', required: true, description: 'Table identifier' },
          { name: 'customerName', type: 'string', required: false, description: 'Customer display name' },
          { name: 'customerEmail', type: 'string', required: false, description: 'Customer email' },
          { name: 'customerPhone', type: 'string', required: false, description: 'Customer phone' },
          { name: 'userId', type: 'string', required: false, description: 'Link to registered user ObjectId' },
        ],
        responseFields: [
          { name: 'data.tabNumber', type: 'string', required: true, description: 'Generated tab number' },
          { name: 'data.tableNumber', type: 'string', required: true, description: 'Table identifier' },
          { name: 'data.status', type: 'string', required: true, description: '"open"' },
        ],
        statusCodes: [
          { code: 201, description: 'Tab created' },
          { code: 400, description: 'Missing tableNumber' },
          { code: 409, description: 'Table already has an open tab' },
        ],
        requestExample: `{
  "tableNumber": "T5",
  "customerName": "Ada Obi",
  "customerEmail": "ada@example.com"
}`,
        responseExample: `{
  "success": true,
  "data": {
    "tabNumber": "TAB-T5-845632",
    "tableNumber": "T5",
    "status": "open",
    "subtotal": 0,
    "total": 0,
    "paymentStatus": "pending",
    "openedAt": "2025-06-01T18:30:00.000Z"
  },
  "meta": { "timestamp": "..." }
}`,
      },
      {
        method: 'GET',
        path: '/api/public/tabs/{tabId}',
        summary: 'Get tab detail',
        description: 'Get a single tab by ID with all populated orders and financial details.',
        scopes: ['tabs:read'],
        pathParams: [
          { name: 'tabId', type: 'string', required: true, description: 'MongoDB ObjectId of the tab' },
        ],
        responseFields: [
          { name: 'data.tab', type: 'Object', required: true, description: 'Full tab object with financials' },
          { name: 'data.orders', type: 'Object[]', required: true, description: 'All orders on this tab' },
        ],
        statusCodes: [
          { code: 200, description: 'Tab detail returned' },
          { code: 400, description: 'Invalid tab ID' },
          { code: 404, description: 'Tab not found' },
        ],
        responseExample: `{
  "success": true,
  "data": {
    "tab": {
      "tabNumber": "TAB-T5-845632",
      "tableNumber": "T5",
      "status": "open",
      "subtotal": 12000,
      "serviceFee": 600,
      "tax": 900,
      "total": 13500,
      "paymentStatus": "pending"
    },
    "orders": [
      { "orderNumber": "WGB-A1B2C3", "status": "completed", "total": 7000 },
      { "orderNumber": "WGB-D4E5F6", "status": "preparing", "total": 5000 }
    ]
  },
  "meta": { "timestamp": "..." }
}`,
      },
      {
        method: 'PATCH',
        path: '/api/public/tabs/{tabId}',
        summary: 'Update tab',
        description: 'Update a tab: close without payment (action: "close"), rename (customName), or set tip amount (tipAmount). Send exactly one action per request.',
        scopes: ['tabs:write'],
        pathParams: [
          { name: 'tabId', type: 'string', required: true, description: 'MongoDB ObjectId of the tab' },
        ],
        requestBody: [
          { name: 'action', type: 'string', required: false, description: '"close" — close tab without payment' },
          { name: 'customName', type: 'string', required: false, description: 'Rename tab / table label' },
          { name: 'tipAmount', type: 'number', required: false, description: 'Set tip amount (>= 0), recalculates total' },
        ],
        responseFields: [
          { name: 'data', type: 'Object', required: true, description: 'Updated tab' },
        ],
        statusCodes: [
          { code: 200, description: 'Tab updated' },
          { code: 400, description: 'No valid action provided' },
          { code: 404, description: 'Tab not found' },
        ],
        requestExample: `{ "action": "close" }`,
        responseExample: `{
  "success": true,
  "data": { "tabNumber": "TAB-T5-845632", "status": "closed", "closedAt": "2025-06-01T22:00:00.000Z", ... },
  "meta": { "timestamp": "..." }
}`,
      },
      {
        method: 'DELETE',
        path: '/api/public/tabs/{tabId}',
        summary: 'Delete tab',
        description: 'Delete a tab permanently. The tab must be open/unpaid and all orders on it must be cancelled first. Creates an audit log entry.',
        scopes: ['tabs:write'],
        pathParams: [
          { name: 'tabId', type: 'string', required: true, description: 'MongoDB ObjectId of the tab' },
        ],
        responseFields: [
          { name: 'data.deleted', type: 'boolean', required: true, description: 'true if deleted' },
          { name: 'data.tabId', type: 'string', required: true, description: 'Deleted tab ID' },
        ],
        statusCodes: [
          { code: 200, description: 'Tab deleted' },
          { code: 404, description: 'Tab not found' },
          { code: 422, description: 'Cannot delete (paid tab or non-cancelled orders)' },
        ],
        responseExample: `{
  "success": true,
  "data": { "deleted": true, "tabId": "665f..." },
  "meta": { "timestamp": "..." }
}`,
      },
      {
        method: 'GET',
        path: '/api/public/tabs/summary',
        summary: 'Tab summary',
        description: 'Period-based tab summary with totals, revenue, status distribution, table utilisation, and daily time-series. Supports the same period presets as other summary endpoints.',
        scopes: ['tabs:read'],
        queryParams: [
          { name: 'period', type: 'string', required: false, description: 'Period preset (see Sales Summary for full list)', default: 'today' },
          { name: 'startDate', type: 'string', required: false, description: 'ISO 8601 start date (required when period is "custom")' },
          { name: 'endDate', type: 'string', required: false, description: 'ISO 8601 end date (required when period is "custom")' },
        ],
        responseFields: [
          { name: 'data.period', type: 'Object', required: true, description: '{ label, startDate, endDate }' },
          { name: 'data.totals', type: 'Object', required: true, description: '{ totalTabs, totalRevenue, averageTabValue, openTabs, closedTabs, paidTabs }' },
          { name: 'data.byStatus', type: 'Object', required: true, description: '{ open, settling, closed }' },
          { name: 'data.byPayment', type: 'Object', required: true, description: '{ pending, paid, failed }' },
          { name: 'data.tableUsage', type: 'Object[]', required: true, description: '[{ tableNumber, tabCount, totalRevenue }] sorted desc' },
          { name: 'data.dailySeries', type: 'Object[]', required: true, description: '[{ date, tabsOpened, tabsClosed, revenue }]' },
        ],
        statusCodes: [{ code: 200, description: 'Summary returned' }],
        responseExample: `{
  "success": true,
  "data": {
    "period": { "label": "This Week", "startDate": "...", "endDate": "..." },
    "totals": { "totalTabs": 25, "totalRevenue": 180000, "averageTabValue": 9000, "openTabs": 3, "closedTabs": 22, "paidTabs": 20 },
    "byStatus": { "open": 3, "settling": 0, "closed": 22 },
    "byPayment": { "pending": 3, "paid": 20, "failed": 2 },
    "tableUsage": [{ "tableNumber": "T5", "tabCount": 8, "totalRevenue": 72000 }],
    "dailySeries": [{ "date": "2025-06-02", "tabsOpened": 4, "tabsClosed": 3, "revenue": 27000 }]
  },
  "meta": { "timestamp": "..." }
}`,
      },
    ],
  },

  // ─── Customers ─────────────────────────────────────
  {
    title: 'Customers',
    slug: 'customers',
    description: 'Create, list, search, view, update, and summarize customer profiles. Sensitive fields are always excluded.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/public/customers',
        summary: 'List customers',
        description: 'List or search registered customers. Guest accounts are excluded. Sensitive auth fields are never returned.',
        scopes: ['customers:read'],
        queryParams: [
          { name: 'q', type: 'string', required: false, description: 'Search by email, phone, or name (min 3 chars)' },
          { name: 'role', type: 'string', required: false, description: '"customer" | "admin" | "super-admin"' },
          { name: 'status', type: 'string', required: false, description: '"active" | "suspended" | "deleted"', default: 'active' },
          { name: 'sort', type: 'string', required: false, description: '"createdAt" | "-createdAt" | "totalSpent" | "-totalSpent"', default: '-createdAt' },
          { name: 'page', type: 'number', required: false, description: 'Page number', default: '1' },
          { name: 'limit', type: 'number', required: false, description: 'Items per page (max 100)', default: '25' },
        ],
        responseFields: [
          { name: 'data[]._id', type: 'string', required: true, description: 'User ID' },
          { name: 'data[].email', type: 'string', required: true, description: 'Email' },
          { name: 'data[].firstName', type: 'string', required: false, description: 'First name' },
          { name: 'data[].lastName', type: 'string', required: false, description: 'Last name' },
          { name: 'data[].totalSpent', type: 'number', required: true, description: 'Lifetime spend in ₦' },
          { name: 'data[].totalOrders', type: 'number', required: true, description: 'Lifetime order count' },
          { name: 'data[].loyaltyPoints', type: 'number', required: true, description: 'Current points balance' },
        ],
        statusCodes: [{ code: 200, description: 'Paginated customer list' }],
        responseExample: `{
  "success": true,
  "data": [
    {
      "_id": "665e...",
      "firstName": "Ada",
      "lastName": "Obi",
      "email": "ada@example.com",
      "totalSpent": 45000,
      "totalOrders": 12,
      "loyaltyPoints": 350
    }
  ],
  "meta": { "page": 1, "limit": 25, "total": 89, "totalPages": 4, "timestamp": "..." }
}`,
      },
      {
        method: 'GET',
        path: '/api/public/customers/{customerId}',
        summary: 'Get customer profile',
        description: 'Get a single customer profile by ID. Excludes sensitive auth fields.',
        scopes: ['customers:read'],
        pathParams: [
          { name: 'customerId', type: 'string', required: true, description: 'User MongoDB ObjectId' },
        ],
        responseFields: [
          { name: 'data.email', type: 'string', required: true, description: 'Email' },
          { name: 'data.totalSpent', type: 'number', required: true, description: 'Lifetime spend in ₦' },
          { name: 'data.loyaltyPoints', type: 'number', required: true, description: 'Points balance' },
          { name: 'data.addresses', type: 'Object[]', required: true, description: 'Saved delivery addresses' },
          { name: 'data.preferences', type: 'Object', required: false, description: 'Dietary and communication prefs' },
        ],
        statusCodes: [
          { code: 200, description: 'Success' },
          { code: 404, description: 'Customer not found' },
        ],
        responseExample: `{
  "success": true,
  "data": {
    "_id": "665e...",
    "firstName": "Ada",
    "email": "ada@example.com",
    "totalSpent": 45000,
    "loyaltyPoints": 350,
    "addresses": [...]
  },
  "meta": { "timestamp": "..." }
}`,
      },
      {
        method: 'PATCH',
        path: '/api/public/customers/{customerId}',
        summary: 'Update customer profile',
        description: 'Update safe profile fields. Cannot change email, role, password, or account status.',
        scopes: ['customers:write'],
        pathParams: [
          { name: 'customerId', type: 'string', required: true, description: 'User MongoDB ObjectId' },
        ],
        requestBody: [
          { name: 'firstName', type: 'string', required: false, description: 'First name' },
          { name: 'lastName', type: 'string', required: false, description: 'Last name' },
          { name: 'phone', type: 'string', required: false, description: 'Phone number' },
          { name: 'preferences', type: 'Object', required: false, description: '{ dietaryRestrictions?, communicationPreferences? }' },
        ],
        responseFields: [
          { name: 'data', type: 'Object', required: true, description: 'Updated customer profile' },
        ],
        statusCodes: [
          { code: 200, description: 'Updated' },
          { code: 400, description: 'No valid fields' },
          { code: 404, description: 'Not found' },
        ],
        requestExample: `{
  "firstName": "Adaeze",
  "phone": "+2348012345678",
  "preferences": {
    "dietaryRestrictions": ["vegetarian"],
    "communicationPreferences": { "email": true, "sms": false }
  }
}`,
        responseExample: `{
  "success": true,
  "data": { "_id": "665e...", "firstName": "Adaeze", "phone": "+2348012345678", ... },
  "meta": { "timestamp": "..." }
}`,
      },
      {
        method: 'POST',
        path: '/api/public/customers',
        summary: 'Create customer',
        description: 'Create a new customer account. Returns 409 if a customer with the same email already exists. Sensitive fields are never returned.',
        scopes: ['customers:write'],
        requestBody: [
          { name: 'email', type: 'string', required: true, description: 'Customer email address' },
          { name: 'firstName', type: 'string', required: false, description: 'First name' },
          { name: 'lastName', type: 'string', required: false, description: 'Last name' },
          { name: 'phone', type: 'string', required: false, description: 'Phone number' },
          { name: 'preferences', type: 'Object', required: false, description: '{ dietaryRestrictions?: string[], communicationPreferences?: { email?, sms?, push? } }' },
        ],
        responseFields: [
          { name: 'data._id', type: 'string', required: true, description: 'New customer ID' },
          { name: 'data.email', type: 'string', required: true, description: 'Email' },
          { name: 'data.role', type: 'string', required: true, description: '"customer"' },
        ],
        statusCodes: [
          { code: 201, description: 'Customer created' },
          { code: 400, description: 'Missing or invalid email' },
          { code: 409, description: 'Email already registered' },
        ],
        requestExample: `{
  "email": "ada@example.com",
  "firstName": "Ada",
  "lastName": "Obi",
  "phone": "+2348012345678"
}`,
        responseExample: `{
  "success": true,
  "data": {
    "_id": "665e...",
    "email": "ada@example.com",
    "firstName": "Ada",
    "lastName": "Obi",
    "role": "customer",
    "accountStatus": "active",
    "totalSpent": 0,
    "totalOrders": 0,
    "loyaltyPoints": 0
  },
  "meta": { "timestamp": "..." }
}`,
      },
      {
        method: 'GET',
        path: '/api/public/customers/{customerId}/orders',
        summary: 'Get customer order history',
        description: 'Get a customer\'s order history with pagination and optional status filter. Requires both customers:read and orders:read scopes.',
        scopes: ['customers:read', 'orders:read'],
        pathParams: [
          { name: 'customerId', type: 'string', required: true, description: 'User MongoDB ObjectId' },
        ],
        queryParams: [
          { name: 'status', type: 'string', required: false, description: 'Filter by order status' },
          { name: 'page', type: 'number', required: false, description: 'Page number', default: '1' },
          { name: 'limit', type: 'number', required: false, description: 'Items per page (max 100)', default: '25' },
        ],
        responseFields: [
          { name: 'data[]', type: 'Object[]', required: true, description: 'Array of order objects' },
          { name: 'meta.total', type: 'number', required: true, description: 'Total orders for this customer' },
        ],
        statusCodes: [{ code: 200, description: 'Order history' }],
        responseExample: `{
  "success": true,
  "data": [
    { "orderNumber": "WGB-X1Y2Z3", "status": "completed", "total": 5200, ... }
  ],
  "meta": { "page": 1, "limit": 25, "total": 12, "totalPages": 1, "timestamp": "..." }
}`,
      },
      {
        method: 'GET',
        path: '/api/public/customers/summary',
        summary: 'Customer summary',
        description: 'Period-based customer analytics: total customers, new registrations, top spenders, loyalty stats, role distribution, and daily acquisition series. Supports the same period presets as other summary endpoints.',
        scopes: ['customers:read'],
        queryParams: [
          { name: 'period', type: 'string', required: false, description: 'Period preset (see Sales Summary for full list)', default: 'today' },
          { name: 'startDate', type: 'string', required: false, description: 'ISO 8601 start date (required when period is "custom")' },
          { name: 'endDate', type: 'string', required: false, description: 'ISO 8601 end date (required when period is "custom")' },
        ],
        responseFields: [
          { name: 'data.period', type: 'Object', required: true, description: '{ label, startDate, endDate }' },
          { name: 'data.totals', type: 'Object', required: true, description: '{ totalCustomers, newCustomersInPeriod, totalSpent, averageSpent, totalLoyaltyPoints }' },
          { name: 'data.topSpenders', type: 'Object[]', required: true, description: 'Top 10 [{ _id, firstName, lastName, email, totalSpent, totalOrders, loyaltyPoints }]' },
          { name: 'data.byRole', type: 'Object', required: true, description: '{ customer, admin, "super-admin" }' },
          { name: 'data.acquisitionSeries', type: 'Object[]', required: true, description: '[{ date, newCustomers }]' },
        ],
        statusCodes: [{ code: 200, description: 'Summary returned' }],
        responseExample: `{
  "success": true,
  "data": {
    "period": { "label": "This Month", "startDate": "...", "endDate": "..." },
    "totals": { "totalCustomers": 342, "newCustomersInPeriod": 28, "totalSpent": 4500000, "averageSpent": 13158, "totalLoyaltyPoints": 85000 },
    "topSpenders": [{ "_id": "665e...", "firstName": "Ada", "lastName": "Obi", "email": "ada@example.com", "totalSpent": 85000, "totalOrders": 24, "loyaltyPoints": 2400 }],
    "byRole": { "customer": 335, "admin": 5, "super-admin": 2 },
    "acquisitionSeries": [{ "date": "2025-06-01", "newCustomers": 3 }, { "date": "2025-06-02", "newCustomers": 5 }]
  },
  "meta": { "timestamp": "..." }
}`,
      },
    ],
  },

  // ─── Rewards ───────────────────────────────────────
  {
    title: 'Rewards',
    slug: 'rewards',
    description: 'View reward statistics, validate reward codes, and redeem rewards against orders.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/public/rewards',
        summary: 'Get rewards',
        description: 'With userId: returns user\'s active rewards + personal stats. Without: returns global reward statistics.',
        scopes: ['rewards:read'],
        queryParams: [
          { name: 'userId', type: 'string', required: false, description: 'User ObjectId for user-specific data' },
        ],
        responseFields: [
          { name: 'data.rewards', type: 'Object[]', required: false, description: 'Active rewards (with userId)' },
          { name: 'data.stats', type: 'Object', required: false, description: 'User reward stats (with userId)' },
          { name: 'data.totalRulesActive', type: 'number', required: false, description: 'Global: active rules (no userId)' },
          { name: 'data.totalRewardsIssued', type: 'number', required: false, description: 'Global: total issued' },
          { name: 'data.redemptionRate', type: 'number', required: false, description: 'Global: percentage' },
        ],
        statusCodes: [{ code: 200, description: 'Rewards data' }],
        responseExample: `{
  "success": true,
  "data": {
    "rewards": [
      { "code": "RWD-AB12CD34", "rewardType": "discount-percentage", "rewardValue": 10, "expiresAt": "..." }
    ],
    "stats": { "totalEarned": 5, "activeRewards": 1, "totalSavings": 1500, "loyaltyPoints": 350 }
  },
  "meta": { "timestamp": "..." }
}`,
      },
      {
        method: 'POST',
        path: '/api/public/rewards/validate',
        summary: 'Validate reward code',
        description: 'Validate a reward code for a user. Checks ownership, status, and expiry. Automatically expires stale rewards.',
        scopes: ['rewards:read'],
        requestBody: [
          { name: 'userId', type: 'string', required: true, description: 'User MongoDB ObjectId' },
          { name: 'code', type: 'string', required: true, description: 'Reward code e.g. "RWD-AB12CD34"' },
        ],
        responseFields: [
          { name: 'data.valid', type: 'boolean', required: true, description: 'Whether redeemable' },
          { name: 'data.message', type: 'string', required: false, description: 'Reason if invalid' },
          { name: 'data.reward', type: 'Object', required: false, description: 'Reward object (when valid)' },
        ],
        statusCodes: [
          { code: 200, description: 'Validation result (check data.valid)' },
          { code: 400, description: 'Missing userId or code' },
        ],
        requestExample: `{ "userId": "665e...", "code": "RWD-AB12CD34" }`,
        responseExample: `{
  "success": true,
  "data": {
    "valid": true,
    "reward": { "_id": "...", "code": "RWD-AB12CD34", "rewardType": "discount-percentage", "rewardValue": 10 }
  },
  "meta": { "timestamp": "..." }
}`,
      },
      {
        method: 'POST',
        path: '/api/public/rewards/redeem',
        summary: 'Redeem reward',
        description: 'Redeem an active reward against an order. Only active, non-expired rewards can be redeemed.',
        scopes: ['rewards:read'],
        requestBody: [
          { name: 'rewardId', type: 'string', required: true, description: 'Reward MongoDB ObjectId' },
          { name: 'orderId', type: 'string', required: true, description: 'Order MongoDB ObjectId' },
        ],
        responseFields: [
          { name: 'data.success', type: 'boolean', required: true, description: 'Whether redeemed' },
          { name: 'data.message', type: 'string', required: false, description: 'Error message if failed' },
        ],
        statusCodes: [
          { code: 200, description: 'Redeemed' },
          { code: 400, description: 'Missing fields' },
          { code: 422, description: 'Not active or expired' },
        ],
        requestExample: `{ "rewardId": "665f...", "orderId": "665d..." }`,
        responseExample: `{ "success": true, "data": { "success": true }, "meta": { "timestamp": "..." } }`,
      },
    ],
  },

  // ─── Settings ──────────────────────────────────────
  {
    title: 'Settings',
    slug: 'settings',
    description: 'Read-only access to public application configuration.',
    endpoints: [
      {
        method: 'GET',
        path: '/api/public/settings',
        summary: 'Get application settings',
        description: 'Get public settings: service fee, tax rate, points conversion rate, menu categories, and active payment provider.',
        scopes: ['settings:read'],
        responseFields: [
          { name: 'data.serviceFee', type: 'number', required: true, description: 'Service fee percentage' },
          { name: 'data.taxRate', type: 'number', required: true, description: 'Tax rate percentage' },
          { name: 'data.pointsConversionRate', type: 'number', required: true, description: 'Points per ₦1 (e.g. 100)' },
          { name: 'data.menuCategories', type: 'Object', required: true, description: 'Category configuration' },
          { name: 'data.paymentProvider', type: 'string', required: true, description: '"monnify" | "paystack"' },
        ],
        statusCodes: [{ code: 200, description: 'Settings returned' }],
        responseExample: `{
  "success": true,
  "data": {
    "serviceFee": 5,
    "taxRate": 7.5,
    "pointsConversionRate": 100,
    "menuCategories": { "drinks": { ... }, "food": { ... } },
    "paymentProvider": "monnify"
  },
  "meta": { "timestamp": "..." }
}`,
      },
    ],
  },
];
