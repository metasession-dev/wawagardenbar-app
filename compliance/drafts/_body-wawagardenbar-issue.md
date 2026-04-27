## User journey

A staff member sells one Poundo with Ogbono soup. The till should decrement Poundo stock by 1 portion AND Ogbono stock by 1 portion in the same fulfilment, with two distinct stock-movement audit rows. Cancelling that order should restore both. The same flow should work for any menu item whose customization options have been linked to their own inventory record (Poundo + Egusi, Egusi + Ugu, drinks + garnish, etc.). Today the configuration UI exists but no order-creation surface lets a user _select_ a customization at order time, so the deduction logic is unreachable through the app.

## Surfaces this feature touches

This is the "surface inventory" the planning workflow is supposed to enforce. **Every box must be ticked or explicitly waived in the implementation plan.**

- [ ] Admin: link a customization option to an inventory record (`/dashboard/menu/{id}/edit` → Customization Options builder) — _already shipped on `develop` (was REQ-030, now superseded by this REQ)_
- [ ] Customer online order: pick the customization in the menu item modal (`/menu` → item modal) — **missing**
- [ ] Staff Express Order: pick the customization in the express create page (`/dashboard/orders/express/create-order`) — **missing**
- [ ] Staff Edit Order: pick the customization when adding a line to an existing order (`/dashboard/orders/{id}` → "Edit Order Items") — **missing**
- [ ] Order fulfilment: completing the order decrements base + linked inventories with one audit row each — _already shipped on `develop`_
- [ ] Order cancellation: restores base + linked inventories symmetrically — _already shipped on `develop`_
- [ ] Reporting: each inventory's Stock Movement History at `/dashboard/inventory/{id}` shows both the base sale row and the linked sale row, both linked to the order — _already shipped on `develop`_
- [ ] End-user docs: a step-by-step guide ships with the feature so a manager can configure and verify it without engineering help

## Acceptance criteria (Given / When / Then)

- **AC1** — _Given_ Poundo has a "Soup" customization group with options Ogbono / Egusi linked to their own inventory records, _When_ a staff member opens `/dashboard/orders/express/create-order` and adds Poundo to the order, _Then_ a Soup picker appears, _And_ the order cannot be created until Soup is picked (because the group is required).
- **AC2** — _Given_ the staff picks Ogbono, _When_ the order is created and marked Complete from `/dashboard/orders/{id}`, _Then_ `/dashboard/inventory/{poundo}` shows Poundo stock decreased by 1, _And_ `/dashboard/inventory/{ogbono}` shows Ogbono stock decreased by 1, _And_ both pages show one new "Sale" stock-movement row tied to the order ID.
- **AC3** — _Given_ the same fulfilled order, _When_ the staff cancels it from the order page, _Then_ both Poundo and Ogbono stock are restored to their pre-sale levels, _And_ both inventories show one new "Restore" stock-movement row tied to the same order ID.
- **AC4** — _Given_ Poundo on the customer menu, _When_ a customer opens the Poundo modal at `/menu`, _Then_ they see the Soup picker rendered the same way as the staff path, _And_ "Add to Cart" is disabled until Soup is picked, _And_ the chosen Soup option appears under the Poundo line in the cart.
- **AC5** — _Given_ a customer order with Poundo + Egusi has been placed and shows in `/dashboard/orders`, _When_ a staff member opens "Edit Order Items" and adds a second Poundo with Ogbono, _Then_ the picker is exposed in the edit dialog, _And_ the new line saves with the chosen customization.
- **AC6** — _Given_ an optional customization group (e.g. "Extras"), _When_ the user opens the picker, _Then_ options render as checkboxes (zero-or-many), _And_ the order can be created with no extras selected.
- **AC7** — _Given_ a tampered client posts an order with a `(group, option)` pair that doesn't exist on the menu item, _When_ the request reaches `POST /api/public/orders`, `expressCreateOrderAction`, or `updateOrderItemsAction`, _Then_ the server rejects with HTTP 400 and a path-qualified error, _And_ no order is created.
- **AC8** — _Given_ a menu item with no customization groups, _When_ it is ordered through any of the three surfaces, _Then_ behaviour is identical to before this REQ (legacy-safe).
- **AC9** — _Given_ a linked inventory record is later deleted, _When_ an order referencing it is fulfilled, _Then_ base inventory still decrements, _And_ the linked deduction is silently skipped (no crash) — preserves the REQ-030 behaviour.
- **AC10** — _Given_ this REQ is shipped, _When_ a manager opens `docs/customization-options-user-guide.pdf`, _Then_ they can complete the entire setup-then-sale-then-verify flow without engineering help.
- **AC11** — _Regression_: 386 pre-existing unit tests still green; no behaviour change for orders without customizations.

## Test plan summary

- **Unit** — picker component, validation lib, cart-store merge key, three server actions (~38 new).
- **E2E (Playwright)** — at least 3 user-journey tests that drive a real browser through AC1–AC4 (the staff fulfilment journey and the customer cart journey). Not "the picker renders" — the order is placed, marked complete, and inventory deltas are asserted via DB or API.
- **Manual smoke on UAT pre-merge** — actual Poundo + Ogbono order placed, completed, both inventories verified, then cancelled and re-verified. Result captured in the release ticket's UAT Verification section.
- **Regression** — full vitest + playwright suite green.

## Risk classification

**HIGH.** MEDIUM baseline (user-facing order path, financial side-effect) + AI-involvement +1.

## Out of scope (explicit, not "missing")

- Customization-option **price surcharges** added to line subtotals — captured in data, not summed in cart math today; lighting that up is its own REQ because it changes pricing semantics across every order.
- **Pre-order stock check** for linked inventories (today: silent skip at fulfilment per REQ-030 policy — keep as-is).
- **Conditional groups** (group B only shown if group A choice X selected).
- **Per-customer saved defaults**.
- **Mobile-specific picker layout** — responsive within the existing modal is enough.

## Predecessor work (load-bearing, do NOT revert)

The following commits on `develop` form the back-end and admin-config layer for this feature. They were shipped under REQ-030 / PR #66 but never reached `main`. They are kept as the pre-cursor; this REQ adds the order-time selection UI and end-to-end coverage on top.

- `39d75d6` test: failing unit tests + impl plan
- `e007f3c` feat: multi-component inventory deduction via customization links
- `c5d4327` compliance: local gate evidence
- `830ab4c` compliance: CI gates confirmed green
- `4469b6b` compliance: evidence compiled — awaiting review

PR #66 will be **closed unmerged**; REQ-030 will be marked **SUPERSEDED** in the RTM with a pointer to this issue.

## Closes

- Closes #53 (superseded — original scope was incomplete; see "Surfaces this feature touches" above)
