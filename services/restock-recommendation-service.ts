/**
 * @requirement REQ-019
 * @requirement REQ-020
 */
import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import MenuItemModel from '@/models/menu-item-model';
import InventoryModel from '@/models/inventory-model';
import StockMovementModel from '@/models/stock-movement-model';
import MenuItemPriceHistory from '@/models/menu-item-price-history-model';

export interface RestockRecommendationItem {
  inventoryId: string;
  menuItemId: string;
  itemName: string;
  mainCategory: 'food' | 'drinks';
  category: string;
  currentStock: number;
  minimumStock: number;
  maximumStock: number;
  unit: string;
  sellingPrice: number;
  costPerUnit: number;
  supplier: string;
  avgDailySales: number;
  daysUntilStockout: number;
  suggestedReorderQty: number;
  priority: 'urgent' | 'medium' | 'low';
  lastRestockDate: string | null;
  autoReorderEnabled: boolean;
  reorderQuantity: number;
  score: number;
  diversityGuaranteed: boolean;
  crateSize: number | null;
  packagingType: string | null;
  cratesToOrder: number | null;
}

export interface RestockCategoryGroup {
  category: string;
  categoryLabel: string;
  itemCount: number;
  urgentCount: number;
  items: RestockRecommendationItem[];
}

export type RestockStrategy = 'urgency' | 'popularity' | 'profitability';

export interface RestockRecommendationReport {
  generatedAt: string;
  lookbackDays: number;
  strategy: RestockStrategy;
  totalItems: number;
  urgentItems: number;
  mediumItems: number;
  lowItems: number;
  estimatedRestockCost: number;
  groups: RestockCategoryGroup[];
}

export interface RestockRecommendationParams {
  mainCategory?: 'food' | 'drinks';
  categories?: string[];
  days: number;
  priceBracket?: { min?: number; max?: number };
  priorityFilter?: 'urgent' | 'medium' | 'low' | 'all';
  strategy?: RestockStrategy;
}

const MIN_DIVERSITY_PER_CATEGORY = 2;

