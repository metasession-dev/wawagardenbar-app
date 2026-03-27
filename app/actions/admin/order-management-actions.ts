'use server';

import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { revalidatePath } from 'next/cache';
import { sessionOptions, SessionData } from '@/lib/session';
import { connectDB } from '@/lib/mongodb';
import OrderModel from '@/models/order-model';
import TabModel from '@/models/tab-model';
import { AuditLogService } from '@/services/audit-log-service';
import { TabService, OrderService } from '@/services';
import InventoryService from '@/services/inventory-service';
import { completeOrderAndDeductStockAction } from '@/app/actions/order/complete-order-action';
import {
  emitBatchUpdateEvent,
  emitOrderUpdatedEvent,
  emitOrderCancelledEvent,
} from '@/lib/socket-emit-helper';

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface OrderFilters {
  status?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  paymentStatus?: string;
  reconciled?: 'all' | 'reconciled' | 'not-reconciled';
}

/**
 * Get orders with filtering and pagination
 */
export async function getOrdersAction(
  filters: OrderFilters = {},
  page: number = 1,
  limit: number = 50
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (
      !session.userId ||
      !session.role ||
      !['admin', 'super-admin', 'kitchen-staff'].includes(session.role)
    ) {
      return { success: false, error: 'Unauthorized' };
    }

    await connectDB();

    // Build query
    const query: any = {};

    if (filters.status) {
      // Handle comma-separated statuses
      const statuses = filters.status.split(',').map((s) => s.trim());
      query.status = statuses.length > 1 ? { $in: statuses } : filters.status;
    }

    if (filters.type) {
      // Handle comma-separated types
      const types = filters.type.split(',').map((t) => t.trim());
      query.orderType = types.length > 1 ? { $in: types } : filters.type;
    }

    if (filters.paymentStatus) {
      // Handle comma-separated payment statuses
      const paymentStatuses = filters.paymentStatus
        .split(',')
        .map((p) => p.trim());
      query.paymentStatus =
        paymentStatuses.length > 1
          ? { $in: paymentStatuses }
          : filters.paymentStatus;
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.createdAt.$lte = new Date(filters.endDate);
      }
    }

    if (filters.search) {
      query.$or = [
        { orderNumber: { $regex: filters.search, $options: 'i' } },
        { 'customer.name': { $regex: filters.search, $options: 'i' } },
        { 'customer.email': { $regex: filters.search, $options: 'i' } },
        { 'customer.phone': { $regex: filters.search, $options: 'i' } },
      ];
    }

    if (filters.reconciled === 'reconciled') {
      query.reconciled = true;
    } else if (filters.reconciled === 'not-reconciled') {
      query.reconciled = { $ne: true };
    }

    // Get total count
    const total = await OrderModel.countDocuments(query);

    // Get orders
    const orders = await OrderModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Serialize for client
    const serialized = orders.map((order: any) => ({
      _id: order._id.toString(),
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      status: order.status,
      tabId: order.tabId?.toString(),
      customer: {
        name: order.guestName || order.userId?.name || 'Guest',
        email: order.guestEmail || order.userId?.email,
        phone: order.guestPhone || order.userId?.phone,
      },
      items: order.items.map((item: any) => ({
        menuItemId: item.menuItemId?.toString(),
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        portionSize: item.portionSize,
        subtotal: item.subtotal,
        customizations: item.customizations || [],
      })),
      total: order.total,
      paymentStatus: order.paymentStatus,
      tableNumber: order.dineInDetails?.tableNumber,
      pickupTime: order.pickupDetails?.preferredPickupTime?.toISOString(),
      deliveryAddress: order.deliveryDetails?.address,
      specialInstructions: order.specialInstructions,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      statusHistory: order.statusHistory?.map((h: any) => ({
        status: h.status,
        timestamp: h.timestamp.toISOString(),
        note: h.note,
      })),
      estimatedCompletionTime: order.estimatedCompletionTime?.toISOString(),
      preparationStartedAt: order.preparationStartedAt?.toISOString(),
      reconciled: order.reconciled || false,
      reconciledAt: order.reconciledAt?.toISOString(),
    }));

    return {
      success: true,
      data: {
        orders: serialized,
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Error getting orders:', error);
    return {
      success: false,
      error: 'Failed to get orders',
    };
  }
}

