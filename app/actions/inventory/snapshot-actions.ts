'use server';

import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { connectDB } from '@/lib/mongodb';
import { InventorySnapshotService } from '@/services/inventory-snapshot-service';
import type {
  IInventorySnapshot,
  IInventorySnapshotItem,
  ISubmitSnapshotData,
  ISnapshotFilters,
} from '@/interfaces/inventory-snapshot.interface';

interface ActionResult<T = void> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export async function generateSnapshotDataAction(
  date: string,
  mainCategory?: 'food' | 'drinks'
): Promise<ActionResult<IInventorySnapshotItem[]>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.userId || !session.role || !['admin', 'super-admin'].includes(session.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    await connectDB();

    const snapshotDate = new Date(date);
    const items = await InventorySnapshotService.generateSnapshotData(snapshotDate, mainCategory);

    return {
      success: true,
      data: items,
    };
  } catch (error) {
    console.error('Error generating snapshot data:', error);
    return {
      success: false,
      error: 'Failed to generate snapshot data',
    };
  }
}

export async function submitSnapshotAction(
  data: ISubmitSnapshotData,
  mainCategory: 'food' | 'drinks'
): Promise<ActionResult<IInventorySnapshot>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.userId || !session.role || !['admin', 'super-admin'].includes(session.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    await connectDB();

    const userName = session.name || session.email || 'Unknown User';
    const snapshot = await InventorySnapshotService.submitSnapshot(
      data,
      session.userId,
      userName,
      mainCategory
    );

    return {
      success: true,
      message: 'Inventory snapshot submitted successfully',
      data: snapshot,
    };
  } catch (error) {
    console.error('Error submitting snapshot:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit snapshot',
    };
  }
}

export async function getPendingSnapshotsAction(): Promise<
  ActionResult<IInventorySnapshot[]>
> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (session.role !== 'super-admin') {
      return { success: false, error: 'Unauthorized' };
    }

    await connectDB();

    const snapshots = await InventorySnapshotService.getPendingSnapshots();

    // Serialize MongoDB objects to plain objects
    const serializedSnapshots = JSON.parse(JSON.stringify(snapshots));

    return {
      success: true,
      data: serializedSnapshots,
    };
  } catch (error) {
    console.error('Error fetching pending snapshots:', error);
    return {
      success: false,
      error: 'Failed to fetch pending snapshots',
    };
  }
}

export async function getSnapshotDetailsAction(
  id: string
): Promise<ActionResult<IInventorySnapshot>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (session.role !== 'super-admin') {
      return { success: false, error: 'Unauthorized' };
    }

    await connectDB();

    const snapshot = await InventorySnapshotService.getSnapshotById(id);

    if (!snapshot) {
      return { success: false, error: 'Snapshot not found' };
    }

    // Serialize MongoDB objects to plain objects
    const serializedSnapshot = JSON.parse(JSON.stringify(snapshot));

    return {
      success: true,
      data: serializedSnapshot,
    };
  } catch (error) {
    console.error('Error fetching snapshot details:', error);
    return {
      success: false,
      error: 'Failed to fetch snapshot details',
    };
  }
}

export async function approveSnapshotAction(
  id: string,
  notes?: string
): Promise<ActionResult<IInventorySnapshot>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (session.role !== 'super-admin') {
      return { success: false, error: 'Unauthorized' };
    }

    await connectDB();

    const reviewerName = session.name || session.email || 'Unknown Admin';
    const snapshot = await InventorySnapshotService.approveSnapshot(
      id,
      session.userId!,
      reviewerName,
      notes
    );

    return {
      success: true,
      message: 'Snapshot approved and inventory updated',
      data: snapshot,
    };
  } catch (error) {
    console.error('Error approving snapshot:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve snapshot',
    };
  }
}

