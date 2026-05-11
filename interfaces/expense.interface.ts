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

  // REQ-034 AC6/AC7 — Inventory link. Optional; set when the user selected
  // a kitchen-ingredient inventory row at submission time. Side-effects
  // (StockMovement, currentStock bump, cost-history row) fire when the
  // pending group's `confirmTransfer` materialises this Expense; the new
  // movement's _id is then patched back onto `stockMovementId`. On edit /
  // delete the prior movement is voided and a reversal pair is recorded
  // (audit preserved — no physical deletion). `linkVoidedAt` flips when
  // the inventory effects have been reversed so subsequent edit/delete
  // calls do not double-reverse.
  linkedInventoryId?: ObjectId;
  stockMovementId?: ObjectId;
  linkVoidedAt?: Date;

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
  // REQ-034: optional inventory link captured at submission.
  linkedInventoryId?: string;
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
  // REQ-034: editing the link is allowed (subject to AC7 block-on-negative
  // for the reversal of the prior link). Pass `null` to clear; omit to leave
  // the link untouched.
  linkedInventoryId?: string | null;
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
