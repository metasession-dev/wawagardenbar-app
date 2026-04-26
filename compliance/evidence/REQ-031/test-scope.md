# Test Scope — REQ-031

**Risk Level:** HIGH
**Requirement:** End-to-end multi-inventory deduction for menu items with customization options — order-time picker UI plus defensive server-side validation, completing the back-end work shipped under the superseded REQ-030.
**GitHub Issue:** [#67](https://github.com/metasession-dev/wawagardenbar-app/issues/67)
**Date:** 2026-04-25

## Test Approach

Full verification and validation per Test Strategy high-risk requirements.

**Universal gates (mandatory — verified locally AND in CI):**

- TypeScript compilation: 0 errors
- SAST scan: 0 high/critical findings (baseline 1 WARNING in pre-existing `lib/cors.ts` already accepted)
- Dependency audit: 0 high/critical vulnerabilities (only pre-existing `xlsx` allowlisted)
- E2E suite: all pass (full suite local, unauthenticated subset in CI)
- Human code review via PR (×2 — HIGH risk, AI-involvement +1)

**Security testing (mandatory for HIGH):**

- [ ] Access control: server actions still require admin/super-admin session unchanged; public POST endpoint already public per existing design
- [ ] Audit logging: order creation and stock movements continue to record `performedBy` and `category` consistent with REQ-030
- [ ] Input validation: every `(groupName, optionName)` pair submitted via any of the three order-creating actions is rejected if it doesn't exist on the menu item being ordered (closes a small hole REQ-030 didn't notice)
- [ ] Error handling: rejection messages are path-qualified (e.g. `items[0].customizations[1]`) but do not leak schema internals or other items' IDs

**Additional high-risk testing:**

- [ ] Independent review: second human reviewer required per Review Policy (Risk-Tiered) — HIGH baseline + AI-involvement +1
- [ ] Penetration testing consideration: not warranted — change is additive validation on existing endpoints, no new auth surface
- [ ] Performance impact: per-line validation is O(groups × options) lookup against the menu item already loaded by the action — negligible
- [ ] Regression scope: full vitest run must show 386 pre-existing tests still green; full Playwright run must show no failures in unrelated specs (cart, checkout, order lifecycle)

## Validation Approach

How we confirm this meets the business requirement (the journey REQ-030 left unreachable):

- **Manual end-to-end smoke on UAT pre-merge:** seed a Poundo menu item with a Soup customization group linked to Ogbono and Egusi inventory records. Place an order via `/dashboard/orders/express/create-order` selecting Poundo + Ogbono. Mark the order Complete. Open `/dashboard/inventory/{poundo}` and `/dashboard/inventory/{ogbono}` — both show stock decreased by 1, both show one new "Sale" stock-movement row tied to the order ID. Cancel the order. Re-check both inventories — both restored, both show one new "Restore" row tied to the same order ID. Result captured in `compliance/evidence/REQ-031/uat-verification.md` and the release ticket.
- **Customer journey check:** open `/menu` as a customer, open the Poundo modal, observe the Soup picker, attempt to Add to Cart without picking — button disabled. Pick Egusi — button enables, line appears in cart with "Soup: Egusi" beneath it. Place the order through checkout. Order persists with the customization on the order page.
- **Stakeholder sign-off:** ostendo-io as primary reviewer, second reviewer TBD before PR opens.

## AI Involvement

- AI tool: Claude Code (Claude Opus 4.7, 1M context)
- Code categories AI will generate: implementation, unit tests, E2E spec, user-docs PDF, compliance artefacts
- Elevated review required for: the three server actions (`express-actions.ts`, `order-edit-actions.ts`, `app/api/public/orders/route.ts`) where the validation runs — these are the security-sensitive surfaces
- Regeneration protocol: none — every change is a targeted edit; the existing back-end (REQ-030 commits) is not regenerated

## Acceptance Criteria

Phrased as user-observable journeys per the META-COMPLY #152 patch (Given/When/Then). Every AC names a surface from the implementation plan's Surface Inventory.

- [ ] **AC1 — Required-group enforcement on Express Order (S3, S8)**
      _Given_ Poundo has a "Soup" customization group with options Ogbono / Egusi linked to their own inventory records,
      _When_ a staff member opens `/dashboard/orders/express/create-order` and adds Poundo to the order,
      _Then_ a Soup picker appears,
      _And_ the order cannot be created until Soup is picked (because the group is required).

- [ ] **AC2 — End-to-end deduction journey (S3, S8, S10, S15)**
      _Given_ the staff picks Ogbono and creates the order,
      _When_ the order is marked Complete from `/dashboard/orders/{id}`,
      _Then_ `/dashboard/inventory/{poundo}` shows Poundo stock decreased by 1,
      _And_ `/dashboard/inventory/{ogbono}` shows Ogbono stock decreased by 1,
      _And_ both pages show one new "Sale" stock-movement row tied to the order ID.

- [ ] **AC3 — End-to-end restore on cancel (S11, S15)**
      _Given_ the same fulfilled order from AC2,
      _When_ the staff cancels it from the order page,
      _Then_ both Poundo and Ogbono stock are restored to their pre-sale levels,
      _And_ both inventories show one new "Restore" stock-movement row tied to the same order ID.

