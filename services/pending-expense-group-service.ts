/**
 * @requirement REQ-026 - Pending expense group workflow
 * @requirement REQ-034 - confirmTransfer fires Expense → Inventory link side-effects
 *                        when a line item carries `linkedInventoryId`
 */
import { ObjectId } from 'mongodb';
import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { PendingExpenseGroupModel } from '@/models/pending-expense-group-model';
import { ExpenseModel } from '@/models';
import {
  IExpenseLineItem,
  IPendingExpenseGroup,
  PendingExpenseGroupStatus,
  CreatePendingExpenseGroupDTO,
  UpdatePendingExpenseGroupDTO,
  AssignBatchDTO,
} from '@/interfaces/pending-expense-group.interface';
import { applyExpenseInventoryLink } from './expense-inventory-link-service';
import { validatePendingApprovedTransferredTransition } from '@/lib/status-transition';

// ── Pure logic functions (exported for unit testing) ───────────────────────────

/**
 * Calculates the total amount for a group as the sum of all item totalCosts.
 */
export function calculateGroupTotal(items: IExpenseLineItem[]): number {
  return items.reduce((sum, item) => sum + item.totalCost, 0);
}

/**
 * Normalises line items: if totalCost is 0, derives it from quantity × unitCost.
 */
export function normaliseLineItems(
  items: IExpenseLineItem[]
): IExpenseLineItem[] {
  return items.map((item) => ({
    ...item,
    totalCost:
      item.totalCost !== 0 ? item.totalCost : item.quantity * item.unitCost,
  }));
}

/**
 * Validates that a status transition is allowed.
 * Allowed: pending → approved, approved → transferred.
 * REQ-106: delegates to the generic helper shared with CashDepositService.
 */
export function validateStatusTransition(
  current: PendingExpenseGroupStatus,
  next: PendingExpenseGroupStatus
): void {
  validatePendingApprovedTransferredTransition(current, next);
}

/**
 * Builds the Expense DTO records that will be written to the live ledger
 * when a group is transferred. One record per line item.
 * Pure function — does not write to the database.
 */
export interface ExpenseRecordDTO {
  date: Date;
  expenseType: IExpenseLineItem['expenseType'];
  category: string;
  description: string;
  quantity: number;
  unit: string;
  amount: number;
  receiptReference: string;
  notes?: string;
  createdBy: string;
  pendingGroupId: string;
  // REQ-034 AC6 — propagated from the line item; consumed by confirmTransfer
  // to drive the Inventory side-effects after the Expense row is inserted.
  linkedInventoryId?: string;
  // REQ-104 — tags propagated from the line item so a transferred Expense
  // stays filterable.
  tagIds?: string[];
  // REQ-106 — propagated from the group so a transferred Expense records
  // how it was paid.
  paymentMethod?: 'cash' | 'transfer';
}

export function buildExpenseRecordsFromGroup(
  group: IPendingExpenseGroup,
  transferReference: string,
  transferredBy: string
): ExpenseRecordDTO[] {
  // REQ-106 — a transfer reference (bank reference) is only meaningful for
  // 'transfer'-method groups. A 'cash'-method group has no bank reference;
  // the field becomes an optional "handed over by / notes" acknowledgement
  // instead (enforced only for 'transfer' here; groups predating this REQ
  // have no paymentMethod at all and are treated as 'transfer' for
  // backward compatibility — the stricter, pre-existing behaviour).
  if (
    group.paymentMethod !== 'cash' &&
    (!transferReference || transferReference.trim() === '')
  ) {
    throw new Error('Transfer reference is required');
  }
  if (!group.items || group.items.length === 0) {
    throw new Error('Group has no line items to transfer');
  }
  return group.items.map((item) => ({
    date: group.date,
    expenseType: item.expenseType,
    category: item.category,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    amount: item.totalCost,
    receiptReference: transferReference,
    notes: group.notes,
    createdBy: transferredBy,
    pendingGroupId: group._id.toString(),
    linkedInventoryId: item.linkedInventoryId,
    tagIds: item.tagIds,
    paymentMethod: group.paymentMethod,
  }));
}

/**
 * REQ-106 — a payment batch (or an ad-hoc confirmTransfer group list) must
 * be payment-method-homogeneous: a single shared transferReference/notes
 * field can't correctly represent both a bank reference and a cash
 * handover acknowledgement at once, and mixing methods would make the
 * cash-out-of-till deduction ambiguous. Groups predating this REQ (no
 * paymentMethod set) are treated as 'transfer' for this check.
 */
