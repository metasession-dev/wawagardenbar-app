# Test Plan — REQ-026

**Requirement:** REQ-026
**Issue:** #57
**Risk Level:** HIGH
**Date:** 2026-04-12

---

## Unit Tests (TDD — write before implementation)

File: `__tests__/pending-expense-group/pending-expense-group-service.test.ts`

| Test                                                           | AC   | Description                                          |
| -------------------------------------------------------------- | ---- | ---------------------------------------------------- |
| calculates totalAmount as sum of item totalCosts               | AC-1 | Group with 3 items returns correct sum               |
| auto-calculates item totalCost from qty × unitCost             | AC-1 | Service normalises totalCost on create               |
| creates group with status pending                              | AC-2 | `createGroup()` sets status to `pending`             |
| sets submittedBy and submittedAt on create                     | AC-8 | Audit fields populated                               |
| transitions pending → approved                                 | AC-5 | `approveGroup()` sets status, approvedBy, approvedAt |
| throws if approving non-pending group                          | AC-5 | Already approved/transferred → error                 |
| assigns paymentBatchId to multiple groups                      | AC-6 | `assignBatch()` sets same batchId on all groups      |
| fans out line items to Expense records on transfer             | AC-7 | N items → N Expense docs, correct fields             |
| sets pendingGroupId on each created Expense                    | AC-8 | Traceability field populated                         |
| sets transferReference as receiptReference on Expense          | AC-7 | Maps correctly                                       |
| sets transferredBy, transferredAt, transferReference on group  | AC-8 | Audit fields populated                               |
| throws if transferring non-approved group                      | AC-7 | Pending/already-transferred → error                  |
| transfer reference is required (throws if empty)               | AC-7 | Validation enforced in service                       |
| live Expense records not present before transfer               | AC-2 | Ledger clean until confirmed                         |
| existing Expense records unaffected by create/approve/transfer | AC-9 | No side-effects on live ledger                       |

---

## Unit Tests — RBAC (server actions layer)

File: `__tests__/pending-expense-group/pending-expense-actions.test.ts`

| Test                                                     | AC   | Description       |
| -------------------------------------------------------- | ---- | ----------------- |
| admin can call createPendingExpenseGroupAction           | AC-4 | Returns success   |
| super-admin can call createPendingExpenseGroupAction     | AC-4 | Returns success   |
| customer role blocked on createPendingExpenseGroupAction | AC-3 | Returns 403/error |
| admin can call updatePendingExpenseGroupAction           | AC-4 | Returns success   |
| super-admin can call approvePendingExpenseGroupAction    | AC-5 | Returns success   |
| admin blocked on approvePendingExpenseGroupAction        | AC-5 | Returns 403/error |
| super-admin can call confirmTransferAction               | AC-7 | Returns success   |
| admin blocked on confirmTransferAction                   | AC-7 | Returns 403/error |

---

## E2E Tests (write after implementation)

File: `e2e/pending-expenses.spec.ts`

| Test                                                   | AC         | Description                                                 |
| ------------------------------------------------------ | ---------- | ----------------------------------------------------------- |
| admin submits multi-line expense group                 | AC-1, AC-2 | Form with 3 line items saved; group appears on pending page |
| Save & Add Another reopens form with header pre-filled | AC-1       | Date/type/category retained                                 |
| submitted group not in live expense list               | AC-2       | Expenses page does not show pending group                   |
| admin can edit pending group line items                | AC-4       | Edit dialog saves changes                                   |
| admin cannot see Approve button                        | AC-5       | Button absent for admin role                                |
| super-admin approves group — status badge updates      | AC-5       | Badge shows Approved                                        |
| super-admin merges two groups into payment batch       | AC-6       | Both cards grouped together                                 |
| super-admin confirms transfer with reference           | AC-7       | Group removed from pending view                             |
| transferred expenses appear in live expense list       | AC-7       | Ledger updated                                              |
| financial report includes transferred expenses         | AC-7       | Daily summary totals correct                                |
| customer redirect from pending expenses page           | AC-3       | 403 or redirect to login                                    |

---

## Tests to Update

| File                                                             | Change                                                                                                                  |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `__tests__/reports/total-revenue-consistency.test.ts` (existing) | Verify no regression — reports query ExpenseModel only (not PendingExpenseGroup); no pre-transfer amounts should appear |

## Tests to Remove

None.

---

## Test Data Requirements

- Seeded users: admin role, super-admin role, customer role
- Expense categories available (direct-cost + operating-expense)
- At least two pending groups for batching tests
