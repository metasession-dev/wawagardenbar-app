# Test Scope — REQ-020

**Risk Level:** MEDIUM
**Requirement:** Restock recommendation strategies (popularity, profitability) with CSV export
**GitHub Issue:** #43
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

- [ ] Access control: strategy and export features respect existing inventoryManagement permission
- [ ] Data accuracy: popularity scoring matches sales velocity data; profitability scoring uses correct margin calculation
- [ ] Diversity guarantee: minimum 2 items per subcategory appear in popularity and profitability modes
- [ ] Quantity adjustment: low-popularity/low-profit items use minimum viable restock formula instead of velocity-based
- [ ] CSV export: output contains correct columns, filename format, and matches displayed data
- [ ] Regression: existing stock urgency mode unchanged

## Validation Approach

- Switch between Stock Urgency / Popularity / Profitability and verify sort order changes
- In Popularity mode, verify low-sales subcategories still have items shown
- In Profitability mode, verify high-margin items appear first
- Export CSV in each mode and verify contents match the table
- Verify all existing filters still work with new strategies

## Acceptance Criteria

- [ ] Strategy selector visible with three options: Stock Urgency, Popularity, Profitability
- [ ] Stock Urgency mode behaviour unchanged from REQ-019
- [ ] Popularity mode sorts items by sales velocity within groups
- [ ] Popularity mode guarantees minimum 2 items per subcategory
- [ ] Popularity mode adjusts reorder qty for low-sales items to minimum viable (minimumStock - currentStock)
- [ ] Profitability mode sorts items by (sellingPrice - costPerUnit) \* avgDailySales
- [ ] Profitability mode has same diversity guarantee and quantity adjustment as popularity
- [ ] CSV export button visible in filter bar
- [ ] CSV export contains: Item Name, Category, Current Stock, Unit, Avg Daily Sales, Suggested Reorder Qty, Supplier, Priority, Cost Per Unit, Selling Price
- [ ] CSV filename follows pattern: restock-recommendations-{strategy}-{date}.csv
- [ ] Export reflects current filters and strategy
- [ ] All existing filters, summary cards, and table layout unchanged
- [ ] All additional testing items above pass
