# Security Evidence Summary — REQ-097

**Date:** 2026-07-30

| Control                                  | Result | Evidence                                                                                                                                                                                                                                                                   |
| ---------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SAST                                     | PASS   | `npm run lint` — 0 errors (965 pre-existing warnings, unrelated)                                                                                                                                                                                                           |
| Dependency audit                         | PASS   | No new dependencies introduced                                                                                                                                                                                                                                             |
| Server-side surcharge resolution (R-018) | PASS   | The portion surcharge is resolved from `menuItem.portionOptions` looked up server-side by `menuItemId` — never taken from the client request. Client only supplies which portion size was picked, matching the existing safe pattern the base-price fraction already used. |
| Tamper-check regression guard            | PASS   | `order-line-totals.test.ts` adds a case proving a `clientTotal` computed with the correct (surcharge-inclusive) number now passes the 1-naira tamper-check tolerance — previously would have failed against the buggy server total.                                        |
| Financial calculation correctness        | PASS   | Unit tests across `cart-line-math.test.ts`, `order-line-totals.test.ts`, `express-actions-portion-pricing-req097.test.ts` cover half/quarter/full portions, price-override interaction, and legacy items with no portion options configured.                               |

## Finding surfaced during investigation (not a security vulnerability, a scope-boundary clarification)

The actual customer-facing web checkout (`app/actions/payment/payment-actions.ts::createOrder`, used by `CustomerCheckoutForm`) does **not** use the shared `reconcileAndValidateOrderLines` reconciler at all — it trusts the client-supplied `item.price` directly. Investigated and confirmed the client (`menu-item-detail-modal.tsx`) already computes the surcharge-inclusive price correctly, so this path was never affected by either bug. Documented explicitly in the plan (§2) so it isn't mistaken for a missed fix site in a future audit.

## Post-deploy controls

- No migration required — no schema change.
- No new secrets, credentials, or external dependencies.
- Existing admin-session gates on `express-actions.ts`/`order-edit-actions.ts` unchanged; this REQ only corrects arithmetic within an already-gated surface.
