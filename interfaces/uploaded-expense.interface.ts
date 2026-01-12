import { ObjectId } from 'mongodb';

/**
 * Uploaded Expense Status
 */
export type UploadedExpenseStatus = 'pending' | 'approved' | 'rejected';

/**
 * Original CSV Transaction Data
 */
export interface OriginalTransactionData {
  transactionType?: string;
  transactionStatus?: string;
  terminalId?: string;
  rrn?: number;
  reversalStatus?: number;
  settlementDebit?: number;
  settlementCredit?: number;
  balanceBefore?: number;
  balanceAfter?: number;
  beneficiary?: string;
  beneficiaryInstitution?: string;
  source?: string;
  sourceInstitution?: string;
  narration?: string;
}

/**
 * Uploaded Expense Interface
 */
export interface IUploadedExpense {
  _id: ObjectId;

  // Mapped expense fields
  date: Date;
  description: string;
  amount: number;
  transactionFee: number;
  category?: string;
  expenseType?: 'direct-cost' | 'operating-expense';
  referenceNumber: string;

  // Upload metadata
  uploadedBy: ObjectId;
  uploadedAt: Date;
  status: UploadedExpenseStatus;

  // Original CSV data (for reference)
  originalData: OriginalTransactionData;

  // Approval metadata
  approvedBy?: ObjectId;
  approvedAt?: Date;
  rejectedBy?: ObjectId;
  rejectedAt?: Date;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create Uploaded Expense DTO
 */
export interface CreateUploadedExpenseDTO {
  date: Date;
  description: string;
  amount: number;
  transactionFee: number;
  referenceNumber: string;
  originalData: OriginalTransactionData;
  uploadedBy: string;
}

/**
 * Update Uploaded Expense DTO
 */
export interface UpdateUploadedExpenseDTO {
  date?: Date;
  description?: string;
  amount?: number;
  transactionFee?: number;
  category?: string;
  expenseType?: 'direct-cost' | 'operating-expense';
}

/**
 * Uploaded Expense Filters
 */
export interface UploadedExpenseFilters {
  status?: UploadedExpenseStatus;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  uploadedBy?: string;
}

/**
 * Uploaded Expense Statistics
 */
export interface UploadedExpenseStats {
  pending: number;
  approved: number;
  rejected: number;
  totalAmount: number;
}
