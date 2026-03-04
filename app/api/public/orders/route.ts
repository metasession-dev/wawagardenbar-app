import { NextRequest } from 'next/server';
import Order from '@/models/order-model';
import { OrderService } from '@/services/order-service';
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
}

/**
 * POST /api/public/orders
 *
 * Create a new order. Each item must reference a valid menu item ID.
 * The service enriches items with cost data, generates an order number,
 * calculates estimated wait time, and optionally deducts inventory.
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
 *
 * @returns {Object}  response
 * @returns {boolean} response.success       - `true`
 * @returns {Object}  response.data          - Created order (full order object)
 * @returns {string}  response.data.orderNumber - Generated order number
 * @returns {string}  response.data._id      - Order MongoDB ObjectId
 * @returns {string}  response.data.status   - Initial status (`"pending"`)
 * @returns {number}  response.data.estimatedWaitTime - Estimated wait in minutes
 * @returns {Object}  response.meta
 * @returns {string}  response.meta.timestamp
 *
 * @status 201 - Order created successfully
 * @status 400 - Invalid body (missing required fields, invalid orderType)
 * @status 401 - Missing or invalid API key
 * @status 403 - API key lacks `orders:write` scope
 * @status 422 - Business logic error (e.g. unavailable items, validation failure)
 * @status 429 - Rate limit exceeded
 *
 * @example
 * // Request — create a dine-in order
 * POST /api/public/orders
 * x-api-key: wawa_abc_7f3a...
 * Content-Type: application/json
 *
 * {
 *   "orderType": "dine-in",
 *   "items": [
 *     {
 *       "menuItemId": "665a...",
 *       "name": "Jollof Rice",
 *       "price": 3500,
 *       "quantity": 2,
 *       "portionSize": "full",
 *       "subtotal": 7000
 *     }
 *   ],
 *   "subtotal": 7000,
 *   "tax": 350,
 *   "deliveryFee": 0,
 *   "discount": 0,
 *   "total": 7350,
 *   "guestName": "Ada Obi",
 *   "guestEmail": "ada@example.com",
 *   "dineInDetails": { "tableNumber": "T5" }
 * }
 *
 * // Response 201
 * {
 *   "success": true,
 *   "data": { "_id": "...", "orderNumber": "WGB-A1B2C3", "status": "pending", "estimatedWaitTime": 15, ... },
 *   "meta": { "timestamp": "..." }
 * }
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

      return apiSuccess(serialize(order), 201);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to create order';
      console.error('[PUBLIC API] POST /api/public/orders', error);
      return apiError(msg, 422);
    }
  });
}
