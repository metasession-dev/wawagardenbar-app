# UAT Checklist — REQ-038 (Restock sellable inventory from expense + per-MenuItem expense unit override)

**Requirement:** Restock sellable inventory from expense + per-MenuItem expense unit override
**Issue:** [#84](https://github.com/metasession-dev/wawagardenbar-app/issues/84)
**Date:** 2026-05-17
**UAT environment:** `https://wawagardenbar-uat.up.railway.app/`

## What's automated vs manual

REQ-038 inherits the REQ-037 D11 pattern: E2E asserts behaviour; manual UAT is thin. E2E covers the dropdown wiring + service-side enforcement + customer-menu regression with per-AC `evidenceShot` PNGs at `compliance/evidence/REQ-038/screenshots/`. Manual UAT focuses on cross-unit verification (Bottles + Cans) + the reversal flow on UAT.

## Pre-flight

- [ ] No schema migration. `expenseUnitOverride` is optional and absent on existing MenuItem documents (defaults to undefined → "Any").

## Manual — Purchase unit dropdown is generic across units

- [ ] On Item A (e.g. a bottled drink): Settings → Menu → edit → Purchase unit dropdown → select **Bottles** → save → reopen → dropdown reflects Bottles.
- [ ] On Item B (e.g. a canned drink): same flow → select **Cans** → save → reopen → dropdown reflects Cans.
- [ ] Add new unit in Settings → Units of Measurement (e.g. "Kegs") → return to MenuItem edit → "Kegs" appears in the Purchase unit dropdown without any code change.

## Manual — Expense form unit lock

- [ ] Create a Direct Cost expense → tick "Update inventory count" → "Sellable item to restock" dropdown appears → pick Item A (Bottles) → Unit field collapses to a disabled "Bottles" display + tooltip explains the lock.
- [ ] Try typing a different unit into the Unit field → it remains locked (or the form rejects the submission at the service with the override error message).
- [ ] Pick Item B (Cans) → Unit field locks to Cans (proves the lock is generic, not bottles-only).
- [ ] Pick a third item where Purchase unit is "Any" → Unit field stays editable.

## Manual — End-to-end transfer

- [ ] With Item A (Bottles) picked, set quantity = 24, complete the expense → transfer pending group → Inventory dashboard's Sellable tab shows Item A's currentStock incremented by 24.
- [ ] Edit the same transferred expense → change quantity to 30 → save → Sellable tab shows the new currentStock (reversal + re-apply pattern from REQ-034 D10 fires correctly).
- [ ] Delete the expense → currentStock returns to the pre-transfer value.

## Manual — Customer menu regression

- [ ] Open the customer-facing menu in a separate browser → Item A still renders normally with its current stock; nothing about the restock path is visible to the customer.

## Sign-off

- [ ] All extended E2E tests in `e2e/kitchen/expense-link.spec.ts` (or `e2e/expense-sellable-restock.spec.ts`) green on develop CI
- [ ] All manual cross-unit + reversal + customer-menu checks above completed
- [ ] DevAudit / META-COMPLY UAT approval recorded
- [ ] PR merged to main

## Appendix — items removed from manual UAT (covered by E2E)

| Former manual step                                     | Now asserted by                                                             |
| ------------------------------------------------------ | --------------------------------------------------------------------------- |
| Label rename "Add to kitchen inventory (optional)"     | `expense-link.spec.ts` AC2                                                  |
| Pick sellable item with Bottles override → Unit locked | `expense-link.spec.ts` AC3+AC5                                              |
| Service rejects mismatched expense.unit                | Vitest `validateExpenseUnitAgainstOverride` + service apply rejection tests |
| Customer menu still renders sellable items unchanged   | `expense-link.spec.ts` AC6 + existing customer-menu E2E (regression check)  |
| "Any" Purchase unit → Unit dropdown editable           | `expense-link.spec.ts` AC3 third scenario                                   |
