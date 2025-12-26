import mongoose from 'mongoose';
import InventoryModel from '@/models/inventory-model';
import MenuItemModel from '@/models/menu-item-model';
import OrderModel from '@/models/order-model';
import { sendLowStockAlertEmail } from '@/lib/email';

/**
 * Inventory Service
 * Handles all inventory-related business logic including stock deduction,
 * availability checks, and analytics calculations
 */
class InventoryService {
  /**
   * Deduct stock for completed order
   * Called when order status changes to 'completed'
   */
  static async deductStockForOrder(orderId: string): Promise<void> {
    const order = await OrderModel.findById(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    // Loop through order items
    for (const item of order.items) {
      const menuItem = await MenuItemModel.findById(item.menuItemId);

      // Skip if item doesn't track inventory
      if (!menuItem?.trackInventory || !menuItem.inventoryId) {
        continue;
      }

      // Get inventory record
      const inventory = await InventoryModel.findById(menuItem.inventoryId);

      if (!inventory) {
        continue;
      }

      // Calculate actual quantity to deduct based on portion multiplier
      const actualQuantity = item.quantity * (item.portionMultiplier || 1.0);

      // Deduct stock with fractional support
      inventory.currentStock = Math.max(0, inventory.currentStock - actualQuantity);

      // Add stock history entry with portion info
      inventory.stockHistory.push({
        quantity: -actualQuantity,
        type: 'deduction',
        reason: item.portionSize === 'half' ? 'Sale (Half Portion)' : 'Sale',
        performedBy: new mongoose.Types.ObjectId('000000000000000000000000'),
        timestamp: new Date(),
        category: 'sale',
        orderId: order._id,
        performedByName: 'System',
        notes: item.portionSize === 'half' 
          ? `${item.quantity}x half portions (${actualQuantity} units deducted)` 
          : undefined,
      } as any);

      // Update status based on stock level
      if (inventory.currentStock <= 0) {
        inventory.status = 'out-of-stock';
      } else if (inventory.currentStock <= inventory.minimumStock) {
        inventory.status = 'low-stock';
      } else {
        inventory.status = 'in-stock';
      }

      // Update sales tracking with actual quantity
      inventory.totalSales += actualQuantity;
      inventory.lastSaleDate = new Date();

      await inventory.save();

      // Check for low stock and send alerts
      if (
        inventory.status === 'low-stock' ||
        inventory.status === 'out-of-stock'
      ) {
        await this.sendLowStockAlert(inventory);
      }
    }
  }

  /**
   * Restore stock for cancelled order
   * Called when order is cancelled to return items to inventory
   */
  static async restoreStockForOrder(orderId: string): Promise<void> {
    const order = await OrderModel.findById(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    // Only restore if inventory was already deducted
    if (!order.inventoryDeducted) {
      return;
    }

    // Loop through order items
    for (const item of order.items) {
      const menuItem = await MenuItemModel.findById(item.menuItemId);

      // Skip if item doesn't track inventory
      if (!menuItem?.trackInventory || !menuItem.inventoryId) {
        continue;
      }

      // Get inventory record
      const inventory = await InventoryModel.findById(menuItem.inventoryId);

      if (!inventory) {
        continue;
      }

      // Calculate actual quantity to restore based on portion multiplier
      const actualQuantity = item.quantity * (item.portionMultiplier || 1.0);

      // Restore stock
      inventory.currentStock += actualQuantity;

      // Add stock history entry
      inventory.stockHistory.push({
        quantity: actualQuantity,
        type: 'addition',
        reason: 'Order Cancelled - Stock Restored',
        performedBy: new mongoose.Types.ObjectId('000000000000000000000000'),
        timestamp: new Date(),
        category: 'adjustment',
        orderId: order._id,
        performedByName: 'System',
        notes: item.portionSize === 'half' 
          ? `${item.quantity}x half portions (${actualQuantity} units restored)` 
          : undefined,
      } as any);

      // Update status based on stock level
      if (inventory.currentStock <= 0) {
        inventory.status = 'out-of-stock';
      } else if (inventory.currentStock <= inventory.minimumStock) {
        inventory.status = 'low-stock';
      } else {
        inventory.status = 'in-stock';
      }

      // Update sales tracking (reduce total sales)
      inventory.totalSales = Math.max(0, inventory.totalSales - actualQuantity);

      await inventory.save();
    }

    // Mark order as inventory restored
    order.inventoryDeducted = false;
    order.inventoryDeductedAt = undefined;
    order.inventoryDeductedBy = undefined;
    await order.save();
  }

  /**
   * Check if item is available for ordering
   * Returns true if item can be ordered, false otherwise
   */
  static async isItemAvailable(
    menuItemId: string,
    quantity: number
  ): Promise<boolean> {
    const menuItem = await MenuItemModel.findById(menuItemId);

    // If not tracking inventory, always available
    if (!menuItem?.trackInventory || !menuItem.inventoryId) {
      return true;
    }

    const inventory = await InventoryModel.findById(menuItem.inventoryId);

    if (!inventory) {
      return true;
    }

    // If preventOrdersWhenOutOfStock is enabled, check stock
    if (inventory.preventOrdersWhenOutOfStock) {
      return inventory.currentStock >= quantity;
    }

    return true;
  }

  /**
   * Check availability with portion size support
   * Returns availability status and message
   */
  static async checkAvailability(
    menuItemId: string,
    quantity: number,
    portionSize: 'full' | 'half' = 'full'
  ): Promise<{ available: boolean; message?: string }> {
    const menuItem = await MenuItemModel.findById(menuItemId);

    if (!menuItem) {
      return { available: false, message: 'Menu item not found' };
    }

    if (!menuItem.isAvailable) {
      return { available: false, message: 'This item is currently unavailable' };
    }

    // Validate half-portion is enabled if requested
    if (portionSize === 'half' && !menuItem.halfPortionEnabled) {
      return { available: false, message: 'Half portion is not available for this item' };
    }

    if (!menuItem.trackInventory || !menuItem.inventoryId) {
      return { available: true };
    }

    const inventory = await InventoryModel.findById(menuItem.inventoryId);

    if (!inventory) {
      return { available: true };
    }

    // Calculate actual quantity needed based on portion
    const portionMultiplier = portionSize === 'half' ? 0.5 : 1.0;
    const actualQuantityNeeded = quantity * portionMultiplier;

    if (inventory.preventOrdersWhenOutOfStock && inventory.currentStock < actualQuantityNeeded) {
      return {
        available: false,
        message: `Only ${inventory.currentStock} ${inventory.unit} available. You need ${actualQuantityNeeded} ${inventory.unit}.`,
      };
    }

    return { available: true };
  }

  /**
   * Get low stock items
   * Returns all items with status 'low-stock'
   */
  static async getLowStockItems() {
    return InventoryModel.find({ status: 'low-stock' }).populate(
      'menuItemId',
      'name mainCategory category'
    );
  }

  /**
   * Get out of stock items
   * Returns all items with status 'out-of-stock'
   */
  static async getOutOfStockItems() {
    return InventoryModel.find({ status: 'out-of-stock' }).populate(
      'menuItemId',
      'name mainCategory category'
    );
  }

  /**
   * Calculate sales velocity (average daily sales)
   * @param inventoryId - Inventory record ID
   * @param days - Number of days to calculate over (default 30)
   */
  static async calculateSalesVelocity(
    inventoryId: string,
    days: number = 30
  ): Promise<number> {
    const inventory = await InventoryModel.findById(inventoryId);

    if (!inventory) {
      return 0;
    }

    // Get sales from stock history in the last X days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const salesHistory = inventory.stockHistory.filter(
      (h) => h.category === 'sale' && h.timestamp >= cutoffDate
    );

    const totalSales = salesHistory.reduce(
      (sum, h) => sum + Math.abs(h.quantity),
      0
    );
    const velocity = totalSales / days;

    // Update cached velocity
    inventory.salesVelocity = velocity;
    await inventory.save();

    return velocity;
  }

  /**
   * Get suggested reorder quantity
   * Based on sales velocity and days until restock
   */
  static async getSuggestedReorderQuantity(
    inventoryId: string
  ): Promise<number> {
    const inventory = await InventoryModel.findById(inventoryId);

    if (!inventory) {
      return 0;
    }

    // Calculate based on sales velocity
    const velocity = await this.calculateSalesVelocity(inventoryId);
    const daysUntilRestock = 7; // configurable

    const suggestedReorder =
      velocity * daysUntilRestock +
      inventory.minimumStock -
      inventory.currentStock;

    return Math.max(0, Math.ceil(suggestedReorder));
  }

  /**
   * Calculate stock turnover rate
   * How many times stock is sold and replaced in a period
   */
  static async calculateStockTurnover(
    inventoryId: string,
    days: number = 30
  ): Promise<number> {
    const inventory = await InventoryModel.findById(inventoryId);

    if (!inventory || inventory.currentStock === 0) {
      return 0;
    }

    const velocity = await this.calculateSalesVelocity(inventoryId, days);
    const avgStock =
      (inventory.currentStock + inventory.minimumStock + inventory.maximumStock) /
      3;

    if (avgStock === 0) {
      return 0;
    }

    // Turnover = Total Sales / Average Stock
    const totalSales = velocity * days;
    return totalSales / avgStock;
  }

  /**
   * Get waste statistics for an inventory item
   */
  static async getWasteStats(inventoryId: string) {
    const inventory = await InventoryModel.findById(inventoryId);

    if (!inventory) {
      return {
        totalWaste: 0,
        wasteCost: 0,
        wastePercentage: 0,
      };
    }

    const wasteHistory = inventory.stockHistory.filter(
      (h) => h.category === 'waste' || h.category === 'damage'
    );

    const totalWaste = wasteHistory.reduce(
      (sum, h) => sum + Math.abs(h.quantity),
      0
    );
    const wasteCost = totalWaste * inventory.costPerUnit;

    const totalMovement = inventory.stockHistory.reduce(
      (sum, h) => sum + Math.abs(h.quantity),
      0
    );
    const wastePercentage =
      totalMovement > 0 ? (totalWaste / totalMovement) * 100 : 0;

    return {
      totalWaste,
      wasteCost,
      wastePercentage,
    };
  }

  /**
   * Calculate profit margin for an item
   */
  static async calculateProfitMargin(inventoryId: string) {
    const inventory = await InventoryModel.findById(inventoryId).populate(
      'menuItemId'
    );

    if (!inventory || !inventory.menuItemId) {
      return {
        revenue: 0,
        cost: 0,
        profit: 0,
        marginPercentage: 0,
      };
    }

    const menuItem: any = inventory.menuItemId;
    const sellingPrice = menuItem.price;
    const costPerUnit = inventory.costPerUnit;

    const revenue = sellingPrice * inventory.totalSales;
    const cost = costPerUnit * inventory.totalSales;
    const profit = revenue - cost;
    const marginPercentage = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      revenue,
      cost,
      profit,
      marginPercentage,
    };
  }

