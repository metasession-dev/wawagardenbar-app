import { NextRequest } from 'next/server';
import { PaymentService } from '@/services/payment-service';
import { OrderService } from '@/services/order-service';
import { withApiAuth, apiSuccess, apiError, parseJsonBody, serialize } from '@/lib/api-response';

interface InitializePaymentBody {
  orderId: string;
  customerName: string;
  customerEmail: string;
  redirectUrl: string;
  paymentMethods?: string[];
}

/**
 * POST /api/public/payments
 *
 * Initialize a payment transaction for an existing order.
 * Routes to the active payment provider (Monnify or Paystack) based on system settings.
 * Returns a checkout URL the customer should be redirected to for payment completion.
 *
 * @authentication API Key required — scope: `payments:write`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @requestBody {Object}   body
 * @requestBody {string}   body.orderId        - MongoDB ObjectId of the order to pay (**required**)
 * @requestBody {string}   body.customerName   - Full customer name (**required**)
 * @requestBody {string}   body.customerEmail  - Customer email for receipt (**required**)
 * @requestBody {string}   body.redirectUrl    - URL to redirect after payment (**required**)
 * @requestBody {string[]} [body.paymentMethods] - Restrict payment methods (e.g. `["CARD","ACCOUNT_TRANSFER"]`)
 *
 * @returns {Object}  response
 * @returns {boolean} response.success                  - `true`
 * @returns {Object}  response.data                     - Payment initialization result
 * @returns {string}  response.data.checkoutUrl         - URL to redirect customer for payment
 * @returns {string}  response.data.paymentReference    - Unique payment reference (use for verification)
 * @returns {string}  response.data.provider            - Payment provider used (`"monnify"` | `"paystack"`)
 * @returns {string}  response.data.orderNumber         - Human-readable order number
 * @returns {number}  response.data.amount              - Amount to pay in ₦
 * @returns {Object}  response.meta
 * @returns {string}  response.meta.timestamp
 *
 * @status 201 - Payment initialized, checkout URL returned
 * @status 400 - Missing required fields
 * @status 401 - Missing or invalid API key
 * @status 403 - API key lacks `payments:write` scope
 * @status 404 - Order not found
 * @status 409 - Order already paid
 * @status 422 - Payment gateway error
 * @status 429 - Rate limit exceeded
 *
 * @example
 * // Request
 * POST /api/public/payments
 * x-api-key: wawa_abc_7f3a...
 * Content-Type: application/json
 *
 * {
 *   "orderId": "665d1e2f3a4b5c6d7e8f9a0b",
 *   "customerName": "Ada Obi",
 *   "customerEmail": "ada@example.com",
 *   "redirectUrl": "https://myapp.com/payment/callback"
 * }
 *
 * // Response 201
 * {
 *   "success": true,
 *   "data": {
 *     "checkoutUrl": "https://checkout.monnify.com/...",
 *     "paymentReference": "PAY-665d-1719500000-AB1C2D",
 *     "provider": "monnify",
 *     "orderNumber": "WGB-A1B2C3",
 *     "amount": 7350
 *   },
 *   "meta": { "timestamp": "..." }
 * }
 */
export async function POST(request: NextRequest): Promise<Response> {
  return withApiAuth(request, ['payments:write'], async () => {
    const body = await parseJsonBody<InitializePaymentBody>(request);
    if (!body) {
      return apiError('Invalid JSON body', 400);
    }

    const { orderId, customerName, customerEmail, redirectUrl } = body;

    if (!orderId || !customerName || !customerEmail || !redirectUrl) {
      return apiError('orderId, customerName, customerEmail, and redirectUrl are required', 400);
    }

    try {
      const order = await OrderService.getOrderById(orderId);
      if (!order) {
        return apiError('Order not found', 404);
      }
      if (order.paymentStatus === 'paid') {
        return apiError('Order has already been paid', 409);
      }

      const paymentReference = PaymentService.generatePaymentReference(orderId);

      const result = await PaymentService.initializePayment({
        amount: order.total,
        customerName,
        customerEmail,
        paymentReference,
        paymentDescription: `Wawa Garden Bar — Order ${order.orderNumber}`,
        redirectUrl,
        paymentMethods: body.paymentMethods as any,
      });

      // Store reference on order
      await OrderService.updatePaymentStatus(orderId, {
        paymentStatus: 'pending',
        paymentReference,
      });

      return apiSuccess(serialize({
        checkoutUrl: result.checkoutUrl,
        paymentReference: result.reference,
        provider: result.provider,
        orderNumber: order.orderNumber,
        amount: order.total,
      }), 201);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to initialize payment';
      console.error('[PUBLIC API] POST /api/public/payments', error);
      return apiError(msg, 422);
    }
  });
}