/**
 * Get single order details
 */
export async function getOrderDetailsAction(
  orderId: string
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (
      !session.userId ||
      !session.role ||
      !['admin', 'super-admin', 'kitchen-staff'].includes(session.role)
    ) {
      return { success: false, error: 'Unauthorized' };
    }

    const order = await OrderService.getOrderById(orderId);

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // Serialize for client
    const populatedUser = order.userId as any;
    const serialized = {
      _id: order._id.toString(),
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      status: order.status,
      userId: populatedUser?._id?.toString(),
      customer: {
        name: order.guestName || populatedUser?.name || 'Guest',
        email: order.guestEmail || populatedUser?.email,
        phone: order.guestPhone || populatedUser?.phone,
      },
      items: order.items.map((item: any) => ({
        menuItemId: item.menuItemId?.toString(),
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        portionSize: item.portionSize,
        subtotal: item.subtotal,
        customizations: item.customizations || [],
      })),
      subtotal: order.subtotal,
      tax: order.tax,
      deliveryFee: order.deliveryFee,
      total: order.total,
      paymentStatus: order.paymentStatus,
      paymentReference: order.paymentReference,
      tableNumber: order.dineInDetails?.tableNumber,
      deliveryAddress: order.deliveryDetails?.address,
      deliveryDetails: order.deliveryDetails,
      pickupTime: order.pickupDetails?.preferredPickupTime?.toISOString(),
      specialInstructions: order.specialInstructions,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      statusHistory: order.statusHistory?.map((h: any) => ({
        status: h.status,
        timestamp: h.timestamp.toISOString(),
        note: h.note,
      })),
      estimatedCompletionTime: order.estimatedCompletionTime?.toISOString(),
      preparationStartedAt: order.preparationStartedAt?.toISOString(),
      inventoryDeducted: order.inventoryDeducted,
      inventoryDeductedAt: order.inventoryDeductedAt?.toISOString(),
    };

    return {
      success: true,
      data: serialized,
    };
  } catch (error) {
    console.error('Error getting order details:', error);
    return {
      success: false,
      error: 'Failed to get order details',
    };
  }
}

/**
 * Update order status
 */
export async function updateOrderStatusAction(
  orderId: string,
  newStatus: string,
  note?: string
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (
      !session.userId ||
      !session.role ||
      !['admin', 'super-admin', 'kitchen-staff'].includes(session.role)
    ) {
      return { success: false, error: 'Unauthorized' };
    }

    await connectDB();

    const order = await OrderModel.findById(orderId);

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      pending: ['preparing', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready', 'cancelled'],
      ready: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };

    if (!validTransitions[order.status]?.includes(newStatus)) {
      return {
        success: false,
        error: `Cannot transition from ${order.status} to ${newStatus}`,
      };
    }

    const previousStatus = order.status;
    order.status = newStatus as any;

    // Update timestamps
    if (newStatus === 'preparing' && !order.preparationStartedAt) {
      order.preparationStartedAt = new Date();
    }

    // Add to status history
    order.statusHistory.push({
      status: newStatus as any,
      timestamp: new Date(),
      note: note || `Updated by ${session.role}`,
    });

    // If completing order, deduct inventory
    if (newStatus === 'completed' && !order.inventoryDeducted) {
      try {
        await completeOrderAndDeductStockAction(orderId);
      } catch (error) {
        console.error('Error deducting inventory:', error);
        // Continue with status update even if inventory fails
      }
    }

    await order.save();

    // Create audit log
    await AuditLogService.createLog({
      userId: session.userId,
      userEmail: session.email || '',
      userRole: session.role,
      action: 'order.update',
      resource: 'order',
      resourceId: orderId,
      details: {
        previousStatus,
        newStatus,
        note,
      },
    });

    // Emit Socket.io event
    await emitOrderUpdatedEvent(
      order._id.toString(),
      { status: newStatus },
      'status_update',
      session.email || session.role
    );

    revalidatePath('/dashboard/orders');
    revalidatePath('/dashboard/kitchen');
    revalidatePath(`/orders/${orderId}`);

    return {
      success: true,
      message: `Order status updated to ${newStatus}`,
      data: {
        orderId: order._id.toString(),
        status: order.status,
      },
    };
  } catch (error) {
    console.error('Error updating order status:', error);
    return {
      success: false,
      error: 'Failed to update order status',
    };
  }
}

