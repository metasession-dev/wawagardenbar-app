---
title: 'Implementation plan — REQ-121'
requirement_id: 'REQ-121'
risk_class: 'HIGH'
change_type: 'feat'
authored_by: 'sdlc-implementer (Claude) for operator'
authored_at: '2026-11-16'
---

# Implementation plan — REQ-121

Issue: #968 (WA-06, tracker #953). Own risk class HIGH: the customer checkout handles a signed-in customer's phone, name and delivery address, saves the address to the profile, and adds a tip to the amount charged. **Declared bundle** with REQ-122 (#974): this is the primary (core) REQ; one branch `feat/bundle-wa-06-wa-12-checkout-staff-alerts`, one PR and one portal release. Bundle ceremony runs at HIGH.

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

Closes ISO 29119 §3.4 (§1), ISO 27001 A.8.25 (§5), GDPR Art. 25 (§6), EU AI Act Art. 11 (§7).

## 1. Goal + acceptance criteria

- **Goal:** A signed-in customer places and pays for an order on one page that asks only what the chosen order type needs. No stepper, no customer-info, tab or payment-method step, no email, no pay-later path.

| AC  | Description (Given / When / Then)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Verification                                          | SRS-ID                                                                           |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| AC1 | **Given** a signed-in customer opens `/checkout`, **When** the page loads, **Then** there is one page with an order-type selector, only that type's fields, a summary with the total and one **Pay** button; no stepper and no customer-info, tab or payment-method step exist.                                                                                                                                                                                                                                                          | `e2e/critical/checkout-single-page.spec.ts` (US-A2.1) | REQ-CHECKOUT-014 (new), REQ-CHECKOUT-001 (updated)                               |
| AC2 | **Given** the account has a name, **Then** no name, email or phone field is shown; **Given** it has none, **Then** exactly one required "First name" field is shown and saved to the profile; email is never asked.                                                                                                                                                                                                                                                                                                                      | same spec (US-A2.1, US-A2.2)                          | REQ-CHECKOUT-015 (new)                                                           |
| AC3 | **Given** dine-in, pickup or delivery, **Then** the fields are exactly: dine-in = table (prefilled from `?table=`, editable); pickup = "As soon as possible" by default with an optional schedule from `getPickupSlots`; delivery = saved default address preselected, or one address line plus landmark plus optional instructions (street2, postal code, country hidden, country defaulted to NG), auto-saved to the profile, with the delivery fee and out-of-radius error shown before Pay. Address fields appear for delivery only. | same spec (US-A2.3 to US-A2.5)                        | REQ-CHECKOUT-016 (new), REQ-CHECKOUT-002 (updated), REQ-CHECKOUT-003 (unchanged) |
| AC4 | **Given** "Add a tip" is checked and a preset or custom amount chosen, **Then** the total increases by that tip, the tip is part of the charge, and no tip-method field exists (`tipPaymentMethod` removed from the customer schema).                                                                                                                                                                                                                                                                                                    | same spec (US-A2.11)                                  | REQ-CHECKOUT-006 (updated)                                                       |
| AC5 | **Given** `?type=` and `?table=` query parameters, **Then** the order type and table are preselected; otherwise the customer's last-used type is selected.                                                                                                                                                                                                                                                                                                                                                                               | same spec (US-A2.3) + unit                            | REQ-CHECKOUT-017 (new)                                                           |
| AC6 | **Given** a `createCustomerOrder` typed error, **Then** it is shown inline next to the relevant field; **Given** the business is closed, **Then** the hours banner shows and Pay is disabled.                                                                                                                                                                                                                                                                                                                                            | same spec (US-A2.12) + unit                           | REQ-CHECKOUT-018 (new), REQ-CHECKOUT-012 (unchanged)                             |

SRS-ID column is filled by `requirements-aligner` (see "SRS items proposed/touched" once that skill has run).

### Requirements gap raised at Phase 1 (devaudit-installer#212) — DECIDED: (b) amend, approved 2026-11-16

