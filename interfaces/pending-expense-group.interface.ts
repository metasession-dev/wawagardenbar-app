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
  // REQ-104 — optional tags selected at submission, per line item. Stored
  // as strings (24-char hex ObjectId) for serialisation friendliness
  // through server actions, same convention as `linkedInventoryId`.
  tagIds?: string[];
}

/**
 * Status lifecycle: pending → approved → transferred
 */
export type PendingExpenseGroupStatus = 'pending' | 'approved' | 'transferred';

/**
 * REQ-106 — cash vs bank-transfer payment method for a pending expense
 * group. Selected once at creation (group-level, not per line item).
 */
export type PendingExpenseGroupPaymentMethod = 'cash' | 'transfer';

/**
 * A group of line items submitted together, awaiting approval and payment
 */
export interface IPendingExpenseGroup {
  _id: ObjectId;
  date: Date;
  items: IExpenseLineItem[];
  totalAmount: number;

  status: PendingExpenseGroupStatus;
  // REQ-106 — optional at the schema/interface level so groups created
  // before this REQ deployed remain valid; enforced as required at
  // create-time by the service/action layer (see CreatePendingExpenseGroupDTO).
  paymentMethod?: PendingExpenseGroupPaymentMethod;
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
  // REQ-106 — required at creation (enforced in the service, not the
  // Mongoose schema — see IPendingExpenseGroup.paymentMethod).
  paymentMethod: PendingExpenseGroupPaymentMethod;
}

/**
 * DTO for updating a pending expense group (header + items)
 */
export interface UpdatePendingExpenseGroupDTO {
  date?: Date;
  items?: IExpenseLineItem[];
  notes?: string;
  paymentMethod?: PendingExpenseGroupPaymentMethod;
}

/**
 * DTO for assigning groups to a payment batch
 */
export interface AssignBatchDTO {
  groupIds: string[];
  paymentBatchId: string;
}