/**
 * Batch update order statuses
 */
export async function batchUpdateOrdersAction(
  orderIds: string[],
  action: 'updateStatus' | 'cancel',
  data?: { status?: string; cancelReason?: string }
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (
      !session.userId ||
      !session.role ||
      !['admin', 'super-admin'].includes(session.role)
    ) {
      return { success: false, error: 'Unauthorized' };
    }

    await connectDB();

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const orderId of orderIds) {
      try {
        if (action === 'updateStatus' && data?.status) {
          const result = await updateOrderStatusAction(orderId, data.status);
          if (result.success) {
            results.success++;
          } else {
            results.failed++;
            results.errors.push(`${orderId}: ${result.error}`);
          }
        } else if (action === 'cancel') {
          const order = await OrderModel.findById(orderId);
          if (
            order &&
            order.status !== 'completed' &&
            order.status !== 'cancelled'
          ) {
            order.status = 'cancelled';
            order.statusHistory.push({
              status: 'cancelled',
              timestamp: new Date(),
              note: data?.cancelReason || 'Batch cancellation',
            });
            await order.save();
            results.success++;
          } else {
            results.failed++;
            results.errors.push(`${orderId}: Cannot cancel`);
          }
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`${orderId}: ${error}`);
      }
    }

    // Create audit log
    await AuditLogService.createLog({
      userId: session.userId,
      userEmail: session.email || '',
      userRole: session.role,
      action: 'order.update',
      resource: 'order',
      resourceId: 'batch',
      details: {
        batchAction: action,
        orderIds,
        data,
        results,
      },
    });

    // Emit Socket.io event
    await emitBatchUpdateEvent(orderIds, action);

    revalidatePath('/dashboard/orders');
    revalidatePath('/dashboard/kitchen');

    return {
      success: true,
      message: `Batch operation completed: ${results.success} succeeded, ${results.failed} failed`,
      data: results,
    };
  } catch (error) {
    console.error('Error in batch update:', error);
    return {
      success: false,
      error: 'Failed to perform batch update',
    };
  }
}

/**
 * Cancel order
 */
export async function cancelOrderAction(
  orderId: string,
  reason: string
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (
      !session.userId ||
      !session.role ||
      !['admin', 'super-admin'].includes(session.role)
    ) {
      return { success: false, error: 'Unauthorized' };
    }

    await connectDB();

    const order = await OrderModel.findById(orderId);

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    if (order.status === 'completed') {
      return { success: false, error: 'Cannot cancel completed order' };
    }

    if (order.status === 'cancelled') {
      return { success: false, error: 'Order already cancelled' };
    }

    // Only allow cancellation of unpaid orders
    if (order.paymentStatus === 'paid') {
      return {
        success: false,
        error: 'Cannot cancel paid orders. Please process a refund instead.',
      };
    }

    // Check if order is part of a tab in settling status
    if (order.tabId) {
      const tab = await TabModel.findById(order.tabId);
      if (tab && tab.status === 'settling') {
        return {
          success: false,
          error:
            'Cannot cancel orders from tabs that are currently settling. Please wait until the tab is closed or reopen it.',
        };
      }
    }

    const previousStatus = order.status;
    order.status = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: reason,
    });

    await order.save();

    // Restore inventory if it was deducted
    if (order.inventoryDeducted) {
      try {
        await InventoryService.restoreStockForOrder(orderId);
      } catch (error) {
        console.error('Error restoring inventory:', error);
        // Don't fail the cancellation if inventory restoration fails
      }
    }

    // If order is part of a tab, recalculate tab totals
    if (order.tabId) {
      try {
        await TabService.recalculateTabTotals(order.tabId.toString());
      } catch (error) {
        console.error('Error recalculating tab totals:', error);
        // Don't fail the cancellation if tab recalculation fails
      }
    }

    // Create audit log
    await AuditLogService.createLog({
      userId: session.userId,
      userEmail: session.email || '',
      userRole: session.role,
      action: 'order.cancel',
      resource: 'order',
      resourceId: orderId,
      details: {
        previousStatus,
        reason,
      },
    });

    // Emit Socket.io event
    await emitOrderCancelledEvent(order._id.toString(), reason);

    revalidatePath('/dashboard/orders');
    revalidatePath('/dashboard/kitchen');

    return {
      success: true,
      message: 'Order cancelled successfully',
      data: { orderId: order._id.toString() },
    };
  } catch (error) {
    console.error('Error cancelling order:', error);
    return {
      success: false,
      error: 'Failed to cancel order',
    };
  }
}