- **Gap G1 (AC1 and the issue's task 8):** the issue says Pay goes to the Paystack hosted checkout built in WA-07 (#969), which does not exist yet, and today's customer checkout offers Monnify only (REQ-CHECKOUT-010; payment-method step text "processed securely through Monnify"). `PaymentService.initializePayment` routes to the active provider and already accepts a list of payment methods. **Proposed handling: (b) amend.** AC1 is read as "one Pay button that calls the existing `initializePayment` action with all payment methods, so the active provider's hosted page offers the choice"; the payment-method step is removed from the customer flow; switching the active provider to Paystack, the hosted-checkout wiring and the paid-only kitchen gate stay in WA-07. If the operator prefers, option (c): leave the old payment-method step in place until WA-07.

## SRS items proposed/touched

| AC  | SRS item                    | Status        | Notes                                                                                                                 |
| --- | --------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------- |
| AC1 | REQ-CHECKOUT-014 (new)      | prose drafted | one page, single Pay, no stepper or info/tab/payment-method step                                                      |
| AC1 | REQ-CHECKOUT-001 (existing) | updated       | was "Multi-step form"; now the one-page form                                                                          |
| AC2 | REQ-CHECKOUT-015 (new)      | prose drafted | name asked once, no email                                                                                             |
| AC3 | REQ-CHECKOUT-016 (new)      | prose drafted | minimal fields per type, saved address, pickup ASAP                                                                   |
| AC3 | REQ-CHECKOUT-002 (existing) | updated       | order-type fields; tab lock text removed (REQ-120)                                                                    |
| AC3 | REQ-CHECKOUT-003 (existing) | unchanged     | fee calculation is only displayed                                                                                     |
| AC4 | REQ-CHECKOUT-006 (existing) | updated       | inline customer tip, no tip method                                                                                    |
| AC5 | REQ-CHECKOUT-017 (new)      | prose drafted | query-parameter preselect                                                                                             |
| AC6 | REQ-CHECKOUT-018 (new)      | prose drafted | inline typed errors, closed blocks Pay                                                                                |
| AC6 | REQ-CHECKOUT-012 (existing) | unchanged     | typed errors come from `createCustomerOrder`                                                                          |
| n/a | REQ-CHECKOUT-010 (existing) | stale, see G1 | says "Monnify-only"; the Pay button now starts the active provider with all methods, and the provider switch is WA-07 |

The new items carry full Given/When/Then prose written by the aligner; the operator reviews them at plan approval. Index-table and heading maxima agree for CHECKOUT (013 before this REQ).

## 2. Scope

In scope: replace the stepper in `components/features/checkout/customer-checkout-form.tsx` with one page; remove the customer-info, tab and payment-method steps from the customer flow; inline tip; query-parameter preselect; saved-address handling; inline typed errors; closed-hours disable; sticky mobile Pay button. Out of scope: Paystack hosted checkout, the paid-only kitchen gate, webhook payment confirmation and receipt (WA-07); order status notifications (WA-08); starting an order from WhatsApp (WA-09). The staff checkout path (`admin-checkout-indicator`, `admin-payment-option`) is untouched.

### Surface inventory

| Surface                                     | URL / file                                                                                                                                      | Status                                        |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Customer checkout page                      | `app/(customer)/checkout/*`, `components/features/checkout/customer-checkout-form.tsx`                                                          | In scope                                      |
| Customer-info, tab, payment-method steps    | `customer-info-step.tsx`, `payment-method-step.tsx` (customer flow)                                                                             | In scope: removed from the customer flow      |
| Order details, tip, summary, rewards        | `order-details-step.tsx`, `tip-input-step.tsx`, `order-summary.tsx`, `rewards-section.tsx`, `address-selector.tsx`, `business-hours-banner.tsx` | In scope                                      |
| Profile save of name and address            | `app/actions/profile/profile-actions.ts`, `hooks/use-auth.ts`                                                                                   | In scope                                      |
| Reorder                                     | `ReorderButton` (REQ-062)                                                                                                                       | Already works: reuses the same order creation |
| Staff checkout                              | `admin-checkout-indicator.tsx`, `admin-payment-option.tsx`                                                                                      | Out of scope (staff path unchanged)           |
| Paystack hosted checkout, kitchen paid gate | WA-07 (#969)                                                                                                                                    | Out of scope (waived), tracked as #969        |

## 3. Architecture decisions

- **No ADR needed (candidate verdict, operator confirms at the plan checkpoint)** — This REQ restructures the customer checkout UI on top of ADR-010 (the single `createCustomerOrder` service) and keeps every server-side rule where it is. Signals examined: new third-party dependency, no; new external service, no; new database, cache or queue, no; schema-level data model change, no (the profile keeps its existing name and address fields); pattern change spanning more than three files, no (a form and step-component restructure within `components/features/checkout/`, not a change of approach); risk class HIGH, yes, which the decision tree marks "ADR (operator confirms)". The HIGH signal alone does not describe an architectural decision here, so the candidate is no ADR; if the operator disagrees, an ADR-012 on "one-page customer checkout with server-owned totals" would be drafted.

## 4. E2E test coverage

New critical specs `e2e/critical/checkout-single-page.spec.ts` (US-A2.1 to US-A2.5, US-A2.11, tip charge, inline errors) and `e2e/critical/checkout-closed-hours.spec.ts` (US-A2.12), each test with `tagTest('REQ-121', n)` and `[REQ-121][ACn]` in its title. Updated to the single page: `e2e/smoke/req-084-checkout-separation.spec.ts`, `customer-order-journey`, `customer-ordering-options-ui`, `customer-cannot-use-tabs` and `requirements-verification`. Written through `e2e-test-engineer`; evidence wiring validated by that skill; decision recorded in `compliance/evidence/REQ-121/e2e-scope-decision.md`.

### Test data requirements

A signed-in customer with a name, one without a name, one with a saved delivery address, and the business-hours state (open and closed), created inside the spec through the existing customer-auth helper (`e2e/helpers/customer-auth.ts`) and the seed set in `sdlc-config.json` (`e2e_setup_command`). No shared rows are mutated. Seed and reset stay with the `e2e-test-data` skill; no new seed script is expected.

## 5. Threat model + security considerations

| Threat (STRIDE)                                                | Surface | Mitigation                                                                                                           |
| -------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------- |
| Tampering: client sends altered totals, tip or delivery fee    | Pay     | totals, fee and tip are recomputed server-side by `createCustomerOrder` (ADR-010); the client value is never trusted |
| Tampering: tip amount negative or absurd                       | AC4     | server validates `tipAmount >= 0` and caps it relative to the subtotal                                               |
| Spoofing / elevation: checkout used without a verified session | AC1     | route and action require the WhatsApp-verified session from REQ-117; no guest path                                   |
| Information disclosure: another customer's saved address shown | AC3     | saved address read only for the session's own user id                                                                |
| Denial of service / abuse: Pay while closed                    | AC6     | server rejects when closed (typed error), not only the disabled button                                               |
| Repudiation: duplicate order on double tap                     | Pay     | idempotency key from `createCustomerOrder` (REQ-120) unchanged                                                       |

**Secrets / credentials:** none added. **Dependencies introduced:** none.

### Risk register entries

This REQ opens the following entries in `compliance/risk-register.md` (operator edits the rows and signs off the residual ratings at plan approval):

- **R-60 — Customer checkout rewritten as one page: money path regression** — OPEN, residual low × high.
- **R-61 — Saved name and delivery address handled automatically at checkout** — OPEN, residual low × medium.
- **R-62 — Payment-method step removed before the WA-07 Paystack work** — OPEN, residual low × high (tied to requirements gap G1).

## 6. Data protection (GDPR Art. 25)

**Personal data processed:** yes. Data subjects: customers. Categories: first name, phone (from the verified session), delivery address (one line, landmark, instructions), order contents. Special categories: none. Lawful basis: Art. 6(1)(b), performance of the order contract. Purpose limitation: the address and name are saved to the profile only to prefill the next order. Data minimisation: this REQ reduces what is collected (no email, no street2, postal code or country, no tip method); email is no longer collected at checkout. Retention: profile data follows the existing account retention (WA-14 owns the retention rules). ROPA: update the checkout entry (email no longer collected). DPIA: not required (no new processing, data reduced). Cross-border transfers: none beyond the existing payment provider.

## 7. AI / model considerations (EU AI Act Art. 11)

N/A: this REQ does not introduce or change AI behaviour. Implementation is drafted with Claude Code (disclosed on every commit).

## 8. Rollback plan

Revert the bundle merge. The change is UI and form validation on top of the unchanged `createCustomerOrder`; no data migration. Addresses saved by the new flow use the existing profile address shape, so the old wizard reads them. Notification path: the operator, immediately, through the existing release-incident route.

## 9. Verification

Unit tests per AC (schema, order-type field rules, tip maths, query-parameter preselect, typed-error mapping, closed-state disable); the critical e2e spec for US-A2.1 to US-A2.5, US-A2.11, US-A2.12; a 375px viewport check without horizontal scroll (e2e); UAT executed by the agent on the UAT environment with a named independent reviewer.

## Plan deviation

Implementation approach changes found while building; none changes an acceptance criterion (classified as implementation deviations, not requirements gaps).

1. **Dine-in stays payable when the business is closed.** AC6 says the closed state blocks Pay. The server rule (REQ-061, `createCustomerOrder`) treats dine-in as inside hours because the customer is at the bar, so Pay is blocked for pickup and delivery only. The hours banner shows in every order type. The old "Schedule for opening" button on the banner is no longer offered, because the server rejects any out-of-hours pickup anyway.
2. **New delivery addresses default to Lagos, Lagos, Nigeria.** AC3 says one address line plus a landmark; the service still needs a city and state. They come from `DEFAULT_DELIVERY_REGION` (`lib/checkout/checkout-rules.ts`), and the delivery-radius check protects against a wrong address. A saved address keeps its own city, state and postal code. The country is stored as `Nigeria` (the profile default and what the geocoder reads), not `NG`.
3. **The charge is the server order total.** The old checkout sent `getTotalPrice() + tip` as the amount, which left out fees and let the client choose the amount. `initializePayment` now charges `order.total` for a customer's own order and refuses another customer's order. Staff flows still send their own amount. This closes the plan's "client value never trusted" threat for the charge as well as the order.
4. **Tip cap.** The service rejects a tip larger than the server subtotal (threat model, R-60).
5. **Landmark reaches the order.** The old action dropped it. It is now sent with the delivery instructions as one note ("Landmark: ... . ...").
6. **Profile saves.** A first name alone is saved (the user model's `name` hook and `getFullName` now cope with a missing last name and a missing email), and a delivery address is saved without duplicating the same street.
7. **Payment email.** No email is asked; the provider gets the account email, or the guest address `guest@wawagardenbar.com` already used for tab payments.
8. **Rewards are unchanged.** The plan's task 9 (auto-apply rewards, collapsed) is not an acceptance criterion and is not built here; the existing rewards section in the order summary is untouched. Only "Add a note" is collapsed.
9. Removed as dead code: the four step components and the status dialog that only the old wizard used.
10. **A customer tip is recorded as `card`.** The order model requires a tip method whenever the tip is above zero (REQ-035), and a customer no longer chooses one, so the service records the online payment as `card`. Found by the e2e run: unit tests that mock the model had passed.
11. **`/api/auth/user` returns `hasName`.** The route's `name` falls back to the email prefix, so the checkout could not tell an account with no name from one with a name; the first-name field showed, then disappeared when the profile loaded. The form now waits for the profile and reads `hasName`.
12. **E2E specs.** The closed-hours story is its own spec (`checkout-closed-hours.spec.ts`) because it rewrites shop-wide business hours and must run alone (`AGGREGATE_SPECS`). Existing specs that drove the old wizard were updated to the single page (listed in the e2e scope decision).

## 10. Operator tasks (non-code)

1. ~~Decide requirements gap G1~~ done: (b) amend.
2. ~~Approve the plan~~ done 2026-11-16.
3. Independent UAT review and portal approval after the agent-executed UAT.

## 11. Sign-off

- **Plan approved by operator:** William (william@ostendo.io, via the shared GitHub login metasession-dev), 2026-11-16, in the Claude Code session (HIGH-risk checkpoint, bundle ceremony). Decisions: gap G1 = (b) amend (AC1 is the one Pay button calling the existing `initializePayment` with all methods); Architecture = no ADR (REQ-121) as drafted.
