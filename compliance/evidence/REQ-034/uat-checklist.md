# UAT Checklist — REQ-034

**Requirement:** Recipes + Production + Kitchen-Ingredient Inventory + Kitchen/Bar/Waiting roles
**Issue:** [#74](https://github.com/metasession-dev/wawagardenbar-app/issues/74)
**Date:** 2026-05-09
**UAT environment:** `https://wawagardenbar-uat.up.railway.app/`

## Pre-flight

- [ ] Backfill script run on UAT: `npx tsx scripts/backfill-inventory-kind.ts`. Inspect log — every existing Inventory row tagged `kind: 'menu-item'`. Re-run reports 0 updates (idempotent).
- [ ] Confirm at least 3 `kind: 'kitchen-ingredient'` records added to UAT (e.g. goat meat, palm oil, salt).
- [ ] Confirm at least one Recipe authored on UAT linking a MenuItem to those ingredients.

## Phase A — kitchenManagement permission + Inventory.kind + Expense link

### Step 1 — Permission gating (post-D5 walkback, 2026-05-13)

> AC4 was redesigned during UAT — see defect D5 in
> `test-execution-summary.md`. The three originally-proposed roles
> (`kitchen` / `bar` / `waiting`) were dropped in favour of a single
> `kitchenManagement` feature-permission on the existing
> csr / admin / super-admin role set.

- [ ] Settings → Admins → Create Admin (or edit an existing admin) →
      **Permissions** section shows **Kitchen Management** as the 8th
      toggle (ChefHat icon, "Author recipes and record production
      batches"), after **Settings & Configuration**.
- [ ] Sidebar shows a **Kitchen** entry (ChefHat icon) only when the
      current user has `kitchenManagement` granted.
  - [ ] As super-admin: Kitchen link visible by default.
  - [ ] As an admin without kitchenManagement: Kitchen link absent.
  - [ ] Grant the permission, log out + back in: Kitchen link
        appears.
- [ ] Create a test admin user **with** `kitchenManagement` enabled.
  - [ ] Log in as that user → can hit `/dashboard/kitchen/recipes` and
        `/dashboard/kitchen/production`.
- [ ] Create a test admin user **without** `kitchenManagement`.
  - [ ] Log in as that user → hitting `/dashboard/kitchen/recipes`
        bounces to `/dashboard/forbidden` (or the equivalent
        `requirePermission` redirect target).
- [ ] As a csr user (no `kitchenManagement` by default): hitting
      `/dashboard/kitchen/recipes` is denied.

### Defunct items from the original checklist

The following items were superseded by the D5 walk-back and no longer
apply — the three roles they reference do not exist:

- ~~"Settings > Admins: role dropdown lists Kitchen / Bar / Waiting"~~
- ~~"Create test user B with role `bar`" / "test user C with role `waiting`"~~

The orphaned kitchen-role test user created during the original
walkthrough should be deleted from Settings → Admins.

### Step 2 — Customer-menu kind filter

- [ ] Public menu API (`GET /api/public/menu`) returns only `kind:'menu-item'` items. Verify by adding a kitchen-ingredient and confirming it does NOT appear.
- [ ] Express create-order menu picker shows ONLY menu-item inventory. No kitchen ingredients leak.
- [ ] Order-edit menu picker shows ONLY menu-item inventory.

### Step 3 — Inventory dashboard tabs

- [ ] `/dashboard/inventory` shows two tabs: Sellable (kind:menu-item) and Kitchen (kind:kitchen-ingredient).
- [ ] Each tab filters its list correctly.

### Step 4 — Expense → Inventory link

- [ ] Expense form: when expense type = Direct Cost, "Add to inventory" dropdown is visible.
- [ ] Dropdown options are limited to `kind:'kitchen-ingredient'` records, grouped by COGS category.
- [ ] When expense type = Repairs / Salaries / etc., the dropdown is NOT visible.
- [ ] Save an expense linked to "goat meat" with quantity 5 (kg). Verify:
  - [ ] Inventory.currentStock for goat meat increased by 5.
  - [ ] A new `InventoryItemCostHistory` row created with `cost = expense.amount / 5`.
  - [ ] A `StockMovement` row created tagged with the expenseId.
- [ ] Edit the same expense to quantity 4. Verify:
  - [ ] Prior StockMovement voided (reversal entry created, original NOT physically deleted).
  - [ ] New StockMovement created for the new quantity.
  - [ ] Inventory.currentStock now reflects the diff.
  - [ ] Cost history has another row.
- [ ] Now record a production that consumes 2kg of goat meat (currentStock goes to 2).
- [ ] Try to edit the expense quantity to 1 (would drive currentStock to -1). Verify:
  - [ ] **BLOCKED** with error message explaining how much has been consumed.
  - [ ] No reversal landed; inventory state unchanged.

## Phase B — Recipes + Production

### Step 5 — Recipe builder

- [ ] `/dashboard/kitchen/recipes` lists existing recipes (empty on first load).
- [ ] Click "New Recipe":
  - [ ] Target menu item dropdown lists only `kind:'menu-item'` records.
  - [ ] Yield portions input accepts > 0; rejects ≤ 0.
  - [ ] Add ingredient row: dropdown lists only `kind:'kitchen-ingredient'`, grouped by COGS category.
  - [ ] Quantity input + unit dropdown. Unit defaults to inventory's `unitId` but is overrideable to any same-dimension unit (e.g. ingredient stored as kg, recipe specifies g).
  - [ ] Add second row of the SAME ingredient: rejected at submit ("duplicate ingredient").
  - [ ] Specify ingredient unit `ml` against an inventory in `kg`: rejected at submit ("cross-dimension").
  - [ ] Specify ingredient unit `bottles` against an inventory in `crates`: rejected at submit (count is strict-match).
  - [ ] Save. Recipe appears in the list.
- [ ] Edit recipe → toggle "Active" off. Save. Recipe still appears in list (with deactivated badge) but does NOT appear in "Make a batch" dropdown.

### Step 6 — Production execution

- [ ] `/dashboard/kitchen/production` shows production history (empty on first load).
- [ ] Click "Make a batch":
  - [ ] Recipe dropdown lists only ACTIVE recipes.
  - [ ] Pick "Pepper Soup". Batch count default = 1. Expected yield read-only display = recipe.yieldPortions × 1.
  - [ ] Actual yield input defaults to expected; can be overridden.
  - [ ] Submit:
    - [ ] Each ingredient deducted from currentStock per recipe quantity (with same-dimension conversion if needed).
    - [ ] MenuItem inventory bumped by actualYield.
    - [ ] Production row created with `ingredientsDeducted` snapshot in inventory units.
    - [ ] N+1 `StockMovement` rows created (N deductions + 1 addition), all tagged with productionId.
- [ ] Pre-flight: stage an ingredient at currentStock = 1 needed = 5. Submit:
  - [ ] BLOCKED with clear error: "Insufficient X — needs 5, have 1".
  - [ ] No partial deduction landed (verify other ingredients' currentStock unchanged).

### Step 7 — Production void

- [ ] As super-admin, void a production within 24h: succeeds, reasonNote optional.
  - [ ] Reversal StockMovements created tagged with same productionId.
  - [ ] Production status flips to `voided`.
  - [ ] Ingredients refunded; MenuItem inventory reduced.
- [ ] As super-admin, void a production older than 24h:
  - [ ] Reason note input is required.
  - [ ] Reason persisted on every reversal StockMovement.
- [ ] As admin (not super-admin), try to void: BLOCKED.
- [ ] As kitchen role, try to void: BLOCKED.

### Step 8 — Daily Financial Report regression

- [ ] Daily Financial Report for the test day still renders correctly.
- [ ] `paymentBreakdown.total` (revenue) unchanged by production events.
- [ ] Per-portion COGS calculation uses weighted-average cost from `InventoryItemCostHistory`.

## Sign-off

- [ ] All checkboxes ticked
- [ ] No defects logged blocking AC1–AC16
- [ ] DevAudit / META-COMPLY UAT approval recorded
