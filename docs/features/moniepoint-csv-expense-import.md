# Moniepoint CSV Expense Import - Requirements

## Overview

This feature enables administrators to import expense transactions from Moniepoint bank statement CSV files directly into the Wawa Garden Bar expense management system. The import process includes a review and approval workflow to ensure data accuracy before expenses are added to the system.

## User Story

**As an** administrator  
**I want to** import expense transactions from Moniepoint CSV bank statements  
**So that** I can efficiently record business expenses without manual data entry

---

## Business Requirements

### 1. CSV File Format

**Source:** Moniepoint Account Statement CSV Export

**File Structure:**
- **Rows 1-7:** Account metadata (account name, number, currency, date range, balances, totals)
- **Row 8+:** Transaction data table with 24 columns

**Key Metadata Fields:**
- Account Name
- Account Number
- Currency (NGN)
- Date Range
- Opening Balance
- Closing Balance
- Total Debit
- Total Credit

### 2. Transaction Data Columns

| Column Name | Data Type | Purpose |
|-------------|-----------|---------|
| Date | DateTime | Transaction timestamp |
| Account Name | String | Account holder name |
| Transaction Type | String | Category (TRANSFER, PURCHASE, POS_TRANSFER) |
| Transaction Status | String | Status (COMPLETED) |
| Terminal ID | String | POS terminal ID (if applicable) |
| RRN | Float | Retrieval Reference Number |
| Transaction Ref | String | Unique transaction reference |
| Reversal Status | Float | Reversal status (usually empty) |
| Transaction Amount (NGN) | Float | Face value amount |
| Settlement Debit (NGN) | Integer/Float | Actual debited amount |
| Settlement Credit (NGN) | Float | Actual credited amount |
| Balance Before (NGN) | Float | Pre-transaction balance |
| Balance After (NGN) | Float | Post-transaction balance |
| Charge (NGN) | Float | Service charge/fee |
| Beneficiary | String | Recipient name |
| Beneficiary Institution | String | Recipient bank |
| Source | String | Sender name/ID |
| Source Institution | String | Sender bank |
| Narration | String | Transaction description |

**Note:** 5 unnamed columns (artifacts) contain no data and should be ignored.

---

## Functional Requirements

### FR-1: CSV Upload Interface

**Location:** Dashboard > Expenses

**Components:**
- **Button:** "Moniepoint Expenses CSV Import"
- **File Upload Dialog:** Accept `.csv` files only
- **File Validation:** Verify Moniepoint CSV structure

**Acceptance Criteria:**
- Button is visible only to admin and super-admin users
- File picker accepts only CSV files
- System validates CSV structure before processing
- User receives immediate feedback on upload success/failure

### FR-2: Expense Identification Rules

**Rule 1: Standard Expense Transaction**
```
IF Settlement Debit (NGN) > 0
THEN
  - Date = Date column value
  - Description = Narration column value
  - Amount = Transaction Amount (NGN) column value
  - Transaction Fee = Charge (NGN) column value
  - Category = (to be selected by admin during review)
  - Type = (to be selected by admin during review)
```

**Rule 2: Electronic Money Transfer Levy**
```
IF Transaction Amount (NGN) IS NULL
AND Settlement Debit (NGN) > 0
AND Narration = "null" OR Narration IS NULL
THEN
  - Date = Date column value
  - Description = "Electronic Money Transfer Levy"
  - Amount = 50 (NGN)
  - Transaction Fee = 0
  - Category = "operating-expense"
  - Type = "bank-charges"
```

**Exclusion Rule:**
```
IF Settlement Debit (NGN) = 0 OR Settlement Debit (NGN) IS NULL
THEN Skip transaction (not an expense)
```

### FR-3: Data Mapping

| CSV Column | Expense Field | Transformation |
|------------|---------------|----------------|
| Date | date | Parse DateTime, convert to ISO format |
| Narration | description | String (or "Electronic Money Transfer Levy" for levy transactions) |
| Transaction Amount (NGN) | amount | Float (or 50 for levy transactions) |
| Charge (NGN) | transactionFee | Float (new field) |
| Transaction Ref | referenceNumber | String (for tracking) |
| - | category | Admin selects during review |
| - | type | Admin selects during review |
| - | status | Default: "pending" |

