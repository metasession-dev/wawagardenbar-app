import { NextRequest } from 'next/server';
import { OrderService } from '@/services/order-service';
import { withApiAuth, apiSuccess, apiError, parseJsonBody, serialize } from '@/lib/api-response';

interface ManualPaymentBody {
  paymentType: 'cash' | 'transfer' | 'card';
  paymentReference: string;
  comments?: string;
}

/**
 * POST /api/public/payments/:orderId/manual
 *
 * Record a manual (cash / bank transfer / POS card) payment for an order.
 * Typically used by POS systems, staff-facing integrations, or AI assistants.
 * Marks the order as paid with the specified payment method and reference.
 *
 * @authentication API Key required — scope: `payments:write`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @pathParam {string} orderId - MongoDB ObjectId of the order
 *
 * @requestBody {Object} body
 * @requestBody {string} body.paymentType      - `"cash"` | `"transfer"` | `"card"` (**required**)
 * @requestBody {string} body.paymentReference - Receipt or reference number, min 3 chars (**required**)
 * @requestBody {string} [body.comments]       - Optional staff comments
 *
 * @returns {Object}  response
 * @returns {boolean} response.success              - `true`
 * @returns {Object}  response.data                 - Updated order (full order object with `paymentStatus: "paid"`)
 * @returns {string}  response.data.paymentMethod   - The payment method recorded
 * @returns {string}  response.data.paymentReference - The reference stored
 * @returns {string}  response.data.paidAt          - ISO 8601 payment timestamp
 * @returns {Object}  response.meta
 * @returns {string}  response.meta.timestamp
 *
 * @status 200 - Manual payment recorded, order marked as paid
 * @status 400 - Invalid body (missing/invalid paymentType or paymentReference)
 * @status 401 - Missing or invalid API key
 * @status 403 - API key lacks `payments:write` scope
 * @status 422 - Business logic error (e.g. order already paid, order not found)
 * @status 429 - Rate limit exceeded
 *
 * @example
 * // Request — record cash payment
 * POST /api/public/payments/665d1e2f3a4b5c6d7e8f9a0b/manual
 * x-api-key: wawa_abc_7f3a...
 * Content-Type: application/json
 *
 * {
 *   "paymentType": "cash",
 *   "paymentReference": "CASH-20250601-001",
 *   "comments": "Paid at counter"
 * }
 *
 * // Response 200
 * {
 *   "success": true,
 *   "data": {
 *     "_id": "665d...",
 *     "orderNumber": "WGB-A1B2C3",
 *     "paymentStatus": "paid",
 *     "paymentMethod": "cash",
 *     "paymentReference": "CASH-20250601-001",
 *     "paidAt": "2025-06-01T12:10:00.000Z",
 *     ...
 *   },
 *   "meta": { "timestamp": "..." }
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
): Promise<Response> {
  return withApiAuth(request, ['payments:write'], async () => {
    const { orderId } = await params;
    const body = await parseJsonBody<ManualPaymentBody>(request);

    if (!body) {
      return apiError('Invalid JSON body', 400);
    }

    const { paymentType, paymentReference, comments } = body;

    if (!paymentType || !['cash', 'transfer', 'card'].includes(paymentType)) {
      return apiError('paymentType must be "cash", "transfer", or "card"', 400);
    }
    if (!paymentReference || paymentReference.trim().length < 3) {
      return apiError('paymentReference is required (min 3 characters)', 400);
    }

    try {
      const order = await OrderService.completeOrderPaymentManually({
        orderId,
        paymentType,
        paymentReference,
        comments,
        processedByAdminId: '000000000000000000000000',
      });

      return apiSuccess(serialize(order));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Manual payment failed';
      console.error('[PUBLIC API] POST /api/public/payments/:orderId/manual', error);
      return apiError(msg, 422);
    }
  });
}
