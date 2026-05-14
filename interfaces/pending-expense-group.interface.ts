/**
 * @requirement REQ-026 - Pending expense group workflow
 */
import { ObjectId } from 'mongodb';
import { ExpenseType } from './expense.interface';

/**
 * A single line item within a pending expense group
 */
export interface IExpenseLineItem {
  expenseType: ExpenseType;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  // REQ-034 AC5/AC6 — user picks a kitchen-ingredient inventory row at form
  // submission time. The selection is carried through pending → approved →
  // transferred without side-effect; at confirmTransfer the resulting Expense
  // row gets `linkedInventoryId` set and the inventory effects fire.
  // Stored as a string (24-char hex ObjectId) for serialisation friendliness
  // through server actions.
  linkedInventoryId?: string;
}

/**
 * Status lifecycle: pending → approved → transferred
 */
export type PendingExpenseGroupStatus = 'pending' | 'approved' | 'transferred';

/**
 * A group of line items submitted together, awaiting approval and payment
 */
export interface IPendingExpenseGroup {
  _id: ObjectId;
  date: Date;
  items: IExpenseLineItem[];
  totalAmount: number;

  status: PendingExpenseGroupStatus;
  paymentBatchId?: string;

  submittedBy: ObjectId;
  submittedAt: Date;

  approvedBy?: ObjectId;
  approvedAt?: Date;

  transferReference?: string;
  transferredBy?: ObjectId;
  transferredAt?: Date;

  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for creating a new pending expense group
 */
export interface CreatePendingExpenseGroupDTO {
  date: Date;
  items: IExpenseLineItem[];
  notes?: string;
  submittedBy: string;
}

/**
 * DTO for updating a pending expense group (header + items)
 */
export interface UpdatePendingExpenseGroupDTO {
  date?: Date;
  items?: IExpenseLineItem[];
  notes?: string;
}

/**
 * DTO for assigning groups to a payment batch
 */
export interface AssignBatchDTO {
  groupIds: string[];
  paymentBatchId: string;
}
