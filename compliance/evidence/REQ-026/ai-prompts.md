# AI Prompts Log — REQ-026

**Requirement:** REQ-026
**Risk Level:** HIGH
**Date:** 2026-04-12

---

## Phase 1 — Planning

### Prompt 1: Implementation Plan Authoring

**Context:** User asked to implement a new expense submission workflow with multi-line items, pending approval queue, and payment confirmation.
**Task:** Create detailed implementation plan including architecture decisions, data model, files to create/modify, RBAC matrix, and implementation phases.
**Output:** `compliance/evidence/REQ-026/implementation-plan.md`

### Prompt 2: SOLID Principles Review

**Context:** User asked "does this follow the SOLID principles" after reviewing the implementation plan.
**Task:** Analyze the plan for SOLID compliance, identify LSP violation (repurposing `createExpenseAction`), and propose fix (create new action).
**Output:** Updated `implementation-plan.md` with Decision 3 addressing LSP.

### Prompt 3: Test Scope Authoring

**Context:** Planning phase — need acceptance criteria.
**Task:** Create 9 acceptance criteria covering multi-line form, pending queue, edit/approve/batch/transfer flows, audit trail, and no regressions.
**Output:** `compliance/evidence/REQ-026/test-scope.md`

### Prompt 4: Test Plan Authoring

**Context:** After test scope approval.
**Task:** Map acceptance criteria to specific unit tests (15 service + 8 RBAC) and 11 E2E tests. Distinguish TDD (unit) from post-implementation (E2E).
**Output:** `compliance/evidence/REQ-026/test-plan.md`

---

## Phase 2 — Unit Tests (TDD)

### Prompt 5: Unit Test Authoring — Service Logic

**Context:** RED phase — write tests before implementation.
**Task:** Create 15 pure logic tests for `calculateGroupTotal`, `normaliseLineItems`, `validateStatusTransition`, and `buildExpenseRecordsFromGroup`. No DB, pure functions only.
**Output:** `__tests__/pending-expense-group/pending-expense-group-service.test.ts`

### Prompt 6: Unit Test Authoring — RBAC Actions

**Context:** RED phase — test role-based access control.
**Task:** Create 8 mock-based tests for server actions enforcing admin/super-admin permissions on create, update, approve, and transfer operations.
**Output:** `__tests__/pending-expense-group/pending-expense-actions.test.ts`

---

## Phase 3 — Implementation

### Prompt 7: Data Layer Implementation

**Context:** GREEN phase — make tests pass.
**Task:** Create `IPendingExpenseGroup` interface, Mongoose model, and `PendingExpenseGroupService` with the pure logic functions exported for testing. Add `pendingGroupId` to `IExpense` and `ExpenseModel`.
**Output:** `interfaces/pending-expense-group.interface.ts`, `models/pending-expense-group-model.ts`, `services/pending-expense-group-service.ts`, `interfaces/expense.interface.ts`, `models/expense-model.ts`

### Prompt 8: Server Actions Implementation

**Context:** GREEN phase — implement RBAC actions.
**Task:** Create server actions in `pending-expense-actions.ts` with `requireAdminOrAbove` and `requireSuperAdmin` helpers. Call `PendingExpenseGroupService` methods.
**Output:** `app/actions/finance/pending-expense-actions.ts`

### Prompt 9: Expense Form Rework

**Context:** UI implementation — multi-line item entry.
**Task:** Rewrite `expense-form.tsx` to use `useFieldArray` for dynamic line items, auto-calculate totals, submit to `createPendingExpenseGroupAction` instead of `createExpenseAction`. Add "Save & Add Another" behavior.
**Output:** `components/features/finance/expense-form.tsx`

### Prompt 10: Pending Expenses Page Components

**Context:** UI implementation — pending queue management.
**Task:** Create `edit-pending-group-dialog.tsx` (similar to form but for editing), `transfer-confirmation-dialog.tsx` (mandatory transfer reference), and `pending-expense-group-list.tsx` (list with expand/collapse, select, batch, approve, transfer actions).
**Output:** `components/features/finance/edit-pending-group-dialog.tsx`, `components/features/finance/transfer-confirmation-dialog.tsx`, `components/features/finance/pending-expense-group-list.tsx`

### Prompt 11: Pending Expenses Page

**Context:** UI implementation — page route.
**Task:** Create server component page at `/dashboard/finance/expenses/pending/page.tsx` with RBAC check (admin/super-admin only), render `PendingExpenseGroupList`.
**Output:** `app/dashboard/finance/expenses/pending/page.tsx`

### Prompt 12: Navigation Updates

**Context:** UI implementation — add navigation link.
**Task:** Add "Pending Expenses" nav item to `dashboard-nav.tsx` with Clock icon. Update `expenses-client.tsx` to add "Pending Expenses" button and remove unused edit state.
**Output:** `components/features/admin/dashboard-nav.tsx`, `app/dashboard/finance/expenses/expenses-client.tsx`

---

## Summary

- **Total prompts:** 12
- **Phases:** Planning (4), Unit Tests (2), Implementation (6)
- **Files created:** 11
- **Files modified:** 5
- **Tests added:** 32 (15 service logic + 8 RBAC + 11 E2E planned)
