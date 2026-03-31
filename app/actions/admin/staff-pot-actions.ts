/**
 * @requirement REQ-015 - Staff Pot server actions
 */
'use server';

import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { revalidatePath } from 'next/cache';
import { sessionOptions, SessionData } from '@/lib/session';
import { SystemSettingsService } from '@/services/system-settings-service';
import { StaffPotService, StaffPotConfig } from '@/services/staff-pot-service';
import { InventorySnapshotModel } from '@/models/inventory-snapshot-model';
import StaffPotSnapshotModel from '@/models/staff-pot-snapshot-model';
import { connectDB } from '@/lib/mongodb';
import { startOfMonth, endOfMonth } from 'date-fns';

interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export async function getStaffPotConfigAction(): Promise<
  ActionResult<StaffPotConfig>
> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.userId || session.role !== 'super-admin') {
      return { success: false, error: 'Unauthorized — super-admin only' };
    }

    const config = await SystemSettingsService.getStaffPotConfig();
    return { success: true, data: config };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get config',
    };
  }
}

export async function updateStaffPotConfigAction(
  config: StaffPotConfig
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.userId || session.role !== 'super-admin') {
      return { success: false, error: 'Unauthorized — super-admin only' };
    }

    await SystemSettingsService.updateStaffPotConfig(config, session.userId);

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard/staff-pot');

    return { success: true, message: 'Staff Pot configuration updated' };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update config',
    };
  }
}

export async function getStaffPotDataAction(
  month?: number,
  year?: number
): Promise<ActionResult<ReturnType<typeof StaffPotService.getMonthData>>> {
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

    const now = new Date();
    const m = month ?? now.getMonth();
    const y = year ?? now.getFullYear();

    const data = await StaffPotService.getMonthData(m, y);

    // Serialize dates for client
    const serialized = {
      ...data,
      dailyEntries: data.dailyEntries.map((entry) => ({
        ...entry,
        date:
          entry.date instanceof Date ? entry.date.toISOString() : entry.date,
      })),
    };

    return { success: true, data: serialized as any };
  } catch (error) {
    console.error('Error getting staff pot data:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to get staff pot data',
    };
  }
}

export interface StaffPotChecklist {
  foodSnapshotSubmitted: boolean;
  foodSnapshotApproved: boolean;
  drinkSnapshotSubmitted: boolean;
  drinkSnapshotApproved: boolean;
  configReviewed: boolean;
  inventoryLossEnabled: boolean;
  staffCountsSet: boolean;
  monthFinalized: boolean;
}

export async function getStaffPotChecklistAction(
  month?: number,
  year?: number
): Promise<ActionResult<StaffPotChecklist>> {
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

    const now = new Date();
    const m = month ?? now.getMonth();
    const y = year ?? now.getFullYear();

    const monthStart = startOfMonth(new Date(y, m, 1));
    const monthEnd = endOfMonth(monthStart);

    const config = await SystemSettingsService.getStaffPotConfig();

    // Check inventory snapshots for this month
    const snapshots = await InventorySnapshotModel.find({
      snapshotDate: { $gte: monthStart, $lte: monthEnd },
    })
      .select('mainCategory status')
      .lean();

    const foodSnapshots = snapshots.filter((s) => s.mainCategory === 'food');
    const drinkSnapshots = snapshots.filter((s) => s.mainCategory === 'drinks');

    // Check if month is finalized
    const potSnapshot = await StaffPotSnapshotModel.findOne({
      month: m,
      year: y,
    })
      .select('finalized')
      .lean();

    return {
      success: true,
      data: {
        foodSnapshotSubmitted: foodSnapshots.length > 0,
        foodSnapshotApproved: foodSnapshots.some(
          (s) => s.status === 'approved'
        ),
        drinkSnapshotSubmitted: drinkSnapshots.length > 0,
        drinkSnapshotApproved: drinkSnapshots.some(
          (s) => s.status === 'approved'
        ),
        configReviewed: config.dailyTarget > 0 && config.bonusPercentage > 0,
        inventoryLossEnabled: config.inventoryLossEnabled,
        staffCountsSet:
          config.kitchenStaffCount > 0 && config.barStaffCount > 0,
        monthFinalized: potSnapshot?.finalized === true,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to get checklist data',
    };
  }
}

/**
 * @requirement REQ-018 - Finalize a month's staff pot data
 * Creates an immutable snapshot so past months are not affected by config changes.
 */
export async function finalizeStaffPotMonthAction(
  month: number,
  year: number
): Promise<ActionResult> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(
      cookieStore,
      sessionOptions
    );

    if (!session.userId || session.role !== 'super-admin') {
      return { success: false, error: 'Unauthorized — super-admin only' };
    }

    // Prevent finalizing future or current month
    const now = new Date();
    if (
      year > now.getFullYear() ||
      (year === now.getFullYear() && month >= now.getMonth())
    ) {
      return {
        success: false,
        error: 'Cannot finalize the current or a future month',
      };
    }

    await connectDB();

    const snapshot = await StaffPotService.finalizeMonth(month, year);

    revalidatePath('/dashboard/staff-pot');

    return {
      success: true,
      message: `Staff Pot for ${MONTH_NAMES[month]} ${year} has been finalized`,
      data: { id: (snapshot as any)._id?.toString() },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to finalize month',
    };
  }
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
