import * as XLSX from 'xlsx';
import { parse, isValid } from 'date-fns';

// Verify XLSX module is available
if (!XLSX || !XLSX.read) {
  console.error('CRITICAL: XLSX module not properly loaded!');
  console.error('XLSX object:', XLSX);
}

interface MoniepointTransaction {
  Date: string | number;
  'Account Name': string | number;
  'Transaction Type': string | number;
  'Transaction Status': string | number;
  'Terminal ID': string | number;
  RRN: string | number;
  'Transaction Ref': string | number;
  'Reversal Status': string | number;
  'Transaction Amount (NGN)': string | number;
  'Settlement Debit (NGN)': string | number;
  'Settlement Credit (NGN)': string | number;
  'Balance Before (NGN)': string | number;
  'Balance After (NGN)': string | number;
  'Charge (NGN)': string | number;
  Beneficiary: string | number;
  'Beneficiary Institution': string | number;
  Source: string | number;
  'Source Institution': string | number;
  Narration: string | number;
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

export class XLSXParserService {
  private static readonly ALIASES: Record<string, string[]> = {
    // Reference / transaction ID
    'Transaction Ref': [
      'Transaction Reference',
      'Trans Ref',
      'Tran Ref',
      'TRXN REF',
      'TRX REF',
      'Reference',
    ],

    // Description text
    'Narration': ['Description', 'Memo', 'Remarks', 'Narration/Description'],

    // Dates
    'Date': ['Transaction Date', 'Value Date', 'TRXN DATE', 'TRX DATE'],

    // Debit amount used for settlement
    'Settlement Debit (NGN)': [
      'Settlement Debit',
      'Settlement Amount (NGN)',
      'Settlement DR/CR (NGN)',
      'SETTLEMENT DR/CR NGN',
      'Settlement DR',
      'Debit',
      'Debit Amount',
    ],

    // Transaction amount (pre-settlement)
    'Transaction Amount (NGN)': [
      'TRXN AMOUNT (NGN)',
      'TRXN AMT (NGN)',
      'TRX AMOUNT (NGN)',
      'Amount',
      'Transaction Amount',
    ],

    // Charges / fees
    'Charge (NGN)': [
      'Fee',
      'Fees (NGN)',
      'Charge',
      'Charges',
      'Transaction Fee',
    ],

    // Type of transaction (debit / credit)
    'Transaction Type': ['Type', 'Trans Type', 'Dr/Cr', 'TRXN TYPE', 'TRX TYPE'],
  };

  /**
   * Parse Moniepoint XLSX file and extract expenses
   */
  static async parseMoniepointXLSX(
    fileBuffer: ArrayBuffer,
    existingReferences: Set<string>
  ): Promise<ParseResult> {
    const expenses: ParsedExpense[] = [];
    const errors: string[] = [];
    let totalRows = 0;
    let duplicatesSkipped = 0;
    let invalidRows = 0;

    try {
      // Check if XLSX module is available before attempting to read
      if (!XLSX || typeof XLSX.read !== 'function') {
        console.error('XLSX module not available or read function missing');
        return {
          success: false,
          expenses: [],
          errors: ['XLSX module not properly loaded. This is a server configuration issue.'],
          stats: { totalRows: 0, expensesExtracted: 0, duplicatesSkipped: 0, invalidRows: 0 },
        };
      }

      let workbook;
      try {
        workbook = XLSX.read(fileBuffer, { type: 'array' });
      } catch (xlsxError) {
        console.error('XLSX.read failed:', xlsxError);
        return {
          success: false,
          expenses: [],
          errors: [`Failed to read Excel file: ${xlsxError instanceof Error ? xlsxError.message : 'Unknown error'}`],
          stats: { totalRows: 0, expensesExtracted: 0, duplicatesSkipped: 0, invalidRows: 0 },
        };
      }
      
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return {
          success: false,
          expenses: [],
          errors: ['No sheets found in XLSX file'],
          stats: { totalRows: 0, expensesExtracted: 0, duplicatesSkipped: 0, invalidRows: 0 },
        };
      }

      const worksheet = workbook.Sheets[firstSheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        raw: true,
      }) as any[][];

      totalRows = jsonData.length;

      if (totalRows < 10) {
        return {
          success: false,
          expenses: [],
          errors: ['File has insufficient rows. Expected at least 10 rows'],
          stats: { totalRows, expensesExtracted: 0, duplicatesSkipped: 0, invalidRows: 0 },
        };
      }

