'use server';

import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import InventoryService from '@/services/inventory-service';
import { SystemSettingsService } from '@/services/system-settings-service';
import { AuditLogService } from '@/services/audit-log-service';
import { IInventoryLocationsSettings } from '@/interfaces';

/**
 * Get session
 */
async function getSession() {
  const cookieStore = await cookies();
  return await getIronSession<SessionData>(cookieStore, sessionOptions);
}

/**
 * Require authentication
 */
async function requireAuth() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    throw new Error('Authentication required');
  }
  return session;
}

/**
 * Require specific role
 */
async function requireRole(allowedRoles: string[]) {
  const session = await requireAuth();
  if (!session.role || !allowedRoles.includes(session.role)) {
    throw new Error('Insufficient permissions');
  }
  return session;
}

/**
 * Transfer stock between locations
 */
export async function transferStockAction(params: {
  inventoryId: string;
  fromLocation: string;
  toLocation: string;
  quantity: number;
  transferReference?: string;
  notes?: string;
}) {
  try {
    const session = await requireRole(['admin', 'super-admin']);
    
    if (!session.userId || !session.email || !session.role) {
      throw new Error('Invalid session data');
    }
    
    await InventoryService.transferStock({
      ...params,
      performedBy: session.userId,
      performedByName: session.name || session.email,
    });
    
    await AuditLogService.createLog({
      userId: session.userId,
      userEmail: session.email,
      userRole: session.role,
      action: 'inventory.stock_transferred',
      resource: 'inventory',
      resourceId: params.inventoryId,
      details: {
        fromLocation: params.fromLocation,
        toLocation: params.toLocation,
        quantity: params.quantity,
        transferReference: params.transferReference,
      },
    });
    
    return { success: true, message: 'Stock transferred successfully' };
  } catch (error: any) {
    console.error('Transfer stock error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Batch transfer stock
 */
export async function batchTransferStockAction(params: {
  transfers: Array<{ inventoryId: string; quantity: number }>;
  fromLocation: string;
  toLocation: string;
  transferReference?: string;
  notes?: string;
}) {
  try {
    const session = await requireRole(['admin', 'super-admin']);
    
    if (!session.userId || !session.email || !session.role) {
      throw new Error('Invalid session data');
    }
    
    const result = await InventoryService.batchTransferStock({
      ...params,
      performedBy: session.userId,
      performedByName: session.name || session.email,
    });
    
    await AuditLogService.createLog({
      userId: session.userId,
      userEmail: session.email,
      userRole: session.role,
      action: 'inventory.batch_transfer',
      resource: 'inventory',
      resourceId: 'batch',
      details: {
        fromLocation: params.fromLocation,
        toLocation: params.toLocation,
        itemCount: params.transfers.length,
        success: result.success,
        failed: result.failed,
      },
    });
    
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Batch transfer error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get location breakdown for an item
 */
export async function getLocationBreakdownAction(inventoryId: string) {
  try {
    await requireRole(['admin', 'super-admin']);
    
    const breakdown = await InventoryService.getLocationBreakdown(inventoryId);
    
    return { success: true, data: breakdown };
  } catch (error: any) {
    console.error('Get location breakdown error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get transfer history
 */
export async function getTransferHistoryAction(
  inventoryId: string,
  startDate?: string,
  endDate?: string
) {
  try {
    await requireRole(['admin', 'super-admin']);
    
    const history = await InventoryService.getTransferHistory(
      inventoryId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
    
    return { success: true, data: JSON.parse(JSON.stringify(history)) };
  } catch (error: any) {
    console.error('Get transfer history error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get low stock alerts by location
 */
export async function getLowStockByLocationAction() {
  try {
    await requireRole(['admin', 'super-admin']);
    
    const alerts = await InventoryService.getLowStockByLocation();
    
    return { success: true, data: JSON.parse(JSON.stringify(alerts)) };
  } catch (error: any) {
    console.error('Get low stock by location error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Enable location tracking for an item
 */
export async function enableLocationTrackingAction(
  inventoryId: string,
  initialLocation: string
) {
  try {
    const session = await requireRole(['super-admin']);
    
    if (!session.userId || !session.email || !session.role) {
      throw new Error('Invalid session data');
    }
    
    await InventoryService.enableLocationTracking(
      inventoryId,
      initialLocation,
      session.userId,
      session.name || session.email
    );
    
    await AuditLogService.createLog({
      userId: session.userId,
      userEmail: session.email,
      userRole: session.role,
      action: 'inventory.location_tracking_enabled',
      resource: 'inventory',
      resourceId: inventoryId,
      details: {
        initialLocation,
      },
    });
    
    return { success: true, message: 'Location tracking enabled' };
  } catch (error: any) {
    console.error('Enable location tracking error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get inventory locations configuration
 */
export async function getInventoryLocationsConfigAction() {
  try {
    await requireRole(['admin', 'super-admin']);
    
    const config = await SystemSettingsService.getInventoryLocations();
    
    return { success: true, data: config };
  } catch (error: any) {
    console.error('Get locations config error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update inventory locations configuration
 */
export async function updateInventoryLocationsConfigAction(
  config: IInventoryLocationsSettings
) {
  try {
    const session = await requireRole(['super-admin']);
    
    if (!session.userId || !session.email || !session.role) {
      throw new Error('Invalid session data');
    }
    
    await SystemSettingsService.updateInventoryLocations(config, session.userId);
    
    await AuditLogService.createLog({
      userId: session.userId,
      userEmail: session.email,
      userRole: session.role,
      action: 'settings.inventory_locations_updated',
      resource: 'system-settings',
      resourceId: 'inventory-locations',
      details: {
        enabled: config.enabled,
        locationCount: config.locations.length,
        defaultReceivingLocation: config.defaultReceivingLocation,
        defaultSalesLocation: config.defaultSalesLocation,
      },
    });
    
    return { success: true, message: 'Locations configuration updated' };
  } catch (error: any) {
    console.error('Update locations config error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add stock to specific location
 */
export async function addStockToLocationAction(params: {
  inventoryId: string;
  location: string;
  quantity: number;
  reason: string;
  costPerUnit?: number;
  invoiceNumber?: string;
  supplier?: string;
  notes?: string;
}) {
  try {
    const session = await requireRole(['admin', 'super-admin']);
    
    if (!session.userId || !session.email || !session.role) {
      throw new Error('Invalid session data');
    }
    
    await InventoryService.addStockToLocation({
      ...params,
      performedBy: session.userId,
      performedByName: session.name || session.email,
    });
    
    await AuditLogService.createLog({
      userId: session.userId,
      userEmail: session.email,
      userRole: session.role,
      action: 'inventory.stock_added_to_location',
      resource: 'inventory',
      resourceId: params.inventoryId,
      details: {
        location: params.location,
        quantity: params.quantity,
        reason: params.reason,
      },
    });
    
    return { success: true, message: 'Stock added successfully' };
  } catch (error: any) {
    console.error('Add stock to location error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Deduct stock from specific location
 */
export async function deductStockFromLocationAction(params: {
  inventoryId: string;
  location: string;
  quantity: number;
  reason: string;
  category?: 'sale' | 'waste' | 'damage' | 'adjustment' | 'other';
  notes?: string;
}) {
  try {
    const session = await requireRole(['admin', 'super-admin']);
    
    if (!session.userId || !session.email || !session.role) {
      throw new Error('Invalid session data');
    }
    
    await InventoryService.deductStockFromLocation({
      ...params,
      performedBy: session.userId,
      performedByName: session.name || session.email,
    });
    
    await AuditLogService.createLog({
      userId: session.userId,
      userEmail: session.email,
      userRole: session.role,
      action: 'inventory.stock_deducted_from_location',
      resource: 'inventory',
      resourceId: params.inventoryId,
      details: {
        location: params.location,
        quantity: params.quantity,
        reason: params.reason,
        category: params.category,
      },
    });
    
    return { success: true, message: 'Stock deducted successfully' };
  } catch (error: any) {
    console.error('Deduct stock from location error:', error);
    return { success: false, error: error.message };
  }
}
