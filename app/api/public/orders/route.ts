/**
 * @requirement REQ-005 - Public API Tab Support for Orders
 */
import { NextRequest } from 'next/server';
import Order from '@/models/order-model';
import { OrderService } from '@/services/order-service';
import { TabService } from '@/services/tab-service';
import { OrderStatus, OrderType } from '@/interfaces';
import {
  withApiAuth,
  apiSuccess,
  apiError,
  parsePagination,
  parseDateParam,
  parseJsonBody,
  serialize,
} from '@/lib/api-response';

/**
 * GET /api/public/orders
 *
 * List orders with rich filtering, sorting, and pagination.
 * If `orderNumber` is provided, returns a single order directly.
 *
 * @authentication API Key required — scope: `orders:read`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @queryParam {string} [status]        - Order status: `"pending"` | `"confirmed"` | `"preparing"` | `"ready"` | `"out-for-delivery"` | `"delivered"` | `"completed"` | `"cancelled"`
 * @queryParam {string} [orderType]     - `"dine-in"` | `"pickup"` | `"delivery"` | `"pay-now"`
 * @queryParam {string} [paymentStatus] - `"pending"` | `"paid"` | `"failed"` | `"cancelled"` | `"refunded"`
 * @queryParam {string} [startDate]     - ISO 8601 inclusive start date (e.g. `"2025-06-01T00:00:00Z"`)
 * @queryParam {string} [endDate]       - ISO 8601 inclusive end date
 * @queryParam {string} [customerId]    - MongoDB ObjectId — filter orders for a specific user
 * @queryParam {string} [orderNumber]   - Exact order number lookup (returns single object, not array)
 * @queryParam {string} [sort=-createdAt] - Sort field with optional `-` prefix for descending: `"createdAt"` | `"-createdAt"` | `"total"` | `"-total"`
 * @queryParam {number} [page=1]        - Page number (1-indexed)
 * @queryParam {number} [limit=25]      - Items per page (max 100)
 *
 * @returns {Object}   response
 * @returns {boolean}  response.success                    - `true`
 * @returns {Object[]} response.data                       - Array of order objects (or single order if `orderNumber` used)
 * @returns {string}   response.data[].orderNumber         - Human-readable order number (e.g. `"WGB-A1B2C3"`)
 * @returns {string}   response.data[].orderType           - Order type
 * @returns {string}   response.data[].status              - Current order status
 * @returns {Object[]} response.data[].items               - Line items with name, price, quantity, portionSize, customizations, subtotal
 * @returns {number}   response.data[].subtotal            - Subtotal in ₦
 * @returns {number}   response.data[].tax                 - Tax in ₦
 * @returns {number}   response.data[].total               - Final total in ₦
 * @returns {string}   [response.data[].paymentStatus]     - Payment status
 * @returns {string}   [response.data[].paymentMethod]     - Payment method used
 * @returns {Object}   [response.data[].userId]            - Populated user `{ _id, firstName, lastName, email, phone }`
 * @returns {Object[]} response.data[].statusHistory       - Status change log `[{ status, timestamp, note? }]`
 * @returns {number}   response.data[].estimatedWaitTime   - Estimated wait in minutes
 * @returns {string}   response.data[].createdAt           - ISO 8601 creation timestamp
 * @returns {Object}   response.meta                       - Pagination metadata
 * @returns {number}   response.meta.page
 * @returns {number}   response.meta.limit
 * @returns {number}   response.meta.total
 * @returns {number}   response.meta.totalPages
 * @returns {string}   response.meta.timestamp
 *
 * @status 200 - Success with paginated orders
 * @status 401 - Missing or invalid API key
 * @status 403 - API key lacks `orders:read` scope
 * @status 404 - Order not found (when using `orderNumber`)
 * @status 429 - Rate limit exceeded
 * @status 500 - Internal server error
 *
 * @example
 * // Request — list paid dine-in orders
 * GET /api/public/orders?orderType=dine-in&paymentStatus=paid&sort=-createdAt&page=1&limit=10
 * x-api-key: wawa_abc_7f3a...
 *
 * // Response 200
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "orderNumber": "WGB-A1B2C3",
 *       "orderType": "dine-in",
 *       "status": "completed",
 *       "items": [{ "name": "Jollof Rice", "price": 3500, "quantity": 2, "subtotal": 7000, ... }],
 *       "total": 7350,
 *       "paymentStatus": "paid",
 *       "userId": { "firstName": "Ada", "lastName": "Obi", "email": "ada@example.com" },
 *       ...
 *     }
 *   ],
 *   "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5, "timestamp": "..." }
 * }
 */
