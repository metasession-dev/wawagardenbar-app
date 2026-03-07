import { NextRequest } from 'next/server';
import { CategoryService } from '@/services/category-service';
import MenuItemModel from '@/models/menu-item-model';
import { withApiAuth, apiSuccess, apiError, parsePagination, serialize, parseJsonBody } from '@/lib/api-response';
import { AuditLogService } from '@/services/audit-log-service';

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

export async function POST(request: NextRequest): Promise<Response> {
  return withApiAuth(request, ['menu:write'], async () => {
    try {
      const body = await parseJsonBody<Record<string, unknown>>(request);
      if (!body) return apiError('Invalid JSON body', 400);

      const { name, description, mainCategory, category, price, costPerUnit, preparationTime } = body as Record<string, any>;

      if (!name || typeof name !== 'string') {
        return apiError('name is required', 400);
      }
      if (!description || typeof description !== 'string') {
        return apiError('description is required', 400);
      }
      if (!mainCategory || !['drinks', 'food'].includes(mainCategory)) {
        return apiError('mainCategory must be "drinks" or "food"', 400);
      }
      if (!category || typeof category !== 'string') {
        return apiError('category is required', 400);
      }
      if (price === undefined || price === null || typeof price !== 'number' || price < 0) {
        return apiError('price must be a number >= 0', 400);
      }
      if (costPerUnit === undefined || costPerUnit === null || typeof costPerUnit !== 'number' || costPerUnit < 0) {
        return apiError('costPerUnit must be a number >= 0', 400);
      }
      if (preparationTime === undefined || preparationTime === null || typeof preparationTime !== 'number' || preparationTime < 0) {
        return apiError('preparationTime must be a number >= 0', 400);
      }

      const item = await MenuItemModel.create({
        name,
        description,
        mainCategory,
        category,
        price,
        costPerUnit,
        preparationTime,
        images: body.images || undefined,
        customizations: body.customizations || undefined,
        isAvailable: body.isAvailable !== undefined ? body.isAvailable : true,
        servingSize: body.servingSize || undefined,
        tags: body.tags || undefined,
        allergens: body.allergens || undefined,
        nutritionalInfo: body.nutritionalInfo || undefined,
        slug: body.slug || undefined,
        metaDescription: body.metaDescription || undefined,
        trackInventory: body.trackInventory !== undefined ? body.trackInventory : false,
        pointsValue: body.pointsValue || undefined,
        pointsRedeemable: body.pointsRedeemable !== undefined ? body.pointsRedeemable : false,
        portionOptions: body.portionOptions || undefined,
        allowManualPriceOverride: body.allowManualPriceOverride !== undefined ? body.allowManualPriceOverride : false,
      });

      await AuditLogService.createLog({
        userId: '000000000000000000000000',
        userEmail: 'api',
        userRole: 'api',
        action: 'menu.create',
        resource: 'menu-item',
        resourceId: item._id.toString(),
        details: { name, mainCategory, category, price },
      });

      return apiSuccess(serialize(item), 201);
    } catch (error) {
      console.error('[PUBLIC API] POST /api/public/menu', error);
      return apiError('Failed to create menu item', 500);
    }
  });
}
