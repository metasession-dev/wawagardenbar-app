import { NextRequest } from 'next/server';
import InventoryModel from '@/models/inventory-model';
import InventoryService from '@/services/inventory-service';
import { withApiAuth, apiSuccess, apiError, serialize, parseJsonBody } from '@/lib/api-response';

/**
 * GET /api/public/inventory/:inventoryId
 *
 * Get a single inventory item with full details, location breakdown,
 * waste statistics, and profit margin analytics.
 *
 * @authentication API Key required — scope: `inventory:read`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @pathParam {string} inventoryId - MongoDB ObjectId of the inventory record
 *
 * @returns {Object}   response
 * @returns {boolean}  response.success                            - `true`
 * @returns {Object}   response.data                               - Inventory item with analytics
 * @returns {string}   response.data._id                           - Inventory record ID
 * @returns {Object}   response.data.menuItemId                    - Populated menu item `{ _id, name, price, mainCategory, category, images }`
 * @returns {number}   response.data.currentStock                  - Current stock quantity
 * @returns {number}   response.data.minimumStock                  - Low-stock threshold
 * @returns {number}   response.data.maximumStock                  - Maximum capacity
 * @returns {string}   response.data.unit                          - Unit of measure
 * @returns {string}   response.data.status                        - `"in-stock"` | `"low-stock"` | `"out-of-stock"`
 * @returns {number}   response.data.costPerUnit                   - Unit cost in ₦
 * @returns {Object}   response.data.locationBreakdown             - Per-location stock detail
 * @returns {boolean}  response.data.locationBreakdown.trackByLocation - Whether location tracking is on
 * @returns {number}   response.data.locationBreakdown.totalStock  - Aggregate stock
 * @returns {Object[]} response.data.locationBreakdown.locations   - Array of `{ location, locationName, currentStock, percentage }`
 * @returns {Object}   response.data.wasteStats                   - Waste analytics `{ totalWaste, wasteRate, ... }`
 * @returns {Object}   response.data.profitMargin                 - Profit analytics `{ costPerUnit, sellingPrice, margin, marginPercentage }`
 * @returns {Object}   response.meta
 * @returns {string}   response.meta.timestamp                    - ISO 8601 response timestamp
 *
 * @status 200 - Success with full inventory detail
 * @status 401 - Missing or invalid API key
 * @status 403 - API key lacks `inventory:read` scope
 * @status 404 - Inventory item not found
 * @status 429 - Rate limit exceeded
 * @status 500 - Internal server error
 *
 * @example
 * // Request
 * GET /api/public/inventory/665b1c2d3e4f5a6b7c8d9e0f
 * x-api-key: wawa_abc_7f3a...
 *
 * // Response 200
 * {
 *   "success": true,
 *   "data": {
 *     "_id": "665b...",
 *     "menuItemId": { "_id": "665a...", "name": "Star Lager", "price": 800 },
 *     "currentStock": 48,
 *     "minimumStock": 10,
 *     "unit": "bottles",
 *     "status": "in-stock",
 *     "locationBreakdown": { "trackByLocation": true, "totalStock": 48, "locations": [...] },
 *     "wasteStats": { "totalWaste": 3, "wasteRate": 0.06 },
 *     "profitMargin": { "costPerUnit": 450, "sellingPrice": 800, "marginPercentage": 43.75 }
 *   },
 *   "meta": { "timestamp": "..." }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ inventoryId: string }> }
): Promise<Response> {
  return withApiAuth(request, ['inventory:read'], async () => {
    const { inventoryId } = await params;
    try {
      const inventory = await InventoryModel.findById(inventoryId)
        .populate('menuItemId', 'name price mainCategory category images')
        .lean();

      if (!inventory) {
        return apiError('Inventory item not found', 404);
      }

      const [locationBreakdown, wasteStats, profitMargin] = await Promise.all([
        InventoryService.getLocationBreakdown(inventoryId),
        InventoryService.getWasteStats(inventoryId),
        InventoryService.calculateProfitMargin(inventoryId),
      ]);

      return apiSuccess(serialize({
        ...inventory,
        locationBreakdown,
        wasteStats,
        profitMargin,
      }));
    } catch (error) {
      console.error('[PUBLIC API] GET /api/public/inventory/:id', error);
      return apiError('Failed to fetch inventory item', 500);
    }
  });
}

interface StockAdjustmentBody {
  type: 'addition' | 'deduction';
  quantity: number;
  reason: string;
  location?: string;
  category?: 'restock' | 'sale' | 'waste' | 'damage' | 'adjustment' | 'other';
  costPerUnit?: number;
  invoiceNumber?: string;
  supplier?: string;
  notes?: string;
}

/**
 * PATCH /api/public/inventory/:inventoryId
 *
 * Adjust stock for an inventory item — either add (restock) or deduct (sale, waste, etc.).
 * Records full audit trail in the inventory stock history.
 *
 * @authentication API Key required — scope: `inventory:write`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @pathParam {string} inventoryId - MongoDB ObjectId of the inventory record
 *
 * @requestBody {Object}  body
 * @requestBody {string}  body.type          - `"addition"` | `"deduction"` (**required**)
 * @requestBody {number}  body.quantity      - Positive integer quantity to add/deduct (**required**)
 * @requestBody {string}  body.reason        - Human-readable reason, min 2 chars (**required**)
 * @requestBody {string}  [body.location]    - Location ID (defaults to `"default"`)
 * @requestBody {string}  [body.category]    - Deduction category: `"restock"` | `"sale"` | `"waste"` | `"damage"` | `"adjustment"` | `"other"`
 * @requestBody {number}  [body.costPerUnit] - Cost per unit for restocking (addition only)
 * @requestBody {string}  [body.invoiceNumber] - Supplier invoice reference (addition only)
 * @requestBody {string}  [body.supplier]    - Supplier name (addition only)
 * @requestBody {string}  [body.notes]       - Additional notes
 *
 * @returns {Object}  response
 * @returns {boolean} response.success       - `true`
 * @returns {Object}  response.data          - Updated inventory item (same shape as GET response)
 * @returns {Object}  response.meta
 * @returns {string}  response.meta.timestamp
 *
 * @status 200 - Stock adjusted successfully, returns updated inventory
 * @status 400 - Invalid body (missing type/quantity/reason, invalid values)
 * @status 401 - Missing or invalid API key
 * @status 403 - API key lacks `inventory:write` scope
 * @status 422 - Business logic error (e.g. insufficient stock for deduction)
 * @status 429 - Rate limit exceeded
 *
 * @example
 * // Request — add 24 bottles
 * PATCH /api/public/inventory/665b1c2d3e4f5a6b7c8d9e0f
 * x-api-key: wawa_abc_7f3a...
 * Content-Type: application/json
 *
 * {
 *   "type": "addition",
 *   "quantity": 24,
 *   "reason": "Weekly restock from supplier",
 *   "costPerUnit": 450,
 *   "supplier": "Star Brewery",
 *   "invoiceNumber": "INV-2025-0042"
 * }
 *
 * @example
 * // Request — deduct 2 bottles (waste)
 * {
 *   "type": "deduction",
 *   "quantity": 2,
 *   "reason": "Broken bottles",
 *   "category": "waste"
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ inventoryId: string }> }
): Promise<Response> {
  return withApiAuth(request, ['inventory:write'], async () => {
    const { inventoryId } = await params;
    const body = await parseJsonBody<StockAdjustmentBody>(request);

    if (!body) {
      return apiError('Invalid JSON body', 400);
    }

    const { type, quantity, reason, location, category, costPerUnit, invoiceNumber, supplier, notes } = body;

    if (!type || !['addition', 'deduction'].includes(type)) {
      return apiError('type must be "addition" or "deduction"', 400);
    }
    if (!quantity || quantity <= 0) {
      return apiError('quantity must be a positive number', 400);
    }
    if (!reason || reason.trim().length < 2) {
      return apiError('reason is required (min 2 characters)', 400);
    }

    try {
      const performedBy = '000000000000000000000000';
      const performedByName = 'API';

      if (type === 'addition') {
        await InventoryService.addStockToLocation({
          inventoryId,
          location: location || 'default',
          quantity,
          reason,
          performedBy,
          performedByName,
          costPerUnit,
          invoiceNumber,
          supplier,
          notes,
        });
      } else {
        await InventoryService.deductStockFromLocation({
          inventoryId,
          location: location || 'default',
          quantity,
          reason,
          performedBy,
          performedByName,
          category: category as 'sale' | 'waste' | 'damage' | 'adjustment' | 'other' | undefined,
          notes,
        });
      }

      const updated = await InventoryModel.findById(inventoryId)
        .populate('menuItemId', 'name price mainCategory category')
        .lean();

      return apiSuccess(serialize(updated));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Stock adjustment failed';
      console.error('[PUBLIC API] PATCH /api/public/inventory/:id', error);
      return apiError(msg, 422);
    }
  });
}