export async function GET(request: NextRequest): Promise<Response> {
  return withApiAuth(request, ['orders:read'], async () => {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') as OrderStatus | null;
    const orderType = searchParams.get('orderType') as OrderType | null;
    const paymentStatus = searchParams.get('paymentStatus');
    const startDate = parseDateParam(searchParams.get('startDate'));
    const endDate = parseDateParam(searchParams.get('endDate'));
    const customerId = searchParams.get('customerId');
    const orderNumber = searchParams.get('orderNumber');
    const sortParam = searchParams.get('sort') || '-createdAt';
    const { page, limit, skip } = parsePagination(searchParams);

    try {
      // Exact order number lookup — return single result
      if (orderNumber) {
        const order = await OrderService.getOrderByNumber(orderNumber);
        if (!order) {
          return apiError('Order not found', 404);
        }
        return apiSuccess(serialize(order));
      }

      const filter: Record<string, unknown> = {};
      if (status) filter.status = status;
      if (orderType) filter.orderType = orderType;
      if (paymentStatus) filter.paymentStatus = paymentStatus;
      if (customerId) filter.userId = customerId;
      if (startDate || endDate) {
        const dateFilter: Record<string, Date> = {};
        if (startDate) dateFilter.$gte = startDate;
        if (endDate) dateFilter.$lte = endDate;
        filter.createdAt = dateFilter;
      }

      // Build sort object
      const sortField = sortParam.startsWith('-') ? sortParam.slice(1) : sortParam;
      const sortDir = sortParam.startsWith('-') ? -1 : 1;
      const sortObj: Record<string, 1 | -1> = { [sortField]: sortDir as 1 | -1 };

      const [orders, total] = await Promise.all([
        Order.find(filter)
          .sort(sortObj)
          .skip(skip)
          .limit(limit)
          .populate('userId', 'firstName lastName email phone')
          .lean(),
        Order.countDocuments(filter),
      ]);

      return apiSuccess(serialize(orders), 200, { page, limit, total });
    } catch (error) {
      console.error('[PUBLIC API] GET /api/public/orders', error);
      return apiError('Failed to fetch orders', 500);
    }
  });
}

interface CreateOrderBody {
  orderType: OrderType;
  items: Array<{
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    portionSize?: 'full' | 'half' | 'quarter';
    portionMultiplier?: number;
    customizations?: Array<{ name: string; option: string; price: number }>;
    specialInstructions?: string;
    subtotal: number;
  }>;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  total: number;
  userId?: string;
  guestEmail?: string;
  guestName?: string;
  guestPhone?: string;
  deliveryDetails?: {
    address: { street: string; city: string; state: string; postalCode?: string; country: string };
    deliveryInstructions?: string;
  };
  pickupDetails?: { preferredPickupTime: string };
  dineInDetails?: { tableNumber: string; qrCodeScanned?: boolean };
  specialInstructions?: string;
  tabId?: string;
  useTab?: 'new' | 'existing';
  customerName?: string;
}

