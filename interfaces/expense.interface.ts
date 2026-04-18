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
 * Category group — display-only grouping used by the Add/Edit Expense
 * category dropdown. Groups are configured in Settings and are NOT stored
 * on the expense record itself ({@link IExpense.category} remains a string).
 *
 * @requirement REQ-028
 */
export interface CategoryGroup {
  name: string;
  categoryNames: string[];
}

/**
 * Shape returned by SystemSettingsService.getExpenseCategories and consumed
 * by the Settings form, Add Expense form, and Edit Expense dialog.
 *
 * @requirement REQ-028
 */
export interface ExpenseCategoriesSettings {
  directCostCategories: string[];
  operatingExpenseCategories: string[];
  directCostGroups: CategoryGroup[];
  operatingExpenseGroups: CategoryGroup[];
}

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

  // Traceability
  pendingGroupId?: string;

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
  pendingGroupId?: string;
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
