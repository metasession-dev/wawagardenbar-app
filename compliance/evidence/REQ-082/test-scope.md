# REQ-082 — Test Scope

## Requirement

Progressive category display with grouped items and improved search/navigation UX across express order, quick order, menu management, and inventory management.

## Risk Class

MEDIUM (user-facing UI changes across 4 surfaces, E2E test changes, AI-assisted)

## Acceptance Criteria

| AC  | Description                                                                                       | Test Type  |
| --- | ------------------------------------------------------------------------------------------------- | ---------- |
| AC1 | All 4 surfaces show items on landing, grouped by main category then sub category                  | E2E        |
| AC2 | Selecting a main category filters to that category, items still grouped by sub category           | E2E        |
| AC3 | Selecting a sub category filters to that sub category, items shown flat                           | E2E        |
| AC4 | Search always filters items (not categories), scoped to selected category or all if none selected | E2E + Unit |
| AC5 | Clear breadcrumb navigation showing current category path                                         | E2E        |
| AC6 | Back navigation is intuitive (single clear back action)                                           | E2E        |
| AC7 | E2E tests updated to reflect progressive disclosure pattern                                       | E2E        |
| AC8 | No regression in express order checkout flow                                                      | E2E        |

## Test Scope

### E2E Tests (Playwright)

- `e2e/menu-category-cascade.spec.ts` — update all 3 tests for progressive disclosure
- Express order specs that use `revealFirstExpressMenuCard` helper — update helper if needed
- Smoke tests for menu/express order — verify no regression

### Unit Tests (Vitest)

- CategoryCascadeFilter component — verify search always filters items, not categories
- Grouping logic — verify items are correctly grouped by main/sub category

### Gates

- `npx tsc --noEmit` — 0 errors
- `npm run lint` — no new errors
- `npm test` — all pass
- `npx playwright test` — all pass