- [ ] **AC4 — Customer modal picker journey (S2, S5, S6, S7)**
      _Given_ Poundo on the customer menu at `/menu`,
      _When_ a customer opens the Poundo modal,
      _Then_ they see the Soup picker rendered the same way as the staff path (D1 single shared component),
      _And_ "Add to Cart" is disabled until Soup is picked,
      _And_ the chosen Soup option appears under the Poundo line in the cart sidebar,
      _And_ the order persists with the customization after checkout.

- [ ] **AC5 — Edit-order picker journey (S4, S9)**
      _Given_ a customer order with Poundo + Egusi has been placed and shows in `/dashboard/orders`,
      _When_ a staff member opens "Edit Order Items" and adds a second Poundo with Ogbono,
      _Then_ the picker is exposed in the edit dialog (sub-dialog per D9),
      _And_ the new line saves with the chosen customization.

- [ ] **AC6 — Optional-group multi-select (S2, S3, S4)**
      _Given_ an optional customization group (e.g. "Extras"),
      _When_ the user opens the picker,
      _Then_ options render as checkboxes (zero-or-many),
      _And_ the order can be created with no extras selected.

- [ ] **AC7 — Server-side validation rejects bad pairs (S7, S8, S9)**
      _Given_ a tampered client posts an order with a `(group, option)` pair that doesn't exist on the menu item,
      _When_ the request reaches `POST /api/public/orders`, `expressCreateOrderAction`, or `updateOrderItemsAction`,
      _Then_ the server rejects with HTTP 400 and a path-qualified error,
      _And_ no order is created.

- [ ] **AC8 — Legacy-safe behaviour for items with no customizations (S2, S3, S4)**
      _Given_ a menu item with no customization groups,
      _When_ it is ordered through any of the three surfaces,
      _Then_ behaviour is identical to before this REQ — same buttons, same flow, same cart merge semantics, same totals.

- [ ] **AC9 — Missing linked inventory tolerated at fulfilment (S10)**
      _Given_ a linked inventory record was deleted after the order was placed,
      _When_ the order is marked Complete,
      _Then_ base inventory still decrements,
      _And_ the linked deduction is silently skipped (no crash) — preserves REQ-030 behaviour.

- [ ] **AC10 — End-user docs enable self-serve setup-to-verify (S16)**
      _Given_ this REQ is shipped,
      _When_ a manager opens `docs/customization-options-user-guide.pdf`,
      _Then_ they can complete the entire setup-then-sale-then-verify flow without engineering help — confirmed by a non-author reviewer walking the doc end-to-end on UAT.

- [ ] **AC11 — Regression**
      386 pre-existing unit tests still green; full Playwright suite green for unrelated journeys (cart, checkout, order lifecycle, inventory transfers, expense search). Specifically: orders for menu items with no customization groups produce identical totals to today (no monetary deltas).

- [ ] **AC12 — Surcharge billed correctly (S2, S3, S4, S5, S6, S7, S8, S9)**
      _Given_ Poundo (₦2,000 base) has a "Soup" group with Egusi linked option and surcharge ₦500,
      _When_ a customer or staff member orders 1 × Poundo + Egusi at full portion through any of the three surfaces,
      _Then_ the cart line shows ₦2,500 _And_ the Order Summary shows ₦2,500 _And_ the persisted order has `subtotal: 2500` and `total: 2500` (plus tax/fees) _And_ the line item records the customization with `price: 500`.

- [ ] **AC13 — Surcharge scales with portion (S2, S3, S5, S10)**
      _Given_ the same Poundo + Egusi configuration,
      _When_ a customer orders 1 × **half** Poundo + Egusi,
      _Then_ the cart line shows ₦1,250 (= 0.5 × (2,000 + 500)) _And_ the persisted order total reflects ₦1,250 _And_ fulfilment deducts 0.5 Poundo + 0.5 Egusi from inventory (consistent with REQ-030 portion scaling).

- [ ] **AC14 — Admin builder live combined-price preview (S17 admin UX, D10)**
      _Given_ an admin opens `/dashboard/menu/{id}/edit` for Poundo (₦2,000 base),
      _When_ they add a "Soup" group, add an "Egusi" option, and type `500` into the Surcharge field,
      _Then_ a live preview reads `Poundo + Egusi = ₦2,500` _And_ updates as the surcharge field changes,
      _And_ an "Enter combined price" toggle lets them type `₦2,500` directly with the surcharge auto-deriving to `500`.

- [ ] **AC15 — Server-side total reconciliation (S7, S8, S9)**
      _Given_ a tampered client posts an order claiming `total: 1000` for 1 × Poundo + Egusi (true total ₦2,500),
      _When_ the request reaches `POST /api/public/orders`, `expressCreateOrderAction`, or `updateOrderItemsAction`,
      _Then_ the server recomputes the total from menu data, detects the mismatch beyond 1-naira rounding tolerance, and rejects with HTTP 400 _And_ no order is created.

- [ ] All security testing items above pass
- [ ] All validation items above confirmed
- [ ] Independent review completed (second human reviewer, HIGH risk)
