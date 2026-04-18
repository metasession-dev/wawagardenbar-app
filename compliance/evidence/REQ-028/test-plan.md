# Test Plan — REQ-028

**Requirement:** REQ-028
**Risk Level:** MEDIUM
**GitHub Issue:** #62
**Date:** 2026-04-18

## Tests to Add

- [ ] `__tests__/lib/expense-categories-display.test.ts` — Unit tests (vitest) for `sortCategoriesAlpha`, `buildDropdownSections`, `validateGroups`. **TDD — written first, must fail before implementation.**
- [ ] `__tests__/services/system-settings-service.expense-categories.test.ts` — Unit tests for service round-trip + backward compat of extended shape.
- [ ] `e2e/expense-category-groups.spec.ts` — Playwright E2E covering Settings CRUD + Add Expense dropdown render. **Written after implementation (Phase 3).**

## Tests to Update

- None. Existing expense and settings tests do not cover category grouping.

## Tests to Remove

- None.

## Functional Test Mapping

| Acceptance Criterion                                                                                    | Test File                                                               | Test Name                                                                                      |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `sortCategoriesAlpha` sorts case-insensitively with locale-aware compare                                | `__tests__/lib/expense-categories-display.test.ts`                      | "sortCategoriesAlpha > sorts A→Z case-insensitively"                                           |
| `buildDropdownSections` returns one section per group in admin order, A→Z items within each             | `__tests__/lib/expense-categories-display.test.ts`                      | "buildDropdownSections > renders groups in saved order with items sorted alphabetically"       |
| `buildDropdownSections` appends "Other" section for ungrouped categories when groups exist              | `__tests__/lib/expense-categories-display.test.ts`                      | "buildDropdownSections > adds Other section for ungrouped categories"                          |
| `buildDropdownSections` omits "Other" when every category is grouped                                    | `__tests__/lib/expense-categories-display.test.ts`                      | "buildDropdownSections > omits Other when all categories assigned"                             |
| `buildDropdownSections` returns single headingless A→Z section when no groups                           | `__tests__/lib/expense-categories-display.test.ts`                      | "buildDropdownSections > returns single ungrouped A→Z section when no groups"                  |
| `buildDropdownSections` ignores group members not in the flat category list (defensive)                 | `__tests__/lib/expense-categories-display.test.ts`                      | "buildDropdownSections > silently drops stale categoryNames"                                   |
| `validateGroups` rejects a category assigned to two groups                                              | `__tests__/lib/expense-categories-display.test.ts`                      | "validateGroups > rejects cross-group category membership"                                     |
| `validateGroups` rejects duplicate group names (case-insensitive)                                       | `__tests__/lib/expense-categories-display.test.ts`                      | "validateGroups > rejects duplicate group names case-insensitively"                            |
| `validateGroups` rejects blank group name                                                               | `__tests__/lib/expense-categories-display.test.ts`                      | "validateGroups > rejects blank group name"                                                    |
| `validateGroups` rejects categoryName not present in the flat list                                      | `__tests__/lib/expense-categories-display.test.ts`                      | "validateGroups > rejects group member missing from category list"                             |
| `validateGroups` accepts empty groups array                                                             | `__tests__/lib/expense-categories-display.test.ts`                      | "validateGroups > accepts empty groups array"                                                  |
| `getExpenseCategories` returns `[]` group arrays for docs missing the keys (backward compat)            | `__tests__/services/system-settings-service.expense-categories.test.ts` | "getExpenseCategories > defaults missing group arrays to empty"                                |
| `getExpenseCategories` returns persisted groups when present                                            | `__tests__/services/system-settings-service.expense-categories.test.ts` | "getExpenseCategories > returns persisted groups"                                              |
| `updateExpenseCategories` throws on invalid groups (delegates to validateGroups)                        | `__tests__/services/system-settings-service.expense-categories.test.ts` | "updateExpenseCategories > throws when groups fail validation"                                 |
| `updateExpenseCategories` persists extended shape with change history                                   | `__tests__/services/system-settings-service.expense-categories.test.ts` | "updateExpenseCategories > persists groups and appends change history"                         |
| Settings: super-admin creates a group, assigns categories, saves — persists and is visible after reload | `e2e/expense-category-groups.spec.ts`                                   | "super-admin can create a Direct Cost group, assign categories, and save"                      |
| Settings: attempting duplicate category membership shows validation error                               | `e2e/expense-category-groups.spec.ts`                                   | "assigning a category to two groups shows validation error"                                    |
| Settings: removing a category also removes it from any group it was in                                  | `e2e/expense-category-groups.spec.ts`                                   | "removing a category from the flat list also removes it from its group"                        |
| Add Expense dropdown renders grouped sections A→Z within each, with Other tail                          | `e2e/expense-category-groups.spec.ts`                                   | "Add Expense dropdown shows configured groups with A→Z items and Other section"                |
| Add Expense dropdown with no groups renders a single A→Z list                                           | `e2e/expense-category-groups.spec.ts`                                   | "Add Expense dropdown renders single A→Z list when no groups configured"                       |
| Edit Expense dropdown shows the same grouped structure and preselects existing category                 | `e2e/expense-category-groups.spec.ts`                                   | "Edit Expense dropdown renders grouped structure and preselects existing value"                |
| Edit Expense dropdown reflects live admin config (not the hardcoded fallback)                           | `e2e/expense-category-groups.spec.ts`                                   | "Edit Expense dropdown includes admin-added categories beyond the fallback list"               |
| Type dropdown behaviour unchanged (switching type switches category list)                               | `e2e/expense-category-groups.spec.ts`                                   | "switching Type in Add Expense swaps the grouped category list for that type"                  |
| Submitted expense persists `expenseType` + `category` only (no new fields)                              | `e2e/expense-category-groups.spec.ts`                                   | "submitting a grouped-category selection persists only expenseType and category on the record" |

## Non-Functional Tests (MEDIUM)

- [ ] Access control: `updateExpenseCategoriesAction` still rejects non-super-admin sessions (existing `requireSuperAdmin` guard). Covered in `e2e/expense-category-groups.spec.ts` via "non-super-admin cannot open the Settings page" (already a pre-existing expectation; re-asserted).
- [ ] Backward compatibility: service test above exercises a doc written without the new keys.
- [ ] Regression: full `playwright test` run must pass with no failures in `e2e/pending-expenses.spec.ts` or other finance specs.

## Test Data Requirements

- Super-admin session (existing Playwright auth setup in `e2e/auth.setup.ts`).
- A Direct Cost group named "Proteins" with {Beef, Catfish, Cow Leg, Cow tail, Meat/Protein} — created via the Settings UI in-test, torn down in afterEach.
- At least one existing pending expense record for the Edit dropdown test — seeded via the existing pending-expense creation path in the same spec.

## Execution Order

1. **Phase 1 (TDD, before implementation):** unit tests — `__tests__/lib/expense-categories-display.test.ts` and `__tests__/services/system-settings-service.expense-categories.test.ts`. Must fail.
2. **Phase 2 (implementation):** unit tests above must pass.
3. **Phase 3 (after implementation):** E2E — `e2e/expense-category-groups.spec.ts`. Must pass.
4. **Phase 4 (gates):** `npx tsc --noEmit`, `semgrep scan --config auto`, `npm audit --audit-level=high`, `npx playwright test`. All pass.
