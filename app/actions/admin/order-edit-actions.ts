'use server';

import { revalidatePath } from 'next/cache';
import { SettingsService } from '@/services';
import { connectDB } from '@/lib/mongodb';
import OrderModel from '@/models/order-model';
import MenuItemModel from '@/models/menu-item-model';
import { Types } from 'mongoose';
import {
  reconcileAndValidateOrderLines,
  type MenuItemForReconcile,
} from '@/lib/order-line-totals';

interface UpdateOrderItemsInput {
  orderId: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
    portionSize?: 'full' | 'half' | 'quarter';
    customizations?: Array<{
      name: string;
      option: string;
      price: number;
    }>;
    specialInstructions?: string;
  }>;
}

/**
 * Update order items (add/remove/change quantities)
 * Only allowed for unpaid orders
 */
export async function updateOrderItemsAction(input: UpdateOrderItemsInput) {
  try {
    await connectDB();

    // Fetch the order
    const order = await OrderModel.findById(input.orderId);
    if (!order) {
      return {
        success: false,
        error: 'Order not found',
      };
    }

    // Check if order can be edited
    if (order.paymentStatus === 'paid') {
      return {
        success: false,
        error: 'Cannot edit paid orders',
      };
    }

    if (order.status === 'cancelled' || order.status === 'completed') {
      return {
        success: false,
        error: 'Cannot edit cancelled or completed orders',
      };
    }

    // Validate and fetch menu items
    const menuItemIds = input.items.map((item) => item.menuItemId);
    const uniqueMenuItemIds = [...new Set(menuItemIds)];
    const menuItems = await MenuItemModel.find({
      _id: { $in: uniqueMenuItemIds },
    });

    if (menuItems.length !== uniqueMenuItemIds.length) {
      return {
        success: false,
        error: 'One or more menu items not found',
      };
    }

    // Check availability
    for (const menuItem of menuItems) {
      if (!menuItem.isAvailable) {
        return {
          success: false,
          error: `${menuItem.name} is currently unavailable`,
        };
      }
    }

    // REQ-031: validate (group, option) pairs exist on the menu item and
    // recompute the subtotal server-side. Single source of truth via the
    // reconciler helper. AC7 (validation) and AC15 (server total) covered here.
    const portionMultiplierFor = (size?: string) =>
      size === 'half' ? 0.5 : size === 'quarter' ? 0.25 : 1.0;
    const menuMap = new Map<string, MenuItemForReconcile>(
      menuItems.map((m: any) => [
        m._id.toString(),
        {
          _id: m._id.toString(),
          name: m.name,
          price: m.price,
          customizations: m.customizations,
        },
      ])
    );
    const reconciled = reconcileAndValidateOrderLines({
      menuItems: menuMap,
      lines: input.items.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        portionMultiplier: portionMultiplierFor(item.portionSize),
        customizations: item.customizations,
      })),
    });
    if (!reconciled.valid) {
      return { success: false, error: reconciled.error };
    }

    // Build new items array
    const newItems = input.items.map((inputItem) => {
      const menuItem = menuItems.find(
        (mi) => mi._id.toString() === inputItem.menuItemId
      );

      if (!menuItem) {
        throw new Error('Menu item not found');
      }

      const customizations = inputItem.customizations || [];
      const multiplier = portionMultiplierFor(inputItem.portionSize);
      const surchargeTotal = customizations.reduce(
        (sum, custom) =>
          sum + (typeof custom.price === 'number' ? custom.price : 0),
        0
      );
      const adjustedBase = Math.round(menuItem.price * multiplier);
      // REQ-031: surcharge scales with portion (D6, AC13)
      const itemSubtotal = Math.round(
        (adjustedBase + surchargeTotal * multiplier) * inputItem.quantity
      );

      return {
        menuItemId: new Types.ObjectId(menuItem._id),
        name: menuItem.name,
        price: adjustedBase,
        quantity: inputItem.quantity,
        portionSize: inputItem.portionSize || 'full',
        portionMultiplier: multiplier,
        customizations: customizations.map((custom) => ({
          name: custom.name,
          option: custom.option,
          price: custom.price,
        })),
        specialInstructions: inputItem.specialInstructions || '',
        subtotal: itemSubtotal,
        costPerUnit: menuItem.costPerUnit || 0,
        totalCost: (menuItem.costPerUnit || 0) * inputItem.quantity,
        grossProfit:
          itemSubtotal - (menuItem.costPerUnit || 0) * inputItem.quantity,
        profitMargin:
          itemSubtotal > 0
            ? ((itemSubtotal -
                (menuItem.costPerUnit || 0) * inputItem.quantity) /
                itemSubtotal) *
              100
            : 0,
        priceOverridden: false,
      };
    });

    // REQ-031: subtotal is the server-recomputed value
    const newSubtotal = reconciled.recomputedSubtotal;

    // Recalculate fees using SettingsService
    const totals = await SettingsService.calculateOrderTotals(
      newSubtotal,
      order.orderType
    );

    // Update order
    order.items = newItems;
    order.subtotal = newSubtotal;
    order.serviceFee = totals.serviceFee;
    order.deliveryFee = totals.deliveryFee;
    order.tax = totals.tax;
    order.total = totals.total;

    await order.save();

    // If order is part of a tab, recalculate tab totals
    if (order.tabId) {
      const { TabService } = await import('@/services/tab-service');
      await TabService.recalculateTabTotals(order.tabId.toString());
    }

    revalidatePath(`/dashboard/orders/${input.orderId}`);
    revalidatePath('/dashboard/orders');

    return {
      success: true,
      message: 'Order updated successfully',
      data: JSON.parse(JSON.stringify(order)),
    };
  } catch (error: any) {
    console.error('Update order items error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update order',
    };
  }
}

/**
 * Get available menu items for adding to order
 */
export async function getAvailableMenuItemsAction() {
  try {
    await connectDB();

    const menuItems = await MenuItemModel.find({
      isAvailable: true,
    })
      .select('name price category subcategory image customizationOptions')
      .sort({ category: 1, name: 1 })
      .lean();

    return {
      success: true,
      data: JSON.parse(JSON.stringify(menuItems)),
    };
  } catch (error: any) {
    console.error('Get menu items error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch menu items',
    };
  }
}
