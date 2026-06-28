import mongoose from 'mongoose';
import InventoryModel from '@/models/inventory-model';
import MenuItemModel from '@/models/menu-item-model';
import OrderModel from '@/models/order-model';
import StockMovementModel from '@/models/stock-movement-model';
import { sendLowStockAlertEmail } from '@/lib/email';
import { SystemSettingsService } from '@/services/system-settings-service';
import { resolveLinkedInventoryFor } from '@/lib/customization-inventory';
import type { InventoryKind } from '@/interfaces/inventory.interface';
import type { IDeductionResult, IDeductionItemResult } from '@/interfaces';

/**
 * Inventory Service
 * Handles all inventory-related business logic including stock deduction,
 * availability checks, and analytics calculations
 */
class InventoryService {
  /**
   * REQ-066 AC8 — Route an order-driven stock delta to the correct
   * physical location.
   *
   * For trackByLocation items, the location matters: sales come from the
   * front-of-house bucket (the bar `chiller`, typically) and refills land
   * in the back (`store`). Pre-REQ-066 this function always mutated
   * `locations[0]`, which silently absorbed any deduction when
   * `locations[0]` was empty (because `Math.max(0, 0 + -1) = 0` clamps
   * before the post-save hook recomputes the aggregate) — the root cause
   * of #277.
   *
   * Routing rules (deduction, delta < 0):
   *   1. If `inventory.defaultSalesLocation` is set AND that location
   *      exists AND has stock >= |delta| → deduct from it.
   *   2. If `defaultSalesLocation` is set but that location is short →
   *      THROW. The chokepoint catches and writes an
   *      `inventory_deduction_failed` IncidentEvent. The manager moves
   *      stock from the back via the existing transfer UI; the system
   *      never auto-spills to other locations (operator stipulation).
   *   3. If `defaultSalesLocation` unset (legacy data, pre-backfill) →
   *      walk `locations[]` in order and take from the first non-empty
   *      bucket. Safe fallback so the #277 bug cannot recur on
   *      un-migrated rows.
   *   4. If even the fallback can't satisfy the deduction → THROW (same
   *      IncidentEvent path).
   *
   * Refill / restoration (delta > 0):
   *   - Always lands on `locations[0]` (the storeroom). New stock comes
   *     in the back; operators rebalance via the inventory transfer UI.
   */
  private static applyOrderStockDelta(
    inventory: InstanceType<typeof InventoryModel>,
    delta: number
  ): void {
    if (!inventory.trackByLocation || inventory.locations.length === 0) {
      inventory.currentStock = Math.max(0, inventory.currentStock + delta);
      return;
    }

    const SYSTEM_ACTOR = new mongoose.Types.ObjectId(
      '000000000000000000000000'
    );

    if (delta >= 0) {
      const loc = inventory.locations[0];
      loc.currentStock = loc.currentStock + delta;
      loc.lastUpdated = new Date();
      loc.updatedBy = SYSTEM_ACTOR;
      loc.updatedByName = 'System';
      return;
    }

    // Deduction path — `delta` is negative.
    let remaining = -delta;
    const target =
      inventory.defaultSalesLocation &&
      inventory.locations.find(
        (l) => l.location === inventory.defaultSalesLocation
      );

    if (target) {
      if (target.currentStock < remaining) {
        throw new Error(
          `Insufficient stock at defaultSalesLocation='${inventory.defaultSalesLocation}': ` +
            `have ${target.currentStock}, need ${remaining}. ` +
            'Move stock to the sale point before completing the order.'
        );
      }
      target.currentStock -= remaining;
      target.lastUpdated = new Date();
      target.updatedBy = SYSTEM_ACTOR;
      target.updatedByName = 'System';
      return;
    }

    // Fallback: walk locations, take from each non-empty bucket. Used when
    // `defaultSalesLocation` is unset (legacy data) OR when it references
    // a location code that no longer exists on the row (data anomaly).
    for (const loc of inventory.locations) {
      if (remaining <= 0) break;
      if (loc.currentStock <= 0) continue;
      const take = Math.min(loc.currentStock, remaining);
      loc.currentStock -= take;
      loc.lastUpdated = new Date();
      loc.updatedBy = SYSTEM_ACTOR;
      loc.updatedByName = 'System';
      remaining -= take;
    }

    if (remaining > 0) {
      throw new Error(
        `Insufficient stock across all locations: short ${remaining} unit(s). ` +
          'Restock before completing this order.'
      );
    }
  }

