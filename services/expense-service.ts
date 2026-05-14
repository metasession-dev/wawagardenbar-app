import { ObjectId } from 'mongodb';
import { Types } from 'mongoose';
import { ExpenseModel } from '@/models';
import UserModel from '@/models/user-model';
import {
  IExpense,
  CreateExpenseDTO,
  UpdateExpenseDTO,
  ExpenseFilters,
  ExpenseSummary,
} from '@/interfaces/expense.interface';
import {
  SEARCHABLE_STRING_FIELDS,
  buildLiteralSearchRegex,
  parseNumericTerm,
} from '@/lib/expense-search';
import { AuditLogService } from './audit-log-service';
import {
  applyExpenseInventoryLink,
  reverseExpenseInventoryLink,
} from './expense-inventory-link-service';

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
   * Create a new expense.
   *
   * REQ-034 AC6 — If `linkedInventoryId` is set, fires the Expense → Inventory
   * side-effects (StockMovement, currentStock $inc, cost-history close + insert).
   * The main flow (Form → pending group → confirmTransfer) reuses these effects
   * via PendingExpenseGroupService; this entry point exists so the CSV import
   * approval path stays consistent.
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
      linkedInventoryId: data.linkedInventoryId
        ? new ObjectId(data.linkedInventoryId)
        : undefined,
      createdBy: new ObjectId(data.createdBy),
    });

    if (data.linkedInventoryId) {
      try {
        await applyExpenseInventoryLink({
          expenseId: expense._id as Types.ObjectId,
          linkedInventoryId: new Types.ObjectId(data.linkedInventoryId),
          quantity: data.quantity,
          expenseUnit: data.unit,
          amount: data.amount,
          supplier: data.supplier,
          notes: data.notes,
          date: data.date,
          performedBy: data.createdBy,
        });
      } catch (err) {
        console.error(
          `[REQ-034] createExpense: link side-effects failed for ${expense._id.toString()}:`,
          err
        );
      }
    }

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
   * Get expenses by date range with optional filters.
   *
   * @requirement REQ-029 — searchTerm matches across description, notes,
   * supplier, receiptReference, referenceNumber (case-insensitive literal
   * substring) and exact amount when the term is a finite number. Replaces the
   * previous `$text` path so that references containing pipes (e.g. TRF
   * transfer references) are searchable.
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

    const trimmedTerm = filters?.searchTerm?.trim() ?? '';
    if (trimmedTerm !== '') {
      const pattern = buildLiteralSearchRegex(trimmedTerm);
      const or: Array<Record<string, unknown>> = SEARCHABLE_STRING_FIELDS.map(
        (field) => ({ [field]: pattern })
      );
      const numeric = parseNumericTerm(trimmedTerm);
      if (numeric !== null) {
        or.push({ amount: numeric });
      }
      query.$or = or;
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
   *
   * REQ-034 AC7 — If the expense was previously linked to a kitchen-ingredient
   * inventory row (linkedInventoryId set, linkVoidedAt unset), and the
   * update touches the link, quantity, or amount, we run a reversal of the
   * prior side-effects then re-apply with the new values. The reversal is
   * blocked (no state written) if it would drive Inventory.currentStock
   * below zero.
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

    const prior = await ExpenseModel.findById(id);
    if (!prior) {
      throw new Error('Expense not found');
    }

    // REQ-034 AC7 — figure out whether the inventory link is affected by
    // this update and what the reversal / re-apply quantities should be.
    const priorLinkActive = !!prior.linkedInventoryId && !prior.linkVoidedAt;
    const linkChangeRequested = data.linkedInventoryId !== undefined;
    const quantityChanged =
      data.quantity !== undefined && data.quantity !== prior.quantity;
    const amountChanged =
      data.amount !== undefined && data.amount !== prior.amount;
    const linkAffected =
      priorLinkActive &&
      (linkChangeRequested || quantityChanged || amountChanged);

    if (linkAffected) {
      await reverseExpenseInventoryLink({
        expenseId: prior._id as Types.ObjectId,
        linkedInventoryId: prior.linkedInventoryId as Types.ObjectId,
        quantity: prior.quantity,
        expenseUnit: prior.unit,
        performedBy: updatedBy,
        reason: `Expense edit reversal (${prior._id.toString()})`,
        // Will reset `linkVoidedAt` below when we re-apply.
      });
    }

    // Build the $set / $unset payload. `linkedInventoryId: null` clears.
    const setPayload: Record<string, unknown> = {};
    const unsetPayload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (k === 'linkedInventoryId') continue;
      if (v !== undefined) setPayload[k] = v;
    }
    if (linkChangeRequested) {
      if (data.linkedInventoryId === null || data.linkedInventoryId === '') {
        unsetPayload.linkedInventoryId = '';
        unsetPayload.stockMovementId = '';
      } else if (data.linkedInventoryId) {
        setPayload.linkedInventoryId = new Types.ObjectId(
          data.linkedInventoryId
        );
      }
    }

    const updateOps: Record<string, unknown> = {};
    if (Object.keys(setPayload).length > 0) updateOps.$set = setPayload;
    if (Object.keys(unsetPayload).length > 0) updateOps.$unset = unsetPayload;

    const expense = await ExpenseModel.findByIdAndUpdate(id, updateOps, {
      new: true,
      runValidators: true,
    })
      .populate({
        path: 'createdBy',
        select: 'firstName lastName email',
        options: { strictPopulate: false },
      })
      .lean();

    if (!expense) {
      throw new Error('Expense not found');
    }

    // Re-apply the link if the updated expense still has one and the
    // reversal ran (or the link is brand-new on this update).
    const e = expense as unknown as IExpense;
    if (e.linkedInventoryId) {
      const linkNeedsApply =
        linkAffected || (!priorLinkActive && linkChangeRequested);
      if (linkNeedsApply) {
        await applyExpenseInventoryLink({
          expenseId: e._id as Types.ObjectId,
          linkedInventoryId: e.linkedInventoryId as Types.ObjectId,
          quantity: e.quantity,
          expenseUnit: e.unit,
          amount: e.amount,
          supplier: e.supplier,
          notes: e.notes,
          date: e.date,
          performedBy: updatedBy,
        });
      }
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
   *
   * REQ-034 AC7 — If the expense had an active inventory link, void the
   * linked StockMovement (audit-preserving compensating movement) and
   * decrement the linked Inventory.currentStock by the original quantity.
   * Blocks (no Mongo writes performed) if the reversal would drive
   * currentStock below 0.
   */
  static async deleteExpense(id: string, deletedBy: string): Promise<void> {
    const expense = await ExpenseModel.findById(id);

    if (!expense) {
      throw new Error('Expense not found');
    }

    if (expense.linkedInventoryId && !expense.linkVoidedAt) {
      await reverseExpenseInventoryLink({
        expenseId: expense._id as Types.ObjectId,
        linkedInventoryId: expense.linkedInventoryId as Types.ObjectId,
        quantity: expense.quantity,
        expenseUnit: expense.unit,
        performedBy: deletedBy,
        reason: `Expense delete reversal (${expense._id.toString()})`,
      });
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
