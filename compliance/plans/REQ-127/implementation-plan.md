---
title: 'Implementation plan — REQ-127'
requirement_id: 'REQ-127'
risk_class: 'MEDIUM'
change_type: 'fix'
authored_by: 'sdlc-implementer (Claude Sonnet 5.5)'
authored_at: '2026-11-25'
---

# Implementation plan — REQ-127

Issue: [#1031](https://github.com/metasession-dev/wawagardenbar-app/issues/1031) — Checkout: cart not cleared when payment initialisation fails after the order is created. Found in UAT of REQ-120 (defect D-4). Member of the bundle led by REQ-125 (#1082).

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

Closes ISO 29119 §3.4 (§1, §9), ISO 27001 A.8.25 (§5), GDPR Art. 25 (§6), EU AI Act Art. 11 (§7).

## 1. Goal + acceptance criteria

- **Goal:** After a failed payment start there is exactly one Pending order for the attempt, the cart and that order agree, and retrying never creates a second order for the same items.

### What the code does today (verified)

`components/features/checkout/customer-checkout-form.tsx` creates the order with `createOrder` and then calls `initializePayment`. `clearCart()` runs only after a successful initialisation, so after a failure the order exists (Payment Pending) and the same items are still in the cart. The idempotency key is generated **once per mount** (`useEffect` on `[]`, line ~194) and `createCustomerOrder` returns the existing order for a repeated key (`services/customer-order-service.ts`, `findByIdempotencyKey`). So an immediate retry on the same page **already reuses the order**; the duplicate-order risk is elsewhere:

1. If the customer leaves checkout and returns (back to the menu, a reload, or a new tab), the form remounts, a **new key** is generated, and the same items create a **second** Pending order.
2. If the cart changes between the failed attempt and the retry on the same mount, the key is unchanged, so the server returns the **old order with the old items** while the form charges the **new cart total**: order and payment disagree.

### Decision for approval (the issue's "To decide")

| Option                                                                              | What changes                                                                                                                             | Assessment                                                                                                                            |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Clear the cart once the order is created, add "Pay now" on the Pending order** | New "Pay now" action and UI on the order page; the cart is gone, so the customer cannot edit the order                                   | Larger: new payment entry point on the tracking page (a HIGH-risk surface), and it takes away the customer's ability to fix the cart. |
| **B. Keep the cart, reuse the order on retry, guard against drift (recommended)**   | Tie the idempotency key to the cart contents so a retry of the same cart reuses the order and a changed cart starts a new, correct order | Small, client-side plus one cancel call. Matches what the server already does.                                                        |

**Recommendation: option B.** Detail: derive the key from a stored attempt `{key, cartFingerprint, orderId}` kept in `sessionStorage` (fingerprint = item ids, quantities, customisations, order type, table, tip is excluded because tip changes the amount, not the order lines; the amount sent to `initializePayment` is read from the order, not recomputed). On submit: same fingerprint → reuse the stored key (server returns the same order, payment is re-initialised for it); different fingerprint → cancel the superseded unpaid order with the customer's own cancel action (`app/actions/order/order-actions.ts` `cancelOrderAction`, which only allows unpaid orders; verified in Phase 2 that it is owner-scoped) and create a new one with a new key. If the cancel fails, continue anyway: unpaid orders already expire after 30 minutes (WA-07).

| AC  | Description (Given / When / Then)                                                                                                                                                                                                                                                  | SRS-ID                      | Verification |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------ |
| AC1 | **Given** payment initialisation fails after the order is created, **When** the customer retries with the same cart (same page, reload, or return from the menu), **Then** exactly one Pending order exists for the attempt and the retry initialises payment for that same order. | REQ-CHECKOUT-019            | unit + e2e   |
| AC2 | **Given** a failed payment start, **When** the customer changes the cart and submits again, **Then** the superseded unpaid order is cancelled (best effort, expiry as backstop) and a new order is created with the new items, and the payment amount equals that order's total.   | REQ-CHECKOUT-019            | unit + e2e   |
| AC3 | **Given** payment initialisation succeeds, **Then** the cart is cleared and the stored attempt is removed (existing behaviour kept).                                                                                                                                               | REQ-CHECKOUT-007 (existing) | e2e          |
| AC4 | **Given** the payment gateway is forced to fail in e2e, **Then** the checkout shows the inline error, the cart is intact, and the order count for the customer is one after two failed attempts.                                                                                   | REQ-CHECKOUT-019            | e2e          |

Stories → tests: `e2e/critical/checkout-payment-init-failure.spec.ts` (AC1–AC4), plus vitest for the fingerprint/attempt helper.

### SRS items proposed/touched

| AC        | SRS item                    | Status    | Notes                                                                                     |
| --------- | --------------------------- | --------- | ----------------------------------------------------------------------------------------- |
| AC1       | REQ-CHECKOUT-019 (new)      | written   | one Pending order, retry reuses it                                                        |
| AC2       | REQ-CHECKOUT-019 (new)      | written   | changed cart replaces the order, amount equals the order total                            |
| AC3       | REQ-CHECKOUT-007 (existing) | unchanged | submit clears the cart on success; the stored attempt is also cleared                     |
| AC4       | REQ-CHECKOUT-019 (new)      | written   | e2e with the gateway forced to fail                                                       |
| (context) | REQ-CHECKOUT-008 (existing) | updated   | one Given added: same key, same order after a failed payment start; changed cart, new key |

Table/heading drift check: none for REQ-CHECKOUT (table and heading maxima agree at 018 before this REQ, 019 after).

## 2. Scope

- **In scope:** `lib/checkout-attempt.ts` (new: fingerprint, read/write/clear the stored attempt); `components/features/checkout/customer-checkout-form.tsx` (use the attempt for the key, cancel a superseded order, clear the attempt on success); `app/actions/order/order-actions.ts` only if the existing cancel action cannot be called for the customer's own unpaid order (verified in Phase 2); the payment amount for a reused order is taken from the returned order total.
- **Out of scope:** a "Pay now" action on the order page (option A); changes to `createCustomerOrder`, Paystack or the webhook; staff flows.

## 3. Architecture decisions

- **No ADR needed** — client-side change within the existing idempotency design (REQ-CHECKOUT-008, ADR-010): the stored attempt reuses the server's existing idempotency behaviour and the existing customer cancel action. Signals examined: new dependency no, new service no, new datastore no (browser `sessionStorage` only), pattern change over three files no (checkout form, one new helper), schema change no, HIGH risk no (MEDIUM).

## 4. E2E test coverage

Delegated to `e2e-test-engineer` in Phase 2. Spec `e2e/critical/checkout-payment-init-failure.spec.ts`, forcing the gateway to fail (existing Paystack mock or env switch in the e2e stack). Existing checkout specs are re-run in the Phase 2 UI regression sweep.

## 5. Threat model + security considerations

- **Money path:** the change must never charge a different amount than the order total or pay for a stale order (the drift case above). Mitigation: the amount comes from the order the server returns, AC2 test.
- **Order-owner scoping:** the cancel call must only cancel the signed-in customer's own unpaid order; verified in Phase 2 against the action's ownership check, with a negative unit test.
- **Storage:** `sessionStorage` holds a key, an order id and a hash only; no personal data. Cleared on success.
- No new secret, dependency or external service.

### Risk register entries

Entries in `compliance/risk-register.md` (the project's register uses `R-NNN` ids). The operator signs off each residual rating at the Phase 3 sign-off exchange.

- **R-80 — Checkout retry charges the wrong amount or pays for a stale or duplicate order** — OPEN, residual low × medium. Controls: cart-fingerprint-bound key, amount from the returned order, owner-scoped cancel of the superseded order with 30-minute expiry backstop, forced-failure e2e.

## 6. Data protection (GDPR Art. 25)

No new personal data collected or sent. The stored attempt contains an opaque key, an order id and a cart hash on the customer's own device for the session.

## 7. AI / model considerations (EU AI Act Art. 11)

No AI in scope. AI assistance in authoring is disclosed in `ai-use-note.md`.

## 8. Rollback plan

Revert the bundle PR. Behaviour returns to today's (one key per mount; cart kept on failure). Any Pending orders created meanwhile expire after 30 minutes.

## 9. Verification

`npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, the new critical spec plus the UI regression sweep over `e2e/` for checkout strings; UAT on the UAT environment (agent-executed). The failure path needs the gateway forced to fail on UAT, which is an operator precondition (an environment setting), not something the agent changes.

## 10. Sign-off

Plan approved by: operator, at the Phase 1 checkpoint (decision A or B above).
