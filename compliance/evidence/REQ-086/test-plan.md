# Test Plan — REQ-086

**Requirement:** REQ-086
**Risk Level:** LOW
**GitHub Issue:** #417
**Date:** 2026-06-27

## Tests to Add

- None — no new test files needed.

## Tests to Update

- [x] `e2e/authenticated.spec.ts` — Update "orders page shows Quick Actions section" test to verify "Admin Order Management" heading exists, assert Inventory Summary is in the Admin Order Management section, and Quick Actions contains only the 3 remaining cards.

## Tests to Remove

- None

## Functional Test Mapping

| Acceptance Criterion | Test File                   | Test Name                                         |
| -------------------- | --------------------------- | ------------------------------------------------- |
| AC1, AC2, AC3        | `e2e/authenticated.spec.ts` | orders page shows Quick Actions section (updated) |
| AC4, AC5             | Manual smoke                | Visual verification on UAT                        |
| AC6                  | `e2e/authenticated.spec.ts` | orders page shows Quick Actions section (updated) |
| AC7                  | Documentation review        | SOP manual review                                 |

## Non-Functional Tests

- Standard gates sufficient for LOW risk.

## Test Data Requirements

- Existing test data sufficient — no new seeding needed.