/**
 * Add note to order
 */
export async function addOrderNoteAction(
  orderId: string,
  note: string
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (
      !session.userId ||
      !session.role ||
      !['admin', 'super-admin', 'kitchen-staff'].includes(session.role)
    ) {
      return { success: false, error: 'Unauthorized' };
    }

    await connectDB();

    const order = await OrderModel.findById(orderId);

    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // Find the most recent status history entry and add note to it
    // If there's no status history, create one
    if (order.statusHistory.length === 0) {
      order.statusHistory.push({
        status: order.status,
        timestamp: new Date(),
        note: `Note by ${session.email || session.role}: ${note}`,
      });
    } else {
      // Get the last status history entry
      const lastEntry = order.statusHistory[order.statusHistory.length - 1];

      // If the last entry is for the current status, append the note
      if (lastEntry.status === order.status) {
        const existingNote = lastEntry.note || '';
        const separator = existingNote ? '\n' : '';
        lastEntry.note = `${existingNote}${separator}Note by ${session.email || session.role}: ${note}`;
        lastEntry.timestamp = new Date(); // Update timestamp
      } else {
        // If status has changed, create a new entry
        order.statusHistory.push({
          status: order.status,
          timestamp: new Date(),
          note: `Note by ${session.email || session.role}: ${note}`,
        });
      }
    }

    await order.save();

    // Create audit log
    await AuditLogService.createLog({
      userId: session.userId,
      userEmail: session.email || 'admin',
      userRole: session.role || 'admin',
      action: 'order.update' as any,
      resource: 'order',
      resourceId: orderId,
      details: {
        note,
      },
    });

    revalidatePath('/dashboard/orders');
    revalidatePath(`/dashboard/orders/${orderId}`);

    return {
      success: true,
      message: 'Note added successfully',
    };
  } catch (error) {
    console.error('Error adding note to order:', error);
    return {
      success: false,
      error: 'Failed to add note',
    };
  }
}

/**
 * @requirement REQ-014 - Toggle reconciliation status on a standalone order
 */
export async function toggleOrderReconciliationAction(
  orderId: string
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (
      !session.userId ||
      !session.role ||
      !['admin', 'super-admin'].includes(session.role)
    ) {
      return { success: false, error: 'Unauthorized' };
    }

    await connectDB();
    const order = await OrderModel.findById(orderId);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    const newState = !order.reconciled;
    order.reconciled = newState;
    order.reconciledAt = newState ? new Date() : (undefined as any);
    order.reconciledBy = newState
      ? (session.userId as any)
      : (undefined as any);
    await order.save();

    revalidatePath('/dashboard/orders');

    return {
      success: true,
      message: newState
        ? 'Order marked as reconciled'
        : 'Order marked as not reconciled',
    };
  } catch (error) {
    console.error('Error toggling order reconciliation:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to toggle reconciliation',
    };
  }
}
