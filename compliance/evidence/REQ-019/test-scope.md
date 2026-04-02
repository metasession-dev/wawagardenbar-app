# Test Scope — REQ-019

**Risk Level:** MEDIUM
**Requirement:** Restock recommendations dashboard page
**GitHub Issue:** #41
**Date:** 2026-04-01

## Test Approach

Standard gates plus targeted verification.

**Universal gates (mandatory — verified locally AND in CI):**

- TypeScript compilation: 0 errors
- SAST scan: 0 high/critical findings
- Dependency audit: 0 high/critical vulnerabilities
- E2E suite: all pass (full suite local, unauthenticated subset in CI)
- Human code review via PR

**Additional testing required by risk level:**

- [ ] Access control: only admin and super-admin roles can access `/dashboard/inventory/restock-recommendations`; server actions reject unauthorized sessions
- [ ] Data accuracy: bulk velocity aggregation matches per-item `InventoryService.calculateSalesVelocity` results
- [ ] Filter behaviour: mainCategory, lookback period, subcategory, price bracket, and priority filters correctly narrow results
- [ ] Edge cases: items with zero sales, items with no inventory record, items with no stock movements

## Validation Approach

How we confirm this meets the business requirement:

- Navigate to `/dashboard/inventory/restock-recommendations` as super-admin and verify page loads with data
- Switch between Food/Drinks and verify grouped results update
- Change lookback period and confirm velocity-based recommendations change
- Verify priority badges match the defined thresholds (urgent/medium/low)
- Verify link from inventory page navigates correctly

## Acceptance Criteria

- [ ] Page renders at `/dashboard/inventory/restock-recommendations` for admin/super-admin
- [ ] Unauthorized users are redirected (inventoryManagement permission enforced)
- [ ] Food/Drinks filter shows only items matching the selected mainCategory
- [ ] Lookback period (7/14/30/60/90 days) changes the sales velocity calculation
- [ ] Subcategory multi-select filters items by category
- [ ] Price bracket filter narrows items by selling price
- [ ] Priority filter shows only items matching selected priority level
- [ ] Results are grouped by subcategory with collapsible sections
- [ ] Summary cards show total items, urgent/medium/low counts, and estimated restock cost
- [ ] Table shows: item name, current stock, unit, avg daily sales, days until stockout, suggested reorder qty, supplier, priority badge, last restock date
- [ ] Urgent groups are auto-expanded; others collapsed
- [ ] Link button accessible from inventory page header
- [ ] All additional testing items above pass
