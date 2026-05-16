# Test Plan — REQ-037 (Edit + delete kitchen ingredients with safe-removal guard)

**Status:** DRAFT
**Date:** 2026-05-16
**Issue:** [#83](https://github.com/metasession-dev/wawagardenbar-app/issues/83)
**Risk Level:** MEDIUM (touches inventory data; soft-delete preserves audit-trail integrity; active-recipe guard is the load-bearing safety check)

## Scope

CRUD completion of the kitchen-ingredient surface shipped under REQ-034:

- **Edit** name, COGS category, and min/max stock thresholds. Unit and currentStock NOT editable (out of scope; would require migration / inventory adjustment).
- **Delete** via soft-archive (`archivedAt` timestamp on both paired rows). Blocks when any active recipe references the ingredient.
- All listing surfaces (Inventory dashboard Kitchen tab, Recipe builder dropdown, Expense form "Add to kitchen inventory" dropdown) filter out archived rows.

## Acceptance criteria

| AC  | Description                                                                                                                                                                                                                                          | Verification                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| AC1 | Edit dialog on each Kitchen tab row pre-fills current values; allows name, category, min/max changes; Unit dropdown is disabled with tooltip                                                                                                         | E2E walk; visual + assertion that unit input is disabled                                                      |
| AC2 | `updateKitchenIngredientAction` is auth-gated (super-admin OR `inventoryManagement`), validates payload, writes both paired rows; partial failure surfaces a clear error naming what didn't write                                                    | Vitest service-level tests (happy-path + auth + validation + partial-write); E2E happy-path                   |
| AC3 | `deleteKitchenIngredientAction` blocks when any active recipe references the inventory; error message names the offending recipes; allowed when only deactivated recipes reference                                                                   | Vitest service-level tests (blocked + allowed branches); E2E blocked scenario                                 |
| AC4 | Soft-delete: both paired MenuItem and Inventory rows get `archivedAt: Date`; historical StockMovement / Expense / CostHistory rows still resolve their `_id` references; Kitchen tab + Recipe builder + Expense form dropdowns exclude archived rows | Vitest test asserts MenuItem and Inventory persist post-delete; E2E asserts disappearance from three surfaces |
| AC5 | Test suite added: extends `__tests__/actions/admin/kitchen-ingredient-actions.test.ts`; new `__tests__/services/recipe-service.references.test.ts`; E2E in `e2e/kitchen/`                                                                            | tsc 0; vitest delta ≥ +14 new tests; E2E passes on CI                                                         |
| AC6 | UAT walkthrough on `uat-checklist.md` covers: edit name + min/max, edit unit field disabled, delete with no refs, delete blocked by active recipe, deactivate-then-delete, archived ingredient does not appear in any of the three listing surfaces  | Manual UAT walk (operator)                                                                                    |

## AC ↔ test mapping

E2E coverage target: every AC behaviour must be asserted via Playwright, not just the headline scenarios. Vitest covers service-layer correctness; E2E covers the UI-stitched flows. Where a single E2E walk can prove multiple ACs at once, it's counted under each.

### Vitest

| AC  | Test                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------ |
| AC2 | `__tests__/actions/admin/kitchen-ingredient-actions.test.ts` — `update` happy-path: paired MenuItem + Inventory both updated   |
| AC2 | `__tests__/actions/admin/kitchen-ingredient-actions.test.ts` — `update` validation: empty name rejected                        |
| AC2 | `__tests__/actions/admin/kitchen-ingredient-actions.test.ts` — `update` validation: max < min rejected                         |
| AC2 | `__tests__/actions/admin/kitchen-ingredient-actions.test.ts` — `update` validation: negative stock rejected                    |
| AC2 | `__tests__/actions/admin/kitchen-ingredient-actions.test.ts` — `update` auth: super-admin allowed                              |
| AC2 | `__tests__/actions/admin/kitchen-ingredient-actions.test.ts` — `update` auth: csr without `inventoryManagement` rejected       |
| AC2 | `__tests__/actions/admin/kitchen-ingredient-actions.test.ts` — `update` partial-write: MenuItem write fails → clear error      |
| AC3 | `__tests__/services/recipe-service.references.test.ts` — returns active recipes that reference an inventoryId                  |
| AC3 | `__tests__/services/recipe-service.references.test.ts` — excludes deactivated recipes                                          |
| AC3 | `__tests__/services/recipe-service.references.test.ts` — returns empty for an unreferenced inventoryId                         |
| AC3 | `__tests__/actions/admin/kitchen-ingredient-actions.test.ts` — `delete` blocked by active recipe; error names the recipe(s)    |
| AC3 | `__tests__/actions/admin/kitchen-ingredient-actions.test.ts` — `delete` allowed when only deactivated recipes reference        |
| AC4 | `__tests__/actions/admin/kitchen-ingredient-actions.test.ts` — `delete` archives both MenuItem and Inventory with `archivedAt` |
| AC4 | `__tests__/actions/admin/kitchen-ingredient-actions.test.ts` — `delete` idempotent on already-archived (clear error)           |
| AC4 | `__tests__/services/inventory-service.list-by-kind.test.ts` — `listByKind` excludes archived rows                              |

### Playwright E2E (`e2e/kitchen/inventory-crud.spec.ts` — new spec)

| AC      | Test                                                                                                                        |
| ------- | --------------------------------------------------------------------------------------------------------------------------- |
| AC1     | Edit dialog opens from Kitchen tab row with fields pre-filled with current values                                           |
| AC1     | Unit dropdown in Edit dialog is **disabled** and shows the tooltip explaining the lock                                      |
| AC1+AC2 | Happy-path: edit name → save → Kitchen tab row shows the new name                                                           |
| AC1+AC2 | Happy-path: edit min/max stock → save → reload → new thresholds reflected                                                   |
| AC2     | Validation surface: blank name → save shows the error inline; no row is updated                                             |
| AC2     | Validation surface: max < min → save shows the error inline; no row is updated                                              |
| AC3     | Delete confirmation dialog renders with the ingredient name + a destructive "Delete" button                                 |
| AC3+AC4 | Happy-path: delete an ingredient with no recipe references → row disappears from Kitchen tab                                |
| AC3     | Blocked: author a recipe referencing the ingredient, attempt delete → error names the recipe; row still present             |
| AC3     | Recovery: deactivate the blocking recipe → retry delete → succeeds                                                          |
| AC4     | Archived ingredient does NOT appear in the **Recipe builder** ingredient dropdown (after creating + deleting)               |
| AC4     | Archived ingredient does NOT appear in the **Expense form** "Add to kitchen inventory" dropdown (after creating + deleting) |
| AC4     | Archived ingredient does NOT appear in the **Inventory dashboard** Kitchen tab (after creating + deleting)                  |
| AC4     | Sellable tab count is unchanged when a kitchen ingredient is archived (kitchen and sellable counts are independent)         |
| AC5     | (Meta) the spec is registered as a Playwright project in `playwright.config.ts` so it runs in CI                            |

### Manual UAT (`uat-checklist.md`)

Thin per the REQ-034 D11 pattern. Residual items only:

- Ops-procedure backfill (none for REQ-037 — no new schema requiring migration)
- Sign-off ceremony (DevAudit approval)
- One quick spot-check that historical StockMovement rendering still works for an archived ingredient (this is a regression check that's awkward to E2E without seeding historical rows)

## Gates

- TypeScript: `tsc --noEmit` 0 errors
- Vitest: all green (target ≥ +14 new tests over the REQ-034-closure baseline of 691 pass / 4 skipped)
- Playwright: existing kitchen projects + extended `inventory-tabs.spec.ts` (or new spec) green
- Build: `npm run build` green
- Semgrep: 0 findings on changed paths
- Dependency audit: 0 unaccepted high/critical

## Regression

- REQ-034 expense → inventory link (D10 unit conversion path): untouched. Helper functions are not modified.
- REQ-034 recipe builder + production: only the ingredient listing changes (archived filter at the source service method); recipe creation/execution untouched.
- REQ-034 customer-menu filter: archived menu-items are paired to kitchen-ingredients which already filter out of customer-menu queries via `kind !== 'menu-item'`; no new surface to worry about.
- Daily Financial Report: unaffected; soft-delete preserves cost-history rows so weighted-average calculations remain valid.
