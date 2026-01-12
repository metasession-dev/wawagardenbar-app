import { UploadedExpenseModel } from '@/models/uploaded-expense-model';
import { ExpenseModel } from '@/models/expense-model';
import { AuditLogService } from '@/services/audit-log-service';
import mongoose from 'mongoose';
import {
  CreateUploadedExpenseDTO,
  UpdateUploadedExpenseDTO,
  UploadedExpenseFilters,
  IUploadedExpense,
} from '@/interfaces/uploaded-expense.interface';

/**
 * Helper function to get user details for audit logging
 */
async function getUserDetails(userId: string): Promise<{ email: string; role: string }> {
  try {
    const UserModel = mongoose.models.User || mongoose.model('User');
    const user = await UserModel.findById(userId).select('email role').lean() as any;
    return {
      email: user?.email || 'unknown',
      role: user?.role || 'unknown',
    };
  } catch {
    return { email: 'unknown', role: 'unknown' };
  }
}

export class UploadedExpenseService {
  /**
   * Create uploaded expense
   */
  static async createUploadedExpense(
    input: CreateUploadedExpenseDTO
  ): Promise<IUploadedExpense> {
    const uploadedExpense = await UploadedExpenseModel.create({
      date: input.date,
      description: input.description,
      amount: input.amount,
      transactionFee: input.transactionFee,
      referenceNumber: input.referenceNumber,
      originalData: input.originalData,
      uploadedBy: new mongoose.Types.ObjectId(input.uploadedBy),
      uploadedAt: new Date(),
      status: 'pending',
    });

    return uploadedExpense.toObject();
  }

  /**
   * Bulk create uploaded expenses
   */
  static async bulkCreateUploadedExpenses(
    expenses: CreateUploadedExpenseDTO[]
  ): Promise<IUploadedExpense[]> {
    const uploadedExpenses = await UploadedExpenseModel.insertMany(expenses);
    return uploadedExpenses.map((exp) => exp.toObject());
  }

