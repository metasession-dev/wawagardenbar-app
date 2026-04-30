# Test Plan — REQ-032

**Requirement:** REQ-032 — Create pending expense group from existing expenses (multi-select, standalone copy)
**Risk Level:** MEDIUM
**GitHub Issue:** [#70](https://github.com/metasession-dev/wawagardenbar-app/issues/70)
**Date:** 2026-04-30

## Acceptance Criteria

- **AC1** — On `/dashboard/finance/expenses`, each expense row exposes a checkbox (admin and super-admin only).
- **AC2** — A bulk-action bar appears when one or more rows are selected, showing the selection count and a **"Create pending group from selected (N)"** button.
- **AC3** — Clicking the button opens the existing `ExpenseForm` dialog pre-populated with one line item per selected expense, mapped according to the field-mapping table below.
- **AC4** — Group `date` defaults to today (editable). User may add/remove/edit lines before submitting.
- **AC5** — Submitting calls the existing `createPendingExpenseGroupAction` and creates a new `PendingExpenseGroup` (status `pending`). Source `Expense` rows are unchanged.
- **AC6** — The pure mapping helper rounds `unitCost` to 2 decimal places and defaults `quantity ?? 1`, `unit ?? 'each'` when source `Expense` is missing those fields.
- **AC7** — `totalCost` on each line item equals the source `Expense.amount` exactly (preserves the recorded amount even when quantity defaults).
- **AC8** — Selection state is cleared after the dialog opens (so successive selections don't carry over after an aborted dialog).
- **AC9** — Regression: existing **Add Expense** flow (no prefill) is unchanged.

## Field mapping (Expense → ExpenseLineItem)

| ExpenseLineItem | Source                                     |
| --------------- | ------------------------------------------ |
| `expenseType`   | `Expense.expenseType`                      |
| `category`      | `Expense.category`                         |
| `description`   | `Expense.description`                      |
| `quantity`      | `Expense.quantity ?? 1`                    |
| `unit`          | `Expense.unit ?? 'each'`                   |
| `unitCost`      | `round2(Expense.amount / (quantity ?? 1))` |
| `totalCost`     | `Expense.amount`                           |

## Tests to Add

- [ ] `__tests__/lib/expense-to-line-item.test.ts` — pure helpers `mapExpenseToLineItem(expense)` and `mapExpensesToLineItems(expenses[])`. ~8 tests covering: all fields present, missing quantity defaults to 1, missing unit defaults to 'each', unitCost = amount/qty rounded to 2dp, totalCost = amount preserved, multiple expenses → multiple line items, expenseType/category/description copied verbatim, both line items pass `lineItemSchema` shape (compatible with the form's Zod schema).
- [ ] `e2e/finance/create-pending-from-expenses.spec.ts` — Playwright user journey: log in as admin → open Expenses page → select 2 existing expense rows → click bulk-action button → verify dialog opens with 2 pre-filled line items → submit → navigate to Pending Expenses → verify new group present with both lines and correct total.

## Tests to Update

None — the existing pending-group test suite (`__tests__/pending-expense-group/`) is not affected. Field mapping is encapsulated in the new helper.

## Tests to Remove

None.

## Functional Test Mapping

| Acceptance Criterion                      | Test File                                          | Test Name                                                                                |
| ----------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| AC1 — Row checkboxes (RBAC-gated)         | `e2e/finance/create-pending-from-expenses.spec.ts` | "AC1: Expense rows show selection checkboxes for admin"                                  |
| AC2 — Bulk-action bar with count          | `e2e/finance/create-pending-from-expenses.spec.ts` | "AC2: Bulk-action bar appears with selection count"                                      |
| AC3 — Dialog pre-population               | `e2e/finance/create-pending-from-expenses.spec.ts` | "AC3: Dialog opens pre-populated with one line per selected expense"                     |
| AC3 — Mapping correctness                 | `__tests__/lib/expense-to-line-item.test.ts`       | "mapExpenseToLineItem — copies expenseType/category/description verbatim"                |
| AC4 — Date defaults to today              | `e2e/finance/create-pending-from-expenses.spec.ts` | "AC4: Group date defaults to today and is editable"                                      |
| AC5 — Submission creates pending group    | `e2e/finance/create-pending-from-expenses.spec.ts` | "AC5: Submitting creates pending group; source expenses unchanged"                       |
| AC6 — Defaults for missing fields         | `__tests__/lib/expense-to-line-item.test.ts`       | "mapExpenseToLineItem — defaults quantity to 1 when missing" / "defaults unit to 'each'" |
| AC6 — Rounding                            | `__tests__/lib/expense-to-line-item.test.ts`       | "mapExpenseToLineItem — rounds unitCost to 2 decimal places"                             |
| AC7 — totalCost preservation              | `__tests__/lib/expense-to-line-item.test.ts`       | "mapExpenseToLineItem — totalCost equals source amount exactly"                          |
| AC8 — Selection cleared after dialog open | `e2e/finance/create-pending-from-expenses.spec.ts` | "AC8: Selection is cleared after dialog opens"                                           |
| AC9 — Regression: Add Expense unchanged   | existing `__tests__/pending-expense-group/` suite  | (verify all pre-existing pending-group tests still pass)                                 |

## Non-Functional Tests

- **Security**: AC1 RBAC gate (admin or super-admin only) is verified by the existing role guard at the page level (page-level auth in `app/dashboard/finance/expenses/pending/page.tsx` and the action's `requireAdminOrAbove` — already covered by REQ-026 tests).
- **Performance**: helper is pure O(N) over selected expenses; no DB calls. No load testing required.
- **Accessibility**: row checkboxes carry `aria-label="Select expense …"`; bulk-action bar uses `<Button>` with visible text label.

## Out of Scope (per design decision)

- Back-link `sourceExpenseIds` on the new group — not added (standalone copy per user direction).
- Reclassification of source Expense rows — not modified.
- New server action — reuses existing `createPendingExpenseGroupAction`; mapping happens client-side before submission.
