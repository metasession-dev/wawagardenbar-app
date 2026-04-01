# Test Plan — REQ-021

**Requirement:** REQ-021
**Risk Level:** MEDIUM
**GitHub Issue:** #44
**Date:** 2026-04-01

## Tests to Add

- [ ] `__tests__/inventory/crate-packaging.test.ts` — Unit tests for crate calculation logic (rounding up, breakdown display)

## Tests to Update

- [ ] `__tests__/inventory/restock-recommendation-strategies.test.ts` — Add CSV export tests for crate columns
- [ ] `e2e/restock-recommendations.spec.ts` — Verify crate info displays when available

## Tests to Remove

- None

## Functional Test Mapping

| Acceptance Criterion       | Test File                                 | Test Name                         |
| -------------------------- | ----------------------------------------- | --------------------------------- |
| Crate rounding up          | crate-packaging.test.ts                   | rounds up to nearest whole crate  |
| Crate breakdown display    | crate-packaging.test.ts                   | formats crate breakdown correctly |
| No crate info when not set | crate-packaging.test.ts                   | returns null when no crateSize    |
| CSV includes crate columns | restock-recommendation-strategies.test.ts | CSV includes crate columns        |

## Non-Functional Tests (MEDIUM)

- [ ] Regression: existing inventory tests still pass
- [ ] Data model: optional fields don't break existing documents

## Test Data Requirements

- Mock items with and without crateSize
- Various reorder quantities to test rounding edge cases (exact multiple, remainder, zero)
