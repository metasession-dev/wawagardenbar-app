'use server';

import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { revalidatePath } from 'next/cache';
import { TabService } from '@/services';
import { ITab, IOrder } from '@/interfaces';
import { sessionOptions, SessionData } from '@/lib/session';

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

/**
 * Create a new tab
 */
export async function createTabAction(params: {
  tableNumber: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}): Promise<ActionResult<{ tab: ITab }>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    const userId = session.userId;
    const guestId = session.isGuest ? session.guestId : undefined;

    if (!params.tableNumber) {
      return {
        success: false,
        error: 'Table number is required',
      };
    }

    // Check if there's already an open tab for this table
    const existingTab = await TabService.getOpenTabForTable(params.tableNumber);
    if (existingTab) {
      return {
        success: false,
        error: 'There is already an open tab for this table',
      };
    }

    const tab = await TabService.createTab({
      tableNumber: params.tableNumber,
      userId,
      createdBy: userId,
      createdByRole: session.role || 'customer',
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone,
      guestId,
    });

    revalidatePath('/orders');
    revalidatePath('/dashboard/orders');

    return {
      success: true,
      message: 'Tab created successfully',
      data: { tab },
    };
  } catch (error) {
    console.error('Error creating tab:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create tab',
    };
  }
}

/**
 * Get open tab for current user
 */
export async function getOpenTabForUserAction(): Promise<
  ActionResult<{ tab: ITab | null }>
> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    const userId = session.userId;

    if (userId) {
      const tab = await TabService.getOpenTabForUser(userId);
      return {
        success: true,
        data: { tab },
      };
    }

    if (session.isGuest && session.guestId) {
      const tab = await TabService.getOpenTabForGuest(session.guestId);
      return {
        success: true,
        data: { tab },
      };
    }
    
    // Legacy guest support (email only)
    if (session.isGuest && session.email) {
      const tabs = await TabService.listOpenTabs({ customerEmail: session.email });
      const tab = tabs.length > 0 ? tabs[0] : null;
      return {
        success: true,
        data: { tab },
      };
    }

    return {
      success: false,
      error: 'User must be logged in',
    };
  } catch (error) {
    console.error('Error getting open tab:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get open tab',
    };
  }
}

/**
 * Get open tab for a table
 */
export async function getOpenTabForTableAction(
  tableNumber: string
): Promise<ActionResult<{ tab: ITab | null }>> {
  try {
    if (!tableNumber) {
      return {
        success: false,
        error: 'Table number is required',
      };
    }

    const tab = await TabService.getOpenTabForTable(tableNumber);

    return {
      success: true,
      data: { tab },
    };
  } catch (error) {
    console.error('Error getting open tab for table:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to get open tab for table',
    };
  }
}

/**
 * Get tab details
 */
export async function getTabDetailsAction(
  tabId: string
): Promise<ActionResult<{ tab: ITab; orders: IOrder[] }>> {
  try {
    if (!tabId) {
      return {
        success: false,
        error: 'Tab ID is required',
      };
    }

    const details = await TabService.getTabDetails(tabId);

    return {
      success: true,
      data: details,
    };
  } catch (error) {
    console.error('Error getting tab details:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get tab details',
    };
  }
}

/**
 * List all open tabs (dashboard)
 */
export async function listOpenTabsAction(filters?: {
  tableNumber?: string;
}): Promise<ActionResult<{ tabs: ITab[] }>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    // Check if user is staff/admin
    if (!session.userId || (session.role !== 'admin' && session.role !== 'super-admin')) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const tabs = await TabService.listOpenTabs(filters);

    return {
      success: true,
      data: { tabs },
    };
  } catch (error) {
    console.error('Error listing open tabs:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list open tabs',
    };
  }
}

/**
 * Prepare tab for checkout
 */
export async function prepareTabForCheckoutAction(params: {
  tabId: string;
  tipAmount?: number;
}): Promise<ActionResult<{ tab: ITab; eligibleRewards: any[] }>> {
  try {
    if (!params.tabId) {
      return {
        success: false,
        error: 'Tab ID is required',
      };
    }

    const result = await TabService.prepareTabForCheckout(
      params.tabId,
      params.tipAmount || 0
    );

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error preparing tab for checkout:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to prepare tab for checkout',
    };
  }
}

/**
 * Get filtered tabs for user (customer)
 */
