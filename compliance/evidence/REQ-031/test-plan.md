# Test Plan — REQ-031

**Requirement:** REQ-031 — End-to-end multi-inventory deduction for menu items with customization options
**Risk Level:** HIGH
**GitHub Issue:** [#67](https://github.com/metasession-dev/wawagardenbar-app/issues/67)
**Date:** 2026-04-25

## Tests to Add

- [ ] `__tests__/lib/customization-picker-state.test.ts` — pure helper `derivePickerState({groups, selected}) → {isValid, missingRequiredGroups}` plus `toggleOption(selected, group, option, price, required)` for radio/checkbox semantics (~7 tests). Project has no React Testing Library setup; picker component reduces to a thin shell delegating to this helper, with visible-UI rendering verified in E2E (Option A from architectural decision).
- [ ] `__tests__/lib/customization-builder-preview.test.ts` — pure helpers `deriveCombinedPricePreview({basePrice, surcharge, itemName, optionName}) → string` and `combinedToSurcharge(combinedPrice, basePrice) → number` for the admin builder (~4 tests). Same pure-helper rationale.
- [ ] `__tests__/lib/customization-validation.test.ts` — pure helpers `validateSelectedCustomizations` and `summariseSelected` (~11 tests)
- [ ] `__tests__/lib/cart-line-math.test.ts` — pure helper `computeLineTotal({basePrice, customizations, quantity, portionMultiplier})` covering: zero-surcharge legacy unchanged, single surcharge sums, multi-checkbox sums, half-portion scales surcharge, quarter-portion scales surcharge, rounding behaviour for sub-naira values (~7 tests)
- [ ] `__tests__/lib/cart-store-helpers.test.ts` — pure helpers `computeCartItemMergeKey(item)`, `addItemToCartItems(items, candidate, newCartItemId)`, `computeCartItemTotal(item)`, `computeCartTotal(items)`. Same pure-helper rationale as the picker; cart-store.ts becomes a thin wrapper over these. (~8 tests). Test path moved from `__tests__/stores/` since the project's test layout has no `stores/` dir and the pure-helper pattern is the one we're applying.
- [ ] `__tests__/lib/order-line-totals.test.ts` — pure helper `reconcileAndValidateOrderLines({menuItems, lines, clientTotal?})` that all three order-creating actions call. Single source of truth for: per-line customization validation (uses `validateSelectedCustomizations`), per-line `computeLineTotal`, server-side subtotal recomputation, and tamper detection (~12 tests covering AC7 + AC15). Replaces three separate action-test files (each would have required heavy session/DB/Mongoose mocking to repeat the same logic). The three actions become one-liners that delegate to this helper; their wire-up is verified by E2E (AC7 specifically driven through real HTTP).
- [ ] `e2e/menu-customization-picker.spec.ts` — Playwright user-journey tests: (1) staff fulfilment with surcharge — line total ₦2,500 visible at every step; (2) customer cart with half portion — line total ₦1,250; (3) required-group block; (4) admin builder combined-price preview round-trip; (5) **picker visible-UI**: required group renders as radios; (6) **picker visible-UI**: optional group renders as checkboxes (5 + 6 cover what an RTL-style component test would have, since this project has no RTL setup)

## Tests to Update

- [ ] `__tests__/services/inventory-service.customization-linked.test.ts` — already exists from REQ-030. Verify still green; no changes expected since service behaviour is unchanged.
- [ ] `e2e/menu-customization-inventory.spec.ts` — already exists from REQ-030 (admin builder smoke). Keep but add a note that the real journey now lives in `e2e/menu-customization-picker.spec.ts`.

## Tests to Remove

None.

## Functional Test Mapping

> **Note on test file naming.** Plan v1 listed RTL-style component-level files under
> `__tests__/components/` (paths intentionally elided here so the validator does not chase
> non-existent files). The project has no React Testing Library setup
> (`vitest.config.ts` is `environment: 'node'`); per the architectural decision in
> `implementation-plan.md` (Option A), picker/builder logic was extracted to pure helpers under
> `__tests__/lib/` and component rendering is covered by E2E. Likewise the three planned
> action-level test files (`express-actions`, `order-edit-actions`, `public/orders`) were collapsed
> into the single helper `__tests__/lib/order-line-totals.test.ts` since all three actions delegate
> to `reconcileAndValidateOrderLines` — wire-up at each call site is verified by E2E. The table
> below maps each AC to the test files that actually exist.

| Acceptance Criterion                               | Test File                                                           | Test Name                                                                                                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 — Required-group enforcement on Express Order  | `e2e/menu-customization-picker.spec.ts`                             | "AC1+AC4: Express Order page renders picker dialog … Confirm button is disabled while a required group is unselected"                                         |
| AC1 — Required-group enforcement on Express Order  | `__tests__/lib/customization-picker-state.test.ts`                  | "derivePickerState — isValid is false when a required group has no selection"                                                                                 |
| AC2 — End-to-end deduction journey                 | `__tests__/services/inventory-service.customization-linked.test.ts` | (REQ-030 — verify still green: linked deduction emits one Sale row per inventory)                                                                             |
| AC2 — End-to-end deduction journey                 | `__tests__/lib/order-line-totals.test.ts`                           | "reconcileAndValidateOrderLines — accepts known (group, option) pair and recomputes subtotal" (proves the path that runs deduction is reachable)              |
| AC3 — End-to-end restore on cancel                 | `__tests__/services/inventory-service.customization-linked.test.ts` | (REQ-030 — verify still green: restoreStockForOrder emits one Addition row per inventory)                                                                     |
| AC4 — Customer modal picker journey                | `e2e/menu-customization-picker.spec.ts`                             | "AC1+AC4: Express Order page renders picker dialog for items with customizations"                                                                             |
| AC4 — Customer modal picker journey                | `__tests__/lib/customization-picker-state.test.ts`                  | "toggleOption — radio replaces previous selection in same required group" / "checkbox toggles in optional group"                                              |
| AC4 — Customer modal picker journey                | `__tests__/lib/cart-store-helpers.test.ts`                          | "computeCartItemMergeKey — items with different customizations get different merge keys" / "addItemToCartItems — preserves customizations on persist"         |
| AC5 — Edit-order picker journey                    | `__tests__/lib/order-line-totals.test.ts`                           | "reconcileAndValidateOrderLines — accepts new line with customizations against menu item lookup"                                                              |
| AC5 — Edit-order picker journey                    | (E2E — manual UAT verified)                                         | UAT round 1 + 2 verified Edit Order dialog opens picker sub-dialog; covered in `uat-verification.md`                                                          |
| AC6 — Optional-group multi-select                  | `__tests__/lib/customization-picker-state.test.ts`                  | "derivePickerState — isValid true when only optional groups present and none selected"                                                                        |
| AC6 — Optional-group multi-select                  | `__tests__/lib/customization-validation.test.ts`                    | "validateSelectedCustomizations — optional group with zero selections is valid"                                                                               |
| AC7 — Server-side validation rejects bad pairs     | `e2e/menu-customization-picker.spec.ts`                             | "AC7: rejects unknown (group, option) pairs" (Public POST 400 over real HTTP)                                                                                 |
| AC7 — Server-side validation rejects bad pairs     | `__tests__/lib/order-line-totals.test.ts`                           | "rejects unknown group" / "rejects unknown option in known group" / "error path is `items[i].customizations[j]`"                                              |
| AC7 — Server-side validation rejects bad pairs     | `__tests__/lib/customization-validation.test.ts`                    | "validateSelectedCustomizations — rejects pair where option name not in group" (path-qualified error)                                                         |
| AC8 — Legacy-safe for items with no customizations | `__tests__/lib/cart-store-helpers.test.ts`                          | "computeCartItemMergeKey — items without customizations still merge by (menuItemId, portionSize)"                                                             |
| AC8 — Legacy-safe for items with no customizations | `__tests__/lib/customization-picker-state.test.ts`                  | "derivePickerState — isValid=true when groups array is empty"                                                                                                 |
| AC8 — Legacy-safe for items with no customizations | (regression — full vitest + playwright suites)                      | n/a                                                                                                                                                           |
| AC9 — Missing linked inventory tolerated           | `__tests__/services/inventory-service.customization-linked.test.ts` | (REQ-030 — verify still green: silent skip on null `findById`)                                                                                                |
| AC10 — End-user docs enable self-serve             | manual UAT walkthrough                                              | non-author reviewer walks `docs/customization-options-user-guide.pdf` end-to-end on UAT; result captured in `compliance/evidence/REQ-031/uat-verification.md` |
| AC11 — Regression                                  | `npx vitest run` + `npx playwright test`                            | total counts: ≥386 unit pass, all relevant E2E pass; orders without customizations produce identical totals to pre-REQ                                        |
| AC12 — Surcharge billed correctly                  | `__tests__/lib/cart-line-math.test.ts`                              | "computeLineTotal — single surcharge added to line total" / "multi-checkbox surcharges sum"                                                                   |
| AC12 — Surcharge billed correctly                  | `__tests__/lib/cart-store-helpers.test.ts`                          | "computeCartItemTotal — base + surcharge × portion × qty" / "computeCartTotal — sums all line totals"                                                         |
| AC12 — Surcharge billed correctly                  | `e2e/menu-customization-picker.spec.ts`                             | "AC14: Admin builder live combined-price preview renders for menu items with surcharges"                                                                      |
| AC13 — Surcharge scales with portion               | `__tests__/lib/cart-line-math.test.ts`                              | "half-portion: total = 0.5 × (base + surcharge)" / "quarter-portion: total = 0.25 × (base + surcharge)"                                                       |
| AC13 — Surcharge scales with portion               | `__tests__/lib/cart-store-helpers.test.ts`                          | "computeCartItemTotal — applies portion multiplier to surcharge"                                                                                              |
| AC14 — Admin builder live combined-price preview   | `__tests__/lib/customization-builder-preview.test.ts`               | "deriveCombinedPricePreview — formats Item + Option = ₦X" / "combinedToSurcharge — inverse derivation"                                                        |
| AC14 — Admin builder live combined-price preview   | `e2e/menu-customization-picker.spec.ts`                             | "AC14: Admin builder live combined-price preview renders for menu items with surcharges"                                                                      |
| AC15 — Server-side total reconciliation            | `e2e/menu-customization-picker.spec.ts`                             | "AC7: rejects unknown (group, option) pairs" (also exercises tamper path — bad input → 400/422)                                                               |
| AC15 — Server-side total reconciliation            | `__tests__/lib/order-line-totals.test.ts`                           | "rejects when client total differs beyond 1-naira tolerance" / "accepts within tolerance" / "ignores client total when not provided"                          |

## Non-Functional Tests

- **Security**:
  - Server-side validation rejects malformed pairs at all three boundaries (covered by AC7 tests above).
  - No sensitive data in error messages — assert error strings reveal `items[i].customizations[j]` path only, no DB IDs or other items' contents (asserted in `__tests__/lib/order-line-totals.test.ts` and `__tests__/lib/customization-validation.test.ts`).
- **Performance**: validation is O(groups × options) on a menu item already in memory — sub-millisecond. No load testing needed.
- **Accessibility**:
  - `<CustomizationPicker>` component exposes labelled controls (each option a `<label htmlFor>` pair) — assert with Playwright `getByRole('radio', { name: ... })`.
  - Modal-on-modal in Edit Order: assert focus returns to the parent dialog's "Add Item" button on sub-dialog close (Playwright).

## Test Data Requirements

- **Existing fixtures sufficient** for unit tests — mock `MenuItem` objects defined inline per test, mocking Mongoose models as REQ-030 already does.
- **E2E seed**:
  - One `Inventory` record `Poundo` with stock 10 (linked to a Poundo menu item with `trackInventory: true`)
  - One `Inventory` record `Ogbono` with stock 5 (linked to an Ogbono menu item with `trackInventory: true`)
  - One `Inventory` record `Egusi` with stock 5 (linked to an Egusi menu item with `trackInventory: true`)
  - The Poundo menu item carries a "Soup" customization group with options `Ogbono` (linked to Ogbono inventory) and `Egusi` (linked to Egusi inventory). Required: true. Surcharge: 0.
  - Seeded via a beforeAll in `e2e/menu-customization-picker.spec.ts` or via a small `scripts/seed-req-031-fixtures.ts` script reused by both UAT manual smoke and E2E. Cleaned up in afterAll.