export function assertBatchPaymentMethodHomogeneous(
  groups: Pick<IPendingExpenseGroup, 'paymentMethod'>[]
): void {
  const methods = new Set(groups.map((g) => g.paymentMethod ?? 'transfer'));
  if (methods.size > 1) {
    throw new Error(
      'Cannot batch/transfer groups with different payment methods — a batch must be all-cash or all-transfer'
    );
  }
}

// ── PendingExpenseGroupService ─────────────────────────────────────────────────

/**
 * Service for managing pending expense groups.
 * Handles lifecycle: create → approve → transfer to live ledger.
 */
export class PendingExpenseGroupService {
  /**
   * Create a new pending expense group.
   */
  static async createGroup(
    data: CreatePendingExpenseGroupDTO
  ): Promise<IPendingExpenseGroup> {
    await connectDB();
    const normalisedItems = normaliseLineItems(data.items);
    const totalAmount = calculateGroupTotal(normalisedItems);
    const now = new Date();
    const group = await PendingExpenseGroupModel.create({
      date: data.date,
      items: normalisedItems,
      totalAmount,
      status: 'pending',
      notes: data.notes,
      paymentMethod: data.paymentMethod,
      submittedBy: new ObjectId(data.submittedBy),
      submittedAt: now,
    });
    return group.toObject();
  }

  /**
   * Update the header or line items of a pending or approved group.
   */
  static async updateGroup(
    groupId: string,
    data: UpdatePendingExpenseGroupDTO
  ): Promise<IPendingExpenseGroup> {
    await connectDB();
    const group = await PendingExpenseGroupModel.findById(groupId);
    if (!group) throw new Error('Pending expense group not found');
    if (group.status === 'transferred') {
      throw new Error('Cannot edit a transferred expense group');
    }
    const updates: Record<string, unknown> = {};
    if (data.date !== undefined) updates.date = data.date;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.paymentMethod !== undefined)
      updates.paymentMethod = data.paymentMethod;
    if (data.items !== undefined) {
      const normalisedItems = normaliseLineItems(data.items);
      updates.items = normalisedItems;
      updates.totalAmount = calculateGroupTotal(normalisedItems);
    }
    const updated = await PendingExpenseGroupModel.findByIdAndUpdate(
      groupId,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();
    if (!updated) throw new Error('Pending expense group not found');
    return updated as IPendingExpenseGroup;
  }

  /**
   * Approve a pending group (super-admin only — enforced at action layer).
   */
  static async approveGroup(
    groupId: string,
    approvedBy: string
  ): Promise<IPendingExpenseGroup> {
    await connectDB();
    const group = await PendingExpenseGroupModel.findById(groupId);
    if (!group) throw new Error('Pending expense group not found');
    validateStatusTransition(group.status, 'approved');
    const updated = await PendingExpenseGroupModel.findByIdAndUpdate(
      groupId,
      {
        $set: {
          status: 'approved',
          approvedBy: new ObjectId(approvedBy),
          approvedAt: new Date(),
        },
      },
      { new: true }
    ).lean();
    return updated as IPendingExpenseGroup;
  }

  /**
   * Delete a pending expense group.
   * Only groups with status 'pending' or 'approved' may be deleted.
   * Transferred groups are part of the live ledger and cannot be deleted here.
   */
  static async deleteGroup(groupId: string): Promise<void> {
    await connectDB();
    const group = await PendingExpenseGroupModel.findById(groupId);
    if (!group) throw new Error('Pending expense group not found');
    if (group.status === 'transferred') {
      throw new Error('Cannot delete a transferred expense group');
    }
    await PendingExpenseGroupModel.findByIdAndDelete(groupId);
  }

  /**
   * Assign a list of groups to a payment batch.
   */
  static async assignBatch({
    groupIds,
    paymentBatchId,
  }: AssignBatchDTO): Promise<void> {
    await connectDB();
    // REQ-106 — homogeneity check against the UNION of already-batched
    // members and the newly-added group IDs, not just the incoming array
    // in isolation (a batch may already contain groups from a prior
    // assignBatch call).
    const existingMembers = (await PendingExpenseGroupModel.find({
      paymentBatchId,
    })
      .select('paymentMethod')
      .lean()) as Pick<IPendingExpenseGroup, 'paymentMethod'>[];
    const newMembers = (await PendingExpenseGroupModel.find({
      _id: { $in: groupIds.map((id) => new ObjectId(id)) },
    })
      .select('paymentMethod')
      .lean()) as Pick<IPendingExpenseGroup, 'paymentMethod'>[];
    assertBatchPaymentMethodHomogeneous([...existingMembers, ...newMembers]);

    await PendingExpenseGroupModel.updateMany(
      { _id: { $in: groupIds.map((id) => new ObjectId(id)) } },
      { $set: { paymentBatchId } }
    );
  }

