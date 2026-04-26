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
- [ ] `__tests__/actions/admin/express-actions.customizations.test.ts` — server validation + server-side total recomputation in `expressCreateOrderAction` (~7 tests, +1 for the tamper-detection case)
- [ ] `__tests__/actions/admin/order-edit-actions.customizations.test.ts` — server validation + total recomputation in `updateOrderItemsAction` (~6 tests)
- [ ] `__tests__/api/public/orders.customizations.test.ts` — server validation + total recomputation + tamper rejection in public POST handler (~7 tests)
- [ ] `e2e/menu-customization-picker.spec.ts` — Playwright user-journey tests: (1) staff fulfilment with surcharge — line total ₦2,500 visible at every step; (2) customer cart with half portion — line total ₦1,250; (3) required-group block; (4) admin builder combined-price preview round-trip; (5) **picker visible-UI**: required group renders as radios; (6) **picker visible-UI**: optional group renders as checkboxes (5 + 6 cover what `customization-picker.test.tsx` would have, since this project has no RTL setup)

## Tests to Update

- [ ] `__tests__/services/inventory-service.customization-linked.test.ts` — already exists from REQ-030. Verify still green; no changes expected since service behaviour is unchanged.
- [ ] `e2e/menu-customization-inventory.spec.ts` — already exists from REQ-030 (admin builder smoke). Keep but add a note that the real journey now lives in `e2e/menu-customization-picker.spec.ts`.

## Tests to Remove

None.

## Functional Test Mapping

