'use server';

import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { revalidatePath } from 'next/cache';
import { sessionOptions, SessionData } from '@/lib/session';
import { connectDB } from '@/lib/mongodb';
import InventoryModel from '@/models/inventory-model';
import { AuditLogService } from '@/services/audit-log-service';
import { InventoryService } from '@/services';
import { SystemSettingsService } from '@/services/system-settings-service';
import { Types } from 'mongoose';

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

/**
 * Add stock (restocking)
 * Used when receiving new inventory from suppliers
 */
export async function addStockAction(
  inventoryId: string,
  data: {
    quantity: number;
    reason: string;
    supplier?: string;
    costPerUnit?: number;
    invoiceNumber?: string;
    notes?: string;
    location?: string;
  }
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.userId || !session.role || !['admin', 'super-admin'].includes(session.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    await connectDB();

    // Validate input
    if (!data.quantity || data.quantity <= 0) {
      return { success: false, error: 'Quantity must be greater than 0' };
    }

    if (!data.reason) {
      return { success: false, error: 'Reason is required' };
    }

    // Get inventory record
    const inventory = await InventoryModel.findById(inventoryId);

    if (!inventory) {
      return { success: false, error: 'Inventory not found' };
    }

    // Handle location-based stock addition
    if (inventory.trackByLocation && data.location) {
      const locationIndex = inventory.locations.findIndex(
        (loc: any) => loc.location === data.location
      );

      if (locationIndex >= 0) {
        // Update existing location
        inventory.locations[locationIndex].currentStock += data.quantity;
        inventory.locations[locationIndex].lastUpdated = new Date();
        inventory.locations[locationIndex].updatedByName = session.email || 'Admin';
      } else {
        // Resolve location name from system config
        let locationName = data.location;
        try {
          const locConfig = await SystemSettingsService.getInventoryLocations();
          const cfg = locConfig.locations.find(c => c.id === data.location);
          if (cfg) locationName = cfg.name;
        } catch { /* fallback to ID */ }
        // Add new location
        inventory.locations.push({
          location: data.location,
          locationName,
          currentStock: data.quantity,
          lastUpdated: new Date(),
          updatedByName: session.email || 'Admin',
        });
      }
      // Recalculate total stock from all locations
      inventory.currentStock = inventory.locations.reduce(
        (sum: number, loc: any) => sum + loc.currentStock,
        0
      );
    } else {
      // Standard stock addition (no location tracking)
      inventory.currentStock += data.quantity;
    }
    inventory.lastRestocked = new Date();
    inventory.totalRestocked += data.quantity;

    // Add to stock history
    inventory.stockHistory.push({
      quantity: data.quantity,
      type: 'addition',
      reason: data.reason,
      category: 'restock',
      performedBy: new Types.ObjectId(session.userId),
      performedByName: session.email || 'Admin',
      timestamp: new Date(),
      supplier: data.supplier,
      costPerUnit: data.costPerUnit,
      totalCost: data.costPerUnit ? data.costPerUnit * data.quantity : undefined,
      invoiceNumber: data.invoiceNumber,
      notes: data.notes,
      location: data.location,
    } as any);

    // Update status
    if (inventory.currentStock <= 0) {
      inventory.status = 'out-of-stock';
    } else if (inventory.currentStock <= inventory.minimumStock) {
      inventory.status = 'low-stock';
    } else {
      inventory.status = 'in-stock';
    }

    await inventory.save();

    // Create audit log
    await AuditLogService.createLog({
      userId: session.userId,
      userEmail: session.email || '',
      userRole: session.role,
      action: data.location ? 'inventory.stock_added_to_location' : 'inventory.update',
      resource: 'inventory',
      resourceId: inventoryId,
      details: {
        action: 'add_stock',
        quantity: data.quantity,
        reason: data.reason,
        newStock: inventory.currentStock,
        ...(data.location && { location: data.location })
      },
    });

    revalidatePath('/dashboard/inventory');
    revalidatePath(`/dashboard/inventory/${inventoryId}`);

    return {
      success: true,
      message: `Added ${data.quantity} ${inventory.unit} to stock`,
      data: { currentStock: inventory.currentStock },
    };
  } catch (error) {
    console.error('Error adding stock:', error);
    return {
      success: false,
      error: 'Failed to add stock',
    };
  }
}

/**
 * Deduct stock (waste/damage)
 * Used for tracking waste, damage, theft, etc.
 */
