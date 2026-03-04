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
  // Wrap EVERYTHING in try-catch to ensure we always return a response
  try {
    console.log('[XLSX-IMPORT] === importMoniepointCSVAction called ===');
    console.log('[XLSX-IMPORT] Timestamp:', new Date().toISOString());
    console.log('[XLSX-IMPORT] Environment:', process.env.NODE_ENV);
    console.log('[XLSX-IMPORT] Node version:', process.version);
    console.log('[XLSX-IMPORT] FormData received:', formData ? 'yes' : 'no');

    // Check XLSX module availability immediately
    console.log('[XLSX-IMPORT] Checking XLSX module...');
    try {
      const XLSX = await import('xlsx');
      console.log('[XLSX-IMPORT] XLSX module loaded:', typeof XLSX);
      console.log('[XLSX-IMPORT] XLSX.read available:', typeof XLSX.read === 'function');
      console.log('[XLSX-IMPORT] XLSX.utils available:', typeof XLSX.utils === 'object');
    } catch (xlsxErr) {
      console.error('[XLSX-IMPORT] CRITICAL: XLSX module failed to load:', xlsxErr);
    }

    console.log('[XLSX-IMPORT] Step 1: Connecting to DB...');
    await connectDB();
    console.log('[XLSX-IMPORT] Step 1: DB connected');
    
    console.log('[XLSX-IMPORT] Step 2: Getting session...');
    const session = await getServerSession();
    console.log('[XLSX-IMPORT] Step 2: Session retrieved, isLoggedIn:', session.isLoggedIn, 'role:', session.role);
    
    console.log('[XLSX-IMPORT] Step 3: Checking admin access...');
    requireAdmin(session);
    console.log('[XLSX-IMPORT] Step 3: Admin access confirmed');

    console.log('[XLSX-IMPORT] Step 4: Extracting file from FormData...');
    const file = formData.get('file') as File;
    console.log('[XLSX-IMPORT] Step 4: File extracted:', file ? `${file.name} (${file.size} bytes, type: ${file.type})` : 'null');
    
    if (!file) {
      return JSON.parse(JSON.stringify({
        success: false,
        error: 'No file provided',
      }));
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      return JSON.parse(JSON.stringify({
        success: false,
        error: 'Please upload an Excel file (.xlsx or .xls)',
      }));
    }

    // Validate file size (10 MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return JSON.parse(JSON.stringify({
        success: false,
        error: 'File size exceeds 10 MB limit',
      }));
    }

    // Read file as ArrayBuffer
    console.log('[XLSX-IMPORT] Step 5: Reading file as ArrayBuffer...');
    const arrayBuffer = await file.arrayBuffer();
    console.log('[XLSX-IMPORT] Step 5: ArrayBuffer created:', arrayBuffer.byteLength, 'bytes');

    // Validate XLSX structure
    console.log('[XLSX-IMPORT] Step 6: Validating XLSX structure...');
    const validation = XLSXParserService.validateMoniepointXLSX(arrayBuffer);
    console.log('[XLSX-IMPORT] Step 6: Validation result:', validation.valid ? 'valid' : `invalid - ${validation.error}`);
    if (!validation.valid) {
      return JSON.parse(JSON.stringify({
        success: false,
        error: validation.error || 'Invalid Excel file format',
      }));
    }

    // Get existing reference numbers to detect duplicates
    console.log('[XLSX-IMPORT] Step 7: Getting existing references...');
    const existingReferences = await UploadedExpenseService.getExistingReferenceNumbers();
    console.log('[XLSX-IMPORT] Step 7: Existing references count:', existingReferences.size);

    // Parse XLSX
    console.log('[XLSX-IMPORT] Step 8: Parsing XLSX...');
    const parseResult = await XLSXParserService.parseMoniepointXLSX(
      arrayBuffer,
      existingReferences
    );
    console.log('[XLSX-IMPORT] Step 8: Parse result:', parseResult.success ? 'success' : 'failed');
    console.log('[XLSX-IMPORT] Step 8: Expenses extracted:', parseResult.expenses.length);

    if (!parseResult.success) {
      return JSON.parse(JSON.stringify({
        success: false,
        error: 'Failed to parse Excel file',
        errors: parseResult.errors,
      }));
    }

    if (parseResult.expenses.length === 0) {
      const { totalRows, duplicatesSkipped, invalidRows } =
        parseResult.stats;

      // Provide specific error message based on what happened
      let errorMessage = '';
      
      if (duplicatesSkipped > 0 && invalidRows === 0) {
        // All transactions were duplicates
        errorMessage = 
          `All ${duplicatesSkipped} transactions in this file have already been imported. ` +
          `No new expenses to add. If you need to re-import, please delete the existing expenses first.`;
      } else if (invalidRows > 0) {
        // Some transactions had errors
        const sampleErrors = parseResult.errors.slice(0, 3);
        const errorDetails = sampleErrors.length
          ? ` Sample errors: ${sampleErrors.join(' | ')}`
          : '';
        errorMessage = 
          `No valid expense transactions found. ` +
          `${invalidRows} rows had errors, ${duplicatesSkipped} duplicates skipped.` +
          errorDetails;
      } else {
        // No debit transactions found
        errorMessage = 
          `No debit transactions found in Excel file. ` +
          `The file appears to contain only credit transactions or non-expense items. ` +
          `Total rows: ${totalRows}`;
      }

      return JSON.parse(JSON.stringify({
        success: false,
        error: errorMessage,
        stats: parseResult.stats,
        errors: parseResult.errors,
      }));
    }

    // Create uploaded expenses
    const expensesToCreate = parseResult.expenses.map((expense: any) => ({
      ...expense,
      uploadedBy: session.userId!,
    }));

    await UploadedExpenseService.bulkCreateUploadedExpenses(expensesToCreate);

    return JSON.parse(JSON.stringify({
      success: true,
      message: `Successfully imported ${parseResult.stats.expensesExtracted} expenses`,
      stats: parseResult.stats,
      errors: parseResult.errors,
    }));
  } catch (error) {
    console.error('[XLSX-IMPORT] === UNHANDLED ERROR ===');
    console.error('[XLSX-IMPORT] Timestamp:', new Date().toISOString());
    console.error('[XLSX-IMPORT] Error type:', error?.constructor?.name);
    console.error('[XLSX-IMPORT] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[XLSX-IMPORT] Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    if (error instanceof Error) {
      if (error.name === 'ReferenceError') {
        console.error('[XLSX-IMPORT] ReferenceError - likely missing/unbundled dependency:', error.message);
      } else if (error.name === 'TypeError') {
        console.error('[XLSX-IMPORT] TypeError - data format or null reference issue:', error.message);
      } else if (error.message?.includes('Cannot find module')) {
        console.error('[XLSX-IMPORT] Module not found - package missing from production bundle');
      } else if (error.message?.includes('body exceeded')) {
        console.error('[XLSX-IMPORT] Body size limit exceeded - file too large for server action');
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to import Excel file';
    return JSON.parse(JSON.stringify({
      success: false,
      error: `${errorMessage} (${error?.constructor?.name ?? 'UnknownError'})`,
    }));
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
