---
title: 'Implementation plan — REQ-084'
requirement_id: 'REQ-084'
risk_class: 'MEDIUM'
change_type: 'feat'
authored_by: 'Cascade (AI) + operator'
authored_at: '2026-06-22'
---

# Implementation plan — REQ-084

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

**Closes clauses** (every implementation plan satisfies all four):

| Clause                                                    | What this plan must contain                                                                                                                                       |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ISO 29119 §3.4** Test Plan                              | Acceptance criteria + the strategy for verifying each one. Reference the per-REQ `test-scope.md` if it lives separately.                                          |
| **ISO 27001 A.8.25** Secure development life cycle        | Threat model + secure-design considerations (auth, data handling, dependencies, secrets).                                                                         |
| **GDPR Art. 25** Data protection by design and by default | Per-purpose data flows; minimisation; lawful basis; retention. **Required for any REQ that processes personal data; explicit "no personal data" callout if not.** |
| **EU AI Act Art. 11** Technical documentation (Annex IV)  | When the REQ touches AI / model behaviour: model provenance, prompt sources, oversight path. **Explicit "no AI in scope" callout if not.**                        |

## 1. Goal + acceptance criteria

- **Goal:** Separate customer and admin checkout paths so customers get a clean guest-friendly Monnify-only checkout, while admins get an extended express create-order flow supporting all order types (dine-in, pickup, delivery, pay-now) and a manual-payment tab checkout — no Monnify redirect from the admin panel.

### Acceptance criteria

| AC   | Description                                                                                                                                                                                                      | SRS item it traces to               |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| AC1  | Given an unauthenticated customer on `/checkout`, When they view the checkout form, Then a "Continue as Guest" banner is visible with a link to sign in.                                                         | REQ-CHECKOUT-010 (new — proposed)   |
| AC2  | Given an unauthenticated customer on `/checkout`, When they complete the form and submit, Then the order is created successfully without requiring authentication.                                               | REQ-AUTHC-003 (existing)            |
| AC3  | Given any user on `/checkout`, When they view the payment method step, Then only Monnify gateway options (CARD, ACCOUNT_TRANSFER, USSD, PHONE_NUMBER) are shown — no manual cash/transfer/card options.          | REQ-CHECKOUT-001 (existing — stale) |
| AC4  | Given an admin on `/dashboard/orders/express/create-order`, When they select "Pickup" as the order type, Then a pickup time field appears and is required before submission.                                     | REQ-ORDMGT-009 (new — proposed)     |
| AC5  | Given an admin on `/dashboard/orders/express/create-order`, When they select "Delivery" as the order type, Then delivery address fields (street, city, state, country) appear and are required.                  | REQ-ORDMGT-009 (new — proposed)     |
| AC6  | Given an admin creating a delivery order via express create-order, When the order is submitted, Then `SettingsService.calculateOrderTotals` is called with `orderType='delivery'` so delivery fee and tax apply. | REQ-ORDMGT-010 (new — proposed)     |
| AC7  | Given an admin on `/dashboard/orders/tabs/[tabId]/checkout`, When they view the page, Then an `AdminTabCheckoutForm` is rendered with manual payment options (cash, transfer, card) — no Monnify redirect.       | REQ-TABMGT-003 (existing — stale)   |
| AC8  | Given the `createOrder` server action in `payment-actions.ts`, When searching for admin price override validation logic, Then no `isAdmin` / `priceOverridden` / `hasOverrides` branching is found.              | REQ-ORDMGT-004 (existing — stale)   |
| AC9  | Given the customer checkout component (`customer-checkout-form.tsx`), When searching for `isAdmin`, Then no admin branching logic is found.                                                                      | REQ-CHECKOUT-001 (existing — stale) |
| AC10 | Given an admin on `/dashboard/orders/express/create-order`, When they select "Pickup" or "Delivery", Then customer info fields (name, phone) appear and are required before submission.                          | REQ-ORDMGT-009 (new — proposed)     |
| AC11 | Given an admin closing a tab via `AdminTabCheckoutForm`, When they select a payment method and submit, Then `expressCloseTabAction` is called with the manual payment type — no Monnify gateway URL is returned. | REQ-TABMGT-003 (existing)           |

> **SRS-ID column populated by the `requirements-aligner` skill** at Stage 1 plan APPROVAL.

## SRS items proposed/touched