export async function deductStockAction(
  inventoryId: string,
  data: {
    quantity: number;
    reason: string;
    category: 'waste' | 'damage' | 'theft' | 'other';
    notes?: string;
    location?: string;
  }
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.userId || !session.role || !['admin', 'super-admin'].includes(session.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    await connectDB();

    // Validate input
    if (!data.quantity || data.quantity <= 0) {
      return { success: false, error: 'Quantity must be greater than 0' };
    }

    if (!data.reason) {
      return { success: false, error: 'Reason is required' };
    }

    // Get inventory record
    const inventory = await InventoryModel.findById(inventoryId);

    if (!inventory) {
      return { success: false, error: 'Inventory not found' };
    }

    // Handle location-based stock deduction
    if (inventory.trackByLocation && data.location) {
      const locationIndex = inventory.locations.findIndex(
        (loc: any) => loc.location === data.location
      );

      if (locationIndex >= 0) {
        const locationStock = inventory.locations[locationIndex].currentStock;
        if (locationStock < data.quantity) {
          return {
            success: false,
            error: `Insufficient stock at this location. Available: ${locationStock}`,
          };
        }
        // Deduct from location
        inventory.locations[locationIndex].currentStock -= data.quantity;
        inventory.locations[locationIndex].lastUpdated = new Date();
        inventory.locations[locationIndex].updatedByName = session.email || 'Admin';
      } else {
        return { success: false, error: 'Location not found' };
      }
      // Recalculate total stock from all locations
      inventory.currentStock = inventory.locations.reduce(
        (sum: number, loc: any) => sum + loc.currentStock,
        0
      );
    } else {
      // Standard stock deduction (no location tracking)
      inventory.currentStock = Math.max(0, inventory.currentStock - data.quantity);
    }

    const previousStock = inventory.currentStock + data.quantity;
    inventory.totalWaste += data.quantity;

    // Add to stock history
    inventory.stockHistory.push({
      quantity: -data.quantity,
      type: 'deduction',
      reason: data.reason,
      category: data.category,
      performedBy: new Types.ObjectId(session.userId),
      performedByName: session.email || 'Admin',
      timestamp: new Date(),
      notes: data.notes,
      location: data.location,
    } as any);

    // Update status
    if (inventory.currentStock <= 0) {
      inventory.status = 'out-of-stock';
    } else if (inventory.currentStock <= inventory.minimumStock) {
      inventory.status = 'low-stock';
    } else {
      inventory.status = 'in-stock';
    }

    await inventory.save();

    // Check for low stock and send alerts
    if (inventory.status === 'low-stock' || inventory.status === 'out-of-stock') {
      // Send alert asynchronously (don't wait)
      InventoryService.getLowStockItems().catch(console.error);
    }

    // Create audit log
    await AuditLogService.createLog({
      userId: session.userId,
      userEmail: session.email || '',
      userRole: session.role,
      action: data.location ? 'inventory.stock_deducted_from_location' : 'inventory.update',
      resource: 'inventory',
      resourceId: inventoryId,
      details: {
        action: 'deduct_stock',
        quantity: data.quantity,
        reason: data.reason,
        category: data.category,
        previousStock,
        newStock: inventory.currentStock,
        ...(data.location && { location: data.location })
      },
    });

    revalidatePath('/dashboard/inventory');
    revalidatePath(`/dashboard/inventory/${inventoryId}`);

    return {
      success: true,
      message: `Deducted ${data.quantity} ${inventory.unit} from stock`,
      data: { currentStock: inventory.currentStock },
    };
  } catch (error) {
    console.error('Error deducting stock:', error);
    return {
      success: false,
      error: 'Failed to deduct stock',
    };
  }
}

/**
 * Adjust stock (inventory count correction)
 * Used for physical inventory counts and corrections
 */