  /**
   * @requirement REQ-087 — Per-item inventory deduction with skip-on-retry
   *
   * Deduct stock for completed order. Each item is deducted independently
   * in its own try/catch — one item failing does not prevent other items
   * from being deducted. Already-deducted items (tracked in
   * `order.inventoryDeductionDetails`) are skipped to prevent double
   * deduction on retry.
   *
   * Returns a result object instead of throwing. Callers should check
   * `allSucceeded` and persist `results` to `inventoryDeductionDetails`.
   */
  static async deductStockForOrder(orderId: string): Promise<IDeductionResult> {
    const order = await OrderModel.findById(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    const results: IDeductionItemResult[] = [];

    for (const item of order.items) {
      const menuItemIdStr = item.menuItemId.toString();
      const itemName = item.name || menuItemIdStr;
      const actualQuantity = item.quantity * (item.portionMultiplier || 1.0);

      const existing = order.inventoryDeductionDetails?.find(
        (d) =>
          d.menuItemId.toString() === menuItemIdStr && d.status === 'deducted'
      );

      if (existing) {
        results.push({
          menuItemId: menuItemIdStr,
          itemName,
          status: 'skipped',
          quantity: actualQuantity,
          linkedResults: [],
        });
        continue;
      }

      const result: IDeductionItemResult = {
        menuItemId: menuItemIdStr,
        itemName,
        status: 'deducted',
        quantity: actualQuantity,
        linkedResults: [],
      };

      try {
        const menuItem = await MenuItemModel.findById(item.menuItemId);

        if (!menuItem) {
          result.status = 'failed';
          result.error = `MenuItem not found: ${menuItemIdStr}`;
          results.push(result);
          continue;
        }

        if (menuItem.trackInventory) {
          const inventory = await InventoryModel.findOne({
            menuItemId: item.menuItemId,
          });

          if (inventory) {
            InventoryService.applyOrderStockDelta(inventory, -actualQuantity);

            let reason = 'Sale';
            let notes: string | undefined;

            if (item.portionSize === 'half') {
              reason = 'Sale (Half Portion)';
              notes = `${item.quantity}x half portions (${actualQuantity} units deducted)`;
            } else if (item.portionSize === 'quarter') {
              reason = 'Sale (Quarter Portion)';
              notes = `${item.quantity}x quarter portions (${actualQuantity} units deducted)`;
            }

            await StockMovementModel.create({
              inventoryId: inventory._id,
              quantity: -actualQuantity,
              type: 'deduction' as const,
              reason,
              performedBy: new mongoose.Types.ObjectId(
                '000000000000000000000000'
              ),
              timestamp: new Date(),
              category: 'sale' as const,
              orderId: order._id,
              performedByName: 'System',
              notes,
            });

            if (inventory.currentStock <= 0) {
              inventory.status = 'out-of-stock';
            } else if (inventory.currentStock <= inventory.minimumStock) {
              inventory.status = 'low-stock';
            } else {
              inventory.status = 'in-stock';
            }

            inventory.totalSales += actualQuantity;
            inventory.lastSaleDate = new Date();

            await inventory.save();

            if (
              inventory.status === 'low-stock' ||
              inventory.status === 'out-of-stock'
            ) {
              await this.sendLowStockAlert(inventory);
            }
          }
        }

        const linked = resolveLinkedInventoryFor(
          menuItem,
          item.customizations || []
        );

        for (const { inventoryId, deductionPerUnit } of linked) {
          const linkedInv = await InventoryModel.findById(inventoryId);
          if (!linkedInv) continue;

          const linkedAmount = actualQuantity * deductionPerUnit;
          InventoryService.applyOrderStockDelta(linkedInv, -linkedAmount);

          await StockMovementModel.create({
            inventoryId: linkedInv._id,
            quantity: -linkedAmount,
            type: 'deduction' as const,
            reason: 'Sale (linked customization option)',
            performedBy: new mongoose.Types.ObjectId(
              '000000000000000000000000'
            ),
            timestamp: new Date(),
            category: 'sale' as const,
            orderId: order._id,
            performedByName: 'System',
          });

          if (linkedInv.currentStock <= 0) {
            linkedInv.status = 'out-of-stock';
          } else if (linkedInv.currentStock <= linkedInv.minimumStock) {
            linkedInv.status = 'low-stock';
          } else {
            linkedInv.status = 'in-stock';
          }

          linkedInv.totalSales += linkedAmount;
          linkedInv.lastSaleDate = new Date();

          await linkedInv.save();

          if (
            linkedInv.status === 'low-stock' ||
            linkedInv.status === 'out-of-stock'
          ) {
            await this.sendLowStockAlert(linkedInv);
          }
        }

        results.push(result);
      } catch (error) {
        result.status = 'failed';
        result.error = error instanceof Error ? error.message : String(error);
        results.push(result);
      }
    }

    const allSucceeded = results.every((r) => r.status !== 'failed');

    return { allSucceeded, results };
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

      if (!menuItem) {
        continue;
      }

      const actualQuantity = item.quantity * (item.portionMultiplier || 1.0);

      if (menuItem.trackInventory) {
        const inventory = await InventoryModel.findOne({
          menuItemId: item.menuItemId,
        });

        if (inventory) {
          InventoryService.applyOrderStockDelta(inventory, actualQuantity);

          let notes: string | undefined;
          if (item.portionSize === 'half') {
            notes = `${item.quantity}x half portions (${actualQuantity} units restored)`;
          } else if (item.portionSize === 'quarter') {
            notes = `${item.quantity}x quarter portions (${actualQuantity} units restored)`;
          }

          await StockMovementModel.create({
            inventoryId: inventory._id,
            quantity: actualQuantity,
            type: 'addition' as const,
            reason: 'Order Cancelled - Stock Restored',
            performedBy: new mongoose.Types.ObjectId(
              '000000000000000000000000'
            ),
            timestamp: new Date(),
            category: 'adjustment' as const,
            orderId: order._id,
            performedByName: 'System',
            notes,
          });

          if (inventory.currentStock <= 0) {
            inventory.status = 'out-of-stock';
          } else if (inventory.currentStock <= inventory.minimumStock) {
            inventory.status = 'low-stock';
          } else {
            inventory.status = 'in-stock';
          }

          inventory.totalSales = Math.max(
            0,
            inventory.totalSales - actualQuantity
          );

          await inventory.save();
        }
      }

      // Linked customization-option restore (runs independently of base trackInventory)
      const linked = resolveLinkedInventoryFor(
        menuItem,
        item.customizations || []
      );
      for (const { inventoryId, deductionPerUnit } of linked) {
        const linkedInv = await InventoryModel.findById(inventoryId);
        if (!linkedInv) continue;

        const linkedAmount = actualQuantity * deductionPerUnit;
        InventoryService.applyOrderStockDelta(linkedInv, linkedAmount);

        await StockMovementModel.create({
          inventoryId: linkedInv._id,
          quantity: linkedAmount,
          type: 'addition' as const,
          reason: 'Order Cancelled - Linked Customization Stock Restored',
          performedBy: new mongoose.Types.ObjectId('000000000000000000000000'),
          timestamp: new Date(),
          category: 'adjustment' as const,
          orderId: order._id,
          performedByName: 'System',
        });

        if (linkedInv.currentStock <= 0) {
          linkedInv.status = 'out-of-stock';
        } else if (linkedInv.currentStock <= linkedInv.minimumStock) {
          linkedInv.status = 'low-stock';
        } else {
          linkedInv.status = 'in-stock';
        }

        linkedInv.totalSales = Math.max(0, linkedInv.totalSales - linkedAmount);

        await linkedInv.save();
      }
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
    if (!menuItem?.trackInventory) {
      return true;
    }

    const inventory = await InventoryModel.findOne({
      menuItemId: new mongoose.Types.ObjectId(menuItemId),
    });

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
    portionSize: 'full' | 'half' | 'quarter' = 'full'
  ): Promise<{ available: boolean; message?: string }> {
    const menuItem = await MenuItemModel.findById(menuItemId);

    if (!menuItem) {
      return { available: false, message: 'Menu item not found' };
    }

    if (!menuItem.isAvailable) {
      return {
        available: false,
        message: 'This item is currently unavailable',
      };
    }

    // Validate portion options are enabled if requested
    if (
      portionSize === 'half' &&
      !menuItem.portionOptions?.halfPortionEnabled
    ) {
      return {
        available: false,
        message: 'Half portion is not available for this item',
      };
    }

    if (
      portionSize === 'quarter' &&
      !menuItem.portionOptions?.quarterPortionEnabled
    ) {
      return {
        available: false,
        message: 'Quarter portion is not available for this item',
      };
    }

    if (!menuItem.trackInventory) {
      return { available: true };
    }

    const inventory = await InventoryModel.findOne({
      menuItemId: menuItem._id,
    });

    if (!inventory) {
      return { available: true };
    }

    // Calculate actual quantity needed based on portion
    let portionMultiplier = 1.0;
    if (portionSize === 'half') {
      portionMultiplier = 0.5;
    } else if (portionSize === 'quarter') {
      portionMultiplier = 0.25;
    }
    const actualQuantityNeeded = quantity * portionMultiplier;

    if (
      inventory.preventOrdersWhenOutOfStock &&
      inventory.currentStock < actualQuantityNeeded
    ) {
      return {
        available: false,
        message: `Only ${inventory.currentStock} ${inventory.unit} available. You need ${actualQuantityNeeded} ${inventory.unit}.`,
      };
    }

    return { available: true };
  }

  /**
   * REQ-034 AC3: List inventory rows filtered by `kind`. The Inventory dashboard
   * uses this to populate its Sellable / Kitchen tabs without leaking
   * kitchen-ingredient rows into the sellable tab (or vice versa).
   *
   * REQ-037 AC4: also filters out soft-archived rows (`archivedAt`
   * present). This is the single source of truth for the
   * "show kitchen ingredients" query — fixes the Inventory dashboard,
   * the Recipe builder ingredient dropdown, and any other surface that
   * goes through this method in one edit.
   */
  static async listByKind(kind: InventoryKind) {
    return InventoryModel.find({ kind, archivedAt: { $exists: false } })
      .populate('menuItemId', 'name mainCategory category')
      .sort({ currentStock: 1 })
      .lean();
  }

  /**
   * REQ-037 AC7 — List ONLY archived inventory rows of a given kind.
   * Drives the Kitchen tab's "Show archived" section + the Restore
   * flow. Mirrors `listByKind` shape so the caller can re-use the
   * same row-rendering code path.
   */
  static async listArchivedByKind(kind: InventoryKind) {
    return InventoryModel.find({ kind, archivedAt: { $exists: true } })
      .populate('menuItemId', 'name mainCategory category')
      .sort({ archivedAt: -1 })
      .lean();
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

    // Get sales from StockMovement collection in the last X days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const salesAgg = await StockMovementModel.aggregate([
      {
        $match: {
          inventoryId: inventory._id,
          category: 'sale',
          timestamp: { $gte: cutoffDate },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: { $abs: '$quantity' } },
        },
      },
    ]);

    const totalSales = salesAgg.length > 0 ? salesAgg[0].totalSales : 0;
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
      (inventory.currentStock +
        inventory.minimumStock +
        inventory.maximumStock) /
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

    const [wasteAgg, totalMovementAgg] = await Promise.all([
      StockMovementModel.aggregate([
        {
          $match: {
            inventoryId: inventory._id,
            category: { $in: ['waste', 'damage'] },
          },
        },
        {
          $group: {
            _id: null,
            totalWaste: { $sum: { $abs: '$quantity' } },
          },
        },
      ]),
      StockMovementModel.aggregate([
        {
          $match: { inventoryId: inventory._id },
        },
        {
          $group: {
            _id: null,
            totalMovement: { $sum: { $abs: '$quantity' } },
          },
        },
      ]),
    ]);

    const totalWaste = wasteAgg.length > 0 ? wasteAgg[0].totalWaste : 0;
    const wasteCost = totalWaste * inventory.costPerUnit;
    const totalMovement =
      totalMovementAgg.length > 0 ? totalMovementAgg[0].totalMovement : 0;
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
    const inventory =
      await InventoryModel.findById(inventoryId).populate('menuItemId');

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

  /**
   * Transfer stock between locations
   */
  static async transferStock(params: {
    inventoryId: string;
    fromLocation: string;
    toLocation: string;
    quantity: number;
    performedBy: string;
    performedByName: string;
    transferReference?: string;
    notes?: string;
  }): Promise<void> {
    const {
      inventoryId,
      fromLocation,
      toLocation,
      quantity,
      performedBy,
      performedByName,
      transferReference,
      notes,
    } = params;

    const inventory = await InventoryModel.findById(inventoryId);

    if (!inventory) {
      throw new Error('Inventory item not found');
    }

    if (!inventory.trackByLocation) {
      throw new Error('Location tracking is not enabled for this item');
    }

    if (fromLocation === toLocation) {
      throw new Error('Source and destination locations must be different');
    }

    const sourceLocation = inventory.locations.find(
      (l) => l.location === fromLocation
    );

    if (!sourceLocation) {
      throw new Error(`Source location '${fromLocation}' not found`);
    }

    if (sourceLocation.currentStock < quantity) {
      throw new Error(
        `Insufficient stock in ${fromLocation}. Available: ${sourceLocation.currentStock}, Requested: ${quantity}`
      );
    }

    // Resolve location names from system config
    let fromName = fromLocation;
    let toName = toLocation;
    try {
      const locConfig = await SystemSettingsService.getInventoryLocations();
      const fromCfg = locConfig.locations.find(
        (c: { id: string; name: string }) => c.id === fromLocation
      );
      const toCfg = locConfig.locations.find(
        (c: { id: string; name: string }) => c.id === toLocation
      );
      if (fromCfg) fromName = fromCfg.name;
      if (toCfg) toName = toCfg.name;
    } catch {
      /* fallback to IDs */
    }

    sourceLocation.currentStock -= quantity;
    sourceLocation.lastUpdated = new Date();
    sourceLocation.updatedBy = new mongoose.Types.ObjectId(performedBy);
    sourceLocation.updatedByName = performedByName;

    let destinationLocation = inventory.locations.find(
      (l) => l.location === toLocation
    );

    if (destinationLocation) {
      destinationLocation.currentStock += quantity;
      destinationLocation.lastUpdated = new Date();
      destinationLocation.updatedBy = new mongoose.Types.ObjectId(performedBy);
      destinationLocation.updatedByName = performedByName;
    } else {
      inventory.locations.push({
        location: toLocation,
        locationName: toName,
        currentStock: quantity,
        lastUpdated: new Date(),
        updatedBy: new mongoose.Types.ObjectId(performedBy),
        updatedByName: performedByName,
      } as any);
    }

    const movementData = {
      inventoryId: inventory._id,
      quantity,
      type: 'adjustment' as const,
      reason: `Transfer: ${fromName} → ${toName}`,
      category: 'transfer' as const,
      fromLocation,
      toLocation,
      transferReference,
      performedBy: new mongoose.Types.ObjectId(performedBy),
      performedByName,
      timestamp: new Date(),
      notes,
    };

    // Write to normalized StockMovement collection
    await StockMovementModel.create(movementData);

    await inventory.save();
  }

  /**
   * Batch transfer multiple items
   */
  static async batchTransferStock(params: {
    transfers: Array<{
      inventoryId: string;
      quantity: number;
    }>;
    fromLocation: string;
    toLocation: string;
    performedBy: string;
    performedByName: string;
    transferReference?: string;
    notes?: string;
  }): Promise<{ success: number; failed: number; errors: string[] }> {
    const {
      transfers,
      fromLocation,
      toLocation,
      performedBy,
      performedByName,
      transferReference,
      notes,
    } = params;

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const transfer of transfers) {
      try {
        await this.transferStock({
          inventoryId: transfer.inventoryId,
          fromLocation,
          toLocation,
          quantity: transfer.quantity,
          performedBy,
          performedByName,
          transferReference,
          notes,
        });
        success++;
      } catch (error: any) {
        failed++;
        errors.push(`${transfer.inventoryId}: ${error.message}`);
      }
    }

    return { success, failed, errors };
  }

  /**
   * Get stock by location
   */
  static async getStockByLocation(
    inventoryId: string,
    location: string
  ): Promise<number> {
    const inventory = await InventoryModel.findById(inventoryId);

    if (!inventory) {
      throw new Error('Inventory item not found');
    }

    if (!inventory.trackByLocation) {
      return inventory.currentStock;
    }

    const loc = inventory.locations.find((l) => l.location === location);
    return loc?.currentStock || 0;
  }

  /**
   * Add stock to specific location
   */
  static async addStockToLocation(params: {
    inventoryId: string;
    location: string;
    quantity: number;
    reason: string;
    performedBy: string;
    performedByName: string;
    costPerUnit?: number;
    invoiceNumber?: string;
    supplier?: string;
    notes?: string;
  }): Promise<void> {
    const {
      inventoryId,
      location,
      quantity,
      reason,
      performedBy,
      performedByName,
      costPerUnit,
      invoiceNumber,
      supplier,
      notes,
    } = params;

    const inventory = await InventoryModel.findById(inventoryId);

    if (!inventory) {
      throw new Error('Inventory item not found');
    }

    if (inventory.trackByLocation) {
      const loc = inventory.locations.find((l) => l.location === location);

      if (loc) {
        loc.currentStock += quantity;
        loc.lastUpdated = new Date();
        loc.updatedBy = new mongoose.Types.ObjectId(performedBy);
        loc.updatedByName = performedByName;
      } else {
        inventory.locations.push({
          location,
          currentStock: quantity,
          lastUpdated: new Date(),
          updatedBy: new mongoose.Types.ObjectId(performedBy),
          updatedByName: performedByName,
        } as any);
      }
    } else {
      inventory.currentStock += quantity;
    }

    inventory.lastRestocked = new Date();
    inventory.totalRestocked += quantity;

    const movementData = {
      inventoryId: inventory._id,
      quantity,
      type: 'addition' as const,
      reason,
      category: 'restock' as const,
      location,
      performedBy: new mongoose.Types.ObjectId(performedBy),
      performedByName,
      timestamp: new Date(),
      costPerUnit,
      totalCost: costPerUnit ? costPerUnit * quantity : undefined,
      invoiceNumber,
      supplier,
      notes,
    };

    // Write to normalized StockMovement collection
    await StockMovementModel.create(movementData);

    await inventory.save();
  }

  /**
   * Deduct stock from specific location
   */
  static async deductStockFromLocation(params: {
    inventoryId: string;
    location: string;
    quantity: number;
    reason: string;
    performedBy: string;
    performedByName: string;
    category?: 'sale' | 'waste' | 'damage' | 'adjustment' | 'other';
    orderId?: string;
    notes?: string;
  }): Promise<void> {
    const {
      inventoryId,
      location,
      quantity,
      reason,
      performedBy,
      performedByName,
      category,
      orderId,
      notes,
    } = params;

    const inventory = await InventoryModel.findById(inventoryId);

    if (!inventory) {
      throw new Error('Inventory item not found');
    }

    if (inventory.trackByLocation) {
      const loc = inventory.locations.find((l) => l.location === location);

      if (!loc) {
        throw new Error(`Location '${location}' not found`);
      }

      if (loc.currentStock < quantity) {
        throw new Error(
          `Insufficient stock in ${location}. Available: ${loc.currentStock}, Requested: ${quantity}`
        );
      }

      loc.currentStock = Math.max(0, loc.currentStock - quantity);
      loc.lastUpdated = new Date();
      loc.updatedBy = new mongoose.Types.ObjectId(performedBy);
      loc.updatedByName = performedByName;
    } else {
      inventory.currentStock = Math.max(0, inventory.currentStock - quantity);
    }

    const movementData = {
      inventoryId: inventory._id,
      quantity: -quantity,
      type: 'deduction' as const,
      reason,
      category: (category || 'other') as any,
      location,
      performedBy: new mongoose.Types.ObjectId(performedBy),
      performedByName,
      timestamp: new Date(),
      orderId: orderId ? new mongoose.Types.ObjectId(orderId) : undefined,
      notes,
    };

    // Write to normalized StockMovement collection
    await StockMovementModel.create(movementData);

    if (category === 'sale') {
      inventory.totalSales += quantity;
      inventory.lastSaleDate = new Date();
    } else if (category === 'waste' || category === 'damage') {
      inventory.totalWaste += quantity;
    }

    await inventory.save();
  }

  /**
   * Get location breakdown for an inventory item
   */
  static async getLocationBreakdown(inventoryId: string) {
    const inventory = await InventoryModel.findById(inventoryId).populate(
      'menuItemId',
      'name'
    );

    if (!inventory) {
      throw new Error('Inventory item not found');
    }

    if (!inventory.trackByLocation) {
      return {
        trackByLocation: false,
        totalStock: inventory.currentStock,
        locations: [],
      };
    }

    return {
      trackByLocation: true,
      totalStock: inventory.currentStock,
      locations: inventory.locations.map((loc) => ({
        location: loc.location,
        locationName: loc.locationName,
        currentStock: loc.currentStock,
        lastUpdated: loc.lastUpdated,
        updatedByName: loc.updatedByName,
        percentage:
          inventory.currentStock > 0
            ? ((loc.currentStock / inventory.currentStock) * 100).toFixed(1)
            : '0',
      })),
    };
  }

  /**
   * Get transfer history for an inventory item
   */
  static async getTransferHistory(
    inventoryId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    const query: any = {
      inventoryId: new mongoose.Types.ObjectId(inventoryId),
      category: 'transfer',
    };
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }
    return StockMovementModel.find(query).sort({ timestamp: -1 }).lean();
  }

  /**
   * Get low stock alerts by location
   */
  static async getLowStockByLocation() {
    const inventories = await InventoryModel.find({
      trackByLocation: true,
      status: { $in: ['low-stock', 'out-of-stock'] },
    }).populate('menuItemId', 'name mainCategory category');

    const alerts: any[] = [];

    for (const inventory of inventories) {
      for (const location of inventory.locations) {
        if (location.currentStock <= inventory.minimumStock * 0.3) {
          alerts.push({
            menuItemId: inventory.menuItemId,
            menuItemName: (inventory.menuItemId as any)?.name,
            location: location.location,
            locationName: location.locationName,
            currentStock: location.currentStock,
            minimumStock: inventory.minimumStock,
            unit: inventory.unit,
            severity: location.currentStock === 0 ? 'critical' : 'warning',
          });
        }
      }
    }

    return alerts;
  }

  /**
   * Enable location tracking for an inventory item
   */
  static async enableLocationTracking(
    inventoryId: string,
    initialLocation: string,
    performedBy: string,
    performedByName: string
  ): Promise<void> {
    const inventory = await InventoryModel.findById(inventoryId);

    if (!inventory) {
      throw new Error('Inventory item not found');
    }

    if (inventory.trackByLocation) {
      throw new Error('Location tracking is already enabled');
    }

    // Resolve location name from system config
    let locationName = initialLocation;
    try {
      const locConfig = await SystemSettingsService.getInventoryLocations();
      const cfg = locConfig.locations.find(
        (c: { id: string; name: string }) => c.id === initialLocation
      );
      if (cfg) locationName = cfg.name;
    } catch {
      /* fallback to ID */
    }

    inventory.trackByLocation = true;
    inventory.locations = [
      {
        location: initialLocation,
        locationName,
        currentStock: inventory.currentStock,
        lastUpdated: new Date(),
        updatedBy: new mongoose.Types.ObjectId(performedBy),
        updatedByName: performedByName,
      } as any,
    ];

    const movementData = {
      inventoryId: inventory._id,
      quantity: inventory.currentStock,
      type: 'adjustment' as const,
      reason: `Enabled location tracking - moved stock to ${locationName}`,
      category: 'adjustment' as const,
      location: initialLocation,
      performedBy: new mongoose.Types.ObjectId(performedBy),
      performedByName,
      timestamp: new Date(),
    };

    // Write to normalized StockMovement collection
    await StockMovementModel.create(movementData);

    await inventory.save();
  }

  /**
   * @requirement REQ-066 — Reconciliation cron backstop
   * @requirement REQ-087 — Now consumes per-item result object
   *
   * Scans for orders that the kitchen-completion chokepoint marked
   * `completed` but whose `deductStockForOrder` had partial failures.
   * Each such order gets a retry attempt. With REQ-087, already-deducted
   * items are automatically skipped. Successful retries (allSucceeded)
   * flip the `inventoryDeducted` flag. Partial failures write a fresh
   * `IncidentEvent` with per-item breakdown.
   *
   * Pure retry — never mutates `Order.status`.
   */
  static async reconcileMissedDeductions(
    limit: number = 100
  ): Promise<{ attempted: number; succeeded: number; failed: number }> {
    const OrderModel = (await import('@/models/order-model')).default;
    const { IncidentEventService } = await import('./incident-event-service');

    const orders = await OrderModel.find({
      status: 'completed',
      inventoryDeducted: false,
    })
      .sort({ updatedAt: 1 })
      .limit(limit)
      .lean<
        Array<{
          _id: { toString: () => string };
          status: string;
          inventoryDeducted: boolean;
        }>
      >();

    let succeeded = 0;
    let failed = 0;

    for (const order of orders) {
      const orderId = order._id.toString();
      try {
        const result = await InventoryService.deductStockForOrder(orderId);

        await OrderModel.updateOne(
          { _id: order._id, inventoryDeducted: false },
          {
            $set: {
              inventoryDeductionDetails: result.results.map((r) => ({
                menuItemId: r.menuItemId,
                itemName: r.itemName,
                status: r.status,
                error: r.error,
                deductedAt: r.status === 'deducted' ? new Date() : undefined,
                quantity: r.quantity,
                linkedDeductions: r.linkedResults.map((lr) => ({
                  inventoryId: lr.inventoryId,
                  status: lr.status,
                  error: lr.error,
                })),
              })),
              ...(result.allSucceeded && {
                inventoryDeducted: true,
                inventoryDeductedAt: new Date(),
              }),
            },
          }
        );

        if (result.allSucceeded) {
          succeeded += 1;
        } else {
          const isDup = await IncidentEventService.dedupRecent({
            kind: 'inventory_deduction_failed',
            entityId: orderId,
            withinHours: 1,
          });
          if (!isDup) {
            await IncidentEventService.recordIncident({
              kind: 'inventory_deduction_failed',
              entityId: orderId,
              summary:
                'reconciliation retry of deductStockForOrder had partial failure',
              errorDetails: {
                message: 'Some items could not be deducted',
                actorRole: 'system_reconciliation',
                deductedItems: result.results.filter(
                  (r) => r.status === 'deducted'
                ),
                failedItems: result.results.filter(
                  (r) => r.status === 'failed'
                ),
                skippedItems: result.results.filter(
                  (r) => r.status === 'skipped'
                ),
              },
            });
          }
          failed += 1;
        }
      } catch (error) {
        try {
          const isDup = await IncidentEventService.dedupRecent({
            kind: 'inventory_deduction_failed',
            entityId: orderId,
            withinHours: 1,
          });
          if (!isDup) {
            await IncidentEventService.recordIncident({
              kind: 'inventory_deduction_failed',
              entityId: orderId,
              summary: 'reconciliation retry of deductStockForOrder threw',
              errorDetails: {
                message: error instanceof Error ? error.message : String(error),
                actorRole: 'system_reconciliation',
              },
            });
          }
        } catch (logErr) {
          console.error(
            '[InventoryService.reconcileMissedDeductions] IncidentEvent write failed:',
            logErr
          );
        }
        failed += 1;
      }
    }

    return { attempted: orders.length, succeeded, failed };
  }
}

export default InventoryService;
