# Test Plan — REQ-019

**Requirement:** REQ-019
**Risk Level:** MEDIUM
**GitHub Issue:** #41
**Date:** 2026-04-01

## Tests to Add

- [ ] `__tests__/services/restock-recommendation-service.test.ts` — Unit tests for bulk velocity calculation, priority logic, reorder formula, grouping, and filter behaviour
- [ ] `e2e/restock-recommendations.spec.ts` — E2E tests for page access, filter interactions, and data display

## Tests to Update

- None — this is a new feature with no existing test coverage

## Tests to Remove

- None

## Functional Test Mapping

| Acceptance Criterion               | Test File                                                 | Test Name                                   |
| ---------------------------------- | --------------------------------------------------------- | ------------------------------------------- |
| Page renders for admin/super-admin | e2e/restock-recommendations.spec.ts                       | should display restock recommendations page |
| Unauthorized redirect              | e2e/restock-recommendations.spec.ts                       | should redirect unauthorized users          |
| Food/Drinks filter                 | **tests**/services/restock-recommendation-service.test.ts | filters by mainCategory                     |
| Lookback period changes velocity   | **tests**/services/restock-recommendation-service.test.ts | uses lookback days for velocity             |
| Priority calculation               | **tests**/services/restock-recommendation-service.test.ts | calculates priority correctly               |
| Reorder formula                    | **tests**/services/restock-recommendation-service.test.ts | calculates suggested reorder quantity       |
| Grouping by subcategory            | **tests**/services/restock-recommendation-service.test.ts | groups results by category                  |
| Summary counts                     | **tests**/services/restock-recommendation-service.test.ts | returns correct summary counts              |
| Link from inventory page           | e2e/restock-recommendations.spec.ts                       | should navigate from inventory page         |

## Non-Functional Tests (MEDIUM)

- [ ] Security: server actions check session and role before returning data
- [ ] Performance: bulk aggregation avoids N+1 queries (4 DB calls max)

## Test Data Requirements

- Existing test fixtures for menu items with trackInventory flag
- Mock StockMovement records with category='sale' at various timestamps
- Mock Inventory records with varying stock levels and thresholds
