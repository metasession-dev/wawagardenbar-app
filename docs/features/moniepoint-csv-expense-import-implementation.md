# Moniepoint CSV Expense Import - Implementation Guide

## Overview

This document provides technical implementation details for the Moniepoint CSV expense import feature. It covers database schema, service layer, API routes, UI components, and integration points.

---

## Table of Contents

1. [Database Schema](#database-schema)
2. [Service Layer](#service-layer)
3. [Server Actions](#server-actions)
4. [API Routes](#api-routes)
5. [UI Components](#ui-components)
6. [File Structure](#file-structure)
7. [Implementation Steps](#implementation-steps)
8. [Testing Strategy](#testing-strategy)

---

## Database Schema

### 1. UploadedExpense Model

**File:** `/models/uploaded-expense-model.ts`

```typescript
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUploadedExpense extends Document {
  // Mapped expense fields
  date: Date;
  description: string;
  amount: number;
  transactionFee: number;
  category?: string;
  type?: string;
  referenceNumber: string;
  
  // Upload metadata
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  
  // Original CSV data
  originalData: {
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
  };
  
  // Approval metadata
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectedBy?: mongoose.Types.ObjectId;
  rejectedAt?: Date;
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
}

const UploadedExpenseSchema = new Schema<IUploadedExpense>(
  {
    date: {
      type: Date,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    transactionFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    category: {
      type: String,
      required: false,
    },
    type: {
      type: String,
      required: false,
    },
    referenceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    originalData: {
      transactionType: String,
      transactionStatus: String,
      terminalId: String,
      rrn: Number,
      reversalStatus: Number,
      settlementDebit: Number,
      settlementCredit: Number,
      balanceBefore: Number,
      balanceAfter: Number,
      beneficiary: String,
      beneficiaryInstitution: String,
      source: String,
      sourceInstitution: String,
      narration: String,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
UploadedExpenseSchema.index({ status: 1, uploadedAt: -1 });
UploadedExpenseSchema.index({ uploadedBy: 1, status: 1 });

const UploadedExpenseModel: Model<IUploadedExpense> =
  mongoose.models.UploadedExpense ||
  mongoose.model<IUploadedExpense>('UploadedExpense', UploadedExpenseSchema);

export default UploadedExpenseModel;
```

### 2. Update Expense Model

**File:** `/models/expense-model.ts`

Add the `transactionFee` field to the existing Expense schema:

```typescript
// Add to existing schema
transactionFee: {
  type: Number,
  default: 0,
  min: 0,
},
```

Update the interface:

```typescript
export interface IExpense extends Document {
  // ... existing fields ...
  transactionFee: number;
  // ... existing fields ...
}
```

---

## Service Layer

### 1. CSV Parser Service

**File:** `/services/csv-parser-service.ts`

```typescript
import Papa from 'papaparse';
import { parse, isValid } from 'date-fns';

interface MoniepointTransaction {
  Date: string;
  'Account Name': string;
  'Transaction Type': string;
  'Transaction Status': string;
  'Terminal ID': string;
  RRN: string;
  'Transaction Ref': string;
  'Reversal Status': string;
  'Transaction Amount (NGN)': string;
  'Settlement Debit (NGN)': string;
  'Settlement Credit (NGN)': string;
  'Balance Before (NGN)': string;
  'Balance After (NGN)': string;
  'Charge (NGN)': string;
  Beneficiary: string;
  'Beneficiary Institution': string;
  Source: string;
  'Source Institution': string;
  Narration: string;
}

interface ParsedExpense {
  date: Date;
  description: string;
  amount: number;
  transactionFee: number;
  referenceNumber: string;
  originalData: Record<string, any>;
}

interface ParseResult {
  success: boolean;
  expenses: ParsedExpense[];
  errors: string[];
  stats: {
    totalRows: number;
    expensesExtracted: number;
    duplicatesSkipped: number;
    invalidRows: number;
  };
}

export class CSVParserService {
  /**
   * Parse Moniepoint CSV file and extract expenses
   */
  static async parseMoniepointCSV(
    fileContent: string,
    existingReferences: Set<string>
  ): Promise<ParseResult> {
    const expenses: ParsedExpense[] = [];
    const errors: string[] = [];
    let totalRows = 0;
    let duplicatesSkipped = 0;
    let invalidRows = 0;

    try {
      // Parse CSV
      const parseResult = Papa.parse<MoniepointTransaction>(fileContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
      });

      if (parseResult.errors.length > 0) {
        parseResult.errors.forEach((error) => {
          errors.push(`Row ${error.row}: ${error.message}`);
        });
      }

      const rows = parseResult.data;
      totalRows = rows.length;

      // Skip metadata rows (first 7 rows typically)
      // Moniepoint CSVs have metadata in first 7 rows, transactions start at row 8
      const transactionRows = rows.slice(7);

      for (let i = 0; i < transactionRows.length; i++) {
        const row = transactionRows[i];
        const rowNumber = i + 8; // Actual row number in CSV

        try {
          const expense = this.parseTransaction(row, rowNumber);
          
          if (expense) {
            // Check for duplicates
            if (existingReferences.has(expense.referenceNumber)) {
              duplicatesSkipped++;
              continue;
            }

            expenses.push(expense);
            existingReferences.add(expense.referenceNumber);
          }
        } catch (error) {
          invalidRows++;
          errors.push(
            `Row ${rowNumber}: ${error instanceof Error ? error.message : 'Invalid data'}`
          );
        }
      }

      return {
        success: true,
        expenses,
        errors,
        stats: {
          totalRows,
          expensesExtracted: expenses.length,
          duplicatesSkipped,
          invalidRows,
        },
      };
    } catch (error) {
      return {
        success: false,
        expenses: [],
        errors: [
          `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        stats: {
          totalRows: 0,
          expensesExtracted: 0,
          duplicatesSkipped: 0,
          invalidRows: 0,
        },
      };
    }
  }

  /**
   * Parse individual transaction row
   */
  private static parseTransaction(
    row: MoniepointTransaction,
    rowNumber: number
  ): ParsedExpense | null {
    const settlementDebit = this.parseNumber(row['Settlement Debit (NGN)']);

    // Skip if not an expense (no debit)
    if (!settlementDebit || settlementDebit <= 0) {
      return null;
    }

    const transactionAmount = this.parseNumber(row['Transaction Amount (NGN)']);
    const charge = this.parseNumber(row['Charge (NGN)']) || 0;
    const narration = row.Narration?.trim();
    const transactionRef = row['Transaction Ref']?.trim();

    if (!transactionRef) {
      throw new Error('Missing transaction reference');
    }

    // Parse date
    const date = this.parseDate(row.Date);
    if (!date) {
      throw new Error('Invalid date format');
    }

    // Rule 1: Standard expense transaction
    if (transactionAmount && transactionAmount > 0) {
      return {
        date,
        description: narration || 'No description',
        amount: transactionAmount,
        transactionFee: charge,
        referenceNumber: transactionRef,
        originalData: this.extractOriginalData(row),
      };
    }

    // Rule 2: Electronic Money Transfer Levy
    if (
      (!transactionAmount || transactionAmount === 0) &&
      settlementDebit > 0 &&
      (!narration || narration.toLowerCase() === 'null' || narration === '')
    ) {
      return {
        date,
        description: 'Electronic Money Transfer Levy',
        amount: 50,
        transactionFee: 0,
        referenceNumber: transactionRef,
        originalData: this.extractOriginalData(row),
      };
    }

    // If neither rule matches, skip
    return null;
  }

  /**
   * Parse number from string
   */
  private static parseNumber(value: string | undefined): number | null {
    if (!value) return null;
    
    // Remove commas and parse
    const cleaned = value.replace(/,/g, '');
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Parse date from string
   */
  private static parseDate(dateString: string | undefined): Date | null {
    if (!dateString) return null;

    // Try multiple date formats
    const formats = [
      'yyyy-MM-dd HH:mm:ss',
      'dd/MM/yyyy HH:mm:ss',
      'MM/dd/yyyy HH:mm:ss',
      'yyyy-MM-dd',
      'dd/MM/yyyy',
      'MM/dd/yyyy',
    ];

    for (const format of formats) {
      try {
        const parsed = parse(dateString, format, new Date());
        if (isValid(parsed)) {
          return parsed;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
   * Extract original CSV data for reference
   */
  private static extractOriginalData(row: MoniepointTransaction): Record<string, any> {
    return {
      transactionType: row['Transaction Type'],
      transactionStatus: row['Transaction Status'],
      terminalId: row['Terminal ID'],
      rrn: this.parseNumber(row.RRN),
      reversalStatus: this.parseNumber(row['Reversal Status']),
      settlementDebit: this.parseNumber(row['Settlement Debit (NGN)']),
      settlementCredit: this.parseNumber(row['Settlement Credit (NGN)']),
      balanceBefore: this.parseNumber(row['Balance Before (NGN)']),
      balanceAfter: this.parseNumber(row['Balance After (NGN)']),
      beneficiary: row.Beneficiary,
      beneficiaryInstitution: row['Beneficiary Institution'],
      source: row.Source,
      sourceInstitution: row['Source Institution'],
      narration: row.Narration,
    };
  }

  /**
   * Validate CSV structure
   */
  static validateMoniepointCSV(fileContent: string): {
    valid: boolean;
    error?: string;
  } {
    try {
      const parseResult = Papa.parse(fileContent, {
        header: true,
        preview: 10, // Only check first 10 rows
      });

      const requiredColumns = [
        'Date',
        'Settlement Debit (NGN)',
        'Transaction Amount (NGN)',
        'Transaction Ref',
        'Charge (NGN)',
        'Narration',
      ];

      const headers = parseResult.meta.fields || [];
      const missingColumns = requiredColumns.filter(
        (col) => !headers.includes(col)
      );

      if (missingColumns.length > 0) {
        return {
          valid: false,
          error: `Missing required columns: ${missingColumns.join(', ')}`,
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Invalid CSV format: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
```

### 2. Uploaded Expense Service

**File:** `/services/uploaded-expense-service.ts`

```typescript
import UploadedExpenseModel, { IUploadedExpense } from '@/models/uploaded-expense-model';
import ExpenseModel from '@/models/expense-model';
import { AuditLogService } from '@/services/audit-log-service';
import mongoose from 'mongoose';

interface CreateUploadedExpenseInput {
  date: Date;
  description: string;
  amount: number;
  transactionFee: number;
  referenceNumber: string;
  originalData: Record<string, any>;
  uploadedBy: string;
}

interface ListUploadedExpensesFilters {
  status?: 'pending' | 'approved' | 'rejected';
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  uploadedBy?: string;
}

interface UpdateUploadedExpenseInput {
  date?: Date;
  description?: string;
  amount?: number;
  transactionFee?: number;
  category?: string;
  type?: string;
}

export class UploadedExpenseService {
  /**
   * Create uploaded expense
   */
  static async createUploadedExpense(
    input: CreateUploadedExpenseInput
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

    return uploadedExpense;
  }

  /**
   * Bulk create uploaded expenses
   */
  static async bulkCreateUploadedExpenses(
    expenses: CreateUploadedExpenseInput[]
  ): Promise<IUploadedExpense[]> {
    const uploadedExpenses = await UploadedExpenseModel.insertMany(expenses);
    return uploadedExpenses;
  }

  /**
   * List uploaded expenses with filters and pagination
   */
  static async listUploadedExpenses(
    filters: ListUploadedExpensesFilters,
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
    updates: UpdateUploadedExpenseInput,
    userId: string
  ): Promise<IUploadedExpense | null> {
    const expense = await UploadedExpenseModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    if (expense) {
      await AuditLogService.createLog({
        userId: new mongoose.Types.ObjectId(userId),
        action: 'expense.uploaded_expense_updated',
        resourceType: 'UploadedExpense',
        resourceId: new mongoose.Types.ObjectId(id),
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
  ): Promise<{ expenseId: string }> {
    const uploadedExpense = await UploadedExpenseModel.findById(id);

    if (!uploadedExpense) {
      throw new Error('Uploaded expense not found');
    }

    if (uploadedExpense.status !== 'pending') {
      throw new Error('Expense has already been processed');
    }

    // Create actual expense
    const expense = await ExpenseModel.create({
      date: uploadedExpense.date,
      description: uploadedExpense.description,
      amount: uploadedExpense.amount,
      transactionFee: uploadedExpense.transactionFee,
      category: uploadedExpense.category || 'operating-expense',
      type: uploadedExpense.type || 'other',
      referenceNumber: uploadedExpense.referenceNumber,
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    // Update uploaded expense status
    uploadedExpense.status = 'approved';
    uploadedExpense.approvedBy = new mongoose.Types.ObjectId(userId);
    uploadedExpense.approvedAt = new Date();
    await uploadedExpense.save();

    // Audit log
    await AuditLogService.createLog({
      userId: new mongoose.Types.ObjectId(userId),
      action: 'expense.uploaded_expense_approved',
      resourceType: 'Expense',
      resourceId: expense._id as mongoose.Types.ObjectId,
      details: {
        uploadedExpenseId: id,
        amount: expense.amount,
      },
    });

    return { expenseId: expense._id.toString() };
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

    await AuditLogService.createLog({
      userId: new mongoose.Types.ObjectId(userId),
      action: 'expense.uploaded_expense_rejected',
      resourceType: 'UploadedExpense',
      resourceId: new mongoose.Types.ObjectId(id),
      details: { amount: uploadedExpense.amount },
    });
  }

  /**
   * Delete uploaded expense
   */
  static async deleteUploadedExpense(id: string, userId: string): Promise<void> {
    await UploadedExpenseModel.findByIdAndDelete(id);

    await AuditLogService.createLog({
      userId: new mongoose.Types.ObjectId(userId),
      action: 'expense.uploaded_expense_deleted',
      resourceType: 'UploadedExpense',
      resourceId: new mongoose.Types.ObjectId(id),
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

    await AuditLogService.createLog({
      userId: new mongoose.Types.ObjectId(userId),
      action: 'expense.uploaded_expenses_bulk_deleted',
      resourceType: 'UploadedExpense',
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
```

---

## Server Actions

### File: `/app/actions/expenses/csv-import-actions.ts`

```typescript
'use server';

import { getServerSession } from '@/lib/auth';
import { requireAdmin } from '@/lib/auth-helpers';
import { CSVParserService } from '@/services/csv-parser-service';
import { UploadedExpenseService } from '@/services/uploaded-expense-service';
import { connectToDatabase } from '@/lib/mongodb';

/**
 * Import Moniepoint CSV file
 */
export async function importMoniepointCSVAction(formData: FormData) {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    requireAdmin(session);

    const file = formData.get('file') as File;
    
    if (!file) {
      return {
        success: false,
        error: 'No file provided',
      };
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return {
        success: false,
        error: 'Please upload a CSV file',
      };
    }

    // Validate file size (10 MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return {
        success: false,
        error: 'File size exceeds 10 MB limit',
      };
    }

    // Read file content
    const fileContent = await file.text();

    // Validate CSV structure
    const validation = CSVParserService.validateMoniepointCSV(fileContent);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || 'Invalid CSV format',
      };
    }

    // Get existing reference numbers to detect duplicates
    const existingReferences = await UploadedExpenseService.getExistingReferenceNumbers();

    // Parse CSV
    const parseResult = await CSVParserService.parseMoniepointCSV(
      fileContent,
      existingReferences
    );

    if (!parseResult.success) {
      return {
        success: false,
        error: 'Failed to parse CSV',
        errors: parseResult.errors,
      };
    }

    if (parseResult.expenses.length === 0) {
      return {
        success: false,
        error: 'No valid expense transactions found in CSV',
        stats: parseResult.stats,
      };
    }

    // Create uploaded expenses
    const expensesToCreate = parseResult.expenses.map((expense) => ({
      ...expense,
      uploadedBy: session.userId!,
    }));

    await UploadedExpenseService.bulkCreateUploadedExpenses(expensesToCreate);

    return {
      success: true,
      message: `Successfully imported ${parseResult.stats.expensesExtracted} expenses`,
      stats: parseResult.stats,
      errors: parseResult.errors,
    };
  } catch (error) {
    console.error('CSV import error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import CSV',
    };
  }
}

/**
 * List uploaded expenses
 */
export async function listUploadedExpensesAction(
  filters: {
    status?: 'pending' | 'approved' | 'rejected';
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
  },
  page: number = 1,
  limit: number = 50
) {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    requireAdmin(session);

    const parsedFilters = {
      ...filters,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    };

    const result = await UploadedExpenseService.listUploadedExpenses(
      parsedFilters,
      page,
      limit
    );

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('List uploaded expenses error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch expenses',
    };
  }
}

/**
 * Get uploaded expense by ID
 */
export async function getUploadedExpenseAction(id: string) {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    requireAdmin(session);

    const expense = await UploadedExpenseService.getUploadedExpenseById(id);

    if (!expense) {
      return {
        success: false,
        error: 'Expense not found',
      };
    }

    return {
      success: true,
      data: expense,
    };
  } catch (error) {
    console.error('Get uploaded expense error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch expense',
    };
  }
}

/**
 * Update uploaded expense
 */
export async function updateUploadedExpenseAction(
  id: string,
  updates: {
    date?: string;
    description?: string;
    amount?: number;
    transactionFee?: number;
    category?: string;
    type?: string;
  }
) {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    requireAdmin(session);

    const parsedUpdates = {
      ...updates,
      date: updates.date ? new Date(updates.date) : undefined,
    };

    const expense = await UploadedExpenseService.updateUploadedExpense(
      id,
      parsedUpdates,
      session.userId!
    );

    if (!expense) {
      return {
        success: false,
        error: 'Expense not found',
      };
    }

    return {
      success: true,
      message: 'Expense updated successfully',
      data: expense,
    };
  } catch (error) {
    console.error('Update uploaded expense error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update expense',
    };
  }
}

/**
 * Approve uploaded expense
 */
export async function approveUploadedExpenseAction(id: string) {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    requireAdmin(session);

    const result = await UploadedExpenseService.approveUploadedExpense(
      id,
      session.userId!
    );

    return {
      success: true,
      message: 'Expense approved successfully',
      data: result,
    };
  } catch (error) {
    console.error('Approve uploaded expense error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve expense',
    };
  }
}

/**
 * Bulk approve uploaded expenses
 */
export async function bulkApproveUploadedExpensesAction(ids: string[]) {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    requireAdmin(session);

    const result = await UploadedExpenseService.bulkApproveUploadedExpenses(
      ids,
      session.userId!
    );

    return {
      success: true,
      message: `Approved ${result.approvedCount} expenses`,
      data: result,
    };
  } catch (error) {
    console.error('Bulk approve error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve expenses',
    };
  }
}

/**
 * Reject uploaded expense
 */
export async function rejectUploadedExpenseAction(id: string) {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    requireAdmin(session);

    await UploadedExpenseService.rejectUploadedExpense(id, session.userId!);

    return {
      success: true,
      message: 'Expense rejected successfully',
    };
  } catch (error) {
    console.error('Reject uploaded expense error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject expense',
    };
  }
}

/**
 * Delete uploaded expense
 */
export async function deleteUploadedExpenseAction(id: string) {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    requireAdmin(session);

    await UploadedExpenseService.deleteUploadedExpense(id, session.userId!);

    return {
      success: true,
      message: 'Expense deleted successfully',
    };
  } catch (error) {
    console.error('Delete uploaded expense error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete expense',
    };
  }
}

/**
 * Bulk delete uploaded expenses
 */
export async function bulkDeleteUploadedExpensesAction(ids: string[]) {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    requireAdmin(session);

    const result = await UploadedExpenseService.bulkDeleteUploadedExpenses(
      ids,
      session.userId!
    );

    return {
      success: true,
      message: `Deleted ${result.deletedCount} expenses`,
      data: result,
    };
  } catch (error) {
    console.error('Bulk delete error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete expenses',
    };
  }
}

/**
 * Get uploaded expenses statistics
 */
export async function getUploadedExpensesStatsAction() {
  try {
    await connectToDatabase();
    const session = await getServerSession();
    requireAdmin(session);

    const stats = await UploadedExpenseService.getStatistics();

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    console.error('Get stats error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch statistics',
    };
  }
}
```

---

## UI Components

### 1. CSV Import Button

**File:** `/components/features/admin/expenses/csv-import-button.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { importMoniepointCSVAction } from '@/app/actions/expenses/csv-import-actions';
import { useRouter } from 'next/navigation';

export function CSVImportButton() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  async function handleUpload() {
    if (!file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await importMoniepointCSVAction(formData);

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
        setOpen(false);
        setFile(null);
        router.push('/dashboard/expenses/uploaded');
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to import CSV',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Moniepoint Expenses CSV Import
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Moniepoint CSV</DialogTitle>
          <DialogDescription>
            Upload a Moniepoint account statement CSV file to import expenses
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">
                {file ? file.name : 'Click to select CSV file'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                CSV files only, max 10 MB
              </p>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 2. Uploaded Expenses Page

**File:** `/app/dashboard/expenses/uploaded/page.tsx`

```typescript
import { Suspense } from 'react';
import { UploadedExpensesList } from '@/components/features/admin/expenses/uploaded-expenses-list';
import { UploadedExpensesStats } from '@/components/features/admin/expenses/uploaded-expenses-stats';
import { requireAdmin } from '@/lib/auth-helpers';
import { getServerSession } from '@/lib/auth';

export const metadata = {
  title: 'Uploaded Expenses | Wawa Garden Bar',
  description: 'Review and approve imported expenses',
};

export default async function UploadedExpensesPage() {
  const session = await getServerSession();
  requireAdmin(session);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Uploaded Expenses</h1>
        <p className="text-muted-foreground">
          Review and approve imported expenses from CSV files
        </p>
      </div>

      <Suspense fallback={<div>Loading statistics...</div>}>
        <UploadedExpensesStats />
      </Suspense>

      <Suspense fallback={<div>Loading expenses...</div>}>
        <UploadedExpensesList />
      </Suspense>
    </div>
  );
}
```

### 3. Uploaded Expenses List Component

**File:** `/components/features/admin/expenses/uploaded-expenses-list.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Edit, Check, X, Trash } from 'lucide-react';
import {
  listUploadedExpensesAction,
  approveUploadedExpenseAction,
  rejectUploadedExpenseAction,
  bulkApproveUploadedExpensesAction,
  bulkDeleteUploadedExpensesAction,
} from '@/app/actions/expenses/csv-import-actions';
import { useToast } from '@/hooks/use-toast';
import { EditUploadedExpenseDialog } from './edit-uploaded-expense-dialog';

export function UploadedExpensesList() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const { toast } = useToast();

  async function fetchExpenses() {
    setLoading(true);
    const result = await listUploadedExpensesAction({ status: 'pending' }, page, 50);
    if (result.success && result.data) {
      setExpenses(result.data.expenses);
      setPagination(result.data.pagination);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchExpenses();
  }, [page]);

  async function handleApprove(id: string) {
    const result = await approveUploadedExpenseAction(id);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
      fetchExpenses();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  }

  async function handleBulkApprove() {
    if (selectedIds.length === 0) return;
    const result = await bulkApproveUploadedExpensesAction(selectedIds);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
      setSelectedIds([]);
      fetchExpenses();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  }

  async function handleReject(id: string) {
    const result = await rejectUploadedExpenseAction(id);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
      fetchExpenses();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    const result = await bulkDeleteUploadedExpensesAction(selectedIds);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
      setSelectedIds([]);
      fetchExpenses();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  }

  const columns = [
    {
      id: 'select',
      header: ({ table }: any) => (
        <Checkbox
          checked={selectedIds.length === expenses.length}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelectedIds(expenses.map((e) => e._id));
            } else {
              setSelectedIds([]);
            }
          }}
        />
      ),
      cell: ({ row }: any) => (
        <Checkbox
          checked={selectedIds.includes(row.original._id)}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelectedIds([...selectedIds, row.original._id]);
            } else {
              setSelectedIds(selectedIds.filter((id) => id !== row.original._id));
            }
          }}
        />
      ),
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }: any) => format(new Date(row.original.date), 'MMM dd, yyyy'),
    },
    {
      accessorKey: 'description',
      header: 'Description',
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }: any) => `₦${row.original.amount.toLocaleString()}`,
    },
    {
      accessorKey: 'transactionFee',
      header: 'Fee',
      cell: ({ row }: any) => `₦${row.original.transactionFee.toLocaleString()}`,
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }: any) => row.original.category || '-',
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }: any) => row.original.type || '-',
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => (
        <div className="flex gap-2">
          <EditUploadedExpenseDialog
            expense={row.original}
            onSuccess={fetchExpenses}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleApprove(row.original._id)}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleReject(row.original._id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {selectedIds.length > 0 && (
        <div className="flex gap-2">
          <Button onClick={handleBulkApprove}>
            Approve Selected ({selectedIds.length})
          </Button>
          <Button variant="destructive" onClick={handleBulkDelete}>
            Delete Selected ({selectedIds.length})
          </Button>
        </div>
      )}
      <DataTable columns={columns} data={expenses} loading={loading} />
      {pagination && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Showing {expenses.length} of {pagination.total} expenses
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage(page + 1)}
              disabled={page === pagination.pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## File Structure

```
wawagardenbar app/
├── models/
│   ├── uploaded-expense-model.ts          # New model
│   └── expense-model.ts                   # Updated with transactionFee
│
├── services/
│   ├── csv-parser-service.ts              # New service
│   └── uploaded-expense-service.ts        # New service
│
├── app/
│   ├── actions/
│   │   └── expenses/
│   │       └── csv-import-actions.ts      # New server actions
│   │
│   └── dashboard/
│       └── expenses/
│           ├── page.tsx                   # Add CSV import button
│           └── uploaded/
│               └── page.tsx               # New page
│
├── components/
│   └── features/
│       └── admin/
│           └── expenses/
│               ├── csv-import-button.tsx           # New component
│               ├── uploaded-expenses-list.tsx      # New component
│               ├── uploaded-expenses-stats.tsx     # New component
│               ├── edit-uploaded-expense-dialog.tsx # New component
│               └── expense-form.tsx                # Update with transactionFee
│
└── docs/
    └── features/
        ├── moniepoint-csv-expense-import.md                # Requirements
        └── moniepoint-csv-expense-import-implementation.md # This file
```

---

## Implementation Steps

### Phase 1: Database & Models (Day 1)
1. ✅ Create `UploadedExpense` model
2. ✅ Update `Expense` model with `transactionFee` field
3. ✅ Create database indexes
4. ✅ Test model creation and queries

### Phase 2: Services (Day 2-3)
1. ✅ Implement `CSVParserService`
   - CSV validation
   - Transaction parsing
   - Expense identification rules
   - Duplicate detection
2. ✅ Implement `UploadedExpenseService`
   - CRUD operations
   - Approval workflow
   - Bulk operations
   - Statistics

### Phase 3: Server Actions (Day 4)
1. ✅ Create CSV import action
2. ✅ Create uploaded expenses CRUD actions
3. ✅ Create approval/rejection actions
4. ✅ Create bulk operations actions
5. ✅ Add proper error handling and validation

### Phase 4: UI Components (Day 5-6)
1. ✅ Create CSV import button and dialog
2. ✅ Create uploaded expenses page
3. ✅ Create uploaded expenses list component
4. ✅ Create edit expense dialog
5. ✅ Create statistics cards
6. ✅ Update main expenses page with import button
7. ✅ Update expense form with transaction fee field

### Phase 5: Testing (Day 7)
1. ✅ Unit tests for CSV parser
2. ✅ Unit tests for services
3. ✅ Integration tests for server actions
4. ✅ E2E tests for complete workflow
5. ✅ Test with sample Moniepoint CSV files

### Phase 6: Documentation & Deployment (Day 8)
1. ✅ Update user documentation
2. ✅ Create admin guide
3. ✅ Add to CHANGELOG
4. ✅ Deploy to staging
5. ✅ User acceptance testing
6. ✅ Deploy to production

---

## Testing Strategy

### Unit Tests

**CSV Parser Tests:**
```typescript
describe('CSVParserService', () => {
  test('should parse standard expense transaction', () => {
    // Test standard transaction parsing
  });

  test('should parse Electronic Money Transfer Levy', () => {
    // Test levy transaction parsing
  });

  test('should skip non-expense transactions', () => {
    // Test filtering logic
  });

  test('should detect duplicates', () => {
    // Test duplicate detection
  });

  test('should validate CSV structure', () => {
    // Test CSV validation
  });
});
```

**Service Tests:**
```typescript
describe('UploadedExpenseService', () => {
  test('should create uploaded expense', () => {
    // Test creation
  });

  test('should approve expense and create actual expense', () => {
    // Test approval workflow
  });

  test('should handle bulk operations', () => {
    // Test bulk approve/delete
  });
});
```

### Integration Tests

```typescript
describe('CSV Import Integration', () => {
  test('should import CSV and create uploaded expenses', async () => {
    // Test complete import flow
  });

  test('should approve expense and move to main expenses', async () => {
    // Test approval flow
  });

  test('should handle errors gracefully', async () => {
    // Test error scenarios
  });
});
```

### E2E Tests (Playwright)

```typescript
test('complete CSV import workflow', async ({ page }) => {
  // 1. Navigate to expenses page
  // 2. Click import button
  // 3. Upload CSV file
  // 4. Verify success message
  // 5. Navigate to uploaded expenses
  // 6. Edit expense
  // 7. Approve expense
  // 8. Verify expense in main list
});
```

---

## Dependencies

### Required npm Packages

```json
{
  "dependencies": {
    "papaparse": "^5.4.1",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "@types/papaparse": "^5.3.8"
  }
}
```

### Installation

```bash
npm install papaparse date-fns
npm install -D @types/papaparse
```

---

## Security Considerations

1. **File Upload Security:**
   - Validate file type and size
   - Sanitize file content
   - Limit upload frequency (rate limiting)

2. **Data Validation:**
   - Validate all parsed data
   - Prevent SQL/NoSQL injection
   - Sanitize user inputs

3. **Access Control:**
   - Enforce admin-only access
   - Verify user permissions on all operations
   - Audit all actions

4. **Data Privacy:**
   - Store only necessary CSV data
   - Implement data retention policy
   - Secure sensitive financial information

---

## Performance Optimization

1. **CSV Processing:**
   - Stream large files instead of loading entirely in memory
   - Process in batches (1000 rows at a time)
   - Use background jobs for very large files

2. **Database:**
   - Create proper indexes
   - Use lean() for read operations
   - Implement pagination

3. **UI:**
   - Lazy load components
   - Implement virtual scrolling for large lists
   - Show loading states

---

## Monitoring & Logging

1. **Audit Logs:**
   - Log all CSV imports
   - Log all approvals/rejections
   - Log bulk operations

2. **Error Tracking:**
   - Track CSV parsing errors
   - Monitor validation failures
   - Alert on repeated failures

3. **Metrics:**
   - Track import success rate
   - Monitor processing time
   - Track approval rate

---

## Future Enhancements

1. **Auto-categorization using ML**
2. **Scheduled imports from email**
3. **Multi-bank CSV support**
4. **Expense reconciliation with inventory**
5. **Advanced analytics dashboard**

---

**Document Version:** 1.0.0  
**Created:** 2026-01-07  
**Last Updated:** 2026-01-07  
**Author:** Development Team
