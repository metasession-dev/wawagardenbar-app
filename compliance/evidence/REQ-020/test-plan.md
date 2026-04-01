# Test Plan — REQ-020

**Requirement:** REQ-020
**Risk Level:** MEDIUM
**GitHub Issue:** #43
**Date:** 2026-04-01

## Tests to Add

- [ ] `__tests__/inventory/restock-recommendation-strategies.test.ts` — Unit tests for popularity scoring, profitability scoring, diversity guarantee, quantity adjustment, and CSV generation
- [ ] `e2e/restock-recommendations.spec.ts` — Add E2E tests for strategy switching and export button

## Tests to Update

- [ ] `__tests__/inventory/restock-recommendation.test.ts` — May need updates if service interface changes (strategy param)

## Tests to Remove

- None

## Functional Test Mapping

| Acceptance Criterion              | Test File                                 | Test Name                                   |
| --------------------------------- | ----------------------------------------- | ------------------------------------------- |
| Strategy selector visible         | e2e/restock-recommendations.spec.ts       | should show strategy selector               |
| Stock Urgency unchanged           | restock-recommendation.test.ts            | existing tests (no changes)                 |
| Popularity sorts by velocity      | restock-recommendation-strategies.test.ts | sorts by avgDailySales in popularity mode   |
| Popularity diversity guarantee    | restock-recommendation-strategies.test.ts | guarantees minimum items per category       |
| Popularity quantity adjustment    | restock-recommendation-strategies.test.ts | uses minimum viable qty for low-sales items |
| Profitability scoring             | restock-recommendation-strategies.test.ts | scores by margin times volume               |
| Profitability diversity guarantee | restock-recommendation-strategies.test.ts | guarantees minimum items per category       |
| CSV export content                | restock-recommendation-strategies.test.ts | generates correct CSV columns and data      |
| CSV filename format               | restock-recommendation-strategies.test.ts | filename matches pattern                    |
| Export button visible             | e2e/restock-recommendations.spec.ts       | should show export button                   |

## Non-Functional Tests (MEDIUM)

- [ ] Security: no new endpoints — export is client-side from existing data
- [ ] Regression: existing stock urgency tests must still pass unchanged

## Test Data Requirements

- Mock items with varying sales velocity and profit margins
- Items across multiple subcategories to test diversity guarantee
- Subcategories with fewer than 2 items to test edge cases
