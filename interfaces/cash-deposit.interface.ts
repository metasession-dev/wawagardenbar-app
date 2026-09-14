import { ObjectId } from 'mongodb';

/**
 * @requirement REQ-106
 * Cash deposit — moving physical cash from the till into the company bank
 * account. Deliberately a dedicated model, not folded into
 * PendingExpenseGroup: a deposit has no vendor/category/inventory-link and
 * never creates an Expense ledger row (it is not a cost).
 */
export type CashDepositStatus = 'pending' | 'approved' | 'transferred';

export interface ICashDeposit {
  _id: ObjectId;
  date: Date;
  amount: number;
  reference?: string; // Optional — unlike a pending expense's transfer reference.
  status: CashDepositStatus;
  submittedBy: ObjectId;
  submittedAt: Date;
  approvedBy?: ObjectId;
  approvedAt?: Date;
  transferredBy?: ObjectId;
  transferredAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCashDepositDTO {
  date: Date;
  amount: number;
  reference?: string;
  notes?: string;
  submittedBy: string;
}

export interface UpdateCashDepositDTO {
  date?: Date;
  amount?: number;
  reference?: string;
  notes?: string;
}
