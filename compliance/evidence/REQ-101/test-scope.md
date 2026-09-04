---
req: REQ-101
generated_from: compliance/plans/REQ-101/implementation-plan.md
---

# Test scope — REQ-101

Risk class: **MEDIUM**

| AC  | Description                                                                                                                                                                                                                                                                                                                                                       | SRS item                                    | Verification method            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------ |
| AC1 | Given orders for an item sold at both full and half portion within the same day, When a staff member opens Dashboard → Reports → Daily → Revenue tab for that day, Then the item appears as two rows ("Peppered Meat" and "Peppered Meat (Half)") each showing its own correct unit price and quantity, and their totals sum to the item's true combined revenue. | REQ-REPORT-001 (existing, updated)          | Unit (Vitest)                  |
| AC2 | Given the same mixed-portion order set, When a staff member opens Dashboard → Reports → Daily → Costs tab for that day, Then cost-per-unit rows are likewise split per portion size (no cross-portion blending of the cost column).                                                                                                                               | REQ-REPORT-001 (existing, updated)          | Unit (Vitest)                  |
| AC3 | Given the same mixed-portion order set, When a staff member opens a date-range report or a per-main-category report covering the same window, Then the same per-portion split applies (not just the daily summary path).                                                                                                                                          | REQ-MENUMGT-006 (existing, updated)         | Unit (Vitest)                  |
| AC4 | Given an item with only full-portion sales (the common case, including all pre-existing data with no `portionSize` field), When the Revenue tab is viewed, Then behaviour is unchanged — one row, matching REQ-100's existing multi-price-within-window test fixtures exactly.                                                                                    | REQ-REPORT-001 / REQ-MENUMGT-006 (existing) | Unit (Vitest) — regression pin |

E2E: `@e2e-deferred` — no UI-facing files touched by this REQ's diff (see `compliance/evidence/REQ-101/e2e-scope-decision.md`).