/**
 * POST /api/public/orders
 *
 * Create a new order. Each item must reference a valid menu item ID.
 * The service enriches items with cost data, generates an order number,
 * calculates estimated wait time, and optionally deducts inventory.
 *
 * Optionally attach the order to a tab:
 * - Provide `tabId` to attach to an **existing tab by ID**.
 * - Provide `useTab: "new"` with `dineInDetails.tableNumber` to **create a new tab**
 *   and attach the order automatically.
 * - Provide `useTab: "existing"` with `dineInDetails.tableNumber` to **find the open
 *   tab for that table** and attach the order.
 *
 * When a tab is involved, the response wraps the result in `{ order, tab }` instead
 * of returning the order directly.
 *
 * @authentication API Key required — scope: `orders:write`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @requestBody {Object}   body
 * @requestBody {string}   body.orderType                         - `"dine-in"` | `"pickup"` | `"delivery"` | `"pay-now"` (**required**)
 * @requestBody {Object[]} body.items                             - Line items (**required**, min 1)
 * @requestBody {string}   body.items[].menuItemId                - Menu item MongoDB ObjectId (**required**)
 * @requestBody {string}   body.items[].name                      - Item display name (**required**)
 * @requestBody {number}   body.items[].price                     - Unit price in ₦ (**required**)
 * @requestBody {number}   body.items[].quantity                  - Quantity (**required**)
 * @requestBody {string}   [body.items[].portionSize="full"]      - `"full"` | `"half"` | `"quarter"`
 * @requestBody {number}   [body.items[].portionMultiplier=1]     - Portion price multiplier
 * @requestBody {Object[]} [body.items[].customizations]          - Array of `{ name, option, price }`
 * @requestBody {string}   [body.items[].specialInstructions]     - Per-item special instructions
 * @requestBody {number}   body.items[].subtotal                  - Line item subtotal (**required**)
 * @requestBody {number}   body.subtotal                          - Order subtotal in ₦
 * @requestBody {number}   body.tax                               - Tax amount in ₦
 * @requestBody {number}   body.deliveryFee                       - Delivery fee in ₦ (0 if not delivery)
 * @requestBody {number}   body.discount                          - Discount amount in ₦
 * @requestBody {number}   body.total                             - Final total in ₦ (**required**)
 * @requestBody {string}   [body.userId]                          - Registered user MongoDB ObjectId
 * @requestBody {string}   [body.guestEmail]                      - Guest email (if no userId)
 * @requestBody {string}   [body.guestName]                       - Guest name
 * @requestBody {string}   [body.guestPhone]                      - Guest phone
 * @requestBody {Object}   [body.deliveryDetails]                 - Required when orderType is `"delivery"`
 * @requestBody {Object}   body.deliveryDetails.address           - `{ street, city, state, postalCode?, country }`
 * @requestBody {string}   [body.deliveryDetails.deliveryInstructions]
 * @requestBody {Object}   [body.pickupDetails]                   - Required when orderType is `"pickup"`
 * @requestBody {string}   body.pickupDetails.preferredPickupTime - ISO 8601 datetime
 * @requestBody {Object}   [body.dineInDetails]                   - Required when orderType is `"dine-in"`
 * @requestBody {string}   body.dineInDetails.tableNumber         - Table identifier
 * @requestBody {boolean}  [body.dineInDetails.qrCodeScanned]     - Whether QR code was scanned
 * @requestBody {string}   [body.specialInstructions]             - Order-level special instructions
 * @requestBody {string}   [body.tabId]                           - Attach to an existing tab by MongoDB ObjectId
 * @requestBody {string}   [body.useTab]                          - `"new"` to create a tab, `"existing"` to find the open tab for the table
 * @requestBody {string}   [body.customerName]                    - Customer display name (used for new tab creation)
 *
 * @returns {Object}  response
 * @returns {boolean} response.success                    - `true`
 * @returns {Object}  response.data                       - Created order (or `{ order, tab }` when tab is involved)
 * @returns {string}  response.data.orderNumber            - Generated order number (flat response)
 * @returns {string}  response.data._id                    - Order MongoDB ObjectId (flat response)
 * @returns {string}  response.data.status                 - Initial status (`"pending"`)
 * @returns {number}  response.data.estimatedWaitTime      - Estimated wait in minutes
 * @returns {Object}  [response.data.order]                - Order object (tab response)
 * @returns {Object}  [response.data.tab]                  - Tab object with totals and order list (tab response)
 * @returns {Object}  response.meta
 * @returns {string}  response.meta.timestamp
 *
 * @status 201 - Order created successfully
 * @status 400 - Invalid body (missing required fields, invalid orderType, invalid useTab)
 * @status 401 - Missing or invalid API key
 * @status 403 - API key lacks `orders:write` scope
 * @status 409 - Tab already exists for table (when useTab="new")
 * @status 422 - Business logic error (e.g. unavailable items, validation failure, no open tab found)
 * @status 429 - Rate limit exceeded
 *
 * @example
 * // Request — create a dine-in order (no tab)
 * POST /api/public/orders
 * x-api-key: wawa_abc_7f3a...
 * Content-Type: application/json
 *
 * {
 *   "orderType": "dine-in",
 *   "items": [{ "menuItemId": "665a...", "name": "Jollof Rice", "price": 3500, "quantity": 2, "portionSize": "full", "subtotal": 7000 }],
 *   "subtotal": 7000, "tax": 350, "deliveryFee": 0, "discount": 0, "total": 7350,
 *   "guestName": "Ada Obi", "guestEmail": "ada@example.com",
 *   "dineInDetails": { "tableNumber": "T5" }
 * }
 *
 * // Response 201 (flat — no tab)
 * { "success": true, "data": { "_id": "...", "orderNumber": "WGB-A1B2C3", "status": "pending", ... }, "meta": { "timestamp": "..." } }
 *
 * @example
 * // Request — create order + new tab
 * {
 *   "orderType": "dine-in", "useTab": "new", "customerName": "John Doe",
 *   "items": [{ "menuItemId": "665a...", "name": "Star Lager", "price": 800, "quantity": 2, "subtotal": 1600 }],
 *   "subtotal": 1600, "tax": 0, "deliveryFee": 0, "discount": 0, "total": 1600,
 *   "dineInDetails": { "tableNumber": "T5" }
 * }
 *
 * // Response 201 (wrapped — with tab)
 * { "success": true, "data": { "order": { ... }, "tab": { "tabNumber": "TAB-T5-123456", "status": "open", ... } }, "meta": { "timestamp": "..." } }
 *
 * @example
 * // Request — add order to existing tab by tabId
 * { "orderType": "dine-in", "tabId": "abc123", "items": [...], ... }
 */