export async function getFilteredTabsAction(filters: {
  statuses?: string[];
  startDate?: string;
  endDate?: string;
}): Promise<ActionResult<{ tabs: ITab[] }>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    const userId = session.userId;

    if (!userId) {
      return {
        success: false,
        error: 'User must be logged in',
      };
    }

    const tabs = await TabService.listTabsWithFilters(userId, {
      statuses: filters.statuses,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    });

    return {
      success: true,
      data: { tabs },
    };
  } catch (error) {
    console.error('Error getting filtered tabs:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get tabs',
    };
  }
}

/**
 * Get filtered tabs for dashboard (admin/staff)
 */
export async function getDashboardFilteredTabsAction(filters: {
  statuses?: string[];
  startDate?: string;
  endDate?: string;
}): Promise<ActionResult<{ tabs: ITab[] }>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.userId || (session.role !== 'admin' && session.role !== 'super-admin')) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const tabs = await TabService.listAllTabsWithFilters({
      statuses: filters.statuses,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    });

    return {
      success: true,
      data: { tabs },
    };
  } catch (error) {
    console.error('Error getting filtered tabs:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get tabs',
    };
  }
}

/**
 * Complete tab payment manually (admin)
 * For cash, transfer, or POS payments
 */
export async function completeTabPaymentManuallyAction(params: {
  tabId: string;
  paymentType: 'cash' | 'transfer' | 'card';
  paymentReference: string;
  comments?: string;
}): Promise<ActionResult<{ tab: ITab }>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    // Check if user is staff/admin
    if (!session.userId || (session.role !== 'admin' && session.role !== 'super-admin')) {
      return {
        success: false,
        error: 'Unauthorized. Only admins can process manual payments.',
      };
    }

    if (!params.tabId) {
      return {
        success: false,
        error: 'Tab ID is required',
      };
    }

    if (!params.paymentReference) {
      return {
        success: false,
        error: 'Payment reference is required',
      };
    }

    const tab = await TabService.completeTabPaymentManually({
      tabId: params.tabId,
      paymentType: params.paymentType,
      paymentReference: params.paymentReference,
      comments: params.comments,
      processedBy: session.userId,
    });

    revalidatePath('/dashboard/orders/tabs');
    revalidatePath(`/dashboard/orders/tabs/${params.tabId}`);

    return {
      success: true,
      message: 'Tab payment completed successfully',
      data: { tab },
    };
  } catch (error) {
    console.error('Error completing tab payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete payment',
    };
  }
}

/**
 * Close tab without payment (cancel)
 */
export async function closeTabAction(
  tabId: string
): Promise<ActionResult<{ tab: ITab }>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    // Check if user is staff/admin
    if (!session.userId || (session.role !== 'admin' && session.role !== 'super-admin')) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    if (!tabId) {
      return {
        success: false,
        error: 'Tab ID is required',
      };
    }

    const tab = await TabService.closeTab(tabId);

    revalidatePath('/dashboard/orders');

    return {
      success: true,
      message: 'Tab closed successfully',
      data: { tab },
    };
  } catch (error) {
    console.error('Error closing tab:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to close tab',
    };
  }
}

/**
 * Create a new tab (Admin/Staff)
 * Allows creating a tab without customer details, only table number
 */
export async function createAdminTabAction(params: {
  tableNumber: string;
}): Promise<ActionResult<{ tab: ITab }>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    // Check if user is staff/admin
    if (!session.userId || (session.role !== 'admin' && session.role !== 'super-admin')) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    if (!params.tableNumber) {
      return {
        success: false,
        error: 'Table number is required',
      };
    }

    // Check if there's already an open tab for this table
    const existingTab = await TabService.getOpenTabForTable(params.tableNumber);
    if (existingTab) {
      return {
        success: false,
        error: 'There is already an open tab for this table',
      };
    }

    const tab = await TabService.createTab({
      tableNumber: params.tableNumber,
      openedByStaffId: session.userId,
      customerName: 'Walk-in Customer', // Default name
    });

    revalidatePath('/orders');
    revalidatePath('/dashboard/orders');
    revalidatePath('/dashboard/orders/tabs');

    return {
      success: true,
      message: 'Tab created successfully',
      data: { tab },
    };
  } catch (error) {
    console.error('Error creating admin tab:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create tab',
    };
  }
}