| AC   | SRS item                          | Status                | Notes                                                                                                                   |
| ---- | --------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| AC1  | REQ-CHECKOUT-010 (new — proposed) | stub                  | Guest checkout banner UX — "Continue as Guest" visible when unauthenticated                                             |
| AC2  | REQ-AUTHC-003 (existing)          | unchanged             | Guest checkout (no PIN) — exact match                                                                                   |
| AC3  | REQ-CHECKOUT-001 (existing)       | stale — update needed | Source references `checkout-form.tsx` → renamed to `customer-checkout-form.tsx`; admin options removed                  |
| AC4  | REQ-ORDMGT-009 (new — proposed)   | stub                  | Express order type selector with conditional pickup/delivery fields                                                     |
| AC5  | REQ-ORDMGT-009 (new — proposed)   | stub                  | Same as AC4 — delivery address fields                                                                                   |
| AC6  | REQ-ORDMGT-010 (new — proposed)   | stub                  | Express order totals via SettingsService.calculateOrderTotals                                                           |
| AC7  | REQ-TABMGT-003 (existing)         | stale — update needed | Source references `admin-pay-tab-dialog` → now `AdminTabCheckoutForm` full page; no Monnify redirect                    |
| AC8  | REQ-ORDMGT-004 (existing)         | stale — update needed | Price override removed from `createOrder` (`payment-actions.ts:129`); admin concern moves to `expressCreateOrderAction` |
| AC9  | REQ-CHECKOUT-001 (existing)       | stale — update needed | Same as AC3 — no `isAdmin` branching in customer checkout                                                               |
| AC10 | REQ-ORDMGT-009 (new — proposed)   | stub                  | Same as AC4 — customer info fields for pickup/delivery                                                                  |
| AC11 | REQ-TABMGT-003 (existing)         | unchanged             | Admin pay tab with method + independent tip — exact match for manual close                                              |

## 2. Scope

- **In scope:**
  - `components/features/checkout/checkout-form.tsx` → rename to `customer-checkout-form.tsx` (strip admin logic, add guest banner)
  - `components/features/checkout/payment-method-step.tsx` (remove admin props)
  - `app/actions/payment/payment-actions.ts` `createOrder` (remove price override validation)
  - `app/actions/admin/express-actions.ts` `expressCreateOrderAction` (accept orderType, customerInfo, deliveryInfo, pickupTime, use SettingsService.calculateOrderTotals)
  - `app/dashboard/orders/express/create-order/page.tsx` (add order type selector, conditional fields)
  - `app/dashboard/orders/tabs/[tabId]/checkout/page.tsx` (render AdminTabCheckoutForm)
  - New: `components/features/checkout/admin-tab-checkout-form.tsx`
  - `app/checkout/page.tsx` (import update)
  - `components/features/checkout/index.ts` (barrel export update)

- **Out of scope:**
  - Monnify payment gateway integration changes
  - OrderService.createOrder method signature changes
  - Tab model schema changes
  - Financial report calculations
  - Customer tab checkout (`/orders/tabs/[tabId]/checkout`) — already uses Monnify, unchanged

### Surface inventory

| Surface               | URL / file                                                                                        | Status                                            |
| --------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Customer checkout     | `/checkout` — `components/features/checkout/customer-checkout-form.tsx`                           | In scope                                          |
| Express create order  | `/dashboard/orders/express/create-order` — `app/dashboard/orders/express/create-order/page.tsx`   | In scope                                          |
| Admin tab checkout    | `/dashboard/orders/tabs/[tabId]/checkout` — `app/dashboard/orders/tabs/[tabId]/checkout/page.tsx` | In scope                                          |
| Payment method step   | `components/features/checkout/payment-method-step.tsx`                                            | In scope                                          |
| Customer tab checkout | `/orders/tabs/[tabId]/checkout` — `app/(customer)/orders/tabs/[tabId]/checkout/page.tsx`          | Already works — uses Monnify, unchanged           |
| Order service         | `services/order-service.ts` `createOrder`                                                         | Already works — no signature change               |
| Settings service      | `services/settings-service.ts` `calculateOrderTotals`                                             | Already works — called by extended express action |

## 3. Architecture decisions

> _Populated by the `adr-author` skill at Stage 1 plan APPROVAL._

**No ADR needed** — Refactor separating existing checkout logic into two distinct components (customer vs admin). No new dependencies, no new database/cache/queue, no new external services. Pattern change is limited to removing admin branches from a shared component and extending an existing admin-only action with additional parameters. The architectural boundary between customer (Monnify) and admin (manual payment) already exists in the codebase; this REQ enforces it rather than creating it.

## 4. Threat model + security considerations

> _Closes ISO 27001 A.8.25 — secure development life cycle_

