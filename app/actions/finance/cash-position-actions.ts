'use server';

/**
 * @requirement REQ-106 - Current Cash Position tracking
 */
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { revalidatePath } from 'next/cache';
import { sessionOptions, SessionData } from '@/lib/session';
import { CashPositionService } from '@/services/cash-position-service';
import { CashPositionAdjustmentType } from '@/interfaces/cash-position-adjustment.interface';

async function getSession(): Promise<SessionData> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

/** Same gate as the Daily Report itself — a report-viewing concern. */
function requireReportViewer(session: SessionData): void {
  if (!session.isLoggedIn || !session.userId) throw new Error('Unauthorized');
  if (session.role !== 'super-admin' && session.role !== 'admin') {
    throw new Error('Insufficient permissions');
  }
}

function requireSuperAdmin(session: SessionData): void {
  if (!session.isLoggedIn || !session.userId) throw new Error('Unauthorized');
  if (session.role !== 'super-admin') {
    throw new Error('Insufficient permissions — super-admin required');
  }
}

/**
 * Get the Current Cash Position for a single date, or a range when
 * `endDate` is provided.
 */
export async function getCashPositionAction(startDate: Date, endDate?: Date) {
  try {
    const session = await getSession();
    requireReportViewer(session);
    const summary = endDate
      ? await CashPositionService.getCashPositionForRange(startDate, endDate)
      : await CashPositionService.getCashPositionForDate(startDate);
    return { success: true, summary };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to compute cash position',
    };
  }
}

/**
 * Record a cash-position adjustment — the initial opening balance
 * (`type: 'seed'`) or a later correction (`type: 'correction'`).
 * Unconditionally super-admin only, regardless of any other permission flag.
 */
export async function recordCashPositionAdjustmentAction({
  type,
  amount,
  effectiveDate,
  note,
}: {
  type: CashPositionAdjustmentType;
  amount: number;
  effectiveDate: Date;
  note?: string;
}) {
  try {
    const session = await getSession();
    requireSuperAdmin(session);
    if (amount === 0) {
      return { success: false, error: 'Adjustment amount cannot be zero' };
    }
    const adjustment = await CashPositionService.recordAdjustment({
      type,
      amount,
      effectiveDate,
      note,
      createdBy: session.userId!,
    });
    revalidatePath('/dashboard/reports/daily');
    return {
      success: true,
      adjustment: JSON.parse(JSON.stringify(adjustment)),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to record adjustment',
    };
  }
}

export async function listCashPositionAdjustmentsAction() {
  try {
    const session = await getSession();
    requireSuperAdmin(session);
    const adjustments = await CashPositionService.listAdjustments();
    return {
      success: true,
      adjustments: JSON.parse(JSON.stringify(adjustments)),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to list adjustments',
      adjustments: [],
    };
  }
}