export async function adjustStockAction(
  inventoryId: string,
  data: {
    newStock: number;
    reason: string;
    location?: string;
  }
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.userId || !session.role || !['admin', 'super-admin'].includes(session.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    await connectDB();

    // Validate input
    if (data.newStock < 0) {
      return { success: false, error: 'Stock cannot be negative' };
    }

    if (!data.reason) {
      return { success: false, error: 'Reason is required' };
    }

    // Get inventory record
    const inventory = await InventoryModel.findById(inventoryId);

    if (!inventory) {
      return { success: false, error: 'Inventory not found' };
    }

    // Calculate difference and adjust stock
    let previousStock: number;
    let difference: number;

    // Resolve location name for notes
    let locationDisplayName = '';
    if (inventory.trackByLocation && data.location) {
      // Adjust stock for a specific location
      const locIndex = inventory.locations.findIndex(
        (l: any) => l.location === data.location
      );
      if (locIndex === -1) {
        return { success: false, error: 'Location not found on this inventory item' };
      }
      previousStock = inventory.locations[locIndex].currentStock;
      difference = data.newStock - previousStock;
      inventory.locations[locIndex].currentStock = data.newStock;
      inventory.locations[locIndex].lastUpdated = new Date();
      inventory.locations[locIndex].updatedByName = session.email || 'Admin';
      locationDisplayName = inventory.locations[locIndex].locationName || data.location;
      // pre-save hook will sync inventory.currentStock from location totals
    } else {
      previousStock = inventory.currentStock;
      difference = data.newStock - previousStock;
      inventory.currentStock = data.newStock;
    }

    // Add to stock history
    inventory.stockHistory.push({
      quantity: difference,
      type: 'adjustment',
      reason: data.reason,
      category: 'adjustment',
      performedBy: new Types.ObjectId(session.userId),
      performedByName: session.email || 'Admin',
      timestamp: new Date(),
      notes: `Adjusted from ${previousStock} to ${data.newStock}${
        locationDisplayName ? ` at ${locationDisplayName}` : ''
      }`,
      ...(data.location && { location: data.location }),
    } as any);

    await inventory.save();

    // Check for low stock and send alerts
    if (inventory.status === 'low-stock' || inventory.status === 'out-of-stock') {
      // Send alert asynchronously (don't wait)
      InventoryService.getLowStockItems().catch(console.error);
    }

    // Create audit log
    await AuditLogService.createLog({
      userId: session.userId,
      userEmail: session.email || '',
      userRole: session.role,
      action: 'inventory.update',
      resource: 'inventory',
      resourceId: inventoryId,
      details: {
        action: 'adjust_stock',
        previousStock,
        newStock: data.newStock,
        difference,
        reason: data.reason,
        ...(data.location && { location: data.location }),
      },
    });

    revalidatePath('/dashboard/inventory');
    revalidatePath(`/dashboard/inventory/${inventoryId}`);

    return {
      success: true,
      message: `Stock adjusted to ${data.newStock} ${inventory.unit}`,
      data: { currentStock: inventory.currentStock, difference },
    };
  } catch (error) {
    console.error('Error adjusting stock:', error);
    return {
      success: false,
      error: 'Failed to adjust stock',
    };
  }
}

/**
 * Get inventory details with menu item info
 */
export async function getInventoryDetailsAction(
  inventoryId: string
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.userId || !session.role || !['admin', 'super-admin'].includes(session.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    await connectDB();

    const inventory = await InventoryModel.findById(inventoryId)
      .populate('menuItemId', 'name mainCategory category price')
      .lean();

    if (!inventory) {
      return { success: false, error: 'Inventory not found' };
    }

    // Fetch system location config for name resolution
    let configLocations: Array<{ id: string; name: string; type: string; isActive: boolean; displayOrder: number }> = [];
    if (inventory.trackByLocation) {
      try {
        const locConfig = await SystemSettingsService.getInventoryLocations();
        configLocations = locConfig.locations || [];
      } catch {
        // Fall back to empty — names will show IDs
      }
    }

    // Helper to resolve location name from config
    const resolveLocationName = (locationId: string): string => {
      const cfg = configLocations.find(c => c.id === locationId);
      return cfg?.name || locationId;
    };

    // Serialize for client
    const serialized = {
      _id: inventory._id.toString(),
      menuItemId: inventory.menuItemId ? {
        _id: (inventory.menuItemId as any)._id.toString(),
        name: (inventory.menuItemId as any).name,
        mainCategory: (inventory.menuItemId as any).mainCategory,
        category: (inventory.menuItemId as any).category,
        price: (inventory.menuItemId as any).price,
      } : null,
      currentStock: inventory.currentStock,
      minimumStock: inventory.minimumStock,
      maximumStock: inventory.maximumStock,
      unit: inventory.unit,
      status: inventory.status,
      costPerUnit: inventory.costPerUnit,
      supplier: inventory.supplier,
      totalSales: inventory.totalSales,
      totalWaste: inventory.totalWaste,
      totalRestocked: inventory.totalRestocked,
      lastRestocked: inventory.lastRestocked?.toISOString(),
      lastSaleDate: inventory.lastSaleDate?.toISOString(),
      trackByLocation: inventory.trackByLocation || false,
      locations: (inventory.locations || []).map((loc: any) => ({
        location: loc.location,
        locationName: loc.locationName || resolveLocationName(loc.location),
        currentStock: loc.currentStock,
        lastUpdated: loc.lastUpdated ? new Date(loc.lastUpdated).toISOString() : null,
        updatedByName: loc.updatedByName || null,
        notes: loc.notes || null,
      })),
      configLocations: configLocations.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        isActive: c.isActive,
        displayOrder: c.displayOrder,
      })),
      stockHistory: inventory.stockHistory.map((h: any) => ({
        quantity: h.quantity,
        type: h.type,
        reason: h.reason,
        category: h.category,
        timestamp: h.timestamp.toISOString(),
        performedByName: h.performedByName,
        notes: h.notes,
        supplier: h.supplier,
        invoiceNumber: h.invoiceNumber,
        location: h.location,
        fromLocation: h.fromLocation,
        toLocation: h.toLocation,
        transferReference: h.transferReference,
      })),
    };

    return {
      success: true,
      data: serialized,
    };
  } catch (error) {
    console.error('Error getting inventory details:', error);
    return {
      success: false,
      error: 'Failed to get inventory details',
    };
  }
}
