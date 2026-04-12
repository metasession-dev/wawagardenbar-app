/**
 * @requirement REQ-026 - Pending expense group workflow
 */
import { ObjectId } from 'mongodb';
import { ExpenseType } from './expense.interface';

/**
 * A single line item within a pending expense group
 */
export interface IExpenseLineItem {
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
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
  expenseType: ExpenseType;
  category: string;
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
  expenseType: ExpenseType;
  category: string;
  items: IExpenseLineItem[];
  notes?: string;
  submittedBy: string;
}

/**
 * DTO for updating a pending expense group (header + items)
 */
export interface UpdatePendingExpenseGroupDTO {
  date?: Date;
  expenseType?: ExpenseType;
  category?: string;
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
