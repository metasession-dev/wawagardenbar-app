# Changelog

All notable changes to the Wawa Garden Bar project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2026-01-07] - Documentation

### Added
- Comprehensive documentation standard in `/docs/DOCUMENTATION-STANDARD.md`
- Documentation guidelines added to `/docs/ruleset.md`
- Centralized CHANGELOG.md for tracking all project changes
- Documentation structure with clear templates for features, APIs, database schema, and operational scripts
- JSDoc requirements for all exported functions, service methods, and custom hooks
- Documentation workflow for features, bug fixes, and refactoring
- `/docs/README.md` - Comprehensive documentation index with navigation guide
- `/docs/DIRECTORY-STRUCTURE.md` - Visual directory tree and naming conventions

### Changed
- **Major Documentation Reorganization:**
  - Created 13 organized subdirectories: `authentication/`, `features/`, `admin/`, `database/`, `operations/`, `menu-management/`, `integrations/`, `finance/`, `testing/`, `architecture/`, `phase-implementations/`, `changelog-archive/`, `api/`
  - Renamed all files to follow kebab-case convention (lowercase with hyphens)
  - Moved 80+ documentation files into logical categories
  - Consolidated scattered folders (`Finance/`, `Instagram design/`, `Test/`, `payment-integration/`) into standardized structure
  - Renamed phase folders to kebab-case: `phase-2-core-customer-experience/`, `phase-3-order-management/`, `phase-4-admin-dashboard/`
  - Archived historical changelog files (2024) to `changelog-archive/` with year prefix
- Established formal documentation practices across the project
- Defined clear criteria for when documentation is required vs optional

### Removed
- Eliminated inconsistent capitalization (ALL-CAPS, Mixed-Case, spaces in folder names)
- Removed redundant directory structures

---

## [2026-01-11] - Update

### Changed
- **Moniepoint Expense Import - Migrated from CSV to XLSX:**
  - Replaced `CSVParserService` with `XLSXParserService` using `xlsx` library
  - Updated `importMoniepointCSVAction` to handle Excel files (.xlsx, .xls)
  - Updated `CSVImportButton` component to accept Excel files instead of CSV
  - Updated all UI labels and descriptions to reference Excel files
  - File validation now checks for .xlsx and .xls extensions
  - Parser now reads Excel files as ArrayBuffer instead of text
  - Maintains same expense identification rules and workflow
  - All existing features preserved (approval workflow, bulk operations, etc.)

### Technical Details
- Service: `/services/xlsx-parser-service.ts` (replaces csv-parser-service.ts)
- Uses `XLSX.read()` and `XLSX.utils.sheet_to_json()` for parsing
- Handles Excel workbook structure with first sheet selection
- Maintains row 8 as header row (rows 1-7 are metadata)
- Same transaction parsing logic and expense identification rules

---

## [2026-01-07] - Feature

### Added
- **Moniepoint Expense Import Feature - IMPLEMENTED:**
  - **Documentation:**
    - `/docs/features/moniepoint-csv-expense-import.md` - Complete requirements specification
    - `/docs/features/moniepoint-csv-expense-import-implementation.md` - Technical implementation guide
  
  - **Database Models:**
    - Created `UploadedExpenseModel` with full schema for staging imported expenses
    - Updated `ExpenseModel` with `transactionFee` and `referenceNumber` fields
    - Added 5 new audit action types for uploaded expense operations
  
  - **Services:**
    - `XLSXParserService` - Parses Moniepoint Excel files with expense identification rules
    - `UploadedExpenseService` - Complete CRUD operations and approval workflow
    - Supports standard expenses and Electronic Money Transfer Levy detection
    - Duplicate detection via transaction reference numbers
  
  - **Server Actions (10 actions):**
    - `importMoniepointCSVAction` - Excel file upload and parsing
    - `listUploadedExpensesAction` - List with filters and pagination
    - `getUploadedExpenseAction` - Get single expense details
    - `updateUploadedExpenseAction` - Update expense fields
    - `approveUploadedExpenseAction` - Approve and create actual expense
    - `bulkApproveUploadedExpensesAction` - Bulk approval
    - `rejectUploadedExpenseAction` - Reject expense
    - `deleteUploadedExpenseAction` - Delete expense
    - `bulkDeleteUploadedExpensesAction` - Bulk deletion
    - `getUploadedExpensesStatsAction` - Get statistics
  
  - **UI Components:**
    - `CSVImportButton` - Upload dialog with file validation (supports Excel)
    - `UploadedExpensesList` - Review page with filtering and bulk operations
    - `UploadedExpensesStats` - Statistics dashboard cards
    - `EditUploadedExpenseDialog` - Edit expense details before approval
    - New page: `/dashboard/expenses/uploaded` - Uploaded expenses review interface
  
  - **Integration:**
    - Added import button to main expenses page
    - Added "View Uploaded" link to navigate to review page
    - Transaction fee field support in expense forms
  
  - **Features:**
    - Automatic expense identification from Moniepoint Excel format
    - Electronic Money Transfer Levy detection (₦50 charges)
    - Review and approval workflow before adding to expenses
    - Bulk operations (approve, reject, delete)
    - Category and expense type assignment during review
    - Original data preservation for reference
    - Duplicate prevention using transaction references
    - Statistics dashboard (pending, approved, rejected counts)

### Changed
- Updated `IExpense` interface to include `transactionFee` and `referenceNumber` fields
- Updated expense DTOs to support new fields
- Enhanced audit logging with uploaded expense actions

### Dependencies
- Using `xlsx` library (already installed) for Excel parsing
- Using `date-fns` for date handling

---

## Template for Future Entries

```markdown
## [YYYY-MM-DD] - [Category]

### Added
- New features or capabilities

### Changed
- Modifications to existing functionality

### Fixed
- Bug fixes with brief description

### Removed
- Deprecated features or code

### Security
- Security-related changes

---
```

**Categories:** Feature, Bug Fix, Refactor, Security, Performance, Documentation

---

## Historical Changes

For changes made before 2026-01-07, please refer to:
- Individual feature documentation in `/docs/features/`
- CHANGELOG-*.md files in `/docs/`
- Git commit history
- System-retrieved memories in the AI assistant

---

**Maintained By:** Development Team  
**Last Updated:** 2026-01-07