  /**
   * List uploaded expenses with filters and pagination
   */
  static async listUploadedExpenses(
    filters: UploadedExpenseFilters,
    page: number = 1,
    limit: number = 50
  ) {
    const query: any = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) {
        query.date.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.date.$lte = filters.endDate;
      }
    }

    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      query.amount = {};
      if (filters.minAmount !== undefined) {
        query.amount.$gte = filters.minAmount;
      }
      if (filters.maxAmount !== undefined) {
        query.amount.$lte = filters.maxAmount;
      }
    }

    if (filters.uploadedBy) {
      query.uploadedBy = new mongoose.Types.ObjectId(filters.uploadedBy);
    }

    const skip = (page - 1) * limit;

    const [expenses, total] = await Promise.all([
      UploadedExpenseModel.find(query)
        .sort({ uploadedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('uploadedBy', 'name email')
        .populate('approvedBy', 'name email')
        .lean(),
      UploadedExpenseModel.countDocuments(query),
    ]);

    return {
      expenses: JSON.parse(JSON.stringify(expenses)),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get uploaded expense by ID
   */
  static async getUploadedExpenseById(id: string): Promise<IUploadedExpense | null> {
    const expense = await UploadedExpenseModel.findById(id)
      .populate('uploadedBy', 'name email')
      .populate('approvedBy', 'name email')
      .lean();

    return expense ? JSON.parse(JSON.stringify(expense)) : null;
  }

  /**
   * Update uploaded expense
   */
  static async updateUploadedExpense(
    id: string,
    updates: UpdateUploadedExpenseDTO,
    userId: string
  ): Promise<IUploadedExpense | null> {
    const expense = await UploadedExpenseModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    if (expense) {
      const userDetails = await getUserDetails(userId);
      
      await AuditLogService.createLog({
        userId: userId,
        userEmail: userDetails.email,
        userRole: userDetails.role,
        action: 'expense.uploaded_expense_updated',
        resource: 'UploadedExpense',
        resourceId: id,
        details: { updates },
      });
    }

    return expense ? JSON.parse(JSON.stringify(expense)) : null;
  }

  /**
   * Approve uploaded expense and create actual expense
   */
  static async approveUploadedExpense(
    id: string,
    userId: string
  ): Promise<{ expenseId: string; feeExpenseId?: string }> {
    const uploadedExpense = await UploadedExpenseModel.findById(id);

    if (!uploadedExpense) {
      throw new Error('Uploaded expense not found');
    }

    if (uploadedExpense.status !== 'pending') {
      throw new Error('Expense has already been processed');
    }

    // Validate required fields
    if (!uploadedExpense.category || !uploadedExpense.expenseType) {
      throw new Error('Category and expense type must be set before approval');
    }

    // Create actual expense (primary transaction)
    const expense = await ExpenseModel.create({
      date: uploadedExpense.date,
      description: uploadedExpense.description,
      amount: uploadedExpense.amount,
      transactionFee: uploadedExpense.transactionFee,
      expenseType: uploadedExpense.expenseType,
      category: uploadedExpense.category,
      referenceNumber: uploadedExpense.referenceNumber,
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    // Option A: create a separate operating expense row for the bank fee
    // When a transaction fee exists, we treat it as an additional
    // operating expense under the "Bank Charges" category.
    let feeExpenseId: string | undefined;

    if (uploadedExpense.transactionFee && uploadedExpense.transactionFee > 0) {
      const feeExpense = await ExpenseModel.create({
        date: uploadedExpense.date,
        description: `Bank Charges - ${uploadedExpense.description}`,
        amount: uploadedExpense.transactionFee,
        transactionFee: 0,
        expenseType: 'operating-expense',
        category: 'Bank Charges',
        referenceNumber: uploadedExpense.referenceNumber,
        createdBy: new mongoose.Types.ObjectId(userId),
      });

      feeExpenseId = feeExpense._id.toString();
    }

    // Update uploaded expense status
    uploadedExpense.status = 'approved';
    uploadedExpense.approvedBy = new mongoose.Types.ObjectId(userId);
    uploadedExpense.approvedAt = new Date();
    await uploadedExpense.save();

    // Audit log
    const userDetails = await getUserDetails(userId);

    const auditDetails: Record<string, unknown> = {
      uploadedExpenseId: id,
      amount: expense.amount,
    };

    if (feeExpenseId) {
      auditDetails.feeExpenseId = feeExpenseId;
      auditDetails.feeAmount = uploadedExpense.transactionFee;
    }

    await AuditLogService.createLog({
      userId: userId,
      userEmail: userDetails.email,
      userRole: userDetails.role,
      action: 'expense.uploaded_expense_approved',
      resource: 'Expense',
      resourceId: expense._id.toString(),
      details: auditDetails,
    });

    return { expenseId: expense._id.toString(), feeExpenseId };
  }

  /**
   * Bulk approve uploaded expenses
   */
  static async bulkApproveUploadedExpenses(
    ids: string[],
    userId: string
  ): Promise<{ approvedCount: number; errors: string[] }> {
    let approvedCount = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        await this.approveUploadedExpense(id, userId);
        approvedCount++;
      } catch (error) {
        errors.push(
          `Failed to approve ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return { approvedCount, errors };
  }

  /**
   * Reject uploaded expense
   */
  static async rejectUploadedExpense(id: string, userId: string): Promise<void> {
    const uploadedExpense = await UploadedExpenseModel.findById(id);

    if (!uploadedExpense) {
      throw new Error('Uploaded expense not found');
    }

    if (uploadedExpense.status !== 'pending') {
      throw new Error('Expense has already been processed');
    }

    uploadedExpense.status = 'rejected';
    uploadedExpense.rejectedBy = new mongoose.Types.ObjectId(userId);
    uploadedExpense.rejectedAt = new Date();
    await uploadedExpense.save();

    const userDetails = await getUserDetails(userId);
    await AuditLogService.createLog({
      userId: userId,
      userEmail: userDetails.email,
      userRole: userDetails.role,
      action: 'expense.uploaded_expense_rejected',
      resource: 'UploadedExpense',
      resourceId: id,
      details: { amount: uploadedExpense.amount },
    });
  }

  /**
   * Delete uploaded expense
   */
  static async deleteUploadedExpense(id: string, userId: string): Promise<void> {
    await UploadedExpenseModel.findByIdAndDelete(id);

    const userDetails = await getUserDetails(userId);
    await AuditLogService.createLog({
      userId: userId,
      userEmail: userDetails.email,
      userRole: userDetails.role,
      action: 'expense.uploaded_expense_deleted',
      resource: 'UploadedExpense',
      resourceId: id,
    });
  }

  /**
   * Bulk delete uploaded expenses
   */
  static async bulkDeleteUploadedExpenses(
    ids: string[],
    userId: string
  ): Promise<{ deletedCount: number }> {
    const result = await UploadedExpenseModel.deleteMany({
      _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) },
    });

    const userDetails = await getUserDetails(userId);
    await AuditLogService.createLog({
      userId: userId,
      userEmail: userDetails.email,
      userRole: userDetails.role,
      action: 'expense.uploaded_expenses_bulk_deleted',
      resource: 'UploadedExpense',
      details: { count: result.deletedCount },
    });

    return { deletedCount: result.deletedCount || 0 };
  }

  /**
   * Get existing reference numbers
   */
  static async getExistingReferenceNumbers(): Promise<Set<string>> {
    const [uploadedRefs, expenseRefs] = await Promise.all([
      UploadedExpenseModel.find({}, { referenceNumber: 1 }).lean(),
      ExpenseModel.find({ referenceNumber: { $exists: true } }, { referenceNumber: 1 }).lean(),
    ]);

    const references = new Set<string>();
    
    uploadedRefs.forEach((doc) => {
      if (doc.referenceNumber) references.add(doc.referenceNumber);
    });
    
    expenseRefs.forEach((doc) => {
      if (doc.referenceNumber) references.add(doc.referenceNumber);
    });

    return references;
  }

  /**
   * Get statistics
   */
  static async getStatistics(uploadedBy?: string) {
    const query: any = {};
    if (uploadedBy) {
      query.uploadedBy = new mongoose.Types.ObjectId(uploadedBy);
    }

    const [pending, approved, rejected, totalAmount] = await Promise.all([
      UploadedExpenseModel.countDocuments({ ...query, status: 'pending' }),
      UploadedExpenseModel.countDocuments({ ...query, status: 'approved' }),
      UploadedExpenseModel.countDocuments({ ...query, status: 'rejected' }),
      UploadedExpenseModel.aggregate([
        { $match: { ...query, status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    return {
      pending,
      approved,
      rejected,
      totalAmount: totalAmount[0]?.total || 0,
    };
  }
}
