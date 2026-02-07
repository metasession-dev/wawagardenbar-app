'use server';

import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { connectDB } from '@/lib/mongodb';
import { XLSXParserService } from '@/services/xlsx-parser-service';
import { UploadedExpenseService } from '@/services/uploaded-expense-service';

/**
 * Get server session
 */
async function getServerSession() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session;
}

/**
 * Require admin role
 */
function requireAdmin(session: SessionData) {
  if (!session.isLoggedIn || (session.role !== 'admin' && session.role !== 'super-admin')) {
    throw new Error('Unauthorized: Admin access required');
  }
}

/**
 * Import Moniepoint XLSX file
 */
export async function importMoniepointCSVAction(formData: FormData) {
  try {
    await connectDB();
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
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      return {
        success: false,
        error: 'Please upload an Excel file (.xlsx or .xls)',
      };
    }

    // Validate file size (10 MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return {
        success: false,
        error: 'File size exceeds 10 MB limit',
      };
    }

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Validate XLSX structure
    const validation = XLSXParserService.validateMoniepointXLSX(arrayBuffer);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || 'Invalid Excel file format',
      };
    }

    // Get existing reference numbers to detect duplicates
    const existingReferences = await UploadedExpenseService.getExistingReferenceNumbers();

    // Parse XLSX
    const parseResult = await XLSXParserService.parseMoniepointXLSX(
      arrayBuffer,
      existingReferences
    );

    if (!parseResult.success) {
      return {
        success: false,
        error: 'Failed to parse Excel file',
        errors: parseResult.errors,
      };
    }

    if (parseResult.expenses.length === 0) {
      const { totalRows, expensesExtracted, duplicatesSkipped, invalidRows } =
        parseResult.stats;

      const sampleErrors = parseResult.errors.slice(0, 5);
      const errorDetails = sampleErrors.length
        ? ` Sample errors: ${sampleErrors.join(' | ')}`
        : '';

      return {
        success: false,
        error:
          `No valid expense transactions found in Excel file. ` +
          `Rows: ${totalRows}, extracted: ${expensesExtracted}, ` +
          `duplicates skipped: ${duplicatesSkipped}, invalid rows: ${invalidRows}.` +
          errorDetails,
        stats: parseResult.stats,
        errors: parseResult.errors,
      };
    }

    // Create uploaded expenses
    const expensesToCreate = parseResult.expenses.map((expense: any) => ({
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
    console.error('XLSX import error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error type:', error?.constructor?.name);
    
    // Capture detailed error information
    let errorMessage = 'Failed to import Excel file';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';
      
      // Log specific error types
      if (error.name === 'ReferenceError') {
        console.error('ReferenceError - possible missing dependency:', error.message);
      } else if (error.name === 'TypeError') {
        console.error('TypeError - possible data format issue:', error.message);
      }
    }
    
    return {
      success: false,
      error: `${errorMessage}${errorDetails ? ` (${error?.constructor?.name})` : ''}`,
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
    await connectDB();
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
    await connectDB();
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
    expenseType?: 'direct-cost' | 'operating-expense';
  }
) {
  try {
    await connectDB();
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
    await connectDB();
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
    await connectDB();
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
    await connectDB();
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
    await connectDB();
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
    await connectDB();
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
    await connectDB();
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
