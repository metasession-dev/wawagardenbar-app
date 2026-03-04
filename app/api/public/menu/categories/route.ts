import { NextRequest } from 'next/server';
import { CategoryService } from '@/services/category-service';
import { withApiAuth, apiSuccess, apiError, serialize } from '@/lib/api-response';

/**
 * GET /api/public/menu/categories
 *
 * List available menu categories grouped by main category.
 * Returns enabled categories from system settings, merged with any legacy
 * categories still in use in the database.
 *
 * @authentication API Key required — scope: `menu:read`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @returns {Object}   response
 * @returns {boolean}  response.success        - `true`
 * @returns {Object}   response.data           - Categories grouped by main category
 * @returns {string[]} response.data.drinks    - Drink sub-category slugs (e.g. `["beer-local","wine","soft-drinks"]`)
 * @returns {string[]} response.data.food      - Food sub-category slugs (e.g. `["starters","rice-dishes","soups"]`)
 * @returns {Object}   response.meta
 * @returns {string}   response.meta.timestamp - ISO 8601 response timestamp
 *
 * @status 200 - Success
 * @status 401 - Missing or invalid API key
 * @status 403 - API key lacks `menu:read` scope
 * @status 429 - Rate limit exceeded
 * @status 500 - Internal server error
 *
 * @example
 * // Request
 * GET /api/public/menu/categories
 * x-api-key: wawa_abc_7f3a...
 *
 * // Response 200
 * {
 *   "success": true,
 *   "data": {
 *     "drinks": ["beer-local", "beer-imported", "wine", "soft-drinks", "juice"],
 *     "food": ["starters", "rice-dishes", "soups", "small-chops", "desserts"]
 *   },
 *   "meta": { "timestamp": "2025-06-01T12:00:00.000Z" }
 * }
 */
export async function GET(request: NextRequest): Promise<Response> {
  return withApiAuth(request, ['menu:read'], async () => {
    try {
      const categories = await CategoryService.getCategories();
      return apiSuccess(serialize(categories));
    } catch (error) {
      console.error('[PUBLIC API] GET /api/public/menu/categories', error);
      return apiError('Failed to fetch categories', 500);
    }
  });
}