function formatCategoryLabel(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function calculatePriority(
  currentStock: number,
  minimumStock: number,
  velocity: number
): { level: 'urgent' | 'medium' | 'low'; daysUntilStockout: number } {
  const daysUntilStockout = velocity > 0 ? currentStock / velocity : Infinity;

  if (daysUntilStockout <= 2 || currentStock <= minimumStock) {
    return { level: 'urgent', daysUntilStockout };
  }
  if (daysUntilStockout <= 7) {
    return { level: 'medium', daysUntilStockout };
  }
  return { level: 'low', daysUntilStockout };
}

const PRIORITY_ORDER = { urgent: 0, medium: 1, low: 2 } as const;

export class RestockRecommendationService {
  static async getRestockRecommendations(
    params: RestockRecommendationParams
  ): Promise<RestockRecommendationReport> {
    await connectDB();

    // 1. Query menu items with trackInventory enabled
    const menuFilter: Record<string, unknown> = { trackInventory: true };
    if (params.mainCategory) {
      menuFilter.mainCategory = params.mainCategory;
    }
    if (params.categories && params.categories.length > 0) {
      menuFilter.category = { $in: params.categories };
    }
    if (params.priceBracket) {
      const priceFilter: Record<string, number> = {};
      if (params.priceBracket.min !== undefined) {
        priceFilter.$gte = params.priceBracket.min;
      }
      if (params.priceBracket.max !== undefined) {
        priceFilter.$lte = params.priceBracket.max;
      }
      if (Object.keys(priceFilter).length > 0) {
        menuFilter.price = priceFilter;
      }
    }

    const menuItems = await MenuItemModel.find(menuFilter)
      .select('_id name mainCategory category price costPerUnit')
      .lean();

    const strategy = params.strategy || 'urgency';

    if (menuItems.length === 0) {
      return {
        generatedAt: new Date().toISOString(),
        lookbackDays: params.days,
        strategy,
        totalItems: 0,
        urgentItems: 0,
        mediumItems: 0,
        lowItems: 0,
        estimatedRestockCost: 0,
        groups: [],
      };
    }

    const menuItemIds = menuItems.map((m) => m._id);
    const menuItemMap = new Map(menuItems.map((m) => [m._id.toString(), m]));

    // 2. Query inventories for these menu items
    const inventories = await InventoryModel.find({
      menuItemId: { $in: menuItemIds },
    }).lean();

    if (inventories.length === 0) {
      return {
        generatedAt: new Date().toISOString(),
        lookbackDays: params.days,
        strategy,
        totalItems: 0,
        urgentItems: 0,
        mediumItems: 0,
        lowItems: 0,
        estimatedRestockCost: 0,
        groups: [],
      };
    }

    const inventoryIds = inventories.map((inv) => inv._id as Types.ObjectId);

    // 3. Bulk sales velocity aggregation
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - params.days);

    const [velocityAgg, lastRestockAgg, currentPricing] = await Promise.all([
      StockMovementModel.aggregate([
        {
          $match: {
            inventoryId: { $in: inventoryIds },
            category: 'sale',
            timestamp: { $gte: cutoffDate },
          },
        },
        {
          $group: {
            _id: '$inventoryId',
            totalSales: { $sum: { $abs: '$quantity' } },
          },
        },
      ]),
      // 4. Last restock dates
      StockMovementModel.aggregate([
        {
          $match: {
            inventoryId: { $in: inventoryIds },
            category: 'restock',
          },
        },
        {
          $group: {
            _id: '$inventoryId',
            lastRestockDate: { $max: '$timestamp' },
          },
        },
      ]),
      // Bulk current pricing from price history
      MenuItemPriceHistory.find({
        menuItemId: { $in: menuItemIds },
        effectiveTo: null,
      })
        .sort({ effectiveFrom: -1 })
        .lean(),
    ]);

    const velocityMap = new Map<string, number>(
      velocityAgg.map((v: { _id: Types.ObjectId; totalSales: number }) => [
        v._id.toString(),
        v.totalSales / params.days,
      ])
    );

    const lastRestockMap = new Map<string, Date>(
      lastRestockAgg.map(
        (r: { _id: Types.ObjectId; lastRestockDate: Date }) => [
          r._id.toString(),
          r.lastRestockDate,
        ]
      )
    );

    const pricingMap = new Map<string, number>();
    for (const ph of currentPricing as unknown as Array<{
      menuItemId: Types.ObjectId;
      costPerUnit: number;
    }>) {
      const key = ph.menuItemId.toString();
      if (!pricingMap.has(key)) {
        pricingMap.set(key, ph.costPerUnit || 0);
      }
    }

    // Build recommendation items
    const items: RestockRecommendationItem[] = [];

    for (const inventory of inventories) {
      const menuItem = menuItemMap.get(inventory.menuItemId.toString());
      if (!menuItem) continue;

      const invId = (inventory._id as Types.ObjectId).toString();
      const menuItemId = inventory.menuItemId.toString();
      const velocity = velocityMap.get(invId) || 0;
      const { level: priority, daysUntilStockout } = calculatePriority(
        inventory.currentStock,
        inventory.minimumStock,
        velocity
      );

      const suggestedReorderQty = Math.max(
        0,
        Math.ceil(
          velocity * 7 + inventory.minimumStock - inventory.currentStock
        )
      );

      const costPerUnit =
        pricingMap.get(menuItemId) ||
        (menuItem as { costPerUnit?: number }).costPerUnit ||
        0;

      const lastRestock = lastRestockMap.get(invId);

      const sellingPrice = (menuItem as { price: number }).price;

      items.push({
        inventoryId: invId,
        menuItemId,
        itemName: (menuItem as { name: string }).name,
        mainCategory: (menuItem as { mainCategory: 'food' | 'drinks' })
          .mainCategory,
        category: (menuItem as { category: string }).category,
        currentStock: inventory.currentStock,
        minimumStock: inventory.minimumStock,
        maximumStock: inventory.maximumStock,
        unit: inventory.unit,
        sellingPrice,
        costPerUnit,
        supplier: inventory.supplier || '',
        avgDailySales: Math.round(velocity * 100) / 100,
        daysUntilStockout:
          daysUntilStockout === Infinity
            ? -1
            : Math.round(daysUntilStockout * 10) / 10,
        suggestedReorderQty,
        priority,
        lastRestockDate: lastRestock ? lastRestock.toISOString() : null,
        autoReorderEnabled: inventory.autoReorderEnabled,
        reorderQuantity: inventory.reorderQuantity,
        score: 0,
        diversityGuaranteed: false,
        crateSize: inventory.crateSize || null,
        packagingType: inventory.packagingType || null,
        cratesToOrder: null,
      });
    }

    // Apply strategy-specific scoring
    for (const item of items) {
      if (strategy === 'popularity') {
        item.score = item.avgDailySales;
      } else if (strategy === 'profitability') {
        item.score =
          Math.round(
            (item.sellingPrice - item.costPerUnit) * item.avgDailySales * 100
          ) / 100;
      }
    }

    // Apply diversity guarantee for popularity/profitability strategies
    if (strategy !== 'urgency') {
      const categoryItems = new Map<string, RestockRecommendationItem[]>();
      for (const item of items) {
        const existing = categoryItems.get(item.category) || [];
        existing.push(item);
        categoryItems.set(item.category, existing);
      }

      for (const [, catItems] of categoryItems) {
        catItems.sort((a, b) => b.score - a.score);
        const guaranteed = catItems.slice(0, MIN_DIVERSITY_PER_CATEGORY);
        for (const item of guaranteed) {
          if (item.score === 0) {
            item.diversityGuaranteed = true;
            item.suggestedReorderQty = Math.max(
              0,
              item.minimumStock - item.currentStock
            );
          }
        }
      }
    }

    // Apply priority filter
    const filteredItems =
      params.priorityFilter && params.priorityFilter !== 'all'
        ? items.filter((item) => item.priority === params.priorityFilter)
        : items;

    // Group by category
    const groupMap = new Map<string, RestockRecommendationItem[]>();
    for (const item of filteredItems) {
      const existing = groupMap.get(item.category) || [];
      existing.push(item);
      groupMap.set(item.category, existing);
    }

    // Sort items within groups based on strategy
    const groups: RestockCategoryGroup[] = Array.from(groupMap.entries())
      .map(([category, groupItems]) => {
        if (strategy === 'urgency') {
          groupItems.sort((a, b) => {
            const priorityDiff =
              PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
            if (priorityDiff !== 0) return priorityDiff;
            const aDays =
              a.daysUntilStockout === -1 ? Infinity : a.daysUntilStockout;
            const bDays =
              b.daysUntilStockout === -1 ? Infinity : b.daysUntilStockout;
            return aDays - bDays;
          });
        } else {
          groupItems.sort((a, b) => b.score - a.score);
        }

        return {
          category,
          categoryLabel: formatCategoryLabel(category),
          itemCount: groupItems.length,
          urgentCount: groupItems.filter((i) => i.priority === 'urgent').length,
          items: groupItems,
        };
      })
      .sort((a, b) => {
        if (strategy === 'urgency') {
          return (
            b.urgentCount - a.urgentCount ||
            a.categoryLabel.localeCompare(b.categoryLabel)
          );
        }
        // For popularity/profitability, sort groups by highest-scoring item
        const aMax = a.items[0]?.score ?? 0;
        const bMax = b.items[0]?.score ?? 0;
        return bMax - aMax || a.categoryLabel.localeCompare(b.categoryLabel);
      });

    // Compute crate order quantities
    for (const item of filteredItems) {
      if (
        item.crateSize &&
        item.crateSize > 0 &&
        item.suggestedReorderQty > 0
      ) {
        item.cratesToOrder = Math.ceil(
          item.suggestedReorderQty / item.crateSize
        );
      }
    }

    // Summary counts
    const urgentItems = filteredItems.filter(
      (i) => i.priority === 'urgent'
    ).length;
    const mediumItems = filteredItems.filter(
      (i) => i.priority === 'medium'
    ).length;
    const lowItems = filteredItems.filter((i) => i.priority === 'low').length;
    const estimatedRestockCost = filteredItems.reduce(
      (sum, item) => sum + item.suggestedReorderQty * item.costPerUnit,
      0
    );

    return {
      generatedAt: new Date().toISOString(),
      lookbackDays: params.days,
      strategy,
      totalItems: filteredItems.length,
      urgentItems,
      mediumItems,
      lowItems,
      estimatedRestockCost: Math.round(estimatedRestockCost * 100) / 100,
      groups,
    };
  }
}
