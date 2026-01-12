import { ObjectId } from 'mongodb';

/**
 * Expense Type Enum
 */
export type ExpenseType = 'direct-cost' | 'operating-expense';

/**
 * Direct Cost Categories
 */
export const DIRECT_COST_CATEGORIES = [
  'Meat/Protein',
  'Cooking Oil',
  'Condiments & Spices',
  'Vegetables',
  'Cooking Gas/Fuel',
  'Beverages (Stock)',
  'Other Ingredients',
] as const;

/**
 * Operating Expense Categories
 */
export const OPERATING_EXPENSE_CATEGORIES = [
  'Utilities (Electricity, Water)',
  'Internet/Telecommunications',
  'Maintenance & Repairs',
  'Fuel/Transportation',
  'Salaries',
  'Security Services',
  'Cleaning Supplies',
  'Rent',
  'Insurance',
  'Licenses & Permits',
  'Other',
] as const;

/**
 * Expense Interface
 */
export interface IExpense {
  _id: ObjectId;
  date: Date;

  // Expense Classification
  expenseType: ExpenseType;
  category: string;

  // Details
  description: string;
  quantity?: number;
  unit?: string;
  amount: number; // Total cost in Naira
  transactionFee?: number; // Bank or payment processor transaction fee

  // Tracking
  supplier?: string;
  receiptReference?: string;
  referenceNumber?: string; // Unique transaction reference (for imported expenses)
  notes?: string;

  // Audit
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create Expense DTO
 */
export interface CreateExpenseDTO {
  date: Date;
  expenseType: ExpenseType;
  category: string;
  description: string;
  quantity?: number;
  unit?: string;
  amount: number;
  transactionFee?: number;
  supplier?: string;
  receiptReference?: string;
  referenceNumber?: string;
  notes?: string;
  createdBy: string;
}

/**
 * Update Expense DTO
 */
export interface UpdateExpenseDTO {
  date?: Date;
  expenseType?: ExpenseType;
  category?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  amount?: number;
  transactionFee?: number;
  supplier?: string;
  receiptReference?: string;
  referenceNumber?: string;
  notes?: string;
}

/**
 * Expense Filters
 */
export interface ExpenseFilters {
  expenseType?: ExpenseType;
  category?: string;
  searchTerm?: string;
}

/**
 * Expense Summary
 */
export interface ExpenseSummary {
  totalDirectCosts: number;
  totalOperatingExpenses: number;
  totalExpenses: number;
  directCostsByCategory: Record<string, number>;
  operatingExpensesByCategory: Record<string, number>;
  expenseCount: number;
}
