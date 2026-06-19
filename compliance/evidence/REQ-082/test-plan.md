# Test Plan — REQ-082

## Requirement

Progressive category display with grouped items and improved search/navigation UX across express order, menu management, and inventory management.

## Risk Class

MEDIUM

## Test Strategy

### Layers Planned

- Unit (Vitest)
- E2E (Playwright)

### Layers Covered

- Unit: ✓ (existing suite — no new unit tests needed, grouping logic is inline in components)
- E2E: ✓ (3 updated specs in `menu-category-cascade.spec.ts`)

### Deferrals

- Visual regression: N/A — UI layout change, no visual baseline to compare against
- Integration: N/A — no new API endpoints or service changes

## Test Cases

| ID  | Test                                                                                            | Type | AC            |
| --- | ----------------------------------------------------------------------------------------------- | ---- | ------------- |
| T1  | Express order shows items on landing grouped by category, search filters items, cart persists   | E2E  | AC1, AC4, AC8 |
| T2  | Menu management shows items on landing grouped by category, supports search and category toggle | E2E  | AC1, AC2, AC4 |
| T3  | Sellable inventory shows items on landing and search filters items                              | E2E  | AC1, AC4      |
| T4  | CategoryCascadeFilter renders search, breadcrumb, and category buttons together                 | E2E  | AC5, AC6      |
| T5  | `revealFirstExpressMenuCard` helper finds items on landing without drill-down                   | E2E  | AC7, AC8      |

## Gate Criteria

- `npx tsc --noEmit` — 0 errors
- `npm run lint` — no new errors
- `npm test` — all pass
- `npx playwright test` — all pass (or skip with valid reason)

## SRS Coverage

| Test (file)                       | AC  | SRS item        |
| --------------------------------- | --- | --------------- |
| e2e/menu-category-cascade.spec.ts | AC1 | REQ-MENUMGT-005 |
| e2e/menu-category-cascade.spec.ts | AC4 | REQ-MENUMGT-005 |
| e2e/menu-category-cascade.spec.ts | AC8 | REQ-ORDER-002   |
