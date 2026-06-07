import { NextRequest } from 'next/server';
import { CategoryService } from '@/services/category-service';
import {
  withApiAuth,
  apiSuccess,
  apiError,
  serialize,
} from '@/lib/api-response';

/**
 * GET /api/public/menu/categories
 *
 * List available menu categories grouped by main category.
 *
 * REQ-075 (BREAKING) — Envelope shape changed from
 * `{ drinks: [...], food: [...] }` (REQ-071, pre-this-release) to
 * `{ mainCategories: [{ slug, label, order, subCategories }] }`. This
 * supports admin-configurable main categories (rename / add / disable /
 * delete) and surfaces the human-readable `label` alongside the slug so
 * clients don't need a separate label lookup.
 *
 * Sub-category lists merge enabled rows from settings with any legacy
 * categories still in use in the database (de-duplicated).
 *
 * @authentication API Key required — scope: `menu:read`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @returns {Object}   response
 * @returns {boolean}  response.success                      - `true`
 * @returns {Object}   response.data
 * @returns {Object[]} response.data.mainCategories          - Enabled main categories, sorted by `order` ascending.
 * @returns {string}   response.data.mainCategories[].slug   - Stable identifier; matches `MenuItem.mainCategory`.
 * @returns {string}   response.data.mainCategories[].label  - Human-readable display name.
 * @returns {number}   response.data.mainCategories[].order  - Display order (lower first).
 * @returns {string[]} response.data.mainCategories[].subCategories - Enabled sub-category slugs under this main.
 * @returns {Object}   response.meta
 * @returns {string}   response.meta.timestamp               - ISO 8601 response timestamp
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
 *     "mainCategories": [
 *       {
 *         "slug": "food",
 *         "label": "Food",
 *         "order": 0,
 *         "subCategories": ["starters", "rice-dishes", "soups", "small-chops", "desserts"]
 *       },
 *       {
 *         "slug": "drinks",
 *         "label": "Drinks",
 *         "order": 1,
 *         "subCategories": ["beer-local", "beer-imported", "wine", "soft-drinks", "juice"]
 *       }
 *     ]
 *   },
 *   "meta": { "timestamp": "2026-06-07T12:00:00.000Z" }
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
