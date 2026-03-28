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
