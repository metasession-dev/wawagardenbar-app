'use server';

import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { connectDB } from '@/lib/mongodb';
import InventoryModel from '@/models/inventory-model';

export interface InventoryListItem {
  _id: string;
  name: string;
  unit: string;
}

export interface ListInventoryItemsResult {
  success: boolean;
  data?: InventoryListItem[];
  error?: string;
}

/**
 * Return a compact list of inventory records for use in admin selects
 * (e.g. customization option → inventory link for REQ-030).
 */
export async function listInventoryItemsAction(): Promise<ListInventoryItemsResult> {
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

    const inventories = await InventoryModel.find()
      .populate('menuItemId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const data: InventoryListItem[] = inventories.map((inv) => {
      const menuItem = inv.menuItemId as unknown as { name?: string } | null;
      return {
        _id: String(inv._id),
        name: menuItem?.name ?? `Inventory ${String(inv._id).slice(-6)}`,
        unit: inv.unit || 'units',
      };
    });

    return { success: true, data };
  } catch (error) {
    console.error('Error listing inventory items:', error);
    return { success: false, error: 'Failed to list inventory items' };
  }
}
