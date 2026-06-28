'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/auth-middleware';
import { connectDB } from '@/lib/mongodb';
import OrderModel from '@/models/order-model';
import InventoryService from '@/services/inventory-service';
import { AuditLogService } from '@/services/audit-log-service';
import { Types } from 'mongoose';
import type { ActionResult } from './order-management-actions';

/**
 * @requirement REQ-066 AC10 — operator-initiated retry of a stuck
 * inventory deduction. Bound to the per-row "Retry now" button on
 * `/dashboard/incidents`.
 * @requirement REQ-087 — now consumes per-item result object.
 *
 * Calls `InventoryService.deductStockForOrder` directly. With REQ-087,
 * already-deducted items are automatically skipped — no double
 * deduction. The function returns a result object instead of throwing.
 *
 * On all-succeeded: returns `{ success: true, message: 'Inventory deducted.' }`.
 * On already-deducted: returns `{ success: true, message: 'Already
 *   deducted — no change.' }`.
 * On partial failure: returns `{ success: true, warning: <summary> }`
 *   with per-item breakdown in the warning message.
 * On throw: returns `{ success: true, warning: <error message> }`.
 */
export async function retryInventoryDeductionAction(
  orderId: string
): Promise<ActionResult> {
  const session = await requirePermission('incidentsAccess');

  if (!Types.ObjectId.isValid(orderId)) {
    return { success: false, error: 'Invalid order ID' };
  }

  await connectDB();
  const before = await OrderModel.findById(orderId).select({
    inventoryDeducted: 1,
    status: 1,
  });
  if (!before) {
    return { success: false, error: 'Order not found' };
  }
  if (before.inventoryDeducted) {
    return { success: true, message: 'Already deducted — no change.' };
  }
  if (before.status !== 'completed') {
    return {
      success: false,
      error: `Order is in '${before.status}', not 'completed'. Complete it via the kitchen-display first.`,
    };
  }

  let result;
  try {
    result = await InventoryService.deductStockForOrder(orderId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      await AuditLogService.createLog({
        userId: session.userId || '',
        userEmail: session.email || '',
        userRole: session.role || '',
        action: 'incidents.retry_deduction_failed',
        resource: 'order',
        resourceId: orderId,
        details: { error: message },
      });
    } catch {
      /* non-fatal */
    }
    return { success: true, warning: message };
  }

  await OrderModel.updateOne(
    { _id: new Types.ObjectId(orderId), inventoryDeducted: false },
    {
      $set: {
        inventoryDeductionDetails: result.results.map((r) => ({
          menuItemId: new Types.ObjectId(r.menuItemId),
          itemName: r.itemName,
          status: r.status === 'skipped' ? 'deducted' : r.status,
          error: r.error,
          deductedAt:
            r.status === 'deducted' || r.status === 'skipped'
              ? new Date()
              : undefined,
          quantity: r.quantity,
          linkedDeductions: r.linkedResults.map((lr) => ({
            inventoryId: new Types.ObjectId(lr.inventoryId),
            status: lr.status,
            error: lr.error,
          })),
        })),
        ...(result.allSucceeded && {
          inventoryDeducted: true,
          inventoryDeductedAt: new Date(),
          inventoryDeductedBy: new Types.ObjectId(session.userId || ''),
        }),
      },
    }
  );

  if (!result.allSucceeded) {
    const failedNames = result.results
      .filter((r) => r.status === 'failed')
      .map((r) => `${r.itemName}: ${r.error}`)
      .join('; ');
    const warning = `Partial deduction — failed items: ${failedNames}`;
    try {
      await AuditLogService.createLog({
        userId: session.userId || '',
        userEmail: session.email || '',
        userRole: session.role || '',
        action: 'incidents.retry_deduction_partial',
        resource: 'order',
        resourceId: orderId,
        details: {
          failedItems: result.results.filter((r) => r.status === 'failed'),
          deductedItems: result.results.filter((r) => r.status === 'deducted'),
          skippedItems: result.results.filter((r) => r.status === 'skipped'),
        },
      });
    } catch {
      /* non-fatal */
    }
    revalidatePath('/dashboard/incidents');
    return { success: true, warning };
  }

  try {
    await AuditLogService.createLog({
      userId: session.userId || '',
      userEmail: session.email || '',
      userRole: session.role || '',
      action: 'incidents.retry_deduction_succeeded',
      resource: 'order',
      resourceId: orderId,
      details: { triggeredFrom: '/dashboard/incidents' },
    });
  } catch {
    /* non-fatal */
  }

  revalidatePath('/dashboard/incidents');
  return { success: true, message: 'Inventory deducted.' };
}
