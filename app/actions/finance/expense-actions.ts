'use server';

import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { revalidatePath } from 'next/cache';
import { sessionOptions, SessionData } from '@/lib/session';
import { ExpenseService } from '@/services/expense-service';
import {
  CreateExpenseDTO,
  UpdateExpenseDTO,
  ExpenseFilters,
} from '@/interfaces/expense.interface';

/**
 * Create a new expense
 */
export async function createExpenseAction(
  data: Omit<CreateExpenseDTO, 'createdBy'>
) {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );
    if (!session.isLoggedIn || !session.userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Only super-admin and admin can create expenses
    if (session.role !== 'super-admin' && session.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions' };
    }

    const expense = await ExpenseService.createExpense({
      ...data,
      createdBy: session.userId,
    });

    revalidatePath('/dashboard/finance/expenses');

    return {
      success: true,
      expense: JSON.parse(JSON.stringify(expense)),
    };
  } catch (error) {
    console.error('Error creating expense:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to create expense',
    };
  }
}

/**
 * Get expenses by date range with filters
 */
export async function getExpensesAction(
  startDate: Date,
  endDate: Date,
  filters?: ExpenseFilters
) {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );
    if (!session.isLoggedIn || !session.userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Only super-admin and admin can view expenses
    if (session.role !== 'super-admin' && session.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions' };
    }

    const expenses = await ExpenseService.getExpensesByDateRange(
      startDate,
      endDate,
      filters
    );

    return {
      success: true,
      expenses: JSON.parse(JSON.stringify(expenses)),
    };
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch expenses',
    };
  }
}

/**
 * Get expense by ID
 */
export async function getExpenseByIdAction(id: string) {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );
    if (!session.isLoggedIn || !session.userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Only super-admin and admin can view expenses
    if (session.role !== 'super-admin' && session.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions' };
    }

    const expense = await ExpenseService.getExpenseById(id);

    if (!expense) {
      return { success: false, error: 'Expense not found' };
    }

    return {
      success: true,
      expense: JSON.parse(JSON.stringify(expense)),
    };
  } catch (error) {
    console.error('Error fetching expense:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch expense',
    };
  }
}

/**
 * Update an expense
 */
export async function updateExpenseAction(id: string, data: UpdateExpenseDTO) {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );
    if (!session.isLoggedIn || !session.userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Only super-admin can update expenses
    if (session.role !== 'super-admin') {
      return { success: false, error: 'Only super-admin can update expenses' };
    }

    const expense = await ExpenseService.updateExpense(
      id,
      data,
      session.userId
    );

    revalidatePath('/dashboard/finance/expenses');

    return {
      success: true,
      expense: JSON.parse(JSON.stringify(expense)),
    };
  } catch (error) {
    console.error('Error updating expense:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update expense',
    };
  }
}

/**
 * Delete an expense
 */
export async function deleteExpenseAction(id: string) {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );

    // Only super-admin can delete expenses
    if (session.role !== 'super-admin') {
      return { success: false, error: 'Only super-admin can delete expenses' };
    }
    if (!session.userId) {
      return { success: false, error: 'User ID not found' };
    }

    await ExpenseService.deleteExpense(id, session.userId);

    revalidatePath('/dashboard/finance/expenses');

    return { success: true };
  } catch (error) {
    console.error('Error deleting expense:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to delete expense',
    };
  }
}

/**
 * Get used categories
 */
export async function getUsedCategoriesAction() {
  try {
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions
    );
    if (!session.isLoggedIn || !session.userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Only super-admin and admin can view categories
    if (session.role !== 'super-admin' && session.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions' };
    }

    const categories = await ExpenseService.getUsedCategories();

    return {
      success: true,
      categories,
    };
  } catch (error) {
    console.error('Error fetching categories:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch categories',
    };
  }
}