  /**
   * Send low stock alert email
   * Private method called when stock reaches low threshold
   */
  private static async sendLowStockAlert(inventory: any): Promise<void> {
    try {
      const menuItem = await MenuItemModel.findById(inventory.menuItemId);

      if (!menuItem) {
        return;
      }

      const suggestedReorder = await this.getSuggestedReorderQuantity(
        inventory._id.toString()
      );

      await sendLowStockAlertEmail({
        itemName: menuItem.name,
        currentStock: inventory.currentStock,
        minimumStock: inventory.minimumStock,
        unit: inventory.unit,
        suggestedReorder,
        lastRestocked: inventory.lastRestocked,
      });
    } catch (error) {
      console.error('Error sending low stock alert:', error);
      // Don't throw - we don't want to fail the main operation
    }
  }

  /**
   * Get inventory analytics for dashboard
   */
  static async getInventoryAnalytics() {
    const inventories = await InventoryModel.find().populate(
      'menuItemId',
      'name price mainCategory'
    );

    const analytics = {
      totalItems: inventories.length,
      lowStockCount: inventories.filter((i) => i.status === 'low-stock').length,
      outOfStockCount: inventories.filter((i) => i.status === 'out-of-stock')
        .length,
      totalStockValue: 0,
      totalWaste: 0,
      totalWasteCost: 0,
      topSellingItems: [] as any[],
      slowMovingItems: [] as any[],
    };

    // Calculate totals
    for (const inventory of inventories) {
      analytics.totalStockValue +=
        inventory.currentStock * inventory.costPerUnit;
      analytics.totalWaste += inventory.totalWaste;
      analytics.totalWasteCost += inventory.totalWaste * inventory.costPerUnit;
    }

    // Get top selling items
    const sortedBySales = [...inventories].sort(
      (a, b) => b.totalSales - a.totalSales
    );
    analytics.topSellingItems = sortedBySales.slice(0, 10).map((inv: any) => ({
      name: inv.menuItemId?.name,
      totalSales: inv.totalSales,
      currentStock: inv.currentStock,
      unit: inv.unit,
    }));

    // Get slow moving items (low sales velocity)
    const withVelocity = await Promise.all(
      inventories.map(async (inv) => ({
        inventory: inv,
        velocity: await this.calculateSalesVelocity(inv._id.toString(), 30),
      }))
    );

    const sortedByVelocity = withVelocity.sort(
      (a, b) => a.velocity - b.velocity
    );
    analytics.slowMovingItems = sortedByVelocity
      .slice(0, 10)
      .map((item: any) => ({
        name: item.inventory.menuItemId?.name,
        velocity: item.velocity,
        currentStock: item.inventory.currentStock,
        unit: item.inventory.unit,
      }));

    return analytics;
  }
}

export default InventoryService;