export async function rejectSnapshotAction(
  id: string,
  notes: string
): Promise<ActionResult<IInventorySnapshot>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (session.role !== 'super-admin') {
      return { success: false, error: 'Unauthorized' };
    }

    if (!notes || notes.trim().length === 0) {
      return { success: false, error: 'Rejection notes are required' };
    }

    await connectDB();

    const reviewerName = session.name || session.email || 'Unknown Admin';
    const snapshot = await InventorySnapshotService.rejectSnapshot(
      id,
      session.userId!,
      reviewerName,
      notes
    );

    return {
      success: true,
      message: 'Snapshot rejected',
      data: snapshot,
    };
  } catch (error) {
    console.error('Error rejecting snapshot:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject snapshot',
    };
  }
}

export async function getSnapshotHistoryAction(
  filters: ISnapshotFilters
): Promise<
  ActionResult<{
    snapshots: IInventorySnapshot[];
    total: number;
    page: number;
    limit: number;
  }>
> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (session.role !== 'super-admin') {
      return { success: false, error: 'Unauthorized' };
    }

    await connectDB();

    const result = await InventorySnapshotService.getSnapshotHistory(filters);

    // Serialize MongoDB objects to plain objects
    const serializedResult = JSON.parse(JSON.stringify(result));

    return {
      success: true,
      data: serializedResult,
    };
  } catch (error) {
    console.error('Error fetching snapshot history:', error);
    return {
      success: false,
      error: 'Failed to fetch snapshot history',
    };
  }
}

export async function checkExistingSnapshotAction(
  date: string,
  mainCategory: 'food' | 'drinks'
): Promise<ActionResult<IInventorySnapshot | null>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.userId || !session.role || !['admin', 'super-admin'].includes(session.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    await connectDB();

    const snapshotDate = new Date(date);
    const snapshot = await InventorySnapshotService.checkExistingSnapshot(
      snapshotDate,
      session.userId,
      mainCategory
    );

    // Serialize MongoDB objects to plain objects
    const serializedSnapshot = snapshot ? JSON.parse(JSON.stringify(snapshot)) : null;

    return {
      success: true,
      data: serializedSnapshot,
    };
  } catch (error) {
    console.error('Error checking existing snapshot:', error);
    return {
      success: false,
      error: 'Failed to check existing snapshot',
    };
  }
}

export async function updateSnapshotItemsAction(
  snapshotId: string,
  items: IInventorySnapshotItem[]
): Promise<ActionResult<IInventorySnapshot>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (session.role !== 'super-admin') {
      return { success: false, error: 'Unauthorized. Only super admins can edit snapshots.' };
    }

    await connectDB();

    const snapshot = await InventorySnapshotService.updateSnapshotItems(
      snapshotId,
      items,
      session.userId || '',
      session.name || session.email || 'Unknown User'
    );

    // Serialize MongoDB objects to plain objects
    const serializedSnapshot = JSON.parse(JSON.stringify(snapshot));

    return {
      success: true,
      message: 'Snapshot items updated successfully',
      data: serializedSnapshot,
    };
  } catch (error) {
    console.error('Error updating snapshot items:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update snapshot items',
    };
  }
}

export async function resubmitSnapshotAction(
  snapshotId: string,
  data: ISubmitSnapshotData
): Promise<ActionResult<IInventorySnapshot>> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.userId || !session.role || !['admin', 'super-admin'].includes(session.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    await connectDB();

    const userName = session.name || session.email || 'Unknown User';
    const snapshot = await InventorySnapshotService.resubmitSnapshot(
      snapshotId,
      data,
      session.userId,
      userName
    );

    // Serialize MongoDB objects to plain objects
    const serializedSnapshot = JSON.parse(JSON.stringify(snapshot));

    return {
      success: true,
      message: 'Inventory snapshot resubmitted successfully',
      data: serializedSnapshot,
    };
  } catch (error) {
    console.error('Error resubmitting snapshot:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resubmit snapshot',
    };
  }
}
