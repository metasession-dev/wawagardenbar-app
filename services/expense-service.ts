import { ObjectId } from 'mongodb';
import { ExpenseModel } from '@/models';
import UserModel from '@/models/user-model';
import {
  IExpense,
  CreateExpenseDTO,
  UpdateExpenseDTO,
  ExpenseFilters,
  ExpenseSummary,
} from '@/interfaces/expense.interface';
import { AuditLogService } from './audit-log-service';

/**
 * Expense Service
 * Handles all expense-related business logic
 */
export class ExpenseService {
  /**
   * Helper method to get user details for audit logs
   */
  private static async getUserForAudit(userId: string) {
    const user = await UserModel.findById(userId).select('email role').lean();
    if (!user) {
      throw new Error('User not found');
    }
    return {
      userEmail: user.email || 'unknown',
      userRole: user.role || 'unknown',
    };
  }

  /**
   * Create a new expense
   */
  static async createExpense(data: CreateExpenseDTO): Promise<IExpense> {
    // Validate that date is not in the future
    const now = new Date();
    if (data.date > now) {
      throw new Error('Expense date cannot be in the future');
    }

    // Validate amount
    if (data.amount <= 0) {
      throw new Error('Expense amount must be greater than 0');
    }

    // Validate quantity and unit relationship
    if (data.quantity !== undefined && !data.unit) {
      throw new Error('Unit must be provided when quantity is specified');
    }

    // Create expense
    const expense = await ExpenseModel.create({
      ...data,
      createdBy: new ObjectId(data.createdBy),
    });

    // Create audit log
    const userDetails = await this.getUserForAudit(data.createdBy);
    await AuditLogService.createLog({
      userId: data.createdBy,
      userEmail: userDetails.userEmail,
      userRole: userDetails.userRole,
      action: 'expense.create',
      resource: 'expense',
      resourceId: expense._id.toString(),
      details: {
        expenseId: expense._id.toString(),
        expenseType: expense.expenseType,
        category: expense.category,
        amount: expense.amount,
        description: expense.description,
      },
    });

    return expense;
  }

  /**
   * Get expenses by date range with optional filters
   */
  static async getExpensesByDateRange(
    startDate: Date,
    endDate: Date,
    filters?: ExpenseFilters
  ): Promise<IExpense[]> {
    const query: any = {
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    // Apply filters
    if (filters?.expenseType) {
      query.expenseType = filters.expenseType;
    }

    if (filters?.category) {
      query.category = filters.category;
    }

    if (filters?.searchTerm) {
      query.$text = { $search: filters.searchTerm };
    }

    const expenses = await ExpenseModel.find(query)
      .populate({
        path: 'createdBy',
        select: 'firstName lastName email',
        options: { strictPopulate: false },
      })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return expenses as IExpense[];
  }

  /**
   * Get expense summary for a date range
   */
  static async getExpenseSummary(
    startDate: Date,
    endDate: Date
  ): Promise<ExpenseSummary> {
    const expenses = await this.getExpensesByDateRange(startDate, endDate);

    let totalDirectCosts = 0;
    let totalOperatingExpenses = 0;
    const directCostsByCategory: Record<string, number> = {};
    const operatingExpensesByCategory: Record<string, number> = {};

    expenses.forEach((expense) => {
      if (expense.expenseType === 'direct-cost') {
        totalDirectCosts += expense.amount;
        directCostsByCategory[expense.category] =
          (directCostsByCategory[expense.category] || 0) + expense.amount;
      } else {
        totalOperatingExpenses += expense.amount;
        operatingExpensesByCategory[expense.category] =
          (operatingExpensesByCategory[expense.category] || 0) + expense.amount;
      }
    });

    return {
      totalDirectCosts,
      totalOperatingExpenses,
      totalExpenses: totalDirectCosts + totalOperatingExpenses,
      directCostsByCategory,
      operatingExpensesByCategory,
      expenseCount: expenses.length,
    };
  }

  /**
   * Get expense by ID
   */
  static async getExpenseById(id: string): Promise<IExpense | null> {
    const expense = await ExpenseModel.findById(id)
      .populate({
        path: 'createdBy',
        select: 'firstName lastName email',
        options: { strictPopulate: false },
      })
      .lean();

    return expense as IExpense | null;
  }

  /**
   * Update an expense
   */
  static async updateExpense(
    id: string,
    data: UpdateExpenseDTO,
    updatedBy: string
  ): Promise<IExpense> {
    // Validate date if provided
    if (data.date) {
      const now = new Date();
      if (data.date > now) {
        throw new Error('Expense date cannot be in the future');
      }
    }

    // Validate amount if provided
    if (data.amount !== undefined && data.amount <= 0) {
      throw new Error('Expense amount must be greater than 0');
    }

    // Validate quantity and unit relationship
    if (data.quantity !== undefined && !data.unit) {
      throw new Error('Unit must be provided when quantity is specified');
    }

    const expense = await ExpenseModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    )
      .populate({
        path: 'createdBy',
        select: 'firstName lastName email',
        options: { strictPopulate: false },
      })
      .lean();

    if (!expense) {
      throw new Error('Expense not found');
    }

    // Create audit log
    const userDetails = await this.getUserForAudit(updatedBy);
    await AuditLogService.createLog({
      userId: updatedBy,
      userEmail: userDetails.userEmail,
      userRole: userDetails.userRole,
      action: 'expense.update',
      resource: 'expense',
      resourceId: id,
      details: {
        expenseId: id,
        updates: data,
      },
    });

    return expense as IExpense;
  }