export async function POST(request: NextRequest): Promise<Response> {
  return withApiAuth(request, ['orders:write'], async () => {
    const body = await parseJsonBody<CreateOrderBody>(request);
    if (!body) {
      return apiError('Invalid JSON body', 400);
    }

    const { orderType, items, subtotal, tax, deliveryFee, discount, total } = body;

    if (!orderType || !items?.length || total == null) {
      return apiError('orderType, items (non-empty), and total are required', 400);
    }

    const validTypes: OrderType[] = ['dine-in', 'pickup', 'delivery', 'pay-now'];
    if (!validTypes.includes(orderType)) {
      return apiError(`orderType must be one of: ${validTypes.join(', ')}`, 400);
    }

    // Validate optional tab fields
    const { tabId, useTab, customerName } = body;
    if (useTab && !['new', 'existing'].includes(useTab)) {
      return apiError('useTab must be "new" or "existing"', 400);
    }
    if ((useTab || tabId) && orderType !== 'dine-in') {
      return apiError('Tab support is only available for dine-in orders', 400);
    }
    const tableNumber = body.dineInDetails?.tableNumber?.trim();
    if (useTab && !tableNumber) {
      return apiError('dineInDetails.tableNumber is required when using useTab', 400);
    }

    try {
      const enrichedItems = items.map((item) => ({
        ...item,
        portionSize: item.portionSize || 'full',
        portionMultiplier: item.portionMultiplier ?? 1,
        customizations: item.customizations || [],
        costPerUnit: 0,
        totalCost: 0,
        grossProfit: 0,
        profitMargin: 0,
        priceOverridden: false,
      }));

      const order = await OrderService.createOrder({
        orderType,
        items: enrichedItems as any,
        subtotal: subtotal || 0,
        tax: tax || 0,
        deliveryFee: deliveryFee || 0,
        discount: discount || 0,
        total,
        userId: body.userId,
        guestEmail: body.guestEmail,
        guestName: body.guestName,
        guestPhone: body.guestPhone,
        deliveryDetails: body.deliveryDetails as any,
        pickupDetails: body.pickupDetails
          ? { preferredPickupTime: new Date(body.pickupDetails.preferredPickupTime) } as any
          : undefined,
        dineInDetails: body.dineInDetails as any,
        specialInstructions: body.specialInstructions,
        createdByRole: 'customer',
      });

      // --- Tab handling (optional) ---
      let tab = null;

      if (tabId) {
        // Attach order to existing tab by ID
        tab = await TabService.addOrderToTab(tabId, order._id.toString());
      } else if (useTab === 'new') {
        // Create a new tab for the table
        const existingTab = await TabService.getOpenTabForTable(tableNumber!);
        if (existingTab) {
          return apiError(
            `Table ${tableNumber} already has an open tab`,
            409,
          );
        }
        tab = await TabService.createTab({
          tableNumber: tableNumber!,
          userId: body.userId,
          customerName: customerName || body.guestName || 'Walk-in Customer',
          customerEmail: body.guestEmail,
          customerPhone: body.guestPhone,
        });
        tab = await TabService.addOrderToTab(tab._id.toString(), order._id.toString());
      } else if (useTab === 'existing') {
        // Find existing open tab for the table
        const existingTab = await TabService.getOpenTabForTable(tableNumber!);
        if (!existingTab) {
          return apiError(
            `No open tab found for table ${tableNumber}`,
            422,
          );
        }
        tab = await TabService.addOrderToTab(existingTab._id.toString(), order._id.toString());
      }

      // Return wrapped response when tab is involved
      if (tab) {
        return apiSuccess(
          serialize({ order, tab }),
          201,
        );
      }

      return apiSuccess(serialize(order), 201);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to create order';
      console.error('[PUBLIC API] POST /api/public/orders', error);
      return apiError(msg, 422);
    }
  });
}
