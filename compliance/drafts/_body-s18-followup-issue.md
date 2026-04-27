## Background

REQ-031 (issue #67) ships the order-time customization picker that wires up REQ-030's linked-inventory deduction. Both REQs have a deliberate gap on the cart-side stock check for _linked_ inventories, captured as **S18 (out of scope, waived)** in REQ-031's Surface Inventory.

This issue tracks closing that gap.

## Current behaviour (post REQ-030 + REQ-031)

- `validateCartItem` (`app/actions/cart/cart-actions.ts`) checks **base item** stock only.
- `deductStockForOrder` (`services/inventory-service.ts`) decrements both base and linked inventories at fulfilment time. There is no pre-check on the linked side; if a linked record is _missing_, REQ-030 silently skips. If a linked record is _insufficient_, behaviour depends on `allowNegativeStock`:
  - With `allowNegativeStock: false` — the deduction may fail mid-order or push stock to 0 then refuse, depending on per-record state.
  - With `allowNegativeStock: true` — stock goes negative; the kitchen physically can't fulfil but the order completes.

## Concrete failure mode

Poundo stock 10. Ogbono stock 1.

1. Customer adds 3 × Poundo + Ogbono to cart. Cart shows "yes, 3 available" because Poundo has 10.
2. Customer checks out. Order persists.
3. Kitchen marks complete. Poundo 10 → 7. Ogbono 1 → -2 (or partial deduction failure).
4. Kitchen has one Ogbono soup, three Poundos, and an upset customer.

## Proposed scope

1. Extend `validateCartItem` to compute the **linked-inventory requirement** across the cart using REQ-030's `resolveLinkedInventoryFor` resolver, sum required units per linked inventory across all cart lines, compare to current stock, and return the binding constraint with a per-inventory error.
2. Mirror the same check at the server-action boundary: `expressCreateOrderAction`, `updateOrderItemsAction`, `POST /api/public/orders` (the cart can be stale if held for hours; defence in depth).
3. Picker UX for option-level out-of-stock — design call:
   - **Option A** — hide the option entirely (cleanest; customer never sees it; risk: the option silently disappears mid-shift, which can confuse repeat customers).
   - **Option B** — render the option greyed-out with "Out of stock" label (most informative; matches portion-size behaviour for half/quarter when base stock is low).
   - **Option C** — render normally but block Add-to-Cart with a toast (worst UX; avoid).
   - Recommendation: B for parity with existing portion-size disabled state.
4. Race-condition policy — what happens when stock is sufficient at cart-add but depleted at checkout because another customer drained it. Two reasonable choices:
   - **Fail closed** — checkout returns 409, customer sees "we just sold out of Ogbono — please pick another soup". Safer.
   - **Fail open** — order accepts; fulfilment runs negative as today. Matches current behaviour for base items if `allowNegativeStock` is on.
   - Recommendation: fail closed regardless of `allowNegativeStock` setting for _linked_ deductions, to match the new picker contract.

## Acceptance criteria (Given / When / Then)

- **AC1** — _Given_ Poundo stock 10 and Ogbono stock 1, _When_ a customer attempts to add 3 × Poundo + Ogbono to cart, _Then_ the cart rejects with "Only 1 Ogbono soup available" _And_ the cart line is not added.
- **AC2** — _Given_ the same state, _When_ a customer adds 1 × Poundo + Ogbono and successfully checks out (Ogbono now at 0), _And_ a second customer opens the Poundo modal, _Then_ Ogbono is rendered greyed-out with "Out of stock" _And_ cannot be picked.
- **AC3** — _Given_ a stale cart held by Customer A with 1 × Poundo + Ogbono, _When_ Customer B drains Ogbono to 0 in the meantime, _When_ Customer A submits checkout, _Then_ the public POST returns 409 with a path-qualified error naming Ogbono _And_ no order is created.
- **AC4** — _Given_ a menu item with a customization group whose options have **no** linked inventory (legacy behaviour), _When_ the customer orders any of those options, _Then_ no linked-stock check runs _And_ behaviour is identical to today (legacy-safe).
- **AC5** — _Given_ a customization option's linked inventory record was **deleted** (not zero, missing entirely), _When_ the customer tries to pick the option, _Then_ fall back to current REQ-030 behaviour — the picker renders the option, the order completes, the linked deduction is silently skipped at fulfilment. Do **not** retroactively block at the picker. (This avoids creating orphan-detection UX that doesn't help anyone.)

## Surfaces this feature touches

| #   | Surface                                  | URL / file                                                               | Status                                            |
| --- | ---------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------- |
| S1  | Customer modal: render greyed-out option | `components/features/menu/customization-picker.tsx` (created in REQ-031) | In scope                                          |
| S2  | Cart-side stock validation               | `app/actions/cart/cart-actions.ts:validateCartItem`                      | In scope                                          |
| S3  | Express server action                    | `app/actions/admin/express-actions.ts`                                   | In scope                                          |
| S4  | Edit-order server action                 | `app/actions/admin/order-edit-actions.ts`                                | In scope                                          |
| S5  | Public POST endpoint                     | `app/api/public/orders/route.ts`                                         | In scope                                          |
| S6  | Pure resolver for linked requirements    | `lib/customization-inventory.ts` (REQ-030)                               | Already works — reuse `resolveLinkedInventoryFor` |
| S7  | Stock movement history rendering         | `components/features/admin/stock-history-table.tsx`                      | Already works                                     |

## Risk classification

**MEDIUM** baseline (cart-side validation, no money side-effect change) + AI-involvement +1 → **HIGH**. Two human reviewers required.

## Out of scope

- **Reservation / hold** semantics (e.g. lock 3 Ogbono for 5 minutes while the customer checks out). Standard inventory-race trade-off; not worth it for a casual-dining venue.
- **Allergen-aware blocking** — separate concern.

## Reference

- Predecessor: REQ-030 (back-end deduction) — superseded release ticket at `compliance/superseded-releases/RELEASE-TICKET-REQ-030.md`
- Predecessor: REQ-031 / issue #67 (order-time picker) — Surface Inventory entry **S18 (out of scope, waived)**
- Related META-COMPLY: SDLC Stage 1 patch [#152](https://github.com/metasession-dev/META-COMPLY/issues/152) — this issue follows the patch's Surface Inventory + Given/When/Then format
