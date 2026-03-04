import { NextRequest } from 'next/server';
import { OrderService } from '@/services/order-service';
import { OrderStatus } from '@/interfaces';
import { withApiAuth, apiSuccess, apiError, parseJsonBody, serialize } from '@/lib/api-response';

/**
 * GET /api/public/orders/:orderId
 *
 * Get a single order by ID with full details including items, customer info,
 * payment data, status history, delivery/pickup/dine-in details, and financials.
 *
 * @authentication API Key required — scope: `orders:read`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @pathParam {string} orderId - MongoDB ObjectId of the order
 *
 * @returns {Object}   response
 * @returns {boolean}  response.success                    - `true`
 * @returns {Object}   response.data                       - Full order object
 * @returns {string}   response.data._id                   - Order ID
 * @returns {string}   response.data.orderNumber           - Human-readable number (e.g. `"WGB-A1B2C3"`)
 * @returns {string}   response.data.orderType             - `"dine-in"` | `"pickup"` | `"delivery"` | `"pay-now"`
 * @returns {string}   response.data.status                - Current status
 * @returns {Object[]} response.data.items                 - Line items with full detail
 * @returns {number}   response.data.subtotal              - Subtotal in ₦
 * @returns {number}   response.data.serviceFee            - Service fee in ₦
 * @returns {number}   response.data.tax                   - Tax in ₦
 * @returns {number}   response.data.deliveryFee           - Delivery fee in ₦
 * @returns {number}   response.data.discount              - Discount in ₦
 * @returns {number}   response.data.total                 - Final total in ₦
 * @returns {number}   response.data.totalCost             - Total cost (COGS)
 * @returns {number}   response.data.grossProfit           - Gross profit in ₦
 * @returns {number}   response.data.profitMargin          - Profit margin percentage
 * @returns {string}   [response.data.paymentStatus]       - Payment status
 * @returns {string}   [response.data.paymentMethod]       - Payment method
 * @returns {string}   [response.data.paymentReference]    - Payment gateway reference
 * @returns {Object[]} response.data.statusHistory         - `[{ status, timestamp, note? }]`
 * @returns {number}   response.data.estimatedWaitTime     - Minutes
 * @returns {Object}   [response.data.deliveryDetails]     - Delivery address and instructions
 * @returns {Object}   [response.data.pickupDetails]       - Pickup time info
 * @returns {Object}   [response.data.dineInDetails]       - Table number, QR scanned
 * @returns {string}   response.data.createdAt             - ISO 8601
 * @returns {Object}   response.meta
 * @returns {string}   response.meta.timestamp
 *
 * @status 200 - Success
 * @status 401 - Missing or invalid API key
 * @status 403 - API key lacks `orders:read` scope
 * @status 404 - Order not found
 * @status 429 - Rate limit exceeded
 * @status 500 - Internal server error
 *
 * @example
 * // Request
 * GET /api/public/orders/665d1e2f3a4b5c6d7e8f9a0b
 * x-api-key: wawa_abc_7f3a...
 *
 * // Response 200
 * {
 *   "success": true,
 *   "data": {
 *     "_id": "665d...",
 *     "orderNumber": "WGB-A1B2C3",
 *     "orderType": "dine-in",
 *     "status": "preparing",
 *     "items": [...],
 *     "total": 7350,
 *     "paymentStatus": "paid",
 *     "statusHistory": [{ "status": "pending", "timestamp": "..." }, ...],
 *     ...
 *   },
 *   "meta": { "timestamp": "..." }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
): Promise<Response> {
  return withApiAuth(request, ['orders:read'], async () => {
    const { orderId } = await params;
    try {
      const order = await OrderService.getOrderById(orderId);
      if (!order) {
        return apiError('Order not found', 404);
      }
      return apiSuccess(serialize(order));
    } catch (error) {
      console.error('[PUBLIC API] GET /api/public/orders/:orderId', error);
      return apiError('Failed to fetch order', 500);
    }
  });
}

interface UpdateStatusBody {
  status: OrderStatus;
  note?: string;
}

/**
 * PATCH /api/public/orders/:orderId
 *
 * Update order status. Supports the full order lifecycle.
 * Setting status to `"cancelled"` uses the cancellation flow (validates payment state, recalculates tab totals).
 *
 * **Typical lifecycle:** pending → confirmed → preparing → ready → completed
 * **Delivery lifecycle:** pending → confirmed → preparing → ready → out-for-delivery → delivered → completed
 *
 * @authentication API Key required — scope: `orders:write`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @pathParam {string} orderId - MongoDB ObjectId of the order
 *
 * @requestBody {Object} body
 * @requestBody {string} body.status - New status (**required**): `"pending"` | `"confirmed"` | `"preparing"` | `"ready"` | `"out-for-delivery"` | `"delivered"` | `"completed"` | `"cancelled"`
 * @requestBody {string} [body.note] - Optional note (required when cancelling, recommended for status changes)
 *
 * @returns {Object}  response
 * @returns {boolean} response.success - `true`
 * @returns {Object}  response.data    - Updated order (full order object)
 * @returns {Object}  response.meta
 * @returns {string}  response.meta.timestamp
 *
 * @status 200 - Status updated successfully
 * @status 400 - Missing status or invalid status value
 * @status 401 - Missing or invalid API key
 * @status 403 - API key lacks `orders:write` scope
 * @status 404 - Order not found
 * @status 422 - Business logic error (e.g. cannot cancel paid order, invalid transition)
 * @status 429 - Rate limit exceeded
 *
 * @example
 * // Request — move order to preparing
 * PATCH /api/public/orders/665d1e2f3a4b5c6d7e8f9a0b
 * x-api-key: wawa_abc_7f3a...
 * Content-Type: application/json
 *
 * { "status": "preparing", "note": "Kitchen started" }
 *
 * @example
 * // Request — cancel order
 * { "status": "cancelled", "note": "Customer requested cancellation" }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
): Promise<Response> {
  return withApiAuth(request, ['orders:write'], async () => {
    const { orderId } = await params;
    const body = await parseJsonBody<UpdateStatusBody>(request);

    if (!body || !body.status) {
      return apiError('status is required', 400);
    }

    const validStatuses: OrderStatus[] = [
      'pending', 'confirmed', 'preparing', 'ready',
      'out-for-delivery', 'delivered', 'completed', 'cancelled',
    ];
    if (!validStatuses.includes(body.status)) {
      return apiError(`status must be one of: ${validStatuses.join(', ')}`, 400);
    }

    try {
      if (body.status === 'cancelled') {
        const order = await OrderService.cancelOrder(orderId, body.note);
        if (!order) {
          return apiError('Order not found', 404);
        }
        return apiSuccess(serialize(order));
      }

      const order = await OrderService.updateOrderStatus(orderId, body.status, body.note);
      if (!order) {
        return apiError('Order not found', 404);
      }
      return apiSuccess(serialize(order));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to update order status';
      console.error('[PUBLIC API] PATCH /api/public/orders/:orderId', error);
      return apiError(msg, 422);
    }
  });
}
