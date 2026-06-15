'use server';

/**
 * @requirement REQ-009 - Express Actions: accelerated admin tab, order, and close flows
 * @requirement REQ-081 - Main-category to sub-category cascade for express item selection
 */

import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { revalidatePath } from 'next/cache';
import { connectDB } from '@/lib/mongodb';
import { sessionOptions, SessionData } from '@/lib/session';
import { TabService } from '@/services';
import { OrderService } from '@/services/order-service';
import TabModel from '@/models/tab-model';
import MenuItemModel from '@/models/menu-item-model';
import InventoryModel from '@/models/inventory-model';
import { ITab, IMenuItem } from '@/interfaces';
import { computeInventoryStatus } from '@/lib/expense-inventory-link';
import { CategoryService } from '@/services/category-service';
import {
  reconcileAndValidateOrderLines,
  type MenuItemForReconcile,
} from '@/lib/order-line-totals';
import type { SelectedCustomization } from '@/lib/customization-validation';

interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

async function requireAdminSession(): Promise<SessionData> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    sessionOptions
  );

  if (
    !session.userId ||
    !['admin', 'super-admin'].includes(session.role as string)
  ) {
    throw new Error('Unauthorized');
  }

  return session;
}

/**
 * List all open tabs for the express create-tab flow
 */
export async function expressListOpenTabsAction(): Promise<
  ActionResult<{ tabs: ITab[] }>
> {
  try {
    await requireAdminSession();
    await connectDB();

    const tabs = await TabModel.find({ status: 'open' })
      .sort({ openedAt: -1 })
      .lean();

    return {
      success: true,
      data: { tabs: JSON.parse(JSON.stringify(tabs)) },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list tabs',
    };
  }
}

/**
 * Create a tab with minimal info (express flow)
 */
export async function expressCreateTabAction(params: {
  tableNumber: string;
  customerName?: string;
}): Promise<ActionResult<{ tab: ITab }>> {
  try {
    const session = await requireAdminSession();
    await connectDB();

    if (!params.tableNumber) {
      return { success: false, error: 'Table number is required' };
    }

    const existingTab = await TabService.getOpenTabForTable(params.tableNumber);
    if (existingTab) {
      return {
        success: false,
        error: `Table ${params.tableNumber} already has an open tab (${existingTab.tabNumber})`,
      };
    }

    const tab = await TabService.createTab({
      tableNumber: params.tableNumber,
      customerName: params.customerName || 'Walk-in Customer',
      openedByStaffId: session.userId,
      createdBy: session.userId,
      createdByRole: session.role as 'admin' | 'super-admin',
    });

    revalidatePath('/dashboard/orders');
    revalidatePath('/dashboard/orders/tabs');

    return {
      success: true,
      message: 'Tab created successfully',
      data: { tab: JSON.parse(JSON.stringify(tab)) },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create tab',
    };
  }
}

/**
 * Search menu items for the express order flow.
 *
 * Each returned item is enriched with live stock info (computed from
 * Inventory.currentStock + Inventory.minimumStock, NOT the cached
 * Inventory.status field — see #98) so the order-creation UI can
 * surface "Out of Stock" / "Low Stock (N left)" to staff. Items
 * without a paired Inventory record default to `'in-stock'`.
 */
export type ExpressMenuItem = IMenuItem & {
  stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock';
  currentStock?: number;
};

export interface ExpressMainCategory {
  slug: string;
  label: string;
  subCategories: string[];
}