  /**
   * Remove groups from their payment batch (unassign).
   */
  static async removeBatch(groupIds: string[]): Promise<void> {
    await connectDB();
    await PendingExpenseGroupModel.updateMany(
      { _id: { $in: groupIds.map((id) => new ObjectId(id)) } },
      { $unset: { paymentBatchId: '' } }
    );
  }

  /**
   * Confirm transfer for all groups in a batch (or a list of group IDs).
   * Writes each line item to the live Expense collection.
   * Super-admin only — enforced at the action layer.
   */
  static async confirmTransfer(
    groupIds: string[],
    transferReference: string,
    transferredBy: string
  ): Promise<{ transferred: number }> {
    await connectDB();
    const groups = (await PendingExpenseGroupModel.find({
      _id: { $in: groupIds.map((id) => new ObjectId(id)) },
    }).lean()) as IPendingExpenseGroup[];

    // REQ-106 — defense-in-depth: assignBatch already enforces this at
    // batch-formation time, but confirmTransfer can also be called
    // directly against an ad-hoc groupIds list that was never batched.
    assertBatchPaymentMethodHomogeneous(groups);

    // Validate ALL groups before writing anything — prevents partial transfer
    for (const group of groups) {
      validateStatusTransition(group.status, 'transferred');
      buildExpenseRecordsFromGroup(group, transferReference, transferredBy); // throws if invalid
    }

    const now = new Date();
    let transferred = 0;

    for (const group of groups) {
      const expenseRecords = buildExpenseRecordsFromGroup(
        group,
        transferReference,
        transferredBy
      );
      const inserted = await ExpenseModel.insertMany(
        expenseRecords.map((r) => ({
          ...r,
          createdBy: new ObjectId(r.createdBy),
          linkedInventoryId: r.linkedInventoryId
            ? new ObjectId(r.linkedInventoryId)
            : undefined,
          tagIds: r.tagIds?.length
            ? r.tagIds.map((id) => new ObjectId(id))
            : undefined,
          paymentMethod: r.paymentMethod,
        }))
      );

      // REQ-034 AC6 — fire Inventory side-effects for every line item that
      // carried a linkedInventoryId. Each call is wrapped in try/catch so a
      // single bad link does not block the rest of the batch; the failure is
      // logged and surfaced via the existing audit trail via StockMovement
      // reversal records (applyExpenseInventoryLink runs its own reversal
      // pass internally).
      for (let i = 0; i < inserted.length; i++) {
        const record = expenseRecords[i];
        if (!record.linkedInventoryId) continue;
        const expenseDoc = inserted[i] as { _id: Types.ObjectId };
        try {
          await applyExpenseInventoryLink({
            expenseId: expenseDoc._id,
            linkedInventoryId: new Types.ObjectId(record.linkedInventoryId),
            quantity: record.quantity,
            expenseUnit: record.unit,
            amount: record.amount,
            supplier: undefined,
            notes: record.notes,
            date: record.date,
            performedBy: transferredBy,
          });
        } catch (err) {
          console.error(
            `[REQ-034] expense link failed for expense ${expenseDoc._id.toString()}:`,
            err
          );
        }
      }

      await PendingExpenseGroupModel.findByIdAndUpdate(group._id, {
        $set: {
          status: 'transferred',
          transferReference,
          transferredBy: new ObjectId(transferredBy),
          transferredAt: now,
        },
      });
      transferred++;
    }

    return { transferred };
  }

  /**
   * List pending expense groups (excludes transferred by default).
   */
  static async listGroups(
    status?: PendingExpenseGroupStatus | PendingExpenseGroupStatus[]
  ): Promise<IPendingExpenseGroup[]> {
    await connectDB();
    const filter = status
      ? { status: Array.isArray(status) ? { $in: status } : status }
      : { status: { $ne: 'transferred' } };
    return PendingExpenseGroupModel.find(filter)
      .sort({ createdAt: -1 })
      .lean() as Promise<IPendingExpenseGroup[]>;
  }

  /**
   * Get a single group by ID.
   */
  static async getGroupById(
    groupId: string
  ): Promise<IPendingExpenseGroup | null> {
    await connectDB();
    return PendingExpenseGroupModel.findById(
      groupId
    ).lean() as Promise<IPendingExpenseGroup | null>;
  }
}