| Acceptance Criterion                               | Test File                                                                    | Test Name                                                                                                                                                     |
| -------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 — Required-group enforcement on Express Order  | `e2e/menu-customization-picker.spec.ts`                                      | "staff cannot create Express Order until required Soup group selected"                                                                                        |
| AC1 — Required-group enforcement on Express Order  | `__tests__/components/customization-picker.test.tsx`                         | "isValid is false when a required group has no selection"                                                                                                     |
| AC2 — End-to-end deduction journey                 | `e2e/menu-customization-picker.spec.ts`                                      | "staff completes Poundo+Ogbono order, both inventories decrement, both stock-movement rows appear"                                                            |
| AC2 — End-to-end deduction journey                 | `__tests__/services/inventory-service.customization-linked.test.ts`          | (REQ-030 — verify still green: linked deduction emits one Sale row per inventory)                                                                             |
| AC3 — End-to-end restore on cancel                 | `e2e/menu-customization-picker.spec.ts`                                      | "cancelling the Poundo+Ogbono order restores both inventories with addition rows"                                                                             |
| AC4 — Customer modal picker journey                | `e2e/menu-customization-picker.spec.ts`                                      | "customer picks Egusi from Poundo modal, line shows in cart with Soup label, order persists"                                                                  |
| AC4 — Customer modal picker journey                | `__tests__/components/customization-picker.test.tsx`                         | "renders required group as RadioGroup with surcharge labels"                                                                                                  |
| AC4 — Customer modal picker journey                | `__tests__/stores/cart-store.customizations.test.ts`                         | "customizations are persisted on cart line and survive reload"                                                                                                |
| AC5 — Edit-order picker journey                    | `__tests__/actions/admin/order-edit-actions.customizations.test.ts`          | "updateOrderItemsAction accepts new line with customizations"                                                                                                 |
| AC5 — Edit-order picker journey                    | `e2e/menu-customization-picker.spec.ts`                                      | "staff adds Poundo+Ogbono to existing order via Edit Order Items, line saves with customization"                                                              |
| AC6 — Optional-group multi-select                  | `__tests__/components/customization-picker.test.tsx`                         | "renders optional group as Checkboxes; isValid true with zero selections"                                                                                     |
| AC6 — Optional-group multi-select                  | `__tests__/lib/customization-validation.test.ts`                             | "optional group with zero selections is valid"                                                                                                                |
| AC7 — Server-side validation rejects bad pairs     | `__tests__/api/public/orders.customizations.test.ts`                         | "POST returns 400 with path-qualified error when (group, option) pair not on menu item"                                                                       |
| AC7 — Server-side validation rejects bad pairs     | `__tests__/actions/admin/express-actions.customizations.test.ts`             | "expressCreateOrderAction rejects unknown group" / "rejects unknown option in known group"                                                                    |
| AC7 — Server-side validation rejects bad pairs     | `__tests__/actions/admin/order-edit-actions.customizations.test.ts`          | "updateOrderItemsAction rejects bad pair on new line"                                                                                                         |
| AC8 — Legacy-safe for items with no customizations | `__tests__/stores/cart-store.customizations.test.ts`                         | "items without customizations still merge by (menuItemId, portionSize)"                                                                                       |
| AC8 — Legacy-safe for items with no customizations | `__tests__/components/customization-picker.test.tsx`                         | "renders nothing and isValid=true when groups array is empty"                                                                                                 |
| AC8 — Legacy-safe for items with no customizations | (regression — full vitest + playwright suites)                               | n/a                                                                                                                                                           |
| AC9 — Missing linked inventory tolerated           | `__tests__/services/inventory-service.customization-linked.test.ts`          | (REQ-030 — verify still green: silent skip on null `findById`)                                                                                                |
| AC10 — End-user docs enable self-serve             | manual UAT walkthrough                                                       | non-author reviewer walks `docs/customization-options-user-guide.pdf` end-to-end on UAT; result captured in `compliance/evidence/REQ-031/uat-verification.md` |
| AC11 — Regression                                  | `npx vitest run` + `npx playwright test`                                     | total counts: ≥386 unit pass, all relevant E2E pass; orders without customizations produce identical totals to pre-REQ                                        |
| AC12 — Surcharge billed correctly                  | `__tests__/lib/cart-line-math.test.ts`                                       | "single surcharge added to line total" / "multi-checkbox surcharges sum"                                                                                      |
| AC12 — Surcharge billed correctly                  | `__tests__/stores/cart-store.customizations.test.ts`                         | "addItem with customizations sets line subtotal to base + sum surcharges × qty"                                                                               |
| AC12 — Surcharge billed correctly                  | `e2e/menu-customization-picker.spec.ts`                                      | "staff fulfilment: cart shows ₦2,500 / Order Summary shows ₦2,500 / persisted order total is ₦2,500"                                                          |
| AC13 — Surcharge scales with portion               | `__tests__/lib/cart-line-math.test.ts`                                       | "half-portion: total = 0.5 × (base + surcharge)" / "quarter-portion: total = 0.25 × (base + surcharge)"                                                       |
| AC13 — Surcharge scales with portion               | `e2e/menu-customization-picker.spec.ts`                                      | "customer half-portion Poundo + Egusi: cart shows ₦1,250"                                                                                                     |
| AC14 — Admin builder live combined-price preview   | `__tests__/components/customization-options-builder.combined-price.test.tsx` | "preview updates as surcharge changes" / "toggle to combined-price input mode auto-derives surcharge" / "multi-group preview sums surcharges per option"      |
| AC14 — Admin builder live combined-price preview   | `e2e/menu-customization-picker.spec.ts`                                      | "admin enters combined price ₦2,500 → option saves with surcharge ₦500"                                                                                       |
| AC15 — Server-side total reconciliation            | `__tests__/api/public/orders.customizations.test.ts`                         | "rejects 400 when client total differs from server-recomputed total beyond 1-naira tolerance"                                                                 |
| AC15 — Server-side total reconciliation            | `__tests__/actions/admin/express-actions.customizations.test.ts`             | "expressCreateOrderAction recomputes subtotal server-side, ignores client-supplied total"                                                                     |
| AC15 — Server-side total reconciliation            | `__tests__/actions/admin/order-edit-actions.customizations.test.ts`          | "updateOrderItemsAction rejects tampered totals"                                                                                                              |

## Non-Functional Tests

- **Security**:
  - Server-side validation rejects malformed pairs at all three boundaries (covered by AC7 tests above).
  - No sensitive data in error messages — assert error strings reveal `(items[i].customizations[j])` path only, no DB IDs or other items' contents (assertion in each `.customizations.test.ts`).
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
