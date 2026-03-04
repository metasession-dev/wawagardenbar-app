import { NextRequest } from 'next/server';
import { OrderService } from '@/services/order-service';
import { withApiAuth, apiSuccess, apiError, parseDateParam, serialize } from '@/lib/api-response';

/**
 * GET /api/public/orders/stats
 *
 * Get aggregate order statistics including totals, revenue, average order value,
 * and breakdowns by status and order type. Optionally filter by date range.
 *
 * @authentication API Key required — scope: `orders:read`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @queryParam {string} [startDate] - ISO 8601 inclusive start date (e.g. `"2025-06-01T00:00:00Z"`)
 * @queryParam {string} [endDate]   - ISO 8601 inclusive end date
 *
 * @returns {Object}  response
 * @returns {boolean} response.success                          - `true`
 * @returns {Object}  response.data                             - Aggregate statistics
 * @returns {number}  response.data.totalOrders                 - Total order count
 * @returns {number}  response.data.totalRevenue                - Sum of all order totals in ₦
 * @returns {number}  response.data.averageOrderValue           - Average order total in ₦
 * @returns {Object}  response.data.byStatus                   - Count breakdown by status (e.g. `{ pending: 5, completed: 120, ... }`)
 * @returns {Object}  response.data.byOrderType                - Count breakdown by order type (e.g. `{ "dine-in": 80, pickup: 30, ... }`)
 * @returns {Object}  response.meta
 * @returns {string}  response.meta.timestamp
 *
 * @status 200 - Success with statistics
 * @status 401 - Missing or invalid API key
 * @status 403 - API key lacks `orders:read` scope
 * @status 429 - Rate limit exceeded
 * @status 500 - Internal server error
 *
 * @example
 * // Request — last 30 days
 * GET /api/public/orders/stats?startDate=2025-05-01T00:00:00Z&endDate=2025-05-31T23:59:59Z
 * x-api-key: wawa_abc_7f3a...
 *
 * // Response 200
 * {
 *   "success": true,
 *   "data": {
 *     "totalOrders": 342,
 *     "totalRevenue": 1250000,
 *     "averageOrderValue": 3655,
 *     "byStatus": { "completed": 280, "cancelled": 12, "pending": 5, ... },
 *     "byOrderType": { "dine-in": 180, "pickup": 90, "delivery": 72 }
 *   },
 *   "meta": { "timestamp": "..." }
 * }
 */
export async function GET(request: NextRequest): Promise<Response> {
  return withApiAuth(request, ['orders:read'], async () => {
    const { searchParams } = request.nextUrl;
    const startDate = parseDateParam(searchParams.get('startDate'));
    const endDate = parseDateParam(searchParams.get('endDate'));

    try {
      const stats = await OrderService.getOrderStats(startDate, endDate);
      return apiSuccess(serialize(stats));
    } catch (error) {
      console.error('[PUBLIC API] GET /api/public/orders/stats', error);
      return apiError('Failed to fetch order statistics', 500);
    }
  });
}
