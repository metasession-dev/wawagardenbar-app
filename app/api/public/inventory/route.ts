import { NextRequest } from 'next/server';
import InventoryModel from '@/models/inventory-model';
import { withApiAuth, apiSuccess, apiError, parsePagination, serialize } from '@/lib/api-response';

/**
 * GET /api/public/inventory
 *
 * List all inventory items with stock levels, linked menu item info, and status.
 * Results include populated menu item fields (name, price, category, images).
 *
 * @authentication API Key required — scope: `inventory:read`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @queryParam {string} [status]   - Filter by stock status: `"in-stock"` | `"low-stock"` | `"out-of-stock"`
 * @queryParam {number} [page=1]   - Page number (1-indexed)
 * @queryParam {number} [limit=25] - Items per page (max 100)
 *
 * @returns {Object}   response
 * @returns {boolean}  response.success                   - `true`
 * @returns {Object[]} response.data                      - Array of inventory items
 * @returns {string}   response.data[]._id                - Inventory record ID
 * @returns {Object}   response.data[].menuItemId         - Populated menu item `{ _id, name, price, mainCategory, category, images }`
 * @returns {number}   response.data[].currentStock       - Current stock quantity
 * @returns {number}   response.data[].minimumStock       - Low-stock threshold
 * @returns {number}   response.data[].maximumStock       - Maximum capacity
 * @returns {string}   response.data[].unit               - Unit of measure (bottles, portions, kg, etc.)
 * @returns {string}   response.data[].status             - `"in-stock"` | `"low-stock"` | `"out-of-stock"`
 * @returns {number}   response.data[].costPerUnit        - Cost per unit in ₦
 * @returns {string}   [response.data[].supplier]         - Supplier name
 * @returns {boolean}  response.data[].trackByLocation    - Whether location tracking is enabled
 * @returns {Object[]} [response.data[].locations]        - Per-location stock breakdown
 * @returns {string}   response.data[].updatedAt          - Last update ISO timestamp
 * @returns {Object}   response.meta                      - Pagination metadata
 * @returns {number}   response.meta.page
 * @returns {number}   response.meta.limit
 * @returns {number}   response.meta.total
 * @returns {number}   response.meta.totalPages
 * @returns {string}   response.meta.timestamp
 *
 * @status 200 - Success with paginated inventory items
 * @status 401 - Missing or invalid API key
 * @status 403 - API key lacks `inventory:read` scope
 * @status 429 - Rate limit exceeded
 * @status 500 - Internal server error
 *
 * @example
 * // Request
 * GET /api/public/inventory?status=low-stock&page=1&limit=10
 * x-api-key: wawa_abc_7f3a...
 *
 * // Response 200
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "_id": "665b...",
 *       "menuItemId": { "_id": "665a...", "name": "Star Lager", "price": 800, ... },
 *       "currentStock": 5,
 *       "minimumStock": 10,
 *       "unit": "bottles",
 *       "status": "low-stock",
 *       ...
 *     }
 *   ],
 *   "meta": { "page": 1, "limit": 10, "total": 3, "totalPages": 1, "timestamp": "..." }
 * }
 */
export async function GET(request: NextRequest): Promise<Response> {
  return withApiAuth(request, ['inventory:read'], async () => {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');
    const { page, limit, skip } = parsePagination(searchParams);

    try {
      const filter: Record<string, unknown> = {};
      if (status && ['in-stock', 'low-stock', 'out-of-stock'].includes(status)) {
        filter.status = status;
      }

      const [items, total] = await Promise.all([
        InventoryModel.find(filter)
          .populate('menuItemId', 'name price mainCategory category images')
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        InventoryModel.countDocuments(filter),
      ]);

      return apiSuccess(serialize(items), 200, { page, limit, total });
    } catch (error) {
      console.error('[PUBLIC API] GET /api/public/inventory', error);
      return apiError('Failed to fetch inventory', 500);
    }
  });
}
