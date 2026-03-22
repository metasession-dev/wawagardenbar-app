'use server';

/**
 * @requirement REQ-009 - Express Actions: accelerated admin tab, order, and close flows
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
import { ITab, IMenuItem } from '@/interfaces';

interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

async function requireAdminSession(): Promise<SessionData> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!session.userId || !['admin', 'super-admin'].includes(session.role as string)) {
    throw new Error('Unauthorized');
  }

  return session;
}

/**
 * List all open tabs for the express create-tab flow
 */
export async function expressListOpenTabsAction(): Promise<ActionResult<{ tabs: ITab[] }>> {
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
 * Search menu items for the express order flow
 */
export async function expressSearchMenuAction(params: {
  query?: string;
  category?: string;
}): Promise<ActionResult<{ items: IMenuItem[] }>> {
  try {
    await requireAdminSession();
    await connectDB();

    const filter: Record<string, unknown> = { isAvailable: true };

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

    const items = await MenuItemModel.find(filter)
      .sort({ mainCategory: 1, category: 1, name: 1 })
      .lean();

    return {
      success: true,
      data: { items: JSON.parse(JSON.stringify(items)) },
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
export async function expressGetCategoriesAction(): Promise<ActionResult<{ categories: string[] }>> {
  try {
    await requireAdminSession();
    await connectDB();

    const categories = await MenuItemModel.distinct('category', { isAvailable: true });

    return {
      success: true,
      data: { categories: categories.sort() },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get categories',
    };
  }
}

/**
 * Create an order and optionally attach to a tab (express flow)
 */
export async function expressCreateOrderAction(params: {
  items: Array<{
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    portionSize?: 'full' | 'half' | 'quarter';
    specialInstructions?: string;
  }>;
  tabId?: string;
  tableNumber?: string;
  paymentMethod?: 'cash' | 'transfer' | 'card';
  paymentReference?: string;
  customerName?: string;
}): Promise<ActionResult<{ order: any; tab?: ITab }>> {
  try {
    const session = await requireAdminSession();
    await connectDB();

    if (!params.items || params.items.length === 0) {
      return { success: false, error: 'At least one item is required' };
    }

    const subtotal = params.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const orderType = params.tabId ? ('dine-in' as const) : ('pay-now' as const);
    const items = params.items.map((item) => ({
      menuItemId: item.menuItemId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      portionSize: item.portionSize || 'full',
      portionMultiplier: 1,
      customizations: [],
      specialInstructions: item.specialInstructions,
      subtotal: item.price * item.quantity,
      costPerUnit: 0,
      totalCost: 0,
      grossProfit: 0,
      profitMargin: 0,
    }));

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
      dineInDetails: params.tableNumber ? { tableNumber: params.tableNumber } as any : undefined,
    });

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
      error: error instanceof Error ? error.message : 'Failed to get tab details',
    };
  }
}

/**
 * Close a tab with payment (express flow)
 */
export async function expressCloseTabAction(params: {
  tabId: string;
  paymentType: 'cash' | 'transfer' | 'card';
  paymentReference?: string;
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
    });

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
