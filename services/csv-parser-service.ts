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
    _rowNumber: number
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
