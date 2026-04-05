import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import MenuItemPriceHistory from '@/models/menu-item-price-history-model';
import MenuItem from '@/models/menu-item-model';
import InventoryModel from '@/models/inventory-model';
import { IMenuItemPriceHistory, PriceChangeReason } from '@/interfaces';

export class PriceHistoryService {
  /**
   * Get current price and cost for a menu item
   */
  static async getCurrentPricing(
    menuItemId: string
  ): Promise<{ price: number; costPerUnit: number } | null> {
    await connectDB();

    const priceHistory = (await MenuItemPriceHistory.findOne({
      menuItemId: new Types.ObjectId(menuItemId),
      effectiveTo: null,
    })
      .sort({ effectiveFrom: -1 })
      .lean()) as IMenuItemPriceHistory | null;

    if (priceHistory) {
      return {
        price: priceHistory.price,
        costPerUnit: priceHistory.costPerUnit,
      };
    }

    // Fallback to menu item if no price history exists
    const menuItem = await MenuItem.findById(menuItemId).lean();
    if (menuItem) {
      return {
        price: menuItem.price,
        costPerUnit: menuItem.costPerUnit || 0,
      };
    }

    return null;
  }

  /**
   * Get price and cost at a specific date
   */
  static async getPriceAtDate(
    menuItemId: string,
    date: Date
  ): Promise<{ price: number; costPerUnit: number } | null> {
    await connectDB();

    const priceHistory = (await MenuItemPriceHistory.findOne({
      menuItemId: new Types.ObjectId(menuItemId),
      effectiveFrom: { $lte: date },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gt: date } }],
    })
      .sort({ effectiveFrom: -1 })
      .lean()) as IMenuItemPriceHistory | null;

    if (priceHistory) {
      return {
        price: priceHistory.price,
        costPerUnit: priceHistory.costPerUnit,
      };
    }

    return null;
  }

  /**
   * Update menu item price and create history record
   */
  static async updatePrice(
    menuItemId: string,
    newPrice: number,
    newCostPerUnit: number,
    reason: PriceChangeReason,
    changedBy: string
  ): Promise<void> {
    await connectDB();

    const now = new Date();

    // Close current price history record
    await MenuItemPriceHistory.updateMany(
      {
        menuItemId: new Types.ObjectId(menuItemId),
        effectiveTo: null,
      },
      {
        $set: { effectiveTo: now },
      }
    );

    // Create new price history record
    await MenuItemPriceHistory.create({
      menuItemId: new Types.ObjectId(menuItemId),
      price: newPrice,
      costPerUnit: newCostPerUnit,
      effectiveFrom: now,
      effectiveTo: null,
      reason,
      changedBy: new Types.ObjectId(changedBy),
    });

    // Update menu item with new price
    await MenuItem.findByIdAndUpdate(menuItemId, {
      price: newPrice,
      costPerUnit: newCostPerUnit,
    });

    // Sync inventory cost to keep waste/stock valuation accurate
    await InventoryModel.findOneAndUpdate(
      { menuItemId: new Types.ObjectId(menuItemId) },
      { costPerUnit: newCostPerUnit }
    );
  }

  /**
   * Get price history for a menu item
   */
  static async getPriceHistory(
    menuItemId: string,
    limit?: number
  ): Promise<IMenuItemPriceHistory[]> {
    await connectDB();

    const query = MenuItemPriceHistory.find({
      menuItemId: new Types.ObjectId(menuItemId),
    })
      .sort({ effectiveFrom: -1 })
      .populate('changedBy', 'firstName lastName email');

    if (limit) {
      query.limit(limit);
    }

    const history = await query.lean();
    return JSON.parse(JSON.stringify(history));
  }

  /**
   * Initialize price history for existing menu items
   * Used during migration
   */
  static async initializePriceHistory(
    menuItemId: string,
    price: number,
    costPerUnit: number,
    createdAt: Date,
    changedBy: string
  ): Promise<void> {
    await connectDB();

    // Check if price history already exists
    const existing = await MenuItemPriceHistory.findOne({
      menuItemId: new Types.ObjectId(menuItemId),
    });

    if (!existing) {
      await MenuItemPriceHistory.create({
        menuItemId: new Types.ObjectId(menuItemId),
        price,
        costPerUnit,
        effectiveFrom: createdAt,
        effectiveTo: null,
        reason: 'initial_price',
        changedBy: new Types.ObjectId(changedBy),
      });
    }
  }

  /**
   * Get items with price changes in a date range
   */
  static async getPriceChangesInRange(
    startDate: Date,
    endDate: Date
  ): Promise<IMenuItemPriceHistory[]> {
    await connectDB();

    const changes = await MenuItemPriceHistory.find({
      effectiveFrom: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .sort({ effectiveFrom: -1 })
      .populate('menuItemId', 'name category')
      .populate('changedBy', 'firstName lastName')
      .lean();

    return JSON.parse(JSON.stringify(changes));
  }

  /**
   * Calculate profit margin for given price and cost
   */
  static calculateProfitMargin(price: number, cost: number): number {
    if (price === 0) return 0;
    const profit = price - cost;
    return (profit / price) * 100;
  }
}