### FR-4: New Expense Form Field

**Field:** Transaction Fee

**Properties:**
- **Label:** "Transaction Fee (₦)"
- **Type:** Number
- **Required:** No
- **Default:** 0
- **Validation:** Must be >= 0
- **Description:** "Bank or payment processor transaction fee"

**Location:** Add after "Amount" field in the expense form

### FR-5: Uploaded Expenses Review Page

**Location:** Dashboard > Expenses > Uploaded Expenses

**Purpose:** Review and approve imported expenses before adding to the system

**Features:**

1. **List View:**
   - Display all uploaded expenses in pending status
   - Show: Date, Description, Amount, Transaction Fee, Upload Date, Uploaded By
   - Filter by: Upload date, Amount range, Status
   - Sort by: Date, Amount, Upload date
   - Pagination: 50 items per page

2. **Bulk Actions:**
   - Select multiple expenses (checkboxes)
   - Bulk approve
   - Bulk reject/delete
   - Bulk edit category/type

3. **Individual Expense Actions:**
   - **Edit:** Modify any field (date, description, amount, transaction fee, category, type)
   - **Approve:** Move to main expenses list
   - **Reject:** Delete from uploaded expenses
   - **View Details:** Show all transaction metadata from CSV

4. **Expense Details Modal:**
   - All mapped fields (editable)
   - Original CSV data (read-only reference)
   - Transaction reference number
   - Upload timestamp and user

5. **Approval Workflow:**
   - Status: "pending" → "approved" → moved to main expenses
   - Audit log: Record who approved and when
   - Notification: Optional email to uploader on approval

### FR-6: CSV Processing Logic

**Steps:**

1. **Upload & Validation:**
   - Verify CSV structure (check for required columns)
   - Validate metadata section (rows 1-7)
   - Confirm transaction data starts at row 8

2. **Parsing:**
   - Skip metadata rows (1-7)
   - Parse transaction rows (8+)
   - Ignore unnamed/empty columns

3. **Expense Extraction:**
   - Apply identification rules (FR-2)
   - Extract only debit transactions (Settlement Debit > 0)
   - Map fields according to FR-3

4. **Duplicate Detection:**
   - Check if Transaction Ref already exists in:
     - Main expenses table
     - Uploaded expenses table
   - Skip duplicates, log skipped count

5. **Data Storage:**
   - Save to `UploadedExpense` collection
   - Link to uploader (admin user ID)
   - Store upload timestamp
   - Preserve original CSV row data for reference

6. **Result Summary:**
   - Total rows processed
   - Expenses extracted
   - Duplicates skipped
   - Errors encountered

---

## Non-Functional Requirements

### NFR-1: Performance
- Process CSV files up to 10,000 rows within 30 seconds
- Upload page should load within 2 seconds
- Bulk operations should complete within 5 seconds for 100 items

### NFR-2: Security
- Only admin and super-admin roles can access import feature
- File upload size limit: 10 MB
- Validate file type and content before processing
- Sanitize all input data to prevent injection attacks

### NFR-3: Usability
- Clear error messages for invalid CSV format
- Progress indicator during file processing
- Success/error notifications after upload
- Intuitive review interface with inline editing

### NFR-4: Data Integrity
- Transaction references must be unique
- All monetary values must be non-negative
- Dates must be valid and within reasonable range
- Audit trail for all approvals and rejections

### NFR-5: Compatibility
- Support standard Moniepoint CSV format
- Handle different date formats gracefully
- Support CSV files with BOM (Byte Order Mark)
- Compatible with Excel-exported CSV files

---

## User Interface Requirements

### UI-1: Import Button

**Location:** `/dashboard/expenses` page header

**Design:**
- Icon: Upload or FileSpreadsheet icon
- Text: "Moniepoint Expenses CSV Import"
- Style: Secondary button
- Position: Next to "Add Expense" button

### UI-2: Upload Dialog

**Components:**
- File drop zone with drag-and-drop support
- File picker button
- Accepted format indicator: "CSV files only"
- File size limit indicator: "Max 10 MB"
- Upload button (disabled until file selected)
- Cancel button

