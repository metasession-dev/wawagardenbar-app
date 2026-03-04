import { NextRequest } from 'next/server';
import { CategoryService } from '@/services/category-service';
import { withApiAuth, apiSuccess, apiError, parsePagination, serialize } from '@/lib/api-response';

/**
 * GET /api/public/menu
 *
 * List all available menu items with stock status.
 * Supports filtering by mainCategory, category, and free-text search.
 *
 * @authentication API Key required — scope: `menu:read`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @queryParam {string}  [mainCategory] - Filter by top-level category: `"drinks"` | `"food"`
 * @queryParam {string}  [category]     - Filter by sub-category slug (e.g. `"beer-local"`, `"starters"`)
 * @queryParam {string}  [q]            - Free-text search across name, description, and tags
 * @queryParam {number}  [page=1]       - Page number (1-indexed)
 * @queryParam {number}  [limit=25]     - Items per page (max 100)
 *
 * @returns {Object} response
 * @returns {boolean}  response.success           - `true`
 * @returns {Object[]} response.data              - Array of menu items
 * @returns {string}   response.data[]._id        - Menu item ID
 * @returns {string}   response.data[].name       - Item display name
 * @returns {string}   response.data[].description - Item description
 * @returns {string}   response.data[].mainCategory - `"drinks"` | `"food"`
 * @returns {string}   response.data[].category   - Sub-category slug
 * @returns {number}   response.data[].price      - Price in ₦
 * @returns {string[]} response.data[].images     - Array of image URLs
 * @returns {boolean}  response.data[].isAvailable - Availability flag
 * @returns {number}   response.data[].preparationTime - Prep time in minutes
 * @returns {string}   response.data[].stockStatus - `"in-stock"` | `"low-stock"` | `"out-of-stock"`
 * @returns {number}   [response.data[].currentStock] - Current stock level (if tracked)
 * @returns {Object[]} response.data[].customizations - Available customizations
 * @returns {Object}   response.data[].portionOptions - Half/quarter portion config
 * @returns {Object}   response.data[].nutritionalInfo - Calories, spice level, etc.
 * @returns {string[]} response.data[].allergens  - Allergen warnings
 * @returns {string[]} response.data[].tags        - Search tags
 * @returns {Object}   response.meta              - Pagination metadata
 * @returns {number}   response.meta.page         - Current page
 * @returns {number}   response.meta.limit        - Items per page
 * @returns {number}   response.meta.total        - Total matching items
 * @returns {number}   response.meta.totalPages   - Total pages
 * @returns {string}   response.meta.timestamp    - ISO 8601 response timestamp
 *
 * @status 200 - Success with paginated menu items
 * @status 401 - Missing or invalid API key
 * @status 403 - API key lacks `menu:read` scope
 * @status 429 - Rate limit exceeded (Retry-After header included)
 * @status 500 - Internal server error
 *
 * @example
 * // Request
 * GET /api/public/menu?mainCategory=food&page=1&limit=10
 * x-api-key: wawa_abc_7f3a...
 *
 * // Response 200
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "_id": "665a...",
 *       "name": "Jollof Rice",
 *       "mainCategory": "food",
 *       "category": "rice-dishes",
 *       "price": 3500,
 *       "stockStatus": "in-stock",
 *       "currentStock": 45,
 *       ...
 *     }
 *   ],
 *   "meta": { "page": 1, "limit": 10, "total": 24, "totalPages": 3, "timestamp": "..." }
 * }
 */
export async function GET(request: NextRequest): Promise<Response> {
  return withApiAuth(request, ['menu:read'], async () => {
    const { searchParams } = request.nextUrl;
    const mainCategory = searchParams.get('mainCategory') as 'drinks' | 'food' | null;
    const category = searchParams.get('category');
    const query = searchParams.get('q');
    const { page, limit, skip } = parsePagination(searchParams);

    try {
      let items;
      if (query) {
        items = await CategoryService.searchItems(query);
      } else if (category) {
        items = await CategoryService.getItemsByCategory(category);
      } else if (mainCategory) {
        items = await CategoryService.getItemsByMainCategory(mainCategory);
      } else {
        items = await CategoryService.getAllMenuItems();
      }

      const total = items.length;
      const paged = items.slice(skip, skip + limit);

      return apiSuccess(serialize(paged), 200, { page, limit, total });
    } catch (error) {
      console.error('[PUBLIC API] GET /api/public/menu', error);
      return apiError('Failed to fetch menu items', 500);
    }
  });
}
