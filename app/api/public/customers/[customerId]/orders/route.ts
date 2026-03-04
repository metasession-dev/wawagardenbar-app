import { NextRequest } from 'next/server';
import { OrderService } from '@/services/order-service';
import { OrderStatus } from '@/interfaces';
import { withApiAuth, apiSuccess, apiError, parsePagination, serialize } from '@/lib/api-response';

/**
 * GET /api/public/customers/:customerId/orders
 *
 * Get a customer's order history with pagination and optional status filter.
 * Requires both `customers:read` and `orders:read` scopes.
 *
 * @authentication API Key required — scopes: `customers:read` + `orders:read`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @pathParam {string} customerId - MongoDB ObjectId of the user
 *
 * @queryParam {string} [status]   - Filter by order status: `"pending"` | `"confirmed"` | `"preparing"` | `"ready"` | `"completed"` | `"cancelled"` etc.
 * @queryParam {number} [page=1]   - Page number (1-indexed)
 * @queryParam {number} [limit=25] - Items per page (max 100)
 *
 * @returns {Object}   response
 * @returns {boolean}  response.success                    - `true`
 * @returns {Object[]} response.data                       - Array of order objects (sorted newest first)
 * @returns {string}   response.data[].orderNumber         - Human-readable order number
 * @returns {string}   response.data[].orderType           - Order type
 * @returns {string}   response.data[].status              - Current status
 * @returns {Object[]} response.data[].items               - Line items
 * @returns {number}   response.data[].total               - Total in ₦
 * @returns {string}   response.data[].paymentStatus       - Payment status
 * @returns {string}   response.data[].createdAt           - ISO 8601
 * @returns {Object}   response.meta                       - Pagination metadata
 * @returns {number}   response.meta.page
 * @returns {number}   response.meta.limit
 * @returns {number}   response.meta.total
 * @returns {number}   response.meta.totalPages
 * @returns {string}   response.meta.timestamp
 *
 * @status 200 - Success with order history
 * @status 401 - Missing or invalid API key
 * @status 403 - API key lacks required scopes
 * @status 429 - Rate limit exceeded
 * @status 500 - Internal server error
 *
 * @example
 * // Request
 * GET /api/public/customers/665e1f2a3b4c5d6e7f8a9b0c/orders?status=completed&limit=5
 * x-api-key: wawa_abc_7f3a...
 *
 * // Response 200
 * {
 *   "success": true,
 *   "data": [
 *     { "orderNumber": "WGB-X1Y2Z3", "orderType": "dine-in", "status": "completed", "total": 5200, ... }
 *   ],
 *   "meta": { "page": 1, "limit": 5, "total": 12, "totalPages": 3, "timestamp": "..." }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
): Promise<Response> {
  return withApiAuth(request, ['customers:read', 'orders:read'], async () => {
    const { customerId } = await params;
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') as OrderStatus | null;
    const { page, limit, skip } = parsePagination(searchParams);

    try {
      const { orders, total } = await OrderService.getOrdersByUserId(customerId, {
        limit,
        skip,
        status: status || undefined,
      });

      return apiSuccess(serialize(orders), 200, { page, limit, total });
    } catch (error) {
      console.error('[PUBLIC API] GET /api/public/customers/:id/orders', error);
      return apiError('Failed to fetch customer orders', 500);
    }
  });
}
