# UAT Checklist — REQ-034 (D11-trimmed)

**Requirement:** Recipes + Production + Kitchen-Ingredient Inventory + Kitchen Management permission
**Issue:** [#74](https://github.com/metasession-dev/wawagardenbar-app/issues/74)
**Date:** 2026-05-09 (last revised 2026-05-14 for D11)
**UAT environment:** `https://wawagardenbar-uat.up.railway.app/`

## What changed in D11

The full feature surface — permission gating, kind filtering, inventory tabs,
expense → inventory link (with D10 unit-conversion regression coverage),
recipe builder validation, production deduction, and the production void
rules — is now exercised end-to-end in Playwright. Each automated test
**asserts numeric side effects** via the rendered UI (e.g. `currentStock`
column on the Inventory dashboard), not just that pages render. See:

- `e2e/kitchen/permission-gating.spec.ts` — Step 1
- `e2e/kitchen/menu-kind-filter.spec.ts` — Step 2
- `e2e/kitchen/inventory-tabs.spec.ts` — Step 3
- `e2e/kitchen/expense-link.spec.ts` — Step 4 (incl. D10 regression)
- `e2e/kitchen/recipe-validation.spec.ts` — Step 5
- `e2e/kitchen/production-flow.spec.ts` — Step 6 + 7
- `e2e/kitchen/recipe-and-production.spec.ts` — original surface smoke

Steps 1–7 are no longer manual UAT work — they run on every CI green of
develop. Residual manual UAT below.

## Pre-flight (manual — ops procedure)

- [ ] Backfill script run on UAT: `npx tsx scripts/backfill-inventory-kind.ts`.
      Inspect log — every existing Inventory row tagged `kind: 'menu-item'`.
      Re-run reports 0 updates (idempotent). Logs captured to
      `compliance/evidence/REQ-034/gates/uat-backfill-*.txt`.
- [ ] D10 audit: `npx tsx scripts/audit-expense-link-units.ts`. Inspect
      the report — any historical expense link whose `expense.unit` differs
      from `inventory.unit` was applied pre-D10 and may have miscredited
      stock. Flag those expenses for manual reconciliation.

## Step 8 — Daily Financial Report regression (manual — visual)

- [ ] Daily Financial Report for the test day still renders correctly.
- [ ] `paymentBreakdown.total` (revenue) unchanged by production events.
- [ ] Per-portion COGS calculation uses weighted-average cost from
      `InventoryItemCostHistory`. (The math is unit-tested under
      `__tests__/services/expense-inventory-link.test.ts` —
      this UAT step is a visual sanity check.)

## Sign-off (manual — procedural)

- [ ] All manual checkboxes ticked
- [ ] All E2E specs above are green on the develop CI run that feeds
      META-COMPLY (DevAudit)
- [ ] Operator has manually deleted any orphaned test rows in UAT
      (kitchen-ingredient test fixtures named `E2E-…`) if they accumulated
- [ ] DevAudit / META-COMPLY UAT approval recorded

## Appendix — items removed from manual UAT in D11

The following items moved to E2E. They are no longer manual checkboxes
but the assertions still run on every CI green:

| Former manual step                                    | Now asserted by                 |
| ----------------------------------------------------- | ------------------------------- |
| Permission toggle position + sidebar visibility       | `permission-gating.spec.ts`     |
| Forbidden redirect for csr / no-permission admin      | `permission-gating.spec.ts`     |
| Public menu API excludes kitchen ingredients          | `menu-kind-filter.spec.ts`      |
| Order-create menu picker excludes kitchen ingredients | `menu-kind-filter.spec.ts`      |
| Sellable / Kitchen tab counts                         | `inventory-tabs.spec.ts`        |
| Direct Cost dropdown visibility + grouped categories  | `expense-link.spec.ts`          |
| Non-direct-cost hides Add to inventory                | `expense-link.spec.ts`          |
| 5 kg expense → 5000 g inventory (**D10 regression**)  | `expense-link.spec.ts`          |
| Identity case: same unit on both sides                | `expense-link.spec.ts`          |
| Recipe builder duplicate-ingredient rejection         | `recipe-validation.spec.ts`     |
| Recipe builder cross-dimension rejection              | `recipe-validation.spec.ts`     |
| Recipe target/ingredient kind filtering               | `recipe-validation.spec.ts`     |
| Make-a-batch active-recipe filter                     | `production-flow.spec.ts`       |
| Per-ingredient deduction with unit conversion         | `production-flow.spec.ts`       |
| Pre-flight shortage error + no partial deduction      | `production-flow.spec.ts`       |
| Admin (non-super-admin) cannot void a production      | `production-flow.spec.ts`       |
| Super-admin sees Void buttons on history              | `recipe-and-production.spec.ts` |
