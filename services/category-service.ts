import { connectDB } from '@/lib/mongodb';
import MenuItem from '@/models/menu-item-model';
import Inventory from '@/models/inventory-model';
import { IMenuItem } from '@/interfaces/menu-item.interface';
import { SystemSettingsService } from './system-settings-service';

export interface MenuItemWithStock extends IMenuItem {
  stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock';
  currentStock?: number;
}

/**
 * Serialize Mongoose document to plain object for Client Components
 */
function serializeMenuItem(item: any): any {
  const { inventoryId: _legacyInvId, ...rest } = item;
  return {
    ...rest,
    _id: item._id.toString(),
    createdAt: item.createdAt?.toISOString(),
    updatedAt: item.updatedAt?.toISOString(),
  };
}

export class CategoryService {
  /**
   * Get all menu items with stock information
   */
  static async getAllMenuItems(): Promise<MenuItemWithStock[]> {
    await connectDB();

    const items = await MenuItem.find({ isAvailable: true })
      .sort({ mainCategory: 1, category: 1, name: 1 })
      .lean();

    const itemsWithStock = await Promise.all(
      items.map(async (item) => {
        const inventory = await Inventory.findOne({ menuItemId: item._id }).lean();
        return serializeMenuItem({
          ...item,
          stockStatus: inventory?.status || 'in-stock',
          currentStock: inventory?.currentStock,
        });
      })
    );

    return itemsWithStock as MenuItemWithStock[];
  }

  /**
   * Get menu items by main category
   */
  static async getItemsByMainCategory(
    mainCategory: 'drinks' | 'food'
  ): Promise<MenuItemWithStock[]> {
    await connectDB();

    const items = await MenuItem.find({
      mainCategory,
      isAvailable: true,
    })
      .sort({ category: 1, name: 1 })
      .lean();

    const itemsWithStock = await Promise.all(
      items.map(async (item) => {
        const inventory = await Inventory.findOne({ menuItemId: item._id }).lean();
        return serializeMenuItem({
          ...item,
          stockStatus: inventory?.status || 'in-stock',
          currentStock: inventory?.currentStock,
        });
      })
    );

    return itemsWithStock as MenuItemWithStock[];
  }

  /**
   * Get menu items by category
   */
  static async getItemsByCategory(category: string): Promise<MenuItemWithStock[]> {
    await connectDB();

    const items = await MenuItem.find({
      category,
      isAvailable: true,
    })
      .sort({ name: 1 })
      .lean();

    const itemsWithStock = await Promise.all(
      items.map(async (item) => {
        const inventory = await Inventory.findOne({ menuItemId: item._id }).lean();
        return serializeMenuItem({
          ...item,
          stockStatus: inventory?.status || 'in-stock',
          currentStock: inventory?.currentStock,
        });
      })
    );

    return itemsWithStock as MenuItemWithStock[];
  }

  /**
   * Get a single menu item by ID with stock information
   */
  static async getItemById(itemId: string): Promise<MenuItemWithStock | null> {
    await connectDB();

    const item = await MenuItem.findById(itemId).lean();
    if (!item) return null;

    const inventory = await Inventory.findOne({ menuItemId: item._id }).lean();

    return serializeMenuItem({
      ...item,
      stockStatus: inventory?.status || 'in-stock',
      currentStock: inventory?.currentStock,
    }) as MenuItemWithStock;
  }

  /**
   * Get available categories grouped by main category
   */
  static async getCategories(): Promise<{
    drinks: string[];
    food: string[];
  }> {
    await connectDB();

    // Get categories from settings
    const menuSettings = await SystemSettingsService.getMenuCategories();
    
    // Get enabled categories only, sorted by order
    const foodCategories = menuSettings.food
      .filter(c => c.isEnabled)
      .sort((a, b) => a.order - b.order)
      .map(c => c.value);
      
    const drinkCategories = menuSettings.drinks
      .filter(c => c.isEnabled)
      .sort((a, b) => a.order - b.order)
      .map(c => c.value);

    // Also get distinct categories from DB to ensure we don't miss any that are in use
    // but might not be in settings (legacy support)
    const [dbDrinkCategories, dbFoodCategories] = await Promise.all([
      MenuItem.distinct('category', { mainCategory: 'drinks', isAvailable: true }),
      MenuItem.distinct('category', { mainCategory: 'food', isAvailable: true }),
    ]);
    
    // Merge DB categories if they don't exist in settings
    for (const cat of dbFoodCategories) {
      if (!foodCategories.includes(cat)) {
        foodCategories.push(cat);
      }
    }
    
    for (const cat of dbDrinkCategories) {
      if (!drinkCategories.includes(cat)) {
        drinkCategories.push(cat);
      }
    }

    return {
      drinks: drinkCategories,
      food: foodCategories,
    };
  }

  /**
   * Search menu items by query
   */
  static async searchItems(query: string): Promise<MenuItemWithStock[]> {
    await connectDB();

    const items = await MenuItem.find({
      isAvailable: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } },
      ],
    })
      .sort({ name: 1 })
      .lean();

    const itemsWithStock = await Promise.all(
      items.map(async (item) => {
        const inventory = await Inventory.findOne({ menuItemId: item._id }).lean();
        return serializeMenuItem({
          ...item,
          stockStatus: inventory?.status || 'in-stock',
          currentStock: inventory?.currentStock,
        });
      })
    );

    return itemsWithStock as MenuItemWithStock[];
  }

  /**
   * Check if an item is available for ordering
   */
  static async checkAvailability(itemId: string): Promise<{
    available: boolean;
    stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock';
    currentStock?: number;
  }> {
    await connectDB();

    const item = await MenuItem.findById(itemId);
    if (!item || !item.isAvailable) {
      return { available: false, stockStatus: 'out-of-stock' };
    }

    const inventory = await Inventory.findOne({ menuItemId: itemId });
    if (!inventory) {
      return { available: true, stockStatus: 'in-stock' };
    }

    return {
      available: inventory.status !== 'out-of-stock',
      stockStatus: inventory.status,
      currentStock: inventory.currentStock,
    };
  }
}
