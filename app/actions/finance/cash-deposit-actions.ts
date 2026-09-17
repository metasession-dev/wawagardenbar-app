'use server';

/**
 * @requirement REQ-106 - Cash deposit workflow: pending | approved | transferred
 *
 * Server actions for the cash deposit flow, mirroring
 * pending-expense-actions.ts's shape 1:1.
 */
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { revalidatePath } from 'next/cache';
import { sessionOptions, SessionData } from '@/lib/session';
import { CashDepositService } from '@/services/cash-deposit-service';
import {
  CreateCashDepositDTO,
  UpdateCashDepositDTO,
} from '@/interfaces/cash-deposit.interface';

async function getSession(): Promise<SessionData> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

function requireAdminOrAbove(session: SessionData): void {
  if (!session.isLoggedIn || !session.userId) throw new Error('Unauthorized');
  if (session.role !== 'admin' && session.role !== 'super-admin') {
    throw new Error('Insufficient permissions');
  }
}

function requireSuperAdmin(session: SessionData): void {
  if (!session.isLoggedIn || !session.userId) throw new Error('Unauthorized');
  if (session.role !== 'super-admin') {
    throw new Error('Insufficient permissions — super-admin required');
  }
}

export async function createCashDepositAction(
  data: Omit<CreateCashDepositDTO, 'submittedBy'>
) {
  try {
    const session = await getSession();
    requireAdminOrAbove(session);
    const deposit = await CashDepositService.createDeposit({
      ...data,
      submittedBy: session.userId!,
    });
    revalidatePath('/dashboard/finance/deposits');
    return { success: true, deposit: JSON.parse(JSON.stringify(deposit)) };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create deposit',
    };
  }
}

export async function updateCashDepositAction(
  depositId: string,
  data: UpdateCashDepositDTO
) {
  try {
    const session = await getSession();
    requireAdminOrAbove(session);
    const deposit = await CashDepositService.updateDeposit(depositId, data);
    revalidatePath('/dashboard/finance/deposits');
    return { success: true, deposit: JSON.parse(JSON.stringify(deposit)) };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update deposit',
    };
  }
}

export async function deleteCashDepositAction(depositId: string) {
  try {
    const session = await getSession();
    requireAdminOrAbove(session);
    await CashDepositService.deleteDeposit(depositId);
    revalidatePath('/dashboard/finance/deposits');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete deposit',
    };
  }
}

/**
 * Approve a pending deposit — mirrors the "second admin approves"
 * requirement for pending expenses. Super-admin only.
 */
export async function approveCashDepositAction(depositId: string) {
  try {
    const session = await getSession();
    requireSuperAdmin(session);
    const deposit = await CashDepositService.approveDeposit(
      depositId,
      session.userId!
    );
    revalidatePath('/dashboard/finance/deposits');
    return { success: true, deposit: JSON.parse(JSON.stringify(deposit)) };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to approve deposit',
    };
  }
}

/**
 * Confirm the bank transfer. Reference is optional (unlike a pending
 * expense's mandatory bank reference for transfer-method groups).
 * Super-admin only.
 */
export async function confirmCashDepositTransferAction(
  depositId: string,
  reference?: string
) {
  try {
    const session = await getSession();
    requireSuperAdmin(session);
    const deposit = await CashDepositService.confirmTransfer(
      depositId,
      reference,
      session.userId!
    );
    revalidatePath('/dashboard/finance/deposits');
    revalidatePath('/dashboard/reports/daily');
    return { success: true, deposit: JSON.parse(JSON.stringify(deposit)) };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to confirm transfer',
    };
  }
}

export async function listCashDepositsAction() {
  try {
    const session = await getSession();
    requireAdminOrAbove(session);
    const deposits = await CashDepositService.listDeposits();
    return { success: true, deposits: JSON.parse(JSON.stringify(deposits)) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list deposits',
      deposits: [],
    };
  }
}
