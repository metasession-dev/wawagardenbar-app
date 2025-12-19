'use server';

import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { sessionOptions, SessionData } from '@/lib/session';
import { PriceHistoryService } from '@/services/price-history-service';
import { PriceChangeReason } from '@/interfaces';

interface UpdatePriceParams {
  menuItemId: string;
  price: number;
  costPerUnit: number;
  reason: PriceChangeReason;
  effectiveFrom?: Date;
}

interface PriceUpdateResult {
  success: boolean;
  error?: string;
  data?: {
    menuItemId: string;
    price: number;
    costPerUnit: number;
  };
}

/**
 * Update menu item price and create price history record
 */
export async function updateMenuItemPriceAction(
  params: UpdatePriceParams
): Promise<PriceUpdateResult> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    // Check authentication
    if (!session.userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Only super-admin can update prices
    if (session.role !== 'super-admin') {
      return { success: false, error: 'Only super-admin can update prices' };
    }

    // Validate input
    if (params.price < 0) {
      return { success: false, error: 'Price must be a positive number' };
    }

    if (params.costPerUnit < 0) {
      return { success: false, error: 'Cost per unit must be a positive number' };
    }

    // Update price and create history
    await PriceHistoryService.updatePrice(
      params.menuItemId,
      params.price,
      params.costPerUnit,
      params.reason,
      session.userId
    );

    // Revalidate relevant paths
    revalidatePath('/dashboard/menu');
    revalidatePath(`/dashboard/menu/${params.menuItemId}/edit`);
    revalidatePath('/menu');

    return {
      success: true,
      data: {
        menuItemId: params.menuItemId,
        price: params.price,
        costPerUnit: params.costPerUnit,
      },
    };
  } catch (error) {
    console.error('Error updating menu item price:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update price',
    };
  }
}

/**
 * Get price history for a menu item
 */
export async function getPriceHistoryAction(menuItemId: string, limit?: number) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    // Check authentication
    if (!session.userId) {
      return { success: false, error: 'Unauthorized', data: null };
    }

    // Check admin/super-admin role
    if (session.role !== 'admin' && session.role !== 'super-admin') {
      return { success: false, error: 'Forbidden', data: null };
    }

    const history = await PriceHistoryService.getPriceHistory(menuItemId, limit);

    return {
      success: true,
      data: history,
    };
  } catch (error) {
    console.error('Error fetching price history:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch price history',
      data: null,
    };
  }
}
