# Test Plan - REQ-081

**Requirement ID:** REQ-081
**Risk:** MEDIUM
**Related issue:** [#387](https://github.com/metasession-dev/wawagardenbar-app/issues/387)
**Date:** 2026-06-15

## Acceptance Criteria to Tests

| AC   | Statement                                                                                     | Test                                                                                                                                   |
| ---- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| AC1  | Express order starts with Main Menu Categories only.                                          | E2E on `/dashboard/orders/express/create-order` initial picker state.                                                                  |
| AC2  | Main selection shows only corresponding sub-categories.                                       | E2E seeded with at least two mains and distinct sub-categories; assert unrelated sub-category hidden.                                  |
| AC3  | Sub-category selection shows only matching available sellable items and keeps search enabled. | E2E item assertions plus unit/integration test for `expressSearchMenuAction({ mainCategory, category })`.                              |
| AC4  | Back navigation preserves express cart/order context and supports cross-main additions.       | E2E add item from main A, navigate back to main, add item from main B, assert cart contains both.                                      |
| AC5  | Quick/express menu-item selection follows same data path.                                     | Code review plus focused coverage where separate quick/express selector exists; otherwise documented as same express page/action path. |
| AC6  | Menu management list filters main -> sub -> matching rows while search remains enabled.       | E2E or component-level coverage on `/dashboard/menu`; assert initial main step, enabled search, and narrowed rows.                     |
| AC7  | Menu create/edit clears invalid sub-category on main change.                                  | Unit/component coverage if feasible; otherwise E2E/edit-form assertion before save.                                                    |
| AC8  | Sellable inventory filtering starts main -> sub and keeps search enabled.                     | E2E or component-level coverage on `/dashboard/inventory` sellable tab with enabled search assertions.                                 |
| AC9  | Empty states are clear.                                                                       | E2E or component assertions for no-sub-category / no-items state.                                                                      |
| AC10 | Registry source of truth and permissions unchanged.                                           | Unit/integration assertions for CategoryService-backed action data and no auth/RBAC diff review.                                       |

## Tests to Add

- Express action unit/integration coverage for `mainCategory` + `category` filtering and category-envelope output.
- Focused E2E coverage for express order cascade/back-navigation/cross-main cart preservation and enabled search/filtering.
- E2E coverage for menu management search within the selected cascade path.
- E2E coverage for sellable inventory search within the selected cascade path.

## Tests to Update

- Existing express order E2E specs that assume items/categories are visible immediately may need to navigate through main -> sub before selecting items.
- Existing menu/inventory assertions that use the flat `CategoryFilter` may need updated selectors.

## Tests to Remove

None planned.

## Verification Commands

Local focused checks while developing:

```bash
npm run lint
npx tsc --noEmit
npm test -- --runInBand
npm run build
```

CI checks are authoritative per project instruction:

```bash
gh workflow run ci.yml --ref feat/REQ-081-category-cascade
gh run list --branch feat/REQ-081-category-cascade --limit 5
gh pr checks <PR_NUMBER>
gh pr view <PR_NUMBER> --json mergeStateStatus,reviewDecision,statusCheckRollup
```

## Expected Results

- TypeScript, lint/SAST, dependency audit, unit/integration tests, E2E, and build checks pass in GitHub Actions.
- Express order E2E proves cascade order, back navigation, and cross-main cart preservation.
- Admin management coverage proves at least one management surface uses the same cascade pattern.
- No new high-severity dependency audit findings.

## Rollback Signal

Rollback if CI or UAT shows staff cannot find valid sellable menu items, express cart context is lost while navigating categories, or admin menu/inventory filters hide valid rows with no clear empty-state explanation.
