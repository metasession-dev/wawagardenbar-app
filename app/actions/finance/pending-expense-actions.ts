'use server';

/**
 * @requirement REQ-026 - Pending expense group workflow
 *
 * Server actions for the pending expense group flow.
 * `createExpenseAction` in expense-actions.ts is intentionally unchanged
 * (used by the CSV import approval path). This file handles the manual
 * submission workflow only.
 */
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { revalidatePath } from 'next/cache';
import { sessionOptions, SessionData } from '@/lib/session';
import { PendingExpenseGroupService } from '@/services/pending-expense-group-service';
import {
  CreatePendingExpenseGroupDTO,
  UpdatePendingExpenseGroupDTO,
} from '@/interfaces/pending-expense-group.interface';

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

/**
 * Submit a new multi-line expense group to the pending queue.
 * Available to: admin, super-admin.
 */
export async function createPendingExpenseGroupAction(
  data: Omit<CreatePendingExpenseGroupDTO, 'submittedBy'>
) {
  try {
    const session = await getSession();
    requireAdminOrAbove(session);
    const group = await PendingExpenseGroupService.createGroup({
      ...data,
      submittedBy: session.userId!,
    });
    revalidatePath('/dashboard/finance/expenses/pending');
    return { success: true, group: JSON.parse(JSON.stringify(group)) };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create expense group',
    };
  }
}

/**
 * Update the header or line items of a pending/approved group.
 * Available to: admin, super-admin.
 */
export async function updatePendingExpenseGroupAction(
  groupId: string,
  data: UpdatePendingExpenseGroupDTO
) {
  try {
    const session = await getSession();
    requireAdminOrAbove(session);
    const group = await PendingExpenseGroupService.updateGroup(groupId, data);
    revalidatePath('/dashboard/finance/expenses/pending');
    return { success: true, group: JSON.parse(JSON.stringify(group)) };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update expense group',
    };
  }
}

/**
 * Approve a pending expense group.
 * Available to: super-admin only.
 */
export async function approvePendingExpenseGroupAction(groupId: string) {
  try {
    const session = await getSession();
    requireSuperAdmin(session);
    const group = await PendingExpenseGroupService.approveGroup(
      groupId,
      session.userId!
    );
    revalidatePath('/dashboard/finance/expenses/pending');
    return { success: true, group: JSON.parse(JSON.stringify(group)) };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to approve expense group',
    };
  }
}

/**
 * Assign a list of groups to a payment batch.
 * Available to: super-admin only.
 */
export async function assignBatchAction(
  groupIds: string[],
  paymentBatchId: string
) {
  try {
    const session = await getSession();
    requireSuperAdmin(session);
    await PendingExpenseGroupService.assignBatch({ groupIds, paymentBatchId });
    revalidatePath('/dashboard/finance/expenses/pending');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign batch',
    };
  }
}

/**
 * Remove groups from their payment batch.
 * Available to: super-admin only.
 */
export async function removeBatchAction(groupIds: string[]) {
  try {
    const session = await getSession();
    requireSuperAdmin(session);
    await PendingExpenseGroupService.removeBatch(groupIds);
    revalidatePath('/dashboard/finance/expenses/pending');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove batch',
    };
  }
}

/**
 * Confirm transfer/payment for a list of approved groups.
 * Transfer reference is mandatory.
 * Available to: super-admin only.
 */
export async function confirmTransferAction(
  groupIds: string[],
  transferReference: string
) {
  try {
    if (!transferReference || transferReference.trim() === '') {
      return { success: false, error: 'Transfer reference is required' };
    }
    const session = await getSession();
    requireSuperAdmin(session);
    const result = await PendingExpenseGroupService.confirmTransfer(
      groupIds,
      transferReference,
      session.userId!
    );
    revalidatePath('/dashboard/finance/expenses/pending');
    revalidatePath('/dashboard/finance/expenses');
    return { success: true, ...result };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to confirm transfer',
    };
  }
}

/**
 * List pending expense groups (excludes transferred).
 * Available to: admin, super-admin.
 */
export async function listPendingExpenseGroupsAction() {
  try {
    const session = await getSession();
    requireAdminOrAbove(session);
    const groups = await PendingExpenseGroupService.listGroups();
    return { success: true, groups: JSON.parse(JSON.stringify(groups)) };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to fetch pending groups',
    };
  }
}