      const headerRowIndex = this.findHeaderRow(jsonData);
      if (headerRowIndex === -1) {
        return {
          success: false,
          expenses: [],
          errors: ['Could not find header row with required columns (Date, Transaction Ref, Settlement Debit (NGN))'],
          stats: { totalRows, expensesExtracted: 0, duplicatesSkipped: 0, invalidRows: 0 },
        };
      }

      const headerRow = jsonData[headerRowIndex];
      const transactionRows = jsonData.slice(headerRowIndex + 1);

      const headerMap = this.createHeaderMap(headerRow);

      console.log(`[XLSX-PARSE] Processing ${transactionRows.length} transaction rows...`);
      
      let processedCount = 0;
      for (let i = 0; i < transactionRows.length; i++) {
        const row = transactionRows[i] as any[];
        const rowNumber = headerRowIndex + i + 2;

        if (!row || row.length === 0 || row.every((cell) => !cell)) {
          continue;
        }

        try {
          const transaction = this.mapRowToTransaction(row, headerMap);
          
          // Log first 5 transactions for debugging
          if (processedCount < 5) {
            console.log(`[XLSX-PARSE] Row ${rowNumber} data:`, {
              settlementDebit: transaction['Settlement Debit (NGN)'],
              transactionType: transaction['Transaction Type'],
              transactionRef: String(transaction['Transaction Ref']).substring(0, 30),
              date: transaction.Date,
            });
          }
          processedCount++;
          
          const expense = this.parseTransaction(transaction, rowNumber);
          
          if (expense) {
            if (existingReferences.has(expense.referenceNumber)) {
              duplicatesSkipped++;
              console.log(`[XLSX-PARSE] Row ${rowNumber}: Duplicate reference ${expense.referenceNumber}`);
              continue;
            }

            expenses.push(expense);
            existingReferences.add(expense.referenceNumber);
            console.log(`[XLSX-PARSE] Row ${rowNumber}: Expense extracted - ${expense.description} (${expense.amount})`);
          } else {
            console.log(`[XLSX-PARSE] Row ${rowNumber}: Not a debit transaction or filtered out`);
          }
        } catch (error) {
          invalidRows++;
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Row ${rowNumber}: ${errorMsg}`);
          console.log(`[XLSX-PARSE] Row ${rowNumber}: Error - ${errorMsg}`);
        }
      }
      
      console.log(`[XLSX-PARSE] Summary: ${expenses.length} expenses, ${duplicatesSkipped} duplicates, ${invalidRows} invalid`);

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
        errors: [error instanceof Error ? error.message : 'Failed to parse XLSX file'],
        stats: { totalRows, expensesExtracted: 0, duplicatesSkipped, invalidRows },
      };
    }
  }

  /**
   * Find the header row by looking for required columns
   */
  private static findHeaderRow(jsonData: any[][]): number {
    const requiredColumns = ['Date', 'Transaction Ref', 'Settlement Debit (NGN)'];
    
    for (let i = 0; i < Math.min(15, jsonData.length); i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;
      
      const rowStringArray = row.map((cell) => String(cell || '').trim().toLowerCase());
      
      const hasAllRequired = requiredColumns.every((col) => {
        const aliases = [col, ...(this.ALIASES[col] || [])].map(a => a.toLowerCase());
        return aliases.some(alias => 
          rowStringArray.some((cell: string) => cell.includes(alias))
        );
      });
      
      if (hasAllRequired) {
        return i;
      }
    }
    
    return -1;
  }

  /**
   * Create header map from header row handling aliases
   */
  private static createHeaderMap(headerRow: any[]): Map<string, number> {
    const map = new Map<string, number>();
    
    headerRow.forEach((header, index) => {
      if (!header) return;
      
      const headerStr = String(header).trim();
      
      // Add exact match
      map.set(headerStr, index);
      
      // Check against standard names and their aliases
      for (const [standardName, aliasList] of Object.entries(this.ALIASES)) {
        // Check if header matches standard name (case-insensitive)
        if (headerStr.toLowerCase() === standardName.toLowerCase()) {
          map.set(standardName, index);
        }
        
        // Check if header matches any alias
        if (aliasList.some(alias => headerStr.toLowerCase() === alias.toLowerCase())) {
          map.set(standardName, index);
        }
      }
    });
    
    return map;
  }

  /**
   * Map row array to transaction object using header map
   */
  private static mapRowToTransaction(
    row: any[],
    headerMap: Map<string, number>
  ): MoniepointTransaction {
    const getValue = (key: string): string | number => {
      const index = headerMap.get(key);
      if (index === undefined) {
        return '';
      }
      const cell = row[index];
      if (cell === null || cell === undefined) {
        return '';
      }
      if (typeof cell === 'string') {
        return cell.trim();
      }
      return cell;
    };

    return {
      Date: getValue('Date'),
      'Account Name': getValue('Account Name'),
      'Transaction Type': getValue('Transaction Type'),
      'Transaction Status': getValue('Transaction Status'),
      'Terminal ID': getValue('Terminal ID'),
      RRN: getValue('RRN'),
      'Transaction Ref': getValue('Transaction Ref'),
      'Reversal Status': getValue('Reversal Status'),
      'Transaction Amount (NGN)': getValue('Transaction Amount (NGN)'),
      'Settlement Debit (NGN)': getValue('Settlement Debit (NGN)'),
      'Settlement Credit (NGN)': getValue('Settlement Credit (NGN)'),
      'Balance Before (NGN)': getValue('Balance Before (NGN)'),
      'Balance After (NGN)': getValue('Balance After (NGN)'),
      'Charge (NGN)': getValue('Charge (NGN)'),
      Beneficiary: getValue('Beneficiary'),
      'Beneficiary Institution': getValue('Beneficiary Institution'),
      Source: getValue('Source'),
      'Source Institution': getValue('Source Institution'),
      Narration: getValue('Narration'),
    };
  }

  /**
   * Check if a transaction is a debit based on Settlement Debit or Transaction Type
   */
  private static isDebitTransaction(row: MoniepointTransaction): boolean {
    // Check Settlement Debit first
    const settlementDebit = this.parseNumber(row['Settlement Debit (NGN)']);
    const type = String(row['Transaction Type'] || '').trim().toUpperCase();
    
    // Log first few transactions for debugging
    if (Math.random() < 0.1) { // Log ~10% of transactions
      console.log('[XLSX-PARSE] Transaction check:', {
        settlementDebit,
        type,
        transactionRef: String(row['Transaction Ref'] || '').substring(0, 20),
        isDebit: settlementDebit > 0 || type === 'DEBIT' || type === 'DR'
      });
    }
    
    if (settlementDebit > 0) return true;

    // Check Transaction Type as fallback
    return type === 'DEBIT' || type === 'DR';
  }

  /**
   * Parse a single transaction and determine if it's an expense
   */
  private static parseTransaction(
    row: MoniepointTransaction,
    _rowNumber: number
  ): ParsedExpense | null {
    const isDebit = this.isDebitTransaction(row);
    if (!isDebit) {
      return null;
    }

    const settlementDebit = this.parseNumber(row['Settlement Debit (NGN)']);
    const transactionAmount = this.parseNumber(row['Transaction Amount (NGN)']);
    const charge = this.parseNumber(row['Charge (NGN)']);
    const narration = String(row.Narration ?? '').trim();
    const transactionRef = String(row['Transaction Ref'] ?? '').trim();

    if (!transactionRef) {
      throw new Error('Missing transaction reference');
    }

    const date = this.parseDate(row.Date);
    if (!date) {
      const rawDateValue = row.Date;
      const rawDateType = typeof rawDateValue;
      throw new Error(
        `Invalid date format. Raw value: "${rawDateValue}" (type: ${rawDateType})`
      );
    }

    // Determine the actual amount
    // Use transaction amount if available, otherwise settlement debit
    const amount = transactionAmount > 0 ? transactionAmount : settlementDebit;

    if (amount <= 0) {
      return null;
    }

    // Special Electronic Money Transfer Levy handling for EMTL_DC reference
    // The EMTL_DC reference is unique, so we primarily match on Transaction Ref and
    // ensure there is a positive Settlement Debit. This guarantees that the
    // description is always "Electronic Money Transfer Levy" for this row.
    const transactionRefUpper = transactionRef.toUpperCase();

    if (
      transactionRefUpper.includes('EMTL_DC') &&
      settlementDebit > 0
    ) {
      return {
        date,
        description: 'Electronic Money Transfer Levy',
        amount: settlementDebit,
        transactionFee: 0,
        referenceNumber: transactionRef,
        originalData: {
          date: row.Date,
          settlementDebit,
          narration: row.Narration,
          transactionRef,
          accountName: row['Account Name'],
          transactionType: row['Transaction Type'],
        },
      };
    }

    // Generic expense mapping
    return {
      date,
      description: narration || 'Expense Transaction',
      amount,
      transactionFee: charge || 0,
      referenceNumber: transactionRef,
      originalData: {
        date: row.Date,
        transactionAmount,
        settlementDebit,
        charge,
        narration: row.Narration,
        transactionRef,
        accountName: row['Account Name'],
        transactionType: row['Transaction Type'],
        beneficiary: row.Beneficiary,
        source: row.Source,
      },
    };
  }

  /**
   * Parse number from string (handles commas)
   */
  private static parseNumber(value: string | number | null | undefined): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    if (typeof value === 'number') {
      return value;
    }

    const stringValue = String(value).trim();

    // Remove thousands separators
    const noCommas = stringValue.replace(/,/g, '');

    // Extract the first numeric substring (handles prefixes like "NGN " or other text)
    const match = noCommas.match(/-?\d+(?:\.\d+)?/);

    if (!match) {
      return 0;
    }

    const parsed = parseFloat(match[0]);

    return Number.isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Parse date from string or Excel serial number
   * Moniepoint uses MM/dd/yyyy format, so we prioritize that
   */
  private static parseDate(dateValue: string | number): Date | null {
    if (!dateValue && dateValue !== 0) return null;

    if (typeof dateValue === 'number') {
      return this.excelSerialToDate(dateValue);
    }

    const cleanedDateString = String(dateValue).trim();
    if (!cleanedDateString) {
      return null;
    }

    // If the value is a plain numeric string, treat it as an Excel serial date
    if (/^\d+(?:\.\d+)?$/.test(cleanedDateString)) {
      const serial = parseFloat(cleanedDateString);
      const serialDate = this.excelSerialToDate(serial);
      if (serialDate) {
        return serialDate;
      }
    }
    
    const formats = [
      'MM/dd/yyyy HH:mm:ss',
      'MM/dd/yyyy',
      'yyyy-MM-dd',
      'dd/MM/yyyy',
      'dd-MM-yyyy',
      'MM-dd-yyyy',
      'yyyy/MM/dd',
      'dd MMM yyyy',
      'MMM dd, yyyy',
    ];

    for (const format of formats) {
      try {
        const parsed = parse(cleanedDateString, format, new Date());
        if (isValid(parsed)) {
          return parsed;
        }
      } catch {
        continue;
      }
    }

    const nativeDate = new Date(cleanedDateString);
    if (isValid(nativeDate)) {
      return nativeDate;
    }

    return null;
  }

  /**
   * Convert Excel serial date number to JavaScript Date
   * Excel stores dates as the number of days since 1900-01-01
   */
  private static excelSerialToDate(serial: number): Date | null {
    if (serial < 0) return null;
    
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    
    const fractionalDay = serial - Math.floor(serial) + 0.0000001;
    
    let totalSeconds = Math.floor(86400 * fractionalDay);
    const seconds = totalSeconds % 60;
    totalSeconds -= seconds;
    
    const hours = Math.floor(totalSeconds / (60 * 60));
    const minutes = Math.floor(totalSeconds / 60) % 60;
    
    const date = new Date(dateInfo.getFullYear(), dateInfo.getMonth(), dateInfo.getDate(), hours, minutes, seconds);
    
    return isValid(date) ? date : null;
  }

  /**
   * Validate Moniepoint XLSX structure
   */
  static validateMoniepointXLSX(fileBuffer: ArrayBuffer): { valid: boolean; error?: string } {
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'array' });
      
      if (workbook.SheetNames.length === 0) {
        return { valid: false, error: 'No sheets found in XLSX file' };
      }

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        raw: true,
      }) as any[][];

      if (jsonData.length < 10) {
        return {
          valid: false,
          error: 'Invalid file structure. Expected at least 10 rows',
        };
      }

      const headerRowIndex = this.findHeaderRow(jsonData);
      if (headerRowIndex === -1) {
        return {
          valid: false,
          error: 'Could not find header row with required columns (Date, Transaction Ref, Settlement Debit (NGN))',
        };
      }

      const headerRow = jsonData[headerRowIndex];
      const requiredHeaders = [
        'Date',
        'Transaction Ref',
        'Settlement Debit (NGN)',
        'Transaction Amount (NGN)',
        'Charge (NGN)',
        'Narration',
      ];

      const headers = headerRow.map((h) => String(h || '').trim());
      
      const missingHeaders = requiredHeaders.filter((required) => {
        // Get all aliases for this required header
        const aliases = [required, ...(this.ALIASES[required] || [])].map(a => a.toLowerCase());
        
        // Check if any of the aliases exist in the file headers
        return !headers.some(h => {
          const headerLower = h.toLowerCase();
          return aliases.some(alias => headerLower.includes(alias));
        });
      });

      if (missingHeaders.length > 0) {
        return {
          valid: false,
          error: `Missing required columns: ${missingHeaders.join(', ')}`,
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Failed to validate XLSX file',
      };
    }
  }
}