  /**
   * Delete an expense
   */
  static async deleteExpense(id: string, deletedBy: string): Promise<void> {
    const expense = await ExpenseModel.findById(id);

    if (!expense) {
      throw new Error('Expense not found');
    }

    await ExpenseModel.findByIdAndDelete(id);

    // Create audit log
    const userDetails = await this.getUserForAudit(deletedBy);
    await AuditLogService.createLog({
      userId: deletedBy,
      userEmail: userDetails.userEmail,
      userRole: userDetails.userRole,
      action: 'expense.delete',
      resource: 'expense',
      resourceId: id,
      details: {
        expenseId: id,
        expenseType: expense.expenseType,
        category: expense.category,
        amount: expense.amount,
        description: expense.description,
        date: expense.date,
      },
    });
  }

  /**
   * Get expenses for a specific date (for daily reports)
   */
  static async getExpensesForDate(date: Date): Promise<IExpense[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.getExpensesByDateRange(startOfDay, endOfDay);
  }

  /**
   * Get direct costs for a date range (for financial reports)
   */
  static async getDirectCosts(startDate: Date, endDate: Date): Promise<number> {
    const result = await ExpenseModel.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          expenseType: 'direct-cost',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  /**
   * Get operating expenses for a date range (for financial reports)
   */
  static async getOperatingExpenses(
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const result = await ExpenseModel.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          expenseType: 'operating-expense',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  /**
   * Get expense breakdown by category for a date range
   */
  static async getExpensesByCategory(
    startDate: Date,
    endDate: Date,
    expenseType?: 'direct-cost' | 'operating-expense'
  ): Promise<Record<string, number>> {
    const matchStage: any = {
      date: { $gte: startDate, $lte: endDate },
    };

    if (expenseType) {
      matchStage.expenseType = expenseType;
    }

    const result = await ExpenseModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const breakdown: Record<string, number> = {};
    result.forEach((item) => {
      breakdown[item._id] = item.total;
    });

    return breakdown;
  }

  /**
   * Get all unique categories used in expenses
   */
  static async getUsedCategories(): Promise<{
    directCostCategories: string[];
    operatingExpenseCategories: string[];
  }> {
    const directCostCategories = await ExpenseModel.distinct('category', {
      expenseType: 'direct-cost',
    });

    const operatingExpenseCategories = await ExpenseModel.distinct('category', {
      expenseType: 'operating-expense',
    });

    return {
      directCostCategories,
      operatingExpenseCategories,
    };
  }
}