### UI-3: Processing Feedback

**During Upload:**
- Loading spinner
- Progress message: "Processing CSV file..."
- Cancel option (if possible)

**After Upload:**
- Success toast: "✓ Successfully imported X expenses. Review them in Uploaded Expenses."
- Error toast: "✗ Failed to process CSV. [Error details]"
- Link to Uploaded Expenses page

### UI-4: Uploaded Expenses Page

**Layout:**
- Page title: "Uploaded Expenses"
- Subtitle: "Review and approve imported expenses"
- Filter bar (date range, amount range, status)
- Bulk action toolbar (when items selected)
- Data table with columns:
  - Checkbox (select)
  - Date
  - Description
  - Amount (₦)
  - Transaction Fee (₦)
  - Category (editable dropdown)
  - Type (editable dropdown)
  - Uploaded By
  - Upload Date
  - Actions (Edit, Approve, Reject)
- Pagination controls
- Empty state: "No uploaded expenses. Import CSV to get started."

### UI-5: Edit Expense Modal

**Fields:**
- Date (date picker)
- Description (text input)
- Amount (number input)
- Transaction Fee (number input)
- Category (dropdown)
- Type (dropdown)
- Reference Number (read-only)
- Original CSV Data (collapsible section, read-only)

**Actions:**
- Save Changes
- Approve & Save
- Cancel

---

## Data Model

### UploadedExpense Schema

```typescript
interface IUploadedExpense {
  _id: ObjectId;
  
  // Mapped expense fields
  date: Date;
  description: string;
  amount: number;
  transactionFee: number;
  category?: string;
  type?: string;
  referenceNumber: string;
  
  // Upload metadata
  uploadedBy: ObjectId; // Reference to User
  uploadedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  
  // Original CSV data (for reference)
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
  approvedBy?: ObjectId; // Reference to User
  approvedAt?: Date;
  rejectedBy?: ObjectId;
  rejectedAt?: Date;
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
}
```

### Updated Expense Schema

```typescript
interface IExpense {
  // ... existing fields ...
  
  // New field
  transactionFee: number; // Default: 0
  
  // ... existing fields ...
}
```

---

## API Endpoints

### POST /api/expenses/import-csv

**Purpose:** Upload and process Moniepoint CSV file

**Authentication:** Required (admin, super-admin)

**Request:**
- Content-Type: multipart/form-data
- Body: { file: File }

**Response:**
```typescript
{
  success: boolean;
  message: string;
  data: {
    totalRows: number;
    expensesExtracted: number;
    duplicatesSkipped: number;
    errors: string[];
  }
}
```

### GET /api/expenses/uploaded

**Purpose:** Fetch uploaded expenses pending review

**Authentication:** Required (admin, super-admin)

**Query Parameters:**
- page: number (default: 1)
- limit: number (default: 50)
- status: 'pending' | 'approved' | 'rejected'
- startDate: ISO date string
- endDate: ISO date string
- minAmount: number
- maxAmount: number

**Response:**
```typescript
{
  success: boolean;
  data: {
    expenses: IUploadedExpense[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    }
  }
}
```

### PUT /api/expenses/uploaded/:id

**Purpose:** Update uploaded expense

**Authentication:** Required (admin, super-admin)

**Request Body:**
```typescript
{
  date?: Date;
  description?: string;
  amount?: number;
  transactionFee?: number;
  category?: string;
  type?: string;
}
```

### POST /api/expenses/uploaded/:id/approve

**Purpose:** Approve uploaded expense and move to main expenses

**Authentication:** Required (admin, super-admin)

**Response:**
```typescript
{
  success: boolean;
  message: string;
  data: {
    expenseId: string; // ID of created expense
  }
}
```

### DELETE /api/expenses/uploaded/:id

**Purpose:** Reject/delete uploaded expense

**Authentication:** Required (admin, super-admin)

### POST /api/expenses/uploaded/bulk-approve

**Purpose:** Approve multiple uploaded expenses

**Authentication:** Required (admin, super-admin)

**Request Body:**
```typescript
{
  expenseIds: string[];
}
```

