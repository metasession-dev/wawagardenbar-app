/**
 * @requirement REQ-106 - Cash deposit workflow: pending | approved | transferred
 *
 * Structurally mirrors PendingExpenseGroupService but simplified — no line
 * items, no categories, no inventory links. A deposit moves cash from the
 * till into the bank; it never creates an Expense ledger row (it's not a
 * cost).
 */
import { ObjectId } from 'mongodb';
import { connectDB } from '@/lib/mongodb';
import { CashDepositModel } from '@/models/cash-deposit-model';
import {
  ICashDeposit,
  CashDepositStatus,
  CreateCashDepositDTO,
  UpdateCashDepositDTO,
} from '@/interfaces/cash-deposit.interface';
import { validatePendingApprovedTransferredTransition } from '@/lib/status-transition';

export class CashDepositService {
  static async createDeposit(
    data: CreateCashDepositDTO
  ): Promise<ICashDeposit> {
    await connectDB();
    const now = new Date();
    const deposit = await CashDepositModel.create({
      date: data.date,
      amount: data.amount,
      reference: data.reference,
      notes: data.notes,
      status: 'pending',
      submittedBy: new ObjectId(data.submittedBy),
      submittedAt: now,
    });
    return deposit.toObject();
  }

  static async updateDeposit(
    depositId: string,
    data: UpdateCashDepositDTO
  ): Promise<ICashDeposit> {
    await connectDB();
    const deposit = await CashDepositModel.findById(depositId);
    if (!deposit) throw new Error('Cash deposit not found');
    if (deposit.status === 'transferred') {
      throw new Error('Cannot edit a transferred cash deposit');
    }
    const updates: Record<string, unknown> = {};
    if (data.date !== undefined) updates.date = data.date;
    if (data.amount !== undefined) updates.amount = data.amount;
    if (data.reference !== undefined) updates.reference = data.reference;
    if (data.notes !== undefined) updates.notes = data.notes;
    const updated = await CashDepositModel.findByIdAndUpdate(
      depositId,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();
    if (!updated) throw new Error('Cash deposit not found');
    return updated as ICashDeposit;
  }

  static async deleteDeposit(depositId: string): Promise<void> {
    await connectDB();
    const deposit = await CashDepositModel.findById(depositId);
    if (!deposit) throw new Error('Cash deposit not found');
    if (deposit.status === 'transferred') {
      throw new Error('Cannot delete a transferred cash deposit');
    }
    await CashDepositModel.findByIdAndDelete(depositId);
  }

  static async approveDeposit(
    depositId: string,
    approvedBy: string
  ): Promise<ICashDeposit> {
    await connectDB();
    const deposit = await CashDepositModel.findById(depositId);
    if (!deposit) throw new Error('Cash deposit not found');
    validatePendingApprovedTransferredTransition(deposit.status, 'approved');
    const updated = await CashDepositModel.findByIdAndUpdate(
      depositId,
      {
        $set: {
          status: 'approved',
          approvedBy: new ObjectId(approvedBy),
          approvedAt: new Date(),
        },
      },
      { new: true }
    ).lean();
    return updated as ICashDeposit;
  }

  /**
   * Confirm the transfer (deposit into the bank). Unlike a pending expense
   * transfer, `reference` is OPTIONAL — a cash deposit slip may not have a
   * bank reference at hand when it's confirmed.
   */
  static async confirmTransfer(
    depositId: string,
    reference: string | undefined,
    transferredBy: string
  ): Promise<ICashDeposit> {
    await connectDB();
    const deposit = await CashDepositModel.findById(depositId);
    if (!deposit) throw new Error('Cash deposit not found');
    validatePendingApprovedTransferredTransition(deposit.status, 'transferred');
    const updated = await CashDepositModel.findByIdAndUpdate(
      depositId,
      {
        $set: {
          status: 'transferred',
          reference: reference || deposit.reference,
          transferredBy: new ObjectId(transferredBy),
          transferredAt: new Date(),
        },
      },
      { new: true }
    ).lean();
    return updated as ICashDeposit;
  }

  static async listDeposits(
    status?: CashDepositStatus | CashDepositStatus[]
  ): Promise<ICashDeposit[]> {
    await connectDB();
    const filter = status
      ? { status: Array.isArray(status) ? { $in: status } : status }
      : {};
    return CashDepositModel.find(filter)
      .sort({ createdAt: -1 })
      .lean() as Promise<ICashDeposit[]>;
  }

  static async getDepositById(depositId: string): Promise<ICashDeposit | null> {
    await connectDB();
    return CashDepositModel.findById(
      depositId
    ).lean() as Promise<ICashDeposit | null>;
  }
}