| Threat                                                       | Likelihood | Impact | Mitigation                                                                                                                                                        |
| ------------------------------------------------------------ | ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Customer checkout accidentally exposes admin payment options | Low        | Medium | Remove all admin branching from customer component; `PaymentMethodStep` only renders Monnify options                                                              |
| Price override logic remains accessible to non-admin users   | Low        | High   | Remove price override validation from `createOrder` server action entirely; admin price overrides move to `expressCreateOrderAction` which requires admin session |
| Admin tab checkout bypasses payment recording                | Low        | High   | `AdminTabCheckoutForm` calls `expressCloseTabAction` which requires admin session and records payment via `TabService.completeTabPaymentManually`                 |
| Delivery address PII exposed via express order creation      | Low        | Medium | Admin-only route protected by `requireAdminSession`; delivery info stored in order document, same as customer checkout                                            |

**Secrets / credentials:** No new secrets handled. Existing Monnify credentials and session secrets unchanged.

**Dependencies introduced:** None.

### Risk register entries

This REQ opens the following entries in `compliance/risk-register.md`:

- **R-006 — Admin payment options leak into customer checkout after path separation** — Status: OPEN. Opened by `risk-register-keeper`. Operator edits the canonical row + signs off the residual rating before plan APPROVAL.
- **R-007 — Price override logic remains accessible to non-admin users after removal from createOrder** — Status: OPEN. Opened by `risk-register-keeper`. Operator edits the canonical row + signs off the residual rating before plan APPROVAL.

## 5. Data protection (GDPR Art. 25)

**Personal data processed by this REQ:** Yes — customer name, email, phone, and delivery address are captured in the extended express create-order flow.

- **Categories of data subjects:** Customers (walk-in, pickup, delivery)
- **Categories of personal data:** Name, email, phone number, delivery address (street, city, state, country, postal code, landmark)
- **Special categories (Art. 9):** None
- **Lawful basis:** Art. 6(1)(b) — contract performance (order fulfilment)
- **Purpose limitation:** Data used solely for order processing and delivery; same fields as existing customer checkout flow
- **Data minimisation:** Email optional for pickup/delivery (only name + phone required); no new fields beyond what customer checkout already collects
- **Retention:** Same as existing order retention — orders are retained per existing business policy
- **Cross-references:**
  - Is the ROPA (`compliance/governance/ropa.md`) updated? No — no new data categories introduced, same data as existing checkout
  - Is a DPIA required? No — no new processing of personal data, just extending admin order creation to use existing fields
- **Cross-border transfers:** None — data stays in MongoDB on Railway (same region as existing)

## 6. AI / model considerations (EU AI Act Art. 11)

**AI / ML in scope for this REQ:** No.

N/A — this REQ does not introduce or change AI behaviour. It is a UI/server-action refactor separating checkout paths and extending admin order creation with existing order types.

## 7. Rollback plan

- **Reversible via:** `git revert` of the implementation commit(s)
- **Data implications of rollback:** None — no schema changes, no migrations. Orders created with pickup/delivery types via express flow remain valid; the old `checkout-form.tsx` is restored from git history.
- **Notification path if rollback during a release:** Notify via Slack #engineering channel; the revert PR triggers Railway auto-deploy.

## 8. Verification

- **Unit + integration tests:** Unit tests verifying `expressCreateOrderAction` accepts `orderType`, `customerInfo`, `deliveryInfo`, `pickupTime` params and calls `SettingsService.calculateOrderTotals` with the correct order type. Unit test verifying `createOrder` no longer contains price override validation.
- **E2E coverage:** E2E specs for: (1) guest checkout banner visibility, (2) admin express order type selector with pickup fields, (3) admin express order type selector with delivery fields, (4) admin tab checkout renders manual payment form. Delegated to `e2e-test-engineer` skill.
- **Manual smoke after deploy:** Verify on UAT — customer checkout works anonymously, admin express create order supports all 4 order types, admin tab checkout shows manual payment options.
- **Monitoring / alerting:** No new monitoring needed — existing order creation and payment flows are unchanged in their downstream effects.

## 9. Sign-off

- **Plan reviewer (eng):** TBD
- **Plan reviewer (security / DPO):** N/A — GDPR section is non-trivial but no new data categories; threat model is low-likelihood mitigations
- **Plan approved by operator:** TBD

## Upload path

This file lives at `compliance/plans/REQ-084/implementation-plan.md` and is uploaded automatically on the next push to `develop` via `compliance-evidence.yml`. The portal's framework-coverage matrix flips ISO 29119 §3.4, ISO 27001 A.8.25, GDPR Art. 25, and EU AI Act Art. 11 to COVERED for this REQ once the upload lands.

Verify the upload at `https://devaudit.metasession.co/projects/wgb/releases/REQ-084` — the "Evidence by requirement" list should show this plan tagged with `category=planning`.