### DELETE /api/expenses/uploaded/bulk-reject

**Purpose:** Reject multiple uploaded expenses

**Authentication:** Required (admin, super-admin)

**Request Body:**
```typescript
{
  expenseIds: string[];
}
```

---

## Validation Rules

### CSV File Validation
- File extension must be `.csv`
- File size must not exceed 10 MB
- Must contain required columns: Date, Settlement Debit (NGN), Transaction Amount (NGN), Narration, Charge (NGN)
- Must have metadata section (rows 1-7)
- Must have transaction data starting at row 8

### Expense Data Validation
- **Date:** Must be valid date, not in future, within last 5 years
- **Description:** Required, max 500 characters
- **Amount:** Required, must be > 0, max 10,000,000
- **Transaction Fee:** Optional, must be >= 0, max 100,000
- **Reference Number:** Must be unique across all expenses and uploaded expenses
- **Category:** Must be valid expense category from system settings
- **Type:** Must be valid expense type from system settings

---

## Error Handling

### Upload Errors
- **Invalid file format:** "Please upload a valid CSV file"
- **File too large:** "File size exceeds 10 MB limit"
- **Invalid CSV structure:** "CSV file does not match Moniepoint format"
- **No expenses found:** "No valid expense transactions found in CSV"
- **Processing error:** "Failed to process CSV file. Please try again."

### Validation Errors
- **Invalid date:** "Date must be a valid date within the last 5 years"
- **Invalid amount:** "Amount must be greater than 0"
- **Duplicate reference:** "Transaction reference already exists"
- **Missing required field:** "[Field name] is required"

### Permission Errors
- **Unauthorized:** "You do not have permission to import expenses"
- **Invalid session:** "Your session has expired. Please log in again."

---

## Success Criteria

1. ✅ Admin can upload Moniepoint CSV files from the expenses page
2. ✅ System correctly identifies expense transactions (Settlement Debit > 0)
3. ✅ System correctly handles Electronic Money Transfer Levy transactions
4. ✅ Duplicate transactions are detected and skipped
5. ✅ Uploaded expenses appear in review page with all mapped fields
6. ✅ Admin can edit any field before approval
7. ✅ Admin can approve expenses individually or in bulk
8. ✅ Approved expenses appear in main expenses list with correct data
9. ✅ Transaction fee field is added to expense form and displays correctly
10. ✅ All operations are logged in audit trail

---

## Future Enhancements

1. **Auto-categorization:** Machine learning to suggest categories based on narration
2. **Scheduled imports:** Automatically import CSV files from email or cloud storage
3. **Multi-bank support:** Support CSV formats from other Nigerian banks
4. **Reconciliation:** Match imported expenses with inventory purchases
5. **Expense analytics:** Dashboard showing expense trends from imported data
6. **Export templates:** Provide CSV template for manual expense entry
7. **Notification system:** Email notifications when new expenses are uploaded
8. **Approval workflow:** Multi-level approval for high-value expenses

---

## Dependencies

- **Existing Systems:**
  - Expense management system
  - User authentication and authorization
  - Audit logging system
  - System settings (expense categories and types)

- **External Libraries:**
  - CSV parsing library (e.g., `papaparse`, `csv-parser`)
  - Date parsing library (e.g., `date-fns`)
  - File upload handling (e.g., `multer`)

---

## Testing Requirements

### Unit Tests
- CSV parsing logic
- Expense identification rules
- Data mapping functions
- Validation rules
- Duplicate detection

### Integration Tests
- File upload endpoint
- Uploaded expenses CRUD operations
- Approval workflow
- Bulk operations

### End-to-End Tests
- Complete import workflow (upload → review → approve)
- Error handling scenarios
- Permission checks
- Data integrity verification

### Test Data
- Sample Moniepoint CSV files with various scenarios:
  - Standard expenses
  - Electronic Money Transfer Levy transactions
  - Duplicate transactions
  - Invalid data
  - Edge cases (empty fields, special characters)

---

**Document Version:** 1.0.0  
**Created:** 2026-01-07  
**Last Updated:** 2026-01-07  
**Author:** Development Team
