# Implementation Plan — REQ-032

**Requirement:** REQ-032 — Create pending expense group from existing expenses (multi-select)
**GitHub Issue:** TBD
**Risk Level:** MEDIUM (financial data, additive — no schema migration, source rows unchanged)
**Date:** 2026-04-30

## Approach

Reuse the existing **Add Expense** dialog (`ExpenseForm`, REQ-026) and the existing `createPendingExpenseGroupAction` server action. Add a multi-select column to the expenses list and a bulk-action bar on the Expenses page; on click, map the selected `Expense` rows to `IExpenseLineItem` shapes via a new pure helper and pass them into the form's existing `prefill` interface (extended to accept `items`). User reviews/edits then submits as today.

The duplicate is **standalone** — no back-link is created on the resulting pending group. Source `Expense` rows are read-only.

## Files to Create

- `lib/expense-to-line-item.ts` — pure helpers `mapExpenseToLineItem(expense)` and `mapExpensesToLineItems(expenses[])`. Field mapping per the test plan; defaults `quantity ?? 1` and `unit ?? 'each'`; rounds `unitCost` to 2dp; preserves `totalCost = amount` exactly.
- `__tests__/lib/expense-to-line-item.test.ts` — 10 unit tests covering the mapping (verbatim copy of expenseType/category/description, defaults, rounding, totalCost preservation, multi-row mapping, shape compatibility with `IExpenseLineItem`).
- `e2e/finance/create-pending-from-expenses.spec.ts` — Playwright user journey: select 2 expense rows → bulk-action bar shows count → click button → dialog opens with 2 pre-filled line items → close → selection cleared. Skips gracefully if UAT lacks ≥2 seeded expenses.
- `compliance/evidence/REQ-032/test-scope.md`, `test-plan.md`, `implementation-plan.md` — standard SDLC artefacts.
- `compliance/pending-releases/RELEASE-TICKET-REQ-032.md` — release ticket (DRAFT).

## Files to Modify

- `components/features/finance/expense-form.tsx` — extend the `prefill` interface to accept an optional `items?: ExpenseFormValues['items']`. When supplied (and non-empty), use those items as the form's initial value in both `defaultValues` and the `useEffect(open)` reset block. When omitted, behaviour is identical to today (one blank line item).
- `components/features/finance/expense-list.tsx` — add an optional controlled selection prop pair (`selectedIds?: Set<string>`, `onSelectionChange?: (next) => void`). When supplied, render a row checkbox in a new leading column and a header "select all (visible)" checkbox; when omitted, the table renders exactly as today (preserves callers like `Reports`/`Pending` views).
- `app/dashboard/finance/expenses/expenses-client.tsx` — track `selectedExpenseIds: Set<string>`, render a bulk-action bar above the table when non-empty, and on click of "Create pending group from selected (N)" map the selected expenses to line items, set them as the dialog's `prefill.items`, open the dialog, and clear the selection set. Wire the existing `ExpenseForm` to honour the new `prefill.items` shape.
- `compliance/RTM.md` — append REQ-032 row.

## Field mapping (Expense → ExpenseLineItem)

| ExpenseLineItem | Source                                     |
| --------------- | ------------------------------------------ |
| `expenseType`   | `Expense.expenseType`                      |
| `category`      | `Expense.category`                         |
| `description`   | `Expense.description`                      |
| `quantity`      | `Expense.quantity ?? 1`                    |
| `unit`          | `Expense.unit ?? 'each'`                   |
| `unitCost`      | `round2(Expense.amount / (quantity ?? 1))` |
| `totalCost`     | `Expense.amount` (preserved exactly)       |

Group `date` defaults to today (editable in dialog). `totalAmount` is auto-computed by the existing service (`calculateGroupTotal`).

## Risk Mitigation

- No schema migration, no new server endpoint — change is contained to UI + a pure helper.
- `totalCost = amount` (not `quantity × unitCost`) prevents rounding-loss from changing the recorded amount when a non-integer division occurs (e.g. amount=1000, qty=3 → unitCost=333.33, but totalCost stays at 1000).
- Selection clears on dialog open (AC8) so an aborted dialog doesn't leave stale selection state.
- Existing `lineItemSchema` Zod validation runs against pre-filled items at submission time, so any data anomaly in a source `Expense` is caught before persistence.

## Dependencies

- REQ-026 — supplies `PendingExpenseGroup` model, service, action, and the `ExpenseForm` dialog.
- REQ-028 — supplies category dropdown grouping (no interaction; pre-filled items already carry valid categories).
- REQ-029 — supplies the search/filter on the expense list (no interaction).

## Definition of Done

- 10 unit tests pass (mapping helper)
- 462 + 10 = 472 unit tests pass overall (no regression)
- E2E spec passes on UAT when ≥2 seeded expenses are present; skips gracefully otherwise
- TypeScript: 0 errors
- Build: succeeds
- Compliance validator: `bash scripts/validate-compliance-artifacts.sh` passes for REQ-032
- Manual UAT round trip: select 2 expenses → create pending group → verify it appears in `/dashboard/finance/expenses/pending` with both lines and correct total
