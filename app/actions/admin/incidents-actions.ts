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
 *
 * Calls `InventoryService.deductStockForOrder` directly. The function
 * is idempotent — it guards on `inventoryDeducted` internally — so
 * clicking Retry Now on an already-deducted order is a no-op.
 *
 * On success: returns `{ success: true, message: 'Inventory deducted.' }`.
 * On already-deducted: returns `{ success: true, message: 'Already
 *   deducted — no change.' }`.
 * On throw: returns `{ success: true, warning: <error message> }`
 *   matching the AC9 shape so the UI surfaces a destructive-variant
 *   toast pointing at /dashboard/incidents. The action does NOT write a
 *   new IncidentEvent — the cron's 1-hour dedup handles that.
 */
export async function retryInventoryDeductionAction(
  orderId: string
): Promise<ActionResult> {
  // RBAC + permission gate. Throws redirect on denial.
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

  try {
    await InventoryService.deductStockForOrder(orderId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Audit-log the retry attempt itself so the action history is
    // traceable even when the deduction kept failing.
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

  // Persist the flag flip (deductStockForOrder mutates the inventory
  // document but does NOT touch the order's inventoryDeducted flag).
  await OrderModel.updateOne(
    { _id: new Types.ObjectId(orderId), inventoryDeducted: false },
    {
      $set: {
        inventoryDeducted: true,
        inventoryDeductedAt: new Date(),
        inventoryDeductedBy: new Types.ObjectId(session.userId || ''),
      },
    }
  );

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
