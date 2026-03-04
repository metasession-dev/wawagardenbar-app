import { NextRequest } from 'next/server';
import InventoryModel from '@/models/inventory-model';
import { withApiAuth, apiSuccess, apiError, serialize } from '@/lib/api-response';

/**
 * GET /api/public/inventory/summary
 *
 * Aggregate inventory summary optimized for AI agent consumption.
 * Returns total items, stock value, category breakdowns, status distribution,
 * and actionable insights (items needing restock, high-value items, etc.).
 *
 * @authentication API Key required — scope: `inventory:read`
 * @ratelimit      30 requests / minute (moderate)
 *
 * @queryParam {string} [mainCategory] - Filter by main category: "drinks" | "food"
 *
 * @returns {Object}  response.data
 * @returns {Object}  response.data.totals               - { totalItems, totalStockUnits, totalStockValue, averageCostPerUnit }
 * @returns {Object}  response.data.byStatus             - { inStock, lowStock, outOfStock } (counts)
 * @returns {Object[]} response.data.byCategory          - [{ mainCategory, category, itemCount, totalStock, totalValue }]
 * @returns {Object[]} response.data.needsRestock        - Items where currentStock <= minimumStock [{ name, currentStock, minimumStock, unit, deficit }]
 * @returns {Object[]} response.data.highValueItems      - Top 10 items by total stock value [{ name, currentStock, costPerUnit, totalValue }]
 */
export async function GET(request: NextRequest): Promise<Response> {
  return withApiAuth(request, ['inventory:read'], async () => {
    try {
      const { searchParams } = request.nextUrl;
      const mainCategoryFilter = searchParams.get('mainCategory');

      const allInventory = await InventoryModel.find()
        .populate('menuItemId', 'name mainCategory category price')
        .lean();

      // Apply mainCategory filter after population
      const items = mainCategoryFilter && ['drinks', 'food'].includes(mainCategoryFilter)
        ? allInventory.filter((i: any) => i.menuItemId?.mainCategory === mainCategoryFilter)
        : allInventory;

      // Project computed fields onto a plain typed array
      const rows = items.map((i: any) => ({
        _id: i._id,
        currentStock: (i.currentStock || 0) as number,
        minimumStock: (i.minimumStock || 0) as number,
        maximumStock: (i.maximumStock || 0) as number,
        costPerUnit: (i.costPerUnit || 0) as number,
        unit: (i.unit || 'units') as string,
        status: (i.status || 'in-stock') as string,
        name: (i.menuItemId?.name || 'Unknown') as string,
        mainCategory: (i.menuItemId?.mainCategory || 'unknown') as string,
        category: (i.menuItemId?.category || 'unknown') as string,
        stockValue: ((i.currentStock || 0) * (i.costPerUnit || 0)) as number,
      }));

      const totalItems = rows.length;
      const totalStockUnits = rows.reduce((s, r) => s + r.currentStock, 0);
      const totalStockValue = rows.reduce((s, r) => s + r.stockValue, 0);
      const averageCostPerUnit = totalItems > 0
        ? Math.round(rows.reduce((s, r) => s + r.costPerUnit, 0) / totalItems)
        : 0;

      // Status distribution
      const inStock = rows.filter((r) => r.status === 'in-stock').length;
      const lowStock = rows.filter((r) => r.status === 'low-stock').length;
      const outOfStock = rows.filter((r) => r.status === 'out-of-stock').length;

      // Category breakdown
      const catMap = new Map<string, {
        mainCategory: string;
        category: string;
        itemCount: number;
        totalStock: number;
        totalValue: number;
      }>();
      for (const row of rows) {
        const key = `${row.mainCategory}:${row.category}`;
        const existing = catMap.get(key);
        if (existing) {
          existing.itemCount += 1;
          existing.totalStock += row.currentStock;
          existing.totalValue += row.stockValue;
        } else {
          catMap.set(key, {
            mainCategory: row.mainCategory,
            category: row.category,
            itemCount: 1,
            totalStock: row.currentStock,
            totalValue: row.stockValue,
          });
        }
      }
      const byCategory = Array.from(catMap.values()).sort((a, b) => b.totalValue - a.totalValue);

      // Items needing restock
      const needsRestock = rows
        .filter((r) => r.currentStock <= r.minimumStock)
        .map((r) => ({
          _id: r._id,
          name: r.name,
          currentStock: r.currentStock,
          minimumStock: r.minimumStock,
          unit: r.unit,
          deficit: r.minimumStock - r.currentStock,
        }))
        .sort((a, b) => b.deficit - a.deficit);

      // High-value items
      const highValueItems = [...rows]
        .sort((a, b) => b.stockValue - a.stockValue)
        .slice(0, 10)
        .map((r) => ({
          _id: r._id,
          name: r.name,
          currentStock: r.currentStock,
          costPerUnit: r.costPerUnit,
          totalValue: r.stockValue,
          unit: r.unit,
        }));

      return apiSuccess(serialize({
        totals: { totalItems, totalStockUnits, totalStockValue, averageCostPerUnit },
        byStatus: { inStock, lowStock, outOfStock },
        byCategory,
        needsRestock,
        highValueItems,
      }));
    } catch (error) {
      console.error('[PUBLIC API] GET /api/public/inventory/summary', error);
      return apiError('Failed to generate inventory summary', 500);
    }
  });
}