export async function expressSearchMenuAction(params: {
  query?: string;
  mainCategory?: string;
  category?: string;
}): Promise<ActionResult<{ items: ExpressMenuItem[] }>> {
  try {
    await requireAdminSession();
    await connectDB();

    // REQ-034 AC2: never surface kitchen-ingredient MenuItems on admin
    // search either — admins place orders here, and a sellable item by
    // definition has kind:'menu-item'.
    const filter: Record<string, unknown> = {
      isAvailable: true,
      kind: 'menu-item',
    };

    if (params.query) {
      filter.$or = [
        { name: { $regex: params.query, $options: 'i' } },
        { description: { $regex: params.query, $options: 'i' } },
        { tags: { $regex: params.query, $options: 'i' } },
      ];
    }

    if (params.category) {
      filter.category = params.category;
    }

    if (params.mainCategory) {
      filter.mainCategory = params.mainCategory;
    }

    const items = await MenuItemModel.find(filter)
      .sort({ mainCategory: 1, category: 1, name: 1 })
      .lean();

    // One batched fetch of paired Inventory rows; avoids N+1 lookups.
    const itemIds = items.map((i) => i._id);
    const inventories = await InventoryModel.find(
      { menuItemId: { $in: itemIds } },
      'menuItemId currentStock minimumStock'
    ).lean();
    const invByMenuItem = new Map(
      inventories.map((inv) => [
        String((inv as { menuItemId: unknown }).menuItemId),
        inv,
      ])
    );

    const enriched = items.map((item) => {
      const inv = invByMenuItem.get(String(item._id)) as
        | { currentStock?: number; minimumStock?: number }
        | undefined;
      const stockStatus = inv
        ? computeInventoryStatus(inv.currentStock ?? 0, inv.minimumStock ?? 0)
        : 'in-stock';
      return {
        ...item,
        stockStatus,
        currentStock: inv?.currentStock,
      };
    });

    return {
      success: true,
      data: { items: JSON.parse(JSON.stringify(enriched)) },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search menu',
    };
  }
}

/**
 * Get menu categories for filtering
 */
export async function expressGetCategoriesAction(): Promise<
  ActionResult<{ mainCategories: ExpressMainCategory[] }>
> {
  try {
    await requireAdminSession();

    const categories = await CategoryService.getCategories();

    return {
      success: true,
      data: { mainCategories: categories.mainCategories },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to get categories',
    };
  }
}

/**
 * Create an order and optionally attach to a tab (express flow).
 *
 * @requirement REQ-035 — accepts optional `tipAmount` + `tipPaymentMethod`
 * for the immediate-pay branch. The tip's payment method is independent
 * of the bill's `paymentMethod` (default = paymentMethod, override-able).
 */
export async function expressCreateOrderAction(params: {
  items: Array<{
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    portionSize?: 'full' | 'half' | 'quarter';
    specialInstructions?: string;
    customizations?: SelectedCustomization[];
  }>;
  tabId?: string;
  tableNumber?: string;
  paymentMethod?: 'cash' | 'transfer' | 'card';
  paymentReference?: string;
  customerName?: string;
  tipAmount?: number;
  tipPaymentMethod?: 'cash' | 'transfer' | 'card';
}): Promise<ActionResult<{ order: any; tab?: ITab }>> {
  try {
    const session = await requireAdminSession();
    await connectDB();

    if (!params.items || params.items.length === 0) {
      return { success: false, error: 'At least one item is required' };
    }

    // REQ-031: validate (group, option) pairs against the menu and recompute
    // subtotal server-side. The menu is the source of truth for prices, not
    // the client. AC7 (validation) and AC15 (server total) covered here.
    const menuItemIds = Array.from(
      new Set(params.items.map((i) => i.menuItemId))
    );
    // REQ-034 AC2: validate that every submitted id resolves to a
    // sellable menu-item (kitchen-ingredient ids are rejected — the
    // existing length-mismatch guard below turns missing rows into a
    // user-facing error).
    const menuItemDocs = await MenuItemModel.find({
      _id: { $in: menuItemIds },
      kind: 'menu-item',
    }).lean();
    const menuMap = new Map<string, MenuItemForReconcile>(
      menuItemDocs.map((m: any) => [
        m._id.toString(),
        {
          _id: m._id.toString(),
          name: m.name,
          price: m.price,
          customizations: m.customizations,
        },
      ])
    );

    const portionMultiplierFor = (size?: string) =>
      size === 'half' ? 0.5 : size === 'quarter' ? 0.25 : 1.0;

    const reconciled = reconcileAndValidateOrderLines({
      menuItems: menuMap,
      lines: params.items.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        portionMultiplier: portionMultiplierFor(item.portionSize),
        customizations: item.customizations,
      })),
    });
    if (!reconciled.valid) {
      return { success: false, error: reconciled.error };
    }
    const subtotal = reconciled.recomputedSubtotal;

    const orderType = params.tabId
      ? ('dine-in' as const)
      : ('pay-now' as const);
    const items = params.items.map((item) => {
      const menuItem = menuMap.get(item.menuItemId);
      const basePrice = menuItem?.price ?? item.price;
      const multiplier = portionMultiplierFor(item.portionSize);
      const surcharge = (item.customizations ?? []).reduce(
        (s, c) => s + (typeof c.price === 'number' ? c.price : 0),
        0
      );
      // Persist the portion-adjusted base on the line (matches existing
      // payment-actions semantics) and the surcharge-aware subtotal.
      const adjustedBase = Math.round(basePrice * multiplier);
      const itemSubtotal = Math.round(
        (adjustedBase + surcharge * multiplier) * item.quantity
      );
      return {
        menuItemId: item.menuItemId,
        name: item.name,
        price: adjustedBase,
        quantity: item.quantity,
        portionSize: item.portionSize || 'full',
        portionMultiplier: multiplier,
        customizations: item.customizations ?? [],
        specialInstructions: item.specialInstructions,
        subtotal: itemSubtotal,
        costPerUnit: 0,
        totalCost: 0,
        grossProfit: 0,
        profitMargin: 0,
      };
    });

    const order = await OrderService.createOrder({
      orderType,
      items: items as any,
      subtotal,
      tax: 0,
      deliveryFee: 0,
      discount: 0,
      total: subtotal,
      createdBy: session.userId,
      createdByRole: session.role as 'admin' | 'super-admin',
      guestName: params.customerName || 'Walk-in Customer',
      dineInDetails: params.tableNumber
        ? ({ tableNumber: params.tableNumber } as any)
        : undefined,
    });

    // For pay-now orders, mark as paid immediately with the chosen payment method.
    // REQ-035 — forward tip fields when supplied. completeOrderPaymentManually
    // validates non-zero tipAmount requires a tipPaymentMethod.
    if (!params.tabId && params.paymentMethod) {
      await OrderService.completeOrderPaymentManually({
        orderId: order._id.toString(),
        paymentType: params.paymentMethod,
        paymentReference: params.paymentReference || `EXPRESS-${Date.now()}`,
        processedByAdminId: session.userId!,
        tipAmount: params.tipAmount,
        tipPaymentMethod: params.tipPaymentMethod,
      });
    }

    let tab: ITab | undefined;
    if (params.tabId) {
      tab = await TabService.addOrderToTab(params.tabId, order._id.toString());
      tab = JSON.parse(JSON.stringify(tab));
    }

    revalidatePath('/dashboard/orders');
    revalidatePath('/dashboard/orders/tabs');
    if (params.tabId) {
      revalidatePath(`/dashboard/orders/tabs/${params.tabId}`);
    }

    return {
      success: true,
      message: params.tabId ? 'Order added to tab' : 'Order created',
      data: { order: JSON.parse(JSON.stringify(order)), tab },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create order',
    };
  }
}

