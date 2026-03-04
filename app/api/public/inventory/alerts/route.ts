import { NextRequest } from 'next/server';
import InventoryService from '@/services/inventory-service';
import { withApiAuth, apiSuccess, apiError, serialize } from '@/lib/api-response';

/**
 * GET /api/public/inventory/alerts
 *
 * Get low-stock and out-of-stock alerts across all inventory items,
 * including granular location-level alerts for items with location tracking.
 *
 * @authentication API Key required — scope: `inventory:read`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @returns {Object}   response
 * @returns {boolean}  response.success                             - `true`
 * @returns {Object}   response.data                                - Alerts grouped by severity
 * @returns {Object[]} response.data.lowStock                       - Items with `"low-stock"` status
 * @returns {string}   response.data.lowStock[]._id                 - Inventory record ID
 * @returns {Object}   response.data.lowStock[].menuItemId          - Populated `{ _id, name, mainCategory, category }`
 * @returns {number}   response.data.lowStock[].currentStock        - Current quantity
 * @returns {number}   response.data.lowStock[].minimumStock        - Threshold
 * @returns {Object[]} response.data.outOfStock                     - Items with `"out-of-stock"` status (same shape)
 * @returns {Object[]} response.data.locationAlerts                 - Per-location critical alerts
 * @returns {string}   response.data.locationAlerts[].location      - Location ID
 * @returns {string}   response.data.locationAlerts[].locationName  - Location display name
 * @returns {number}   response.data.locationAlerts[].currentStock  - Stock at location
 * @returns {string}   response.data.locationAlerts[].severity      - `"critical"` | `"warning"`
 * @returns {Object}   response.data.summary                       - Aggregate counts
 * @returns {number}   response.data.summary.lowStockCount
 * @returns {number}   response.data.summary.outOfStockCount
 * @returns {number}   response.data.summary.locationAlertCount
 * @returns {Object}   response.meta
 * @returns {string}   response.meta.timestamp
 *
 * @status 200 - Success with all alert data
 * @status 401 - Missing or invalid API key
 * @status 403 - API key lacks `inventory:read` scope
 * @status 429 - Rate limit exceeded
 * @status 500 - Internal server error
 *
 * @example
 * // Request
 * GET /api/public/inventory/alerts
 * x-api-key: wawa_abc_7f3a...
 *
 * // Response 200
 * {
 *   "success": true,
 *   "data": {
 *     "lowStock": [{ "_id": "665b...", "menuItemId": { "name": "Star Lager" }, "currentStock": 5, ... }],
 *     "outOfStock": [{ "_id": "665c...", "menuItemId": { "name": "Hennessy VS" }, "currentStock": 0, ... }],
 *     "locationAlerts": [{ "location": "bar-1", "locationName": "Main Bar", "currentStock": 0, "severity": "critical" }],
 *     "summary": { "lowStockCount": 4, "outOfStockCount": 1, "locationAlertCount": 2 }
 *   },
 *   "meta": { "timestamp": "..." }
 * }
 */
export async function GET(request: NextRequest): Promise<Response> {
  return withApiAuth(request, ['inventory:read'], async () => {
    try {
      const [lowStock, outOfStock, locationAlerts] = await Promise.all([
        InventoryService.getLowStockItems(),
        InventoryService.getOutOfStockItems(),
        InventoryService.getLowStockByLocation(),
      ]);

      return apiSuccess(serialize({
        lowStock,
        outOfStock,
        locationAlerts,
        summary: {
          lowStockCount: lowStock.length,
          outOfStockCount: outOfStock.length,
          locationAlertCount: locationAlerts.length,
        },
      }));
    } catch (error) {
      console.error('[PUBLIC API] GET /api/public/inventory/alerts', error);
      return apiError('Failed to fetch inventory alerts', 500);
    }
  });
}
