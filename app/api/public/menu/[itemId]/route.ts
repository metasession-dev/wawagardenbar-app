import { NextRequest } from 'next/server';
import { CategoryService } from '@/services/category-service';
import { withApiAuth, apiSuccess, apiError, serialize } from '@/lib/api-response';

/**
 * GET /api/public/menu/:itemId
 *
 * Get a single menu item by ID with full details and stock status.
 *
 * @authentication API Key required — scope: `menu:read`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @pathParam {string} itemId - MongoDB ObjectId of the menu item
 *
 * @returns {Object}   response
 * @returns {boolean}  response.success              - `true`
 * @returns {Object}   response.data                 - Menu item object
 * @returns {string}   response.data._id             - Menu item ID
 * @returns {string}   response.data.name            - Item display name
 * @returns {string}   response.data.description     - Item description
 * @returns {string}   response.data.mainCategory    - `"drinks"` | `"food"`
 * @returns {string}   response.data.category        - Sub-category slug
 * @returns {number}   response.data.price           - Price in ₦
 * @returns {number}   response.data.costPerUnit     - Unit cost in ₦
 * @returns {string[]} response.data.images          - Image URLs
 * @returns {Object[]} response.data.customizations  - Customization groups
 * @returns {string}   response.data.customizations[].name    - Group name (e.g. "Size")
 * @returns {boolean}  response.data.customizations[].required - Whether selection is mandatory
 * @returns {Object[]} response.data.customizations[].options  - Available options with name, price, available
 * @returns {boolean}  response.data.isAvailable     - Menu availability flag
 * @returns {number}   response.data.preparationTime - Prep time in minutes
 * @returns {string}   response.data.stockStatus     - `"in-stock"` | `"low-stock"` | `"out-of-stock"`
 * @returns {number}   [response.data.currentStock]  - Current stock level (if tracked)
 * @returns {Object}   response.data.portionOptions  - Portion configuration
 * @returns {boolean}  response.data.portionOptions.halfPortionEnabled
 * @returns {number}   response.data.portionOptions.halfPortionSurcharge
 * @returns {boolean}  response.data.portionOptions.quarterPortionEnabled
 * @returns {number}   response.data.portionOptions.quarterPortionSurcharge
 * @returns {Object}   [response.data.nutritionalInfo] - Nutritional data (calories, spice level, etc.)
 * @returns {string[]} response.data.allergens       - Allergen warnings
 * @returns {string[]} response.data.tags            - Search tags
 * @returns {Object}   response.meta
 * @returns {string}   response.meta.timestamp       - ISO 8601 response timestamp
 *
 * @status 200 - Success
 * @status 401 - Missing or invalid API key
 * @status 403 - API key lacks `menu:read` scope
 * @status 404 - Menu item not found
 * @status 429 - Rate limit exceeded
 * @status 500 - Internal server error
 *
 * @example
 * // Request
 * GET /api/public/menu/665a1b2c3d4e5f6a7b8c9d0e
 * x-api-key: wawa_abc_7f3a...
 *
 * // Response 200
 * {
 *   "success": true,
 *   "data": {
 *     "_id": "665a1b2c3d4e5f6a7b8c9d0e",
 *     "name": "Jollof Rice",
 *     "mainCategory": "food",
 *     "category": "rice-dishes",
 *     "price": 3500,
 *     "stockStatus": "in-stock",
 *     "currentStock": 45,
 *     "customizations": [...],
 *     "portionOptions": { "halfPortionEnabled": true, "halfPortionSurcharge": 0, ... },
 *     ...
 *   },
 *   "meta": { "timestamp": "..." }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
): Promise<Response> {
  return withApiAuth(request, ['menu:read'], async () => {
    const { itemId } = await params;
    try {
      const item = await CategoryService.getItemById(itemId);
      if (!item) {
        return apiError('Menu item not found', 404);
      }
      return apiSuccess(serialize(item));
    } catch (error) {
      console.error('[PUBLIC API] GET /api/public/menu/:itemId', error);
      return apiError('Failed to fetch menu item', 500);
    }
  });
}