/**
 * Get tab details for closing (express flow)
 */
export async function expressGetTabForCloseAction(
  tabId: string
): Promise<ActionResult<{ tab: ITab; orders: any[] }>> {
  try {
    await requireAdminSession();
    await connectDB();

    const details = await TabService.getTabDetails(tabId);

    return {
      success: true,
      data: JSON.parse(JSON.stringify(details)),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to get tab details',
    };
  }
}

/**
 * Close a tab with payment (express flow).
 *
 * @requirement REQ-035 — accepts optional `tipAmount` for the closing
 * payment.
 * @requirement REQ-036 — accepts optional `tipPaymentMethod`,
 * independent of `paymentType`. Lets staff record a card-paid bill +
 * cash-paid tip on the same closing payment row.
 */
export async function expressCloseTabAction(params: {
  tabId: string;
  paymentType: 'cash' | 'transfer' | 'card';
  paymentReference?: string;
  businessDate?: Date;
  tipAmount?: number;
  tipPaymentMethod?: 'cash' | 'transfer' | 'card';
}): Promise<ActionResult<{ tab: ITab }>> {
  try {
    const session = await requireAdminSession();
    await connectDB();

    if (!params.tabId) {
      return { success: false, error: 'Tab ID is required' };
    }

    const tab = await TabService.completeTabPaymentManually({
      tabId: params.tabId,
      paymentType: params.paymentType,
      paymentReference: params.paymentReference || `EXPRESS-${Date.now()}`,
      processedBy: session.userId!,
      businessDate: params.businessDate,
      tipAmount: params.tipAmount,
      tipPaymentMethod: params.tipPaymentMethod,
    } as any);

    revalidatePath('/dashboard/orders');
    revalidatePath('/dashboard/orders/tabs');
    revalidatePath(`/dashboard/orders/tabs/${params.tabId}`);

    return {
      success: true,
      message: 'Tab closed and payment recorded',
      data: { tab: JSON.parse(JSON.stringify(tab)) },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to close tab',
    };
  }
}
