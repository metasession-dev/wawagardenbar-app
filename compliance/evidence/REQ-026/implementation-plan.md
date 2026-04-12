# Implementation Plan — REQ-026

**Requirement:** REQ-026
**Issue:** #57
**Risk Level:** HIGH
**Date:** 2026-04-12

---

## Problem Statement

The current expense entry flow creates expenses directly in the live ledger with no approval or payment confirmation step. The new flow requires:

1. Multi-line item entry per submission group
2. Pending queue with super-admin approval gate
3. Payment batch regrouping
4. Mandatory transfer reference before committing to live ledger

---

## Architecture Decisions

### Decision 1 — New `PendingExpenseGroup` collection (not reuse `UploadedExpense`)

The existing `UploadedExpense` collection is for CSV imports and has different semantics (row-level approval, no payment batch concept). A new dedicated collection keeps concerns separate and avoids polluting the CSV import flow.

### Decision 2 — Line items as sub-documents on the group

Each group has `items[]` sub-documents (description, qty, unit, unitCost, totalCost). On transfer confirmation each item fans out to one `Expense` record (maintaining backward compatibility with the existing flat `IExpense` model).

### Decision 3 — New server action, not repurposing `createExpenseAction` (LSP)

`createExpenseAction` in `expense-actions.ts` remains unchanged — it writes directly to the live ledger and is used by the CSV import approval path. The form will call the new `createPendingExpenseGroupAction` in `pending-expense-actions.ts`. This avoids a Liskov substitution violation where callers of `createExpenseAction` would silently receive different behaviour.

### Decision 4 — Payment batch via `paymentBatchId` field

Regrouping for payment is done by assigning a shared `paymentBatchId` string to multiple groups. Transfer confirmation operates on all groups sharing the same `paymentBatchId`. Each group retains its own `expenseType` and `category`.

### Decision 5 — Status lifecycle

`pending` → (super-admin approves) → `approved` → (super-admin confirms transfer) → `transferred`

On `transferred`: each line item is written to the `Expense` collection; the group remains in `PendingExpenseGroup` for audit purposes (soft archive, hidden from active pending view).

---

## Data Model

### New: `IPendingExpenseGroup`

```typescript
interface IExpenseLineItem {
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number; // quantity * unitCost (auto-calculated, editable)
}

interface IPendingExpenseGroup {
  _id: ObjectId;
  date: Date;
  expenseType: 'direct-cost' | 'operating-expense';
  category: string;
  items: IExpenseLineItem[];
  totalAmount: number; // sum of item.totalCost

  status: 'pending' | 'approved' | 'transferred';
  paymentBatchId?: string; // shared across groups to be paid together

  submittedBy: ObjectId;
  submittedAt: Date;

  approvedBy?: ObjectId;
  approvedAt?: Date;

  transferReference?: string;
  transferredBy?: ObjectId;
  transferredAt?: Date;

  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Modified: `IExpense` — add `pendingGroupId` (optional, for traceability)

No schema-breaking changes to the live expense model.

---

## Files to Create

| File                                                           | Purpose                                          |
| -------------------------------------------------------------- | ------------------------------------------------ |
| `interfaces/pending-expense-group.interface.ts`                | `IExpenseLineItem`, `IPendingExpenseGroup`, DTOs |
| `models/pending-expense-group-model.ts`                        | Mongoose schema + model                          |
| `services/pending-expense-group-service.ts`                    | CRUD, approve, batch, transfer                   |
| `app/actions/finance/pending-expense-actions.ts`               | Server actions with RBAC                         |
| `app/dashboard/finance/expenses/pending/page.tsx`              | Pending expenses page                            |
| `components/features/finance/pending-expense-group-list.tsx`   | List of pending groups                           |
| `components/features/finance/pending-expense-group-card.tsx`   | Single group display + actions                   |
| `components/features/finance/edit-pending-group-dialog.tsx`    | Edit group header + line items                   |
| `components/features/finance/regroup-expenses-dialog.tsx`      | Select groups to merge into batch                |
| `components/features/finance/transfer-confirmation-dialog.tsx` | Transfer ref input + confirm                     |

## Files to Modify

| File                                                 | Change                                                                                             |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `components/features/finance/expense-form.tsx`       | Add multi-line item table; call `createPendingExpenseGroupAction` instead of `createExpenseAction` |
| `interfaces/expense.interface.ts`                    | Add optional `pendingGroupId` to `IExpense`                                                        |
| `models/expense-model.ts`                            | Add optional `pendingGroupId` field                                                                |
| `app/dashboard/finance/expenses/expenses-client.tsx` | Add "Pending Expenses" tab/link                                                                    |

---

## RBAC Matrix

| Action                        | Admin | Super-Admin |
| ----------------------------- | ----- | ----------- |
| Submit (create pending group) | ✅    | ✅          |
| View pending groups           | ✅    | ✅          |
| Edit pending group            | ✅    | ✅          |
| Approve group                 | ❌    | ✅          |
| Create/modify payment batch   | ❌    | ✅          |
| Confirm transfer              | ❌    | ✅          |

---

## Implementation Phases

1. **Data layer** — interface, model, service
2. **Server actions** — with RBAC checks
3. **Form rework** — multi-line item expense-form.tsx
4. **Pending page** — list, group card, edit dialog
5. **Approve + batch + transfer flows** — dialogs and actions
6. **Navigation** — add pending link to finance sidebar
