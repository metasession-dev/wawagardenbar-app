# Implementation Plan — REQ-031

**Requirement:** REQ-031 — Customization-option picker in customer & staff order flows
**GitHub Issue:** #67 (pending creation — body drafted, awaiting user authorisation to publish)
**Risk Level:** HIGH (MEDIUM baseline — user-facing order path with money side-effects — with AI-involvement +1)
**Date:** 2026-04-25
**Predecessor:** REQ-030 (PR #66) — wired the data model, validation, admin configurator, and stock-deduction logic. This REQ adds the missing order-time selection UI so REQ-030 can be exercised end-to-end.

## Approach

Build a single shared `<CustomizationPicker>` component that renders a `MenuItem`'s `customizations[]` (groups → options) using radios for required groups and checkboxes for optional groups. Mount it in three order-creation surfaces: the customer detail modal, the admin Edit Order dialog, and the staff Express Order create page. Plumb the selected `{ name, option, price }[]` triples through cart-store → checkout → public order POST (already accepted), through `expressCreateOrderAction`, and through `updateOrderItemsAction`. Add defensive server-side validation in those three actions so submitted `(group, option)` pairs must exist on the menu item before the order is created.

## Files to Create

- `components/features/menu/customization-picker.tsx` — shared picker. Props: `groups: ICustomization[]`, `value: SelectedCustomization[]`, `onChange(value)`, optional `disabled`. Exposes a derived `isValid` (all required groups have a selection). Used by all three surfaces.
- `lib/customization-validation.ts` — pure helpers `validateSelectedCustomizations(menuItem, selected)` (returns `{ valid: boolean; error?: string }`) and `summariseSelected(selected)` (for human-readable cart/order labels). Single-sourced between client checks and server-side action validation, mirroring REQ-029's `lib/expense-search.ts` pattern.
- `__tests__/components/customization-picker.test.tsx` — 6–8 unit tests (renders groups, required-group blocks submission, checkbox multi-select, surcharge display, disabled state, empty-customizations renders nothing).
- `__tests__/lib/customization-validation.test.ts` — 10–12 unit tests (valid pair accepted, unknown group rejected, unknown option rejected, missing required group rejected, optional-group-with-no-selection allowed, duplicate selections in optional group, etc.).
- `__tests__/stores/cart-store.customizations.test.ts` — 5–6 tests for the new merge-key behaviour (same item + different soup = two cart lines; same item + same customizations = quantity merge).
- `__tests__/actions/admin/express-actions.customizations.test.ts` — 5–6 tests for server-side validation in `expressCreateOrderAction`.
- `__tests__/actions/admin/order-edit-actions.customizations.test.ts` — 4–5 tests for server-side validation in `updateOrderItemsAction`.
- `__tests__/api/public/orders.customizations.test.ts` — 4–5 tests for server-side validation in the public order POST.
- `e2e/menu-customization-picker.spec.ts` — Playwright. (1) customer flow: open Poundo modal, see Soup group, picking Ogbono adds it to cart and the option name appears in the cart line; (2) Add-to-Cart blocked while a required group is unselected; (3) admin edit-order add-item flow exposes the picker.
- `docs/customization-options-user-guide.html` + `docs/customization-options-user-guide.pdf` — end-user walkthrough following the same pattern as `docs/locations-inventory-guide.html`. Covers: the admin setup (links REQ-030), the customer ordering flow (this REQ), the staff order paths, and the inventory verification flow. Includes a "References" footer pointing at REQ-030 + REQ-031 + the release tickets.
- `compliance/evidence/REQ-031/test-scope.md`, `test-plan.md`, `ai-use-note.md`, `ai-prompts.md` — standard SDLC artefacts.

## Files to Modify

- `components/features/menu/menu-item-detail-modal.tsx` — add a `CustomizationPicker` section between Portion Size and Quantity. Track `selectedCustomizations` state. Disable Add to Cart while picker is invalid. Pass `customizations` into `addItem(...)` and into `validateCartItem(...)`.
- `stores/cart-store.ts` — extend `CartItem` with `customizations?: SelectedCustomization[]`. Change the merge key in `addItem` from `(menuItemId, portionSize)` to `(menuItemId, portionSize, sortedCustomizationsHash)`. Bump zustand `persist` version to invalidate stale carts and avoid mid-deploy merge anomalies.
- `app/actions/cart/cart-actions.ts` — `validateCartItem` accepts an optional `customizations` argument. Forwards into stock validation unchanged for now (linked-stock pre-validation is out of scope — see Risks).
- `components/features/checkout/checkout-form.tsx` — when building the order POST body, forward `cartItem.customizations` per line. Render the chosen options under each cart line in the Order Summary sidebar.
- `app/api/public/orders/route.ts` — call `validateSelectedCustomizations(menuItem, item.customizations)` per line; return 400 with a path-qualified error on failure.
- `components/features/admin/edit-order-dialog.tsx` — when `handleAddItem` fires for a menu item that has `customizations.length > 0`, open the shared picker in a sub-dialog (or inline expand) before pushing the line. Persist chosen customizations into the local `items` state and into the `updateOrderItemsAction` payload.
- `app/actions/admin/order-edit-actions.ts` — `updateOrderItemsAction` runs `validateSelectedCustomizations` per line and rejects on failure with a path-qualified message.
- `app/dashboard/orders/express/create-order/page.tsx` — same picker UX as the customer modal when the staff selects a menu item with customization groups.
- `app/actions/admin/express-actions.ts` — extend the `items` param type with `customizations?: SelectedCustomization[]`. Replace the hardcoded `customizations: []` (line 224) with the forwarded value. Run `validateSelectedCustomizations` per line.
- `compliance/RTM.md` — add `REQ-031` row, status `DRAFT` initially.

## Architecture Decisions

- **D1 — Single shared picker component.** Three order surfaces, one component. Eliminates the risk of behavioural drift between customer and admin paths. Mirrors REQ-029's single-source `lib/expense-search.ts` pattern.
- **D2 — Required vs optional group rendering.** `group.required === true` → RadioGroup, exactly one selection mandatory. `group.required === false` → independent Checkboxes, zero or many. The picker surfaces an `isValid` flag based on required-group coverage; hosts disable their submit button on invalid.
- **D3 — Cart merge key includes customizations.** Two orders of Poundo with different soups must be two cart lines, not one. Hash key = `${menuItemId}|${portionSize}|${JSON.stringify(customizations.sort)}`. Items with no customizations keep their existing merge behaviour (empty array hashes consistently). Bump `persist` version so legacy localStorage carts don't mis-merge after deploy.
- **D4 — Selected customizations are stored as `{ name, option, price }` triples.** Matches the existing `IOrderItem.customizations` shape and the public POST API contract — no new wire format.
- **D5 — Server-side validation is mandatory in every order-creating action.** Defence in depth: a tampered or stale client must not be able to inject `(groupName, optionName)` pairs that don't exist on the menu item being ordered. Single-source via `lib/customization-validation.ts` so the rule is identical across the three actions.
- **D6 — Customization surcharges are NOT folded into line subtotals in this REQ.** The current cart/checkout math doesn't sum customization `price`. Adding that would change pricing semantics across every order — out of scope for this REQ. Document as a follow-up. We continue to _capture_ `option.price` so a future REQ can light it up.
- **D7 — Linked-inventory pre-validation is NOT in this REQ.** REQ-030 silently skips missing linked inventories at fulfilment time. We keep that policy; `validateCartItem` does not reach for linked stock. Out of scope.
- **D8 — User-docs PDF is part of the deliverable.** Same template as `docs/locations-inventory-guide.html`, references REQ-030 + REQ-031 + release tickets so end users see how to set the feature up (REQ-030) and use it at order time (REQ-031). Builds the user's confidence that the round-trip works.
- **D9 — Admin Edit Order picker uses a sub-dialog**, not inline rows, because the existing edit dialog is already dense and customizations vary per item. A modal-on-modal pattern (Radix Dialog inside Dialog is supported) keeps the layout clean.

## Dependencies

- None. All UI primitives (`RadioGroup`, `Checkbox`, `Dialog`, `Label`) already exist in `components/ui/`.

## Risks / Considerations

- **Cart-store persist migration.** Bumping the `persist` version drops in-flight carts on the first load post-deploy. Acceptable trade-off — alternative (silent merge of legacy items into new schema) risks duplicating lines or losing soup choices on add. Document in release ticket so support knows to expect "my cart is empty" reports for ~24h.
- **Modal-on-modal accessibility.** Sub-dialog inside Edit Order dialog needs a Playwright check on focus trap return-to-parent. Tested in the e2e spec.
- **Express Order page is large** (491 lines). Picker integration adds state but the page already manages an `items` array — extension follows the existing pattern.
- **Public POST endpoint already accepted `customizations` without validation.** This REQ closes a real (though small) input-validation hole that REQ-030 didn't notice. Worth calling out in `ai-prompts.md` and the security summary.
- **Two human reviewers required (HIGH risk).** Plan the PR for `ostendo-io` + one second reviewer.

## Post-Deploy Actions

- **None at the database level** — no schema changes. All three actions remain backward-compatible (customizations array is optional everywhere).
- **Cart persist version bump** is a code change only, not a data migration — handled automatically by zustand on first load.
- **Re-publish `docs/customization-options-user-guide.pdf`** to whatever doc-host the team uses (or attach to the release ticket).

## Test Strategy Summary (full plan in `test-plan.md`)

- **Unit**: ~38 new tests across picker, validation lib, cart store, three server actions.
- **E2E**: 3 Playwright tests (customer flow, required-group block, admin edit-order picker).
- **Regression**: 386 pre-existing unit tests must still pass (REQ-030 baseline).
- **Manual smoke** on UAT pre-merge: place a Poundo + Ogbono order, mark complete, confirm both inventories drop and both stock-movement rows appear (this is the REQ-030 + REQ-031 round-trip).
