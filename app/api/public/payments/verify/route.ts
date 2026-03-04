import { NextRequest } from 'next/server';
import { PaymentService } from '@/services/payment-service';
import { OrderService } from '@/services/order-service';
import Order from '@/models/order-model';
import { withApiAuth, apiSuccess, apiError, parseJsonBody, serialize } from '@/lib/api-response';

interface VerifyPaymentBody {
  paymentReference: string;
}

/**
 * POST /api/public/payments/verify
 *
 * Verify the status of a payment by its reference.
 * Queries the active payment provider (Monnify or Paystack) and returns the current status.
 * If payment is successful, automatically updates the linked order's payment status to `"paid"`.
 *
 * @authentication API Key required — scope: `payments:read`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @requestBody {Object} body
 * @requestBody {string} body.paymentReference - The payment reference returned from the initialization step (**required**)
 *
 * @returns {Object}  response
 * @returns {boolean} response.success                       - `true`
 * @returns {Object}  response.data                          - Verification result
 * @returns {string}  response.data.paymentReference         - Payment reference queried
 * @returns {string}  response.data.status                   - Gateway status (e.g. `"PAID"`, `"PENDING"`, `"FAILED"`)
 * @returns {number}  response.data.amount                   - Amount in ₦
 * @returns {string}  [response.data.paidAt]                 - ISO 8601 timestamp of successful payment
 * @returns {string}  [response.data.transactionReference]   - Gateway transaction reference
 * @returns {string}  response.data.provider                 - `"monnify"` | `"paystack"`
 * @returns {Object}  response.meta
 * @returns {string}  response.meta.timestamp
 *
 * @status 200 - Verification result returned
 * @status 400 - Missing paymentReference
 * @status 401 - Missing or invalid API key
 * @status 403 - API key lacks `payments:read` scope
 * @status 422 - Gateway verification error
 * @status 429 - Rate limit exceeded
 *
 * @example
 * // Request
 * POST /api/public/payments/verify
 * x-api-key: wawa_abc_7f3a...
 * Content-Type: application/json
 *
 * { "paymentReference": "PAY-665d-1719500000-AB1C2D" }
 *
 * // Response 200 (payment successful)
 * {
 *   "success": true,
 *   "data": {
 *     "paymentReference": "PAY-665d-1719500000-AB1C2D",
 *     "status": "PAID",
 *     "amount": 7350,
 *     "paidAt": "2025-06-01T12:05:30.000Z",
 *     "transactionReference": "MNFY|TXN|...",
 *     "provider": "monnify"
 *   },
 *   "meta": { "timestamp": "..." }
 * }
 */
export async function POST(request: NextRequest): Promise<Response> {
  return withApiAuth(request, ['payments:read'], async () => {
    const body = await parseJsonBody<VerifyPaymentBody>(request);
    if (!body?.paymentReference) {
      return apiError('paymentReference is required', 400);
    }

    try {
      const result = await PaymentService.verifyPayment(body.paymentReference);

      // If payment succeeded, update the order
      if (PaymentService.isPaymentSuccessful(result.status)) {
        const order = await Order.findOne({ paymentReference: body.paymentReference });
        if (order) {
          await OrderService.updatePaymentStatus(order._id.toString(), {
            paymentStatus: 'paid',
            paymentReference: body.paymentReference,
            transactionReference: result.transactionReference,
            paidAt: result.paidAt,
          });
        }
      }

      return apiSuccess(serialize({
        paymentReference: body.paymentReference,
        status: result.status,
        amount: result.amount,
        paidAt: result.paidAt,
        transactionReference: result.transactionReference,
        provider: result.provider,
      }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Payment verification failed';
      console.error('[PUBLIC API] POST /api/public/payments/verify', error);
      return apiError(msg, 422);
    }
  });
}
