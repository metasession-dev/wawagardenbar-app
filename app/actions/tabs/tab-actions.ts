'use server';

import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { revalidatePath } from 'next/cache';
import { TabService } from '@/services';
import TabModel from '@/models/tab-model';
import { connectDB } from '@/lib/mongodb';
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
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );
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
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );
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
      const tabs = await TabService.listOpenTabs({
        customerEmail: session.email,
      });
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
        error instanceof Error
          ? error.message
          : 'Failed to get open tab for table',
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
      error:
        error instanceof Error ? error.message : 'Failed to get tab details',
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
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    // Check if user is staff/admin
    if (
      !session.userId ||
      (session.role !== 'admin' && session.role !== 'super-admin')
    ) {
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
      error:
        error instanceof Error ? error.message : 'Failed to list open tabs',
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
        error instanceof Error
          ? error.message
          : 'Failed to prepare tab for checkout',
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
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );
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
  reconciled?: 'all' | 'reconciled' | 'not-reconciled';
}): Promise<ActionResult<{ tabs: ITab[] }>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (
      !session.userId ||
      (session.role !== 'admin' && session.role !== 'super-admin')
    ) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const tabs = await TabService.listAllTabsWithFilters({
      statuses: filters.statuses,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      reconciled: filters.reconciled,
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
 * @requirement REQ-012 - Record a partial payment on an open tab
 */
export async function recordPartialPaymentAction(params: {
  tabId: string;
  amount: number;
  note: string;
  paymentType: 'cash' | 'transfer' | 'card';
  paymentReference?: string;
}): Promise<ActionResult<{ tab: ITab }>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (
      !session.userId ||
      (session.role !== 'admin' && session.role !== 'super-admin')
    ) {
      return {
        success: false,
        error: 'Unauthorized. Only admins can process partial payments.',
      };
    }

    if (!params.tabId) {
      return { success: false, error: 'Tab ID is required' };
    }

    if (!params.amount || params.amount <= 0) {
      return { success: false, error: 'A valid payment amount is required' };
    }

    if (!params.note || !params.note.trim()) {
      return {
        success: false,
        error: 'A note is required for partial payments',
      };
    }

    const tab = await TabService.recordPartialPayment({
      tabId: params.tabId,
      amount: params.amount,
      note: params.note,
      paymentType: params.paymentType,
      paymentReference: params.paymentReference,
      processedBy: session.userId,
    });

    revalidatePath('/dashboard/orders/tabs');
    revalidatePath(`/dashboard/orders/tabs/${params.tabId}`);

    return {
      success: true,
      message: 'Partial payment recorded successfully',
      data: { tab },
    };
  } catch (error) {
    console.error('Error recording partial payment:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to record partial payment',
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
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    // Check if user is staff/admin
    if (
      !session.userId ||
      (session.role !== 'admin' && session.role !== 'super-admin')
    ) {
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
      error:
        error instanceof Error ? error.message : 'Failed to complete payment',
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
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    // Check if user is staff/admin
    if (
      !session.userId ||
      (session.role !== 'admin' && session.role !== 'super-admin')
    ) {
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
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    // Check if user is staff/admin
    if (
      !session.userId ||
      (session.role !== 'admin' && session.role !== 'super-admin')
    ) {
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

/**
 * Delete a tab
 * Requirements:
 * - Tab must not be closed/paid
 * - All orders on the tab must be cancelled first
 */
export async function deleteTabAction(tabId: string): Promise<ActionResult> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.isLoggedIn || !session.userId) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    // Only admin and super-admin can delete tabs
    if (session.role !== 'admin' && session.role !== 'super-admin') {
      return {
        success: false,
        error: 'Insufficient permissions',
      };
    }

    console.log('Attempting to delete tab:', tabId, 'by user:', session.userId);
    await TabService.deleteTab(tabId, session.userId);
    console.log('Tab deleted successfully:', tabId);

    revalidatePath('/dashboard/orders/tabs');
    revalidatePath(`/dashboard/orders/tabs/${tabId}`);

    return {
      success: true,
      message: 'Tab deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting tab:', error);
    console.error(
      'Error stack:',
      error instanceof Error ? error.stack : 'No stack trace'
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete tab',
    };
  }
}

/**
 * Update tab custom name
 */
export async function updateTabNameAction(
  tabId: string,
  customName: string
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.isLoggedIn || !session.userId) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    // Only admin and super-admin can update tab names
    if (session.role !== 'admin' && session.role !== 'super-admin') {
      return {
        success: false,
        error: 'Insufficient permissions',
      };
    }

    await TabService.updateTabName(tabId, customName);

    revalidatePath('/dashboard/orders/tabs');
    revalidatePath(`/dashboard/orders/tabs/${tabId}`);

    return {
      success: true,
      message: 'Tab name updated successfully',
    };
  } catch (error) {
    console.error('Error updating tab name:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update tab name',
    };
  }
}

/**
 * @requirement REQ-014 - Toggle reconciliation status on a tab
 */
export async function toggleTabReconciliationAction(
  tabId: string
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (
      !session.isLoggedIn ||
      !session.userId ||
      (session.role !== 'admin' && session.role !== 'super-admin')
    ) {
      return { success: false, error: 'Unauthorized' };
    }

    await connectDB();
    const tab = await TabModel.findById(tabId);
    if (!tab) {
      return { success: false, error: 'Tab not found' };
    }

    const newState = !tab.reconciled;
    tab.reconciled = newState;
    tab.reconciledAt = newState ? new Date() : (undefined as any);
    tab.reconciledBy = newState ? (session.userId as any) : (undefined as any);
    await tab.save();

    revalidatePath('/dashboard/orders/tabs');

    return {
      success: true,
      message: newState
        ? 'Tab marked as reconciled'
        : 'Tab marked as not reconciled',
    };
  } catch (error) {
    console.error('Error toggling tab reconciliation:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to toggle reconciliation',
    };
  }
}
