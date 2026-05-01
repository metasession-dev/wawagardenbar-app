/**
 * @requirement REQ-032 - Create pending expense group from existing expenses
 *
 * Pure mapping helpers that convert a recorded `Expense` row into the
 * `IExpenseLineItem` shape consumed by the Add Expense dialog (`ExpenseForm`)
 * when pre-populating it from a multi-row selection on the Expenses page.
 *
 * The duplicate is standalone — no back-link is created on the resulting
 * pending group. Source expenses are read-only.
 */
import type { ExpenseType } from '@/interfaces/expense.interface';
import type { IExpenseLineItem } from '@/interfaces/pending-expense-group.interface';

export interface ExpenseSource {
  expenseType: ExpenseType;
  category: string;
  description: string;
  quantity?: number;
  unit?: string;
  amount: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function mapExpenseToLineItem(expense: ExpenseSource): IExpenseLineItem {
  const quantity = expense.quantity ?? 1;
  const unit = expense.unit ?? 'each';
  const unitCost = round2(expense.amount / quantity);
  return {
    expenseType: expense.expenseType,
    category: expense.category,
    description: expense.description,
    quantity,
    unit,
    unitCost,
    totalCost: expense.amount,
  };
}

export function mapExpensesToLineItems(
  expenses: ExpenseSource[]
): IExpenseLineItem[] {
  return expenses.map(mapExpenseToLineItem);
}
