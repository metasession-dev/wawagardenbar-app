---
title: 'Implementation plan — REQ-120'
requirement_id: 'REQ-120'
risk_class: 'HIGH'
change_type: 'feat'
authored_by: 'sdlc-implementer (Claude) for operator'
authored_at: '2026-11-10'
---

# Implementation plan — REQ-120

Issue: #967 (WA-05, tracker #953). Solo release, no bundle. Depends on WA-04 (REQ-117, released): every customer session now carries a verified `userId`.

Risk **HIGH**: it rewrites the order-creation money path (totals, fees, order numbers) behind one service, closes the public API's trust of client totals (a financial-integrity and authorization boundary), removes customer capabilities (tabs) with server-side enforcement, adds an API-key-to-user binding, and migrates existing order documents. It does not touch payment capture (WA-07) or checkout layout (WA-06).

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

Closes ISO 29119 §3.4 (§1), ISO 27001 A.8.25 (§5), GDPR Art. 25 (§6), EU AI Act Art. 11 (§7).

## 1. Goal + acceptance criteria

- **Goal:** Every customer order, from the web checkout, the WhatsApp link (WA-09) or the public API, is created by one service that enforces the same rules on the server. Customers cannot create, join or add to tabs. Staff order and tab creation is unchanged.

| AC  | Description (Given / When / Then)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | **Given** any customer entry point (web `createOrder`, `POST /api/public/orders`, later WhatsApp), **Then** it creates the order through `createCustomerOrder(input, ctx)` in `services/customer-order-service.ts`, with `ctx = { userId, channel: 'web' \| 'whatsapp_link' \| 'public_api' }`; guest fields, `pay-now` and `tabId` are rejected.                                                                                                                                                                                                                     |
| AC2 | **Given** a customer order request, **Then** the server reconciles lines (prices, availability, portions, customisations), checks order type enabled, business hours, minimum order and `maxOrdersPerHour`, per-type fields (dine-in table, pickup time default = next open slot, delivery address within `deliveryRadius`), computes totals itself (fees plus tip) and ignores client totals, and fails with the typed errors `OUT_OF_HOURS`, `BELOW_MINIMUM`, `ITEM_UNAVAILABLE`, `OUT_OF_RADIUS`, `ORDER_TYPE_DISABLED`, `RATE_LIMITED` without creating an order. |
| AC3 | **Given** the same `idempotencyKey` twice on any customer entry point, **Then** exactly one order exists and the second call returns it; a missing key is rejected.                                                                                                                                                                                                                                                                                                                                                                                                   |
| AC4 | **Given** any new order, **Then** its number comes from the single `generateOrderNumber()` (`WG` + 10 digits, atomic counter); the `WGB` timestamp format is gone.                                                                                                                                                                                                                                                                                                                                                                                                    |
| AC5 | **Given** any order created after release, **Then** `origin` (`customer` \| `staff`) and `channel` are recorded; **Given** existing orders, **When** `scripts/migrate-order-origin.ts` runs (repeatedly), **Then** `createdByRole: customer` orders get `origin: customer`, the rest `staff`; idempotent, with dry run; the app works before, during and after the migration.                                                                                                                                                                                         |
| AC6 | **Given** a customer session or customer API key, **When** it calls `createTabAction`, `getOpenTabForUserAction`, `getOpenTabForTableAction`, `prepareTabForCheckoutAction`, a public tab write, or sends a `tabId` or `useTab`, **Then** the server rejects it; the checkout shows no tab options; `/orders/tabs` and the customer tab links are gone; staff tab flows (Express, `/dashboard/orders/tabs`, staff-key API) behave as before.                                                                                                                          |
| AC7 | **Given** a read-only `getOrderingOptionsAction`, **Then** it returns enabled order types, today's hours, pickup slots, delivery fee rule, minimum order and radius, with no staff data.                                                                                                                                                                                                                                                                                                                                                                              |
| AC8 | **Given** `POST /api/public/orders`, **Then** a customer-role key must be bound to a `userId` (new `ApiKey.userId`) and goes through `createCustomerOrder` with channel `public_api`; a staff-role key keeps the existing staff path (tabs, `pay-now`) and stamps `origin: staff`; a key with neither is refused for order writes.                                                                                                                                                                                                                                    |

## SRS items proposed/touched

| AC                 | SRS item                                                  | Status        | Notes                                                                                  |
| ------------------ | --------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------- |
| AC1, AC2, AC3, AC4 | REQ-CHECKOUT-012 (new)                                    | stub          | single customer order service: validation, typed errors, idempotency, one order number |
| AC1, AC3           | REQ-CHECKOUT-007, REQ-CHECKOUT-008 (existing)             | update        | create and idempotency now via the service                                             |
| AC6                | REQ-CHECKOUT-005, REQ-ORDER-003, REQ-ORDER-004 (existing) | retire/update | customer tab options and customer-side tab pages removed                               |
| AC6                | REQ-TABMGT-011 (new)                                      | stub          | tabs are staff-only on every server entry point                                        |
| AC5                | REQ-ORDMGT-019 (new)                                      | stub          | order `origin` and `channel` and their migration                                       |
| AC7                | REQ-CHECKOUT-013 (new)                                    | stub          | ordering options exposed read-only                                                     |
| AC8                | REQ-API-007 (new)                                         | stub          | customer-scoped keys bound to a user; server totals on the public order endpoint       |

## 2. Scope

In scope: the new service, `origin`/`channel` on orders and their migration, the single order-number generator, `createOrder` as a wrapper, the public orders endpoint, API-key `userId` binding, removal of customer tabs (UI and server), `getOrderingOptionsAction`, tests. Out of scope: checkout page layout (WA-06), payment capture and the paid-only kitchen gate (WA-07), WhatsApp ordering (WA-09), any change to staff order or tab creation.

### Surface inventory

| Surface                                                                              | Change                                                                      |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `services/customer-order-service.ts` (new)                                           | `createCustomerOrder`, typed error codes, `maxOrdersPerHour` count          |
| `services/order-service.ts`                                                          | `generateOrderNumber()` made public; staff paths set `origin: 'staff'`      |
| `models/order-model.ts`, `interfaces/order.interface.ts`                             | `origin`, `channel`                                                         |
| `app/actions/payment/payment-actions.ts`                                             | `createOrder` becomes a thin wrapper (channel `web`); staff session refused |
| `app/api/public/orders/route.ts`                                                     | customer key goes through the service; staff key keeps the staff path       |
| `models/api-key-model.ts`, `interfaces/api-key.interface.ts`, key-creation UI/action | `userId` on customer keys                                                   |
| `app/actions/tabs/tab-actions.ts`, `app/api/public/tabs/**`                          | customer-reachable actions require a staff role; staff-key for writes       |
| `components/features/checkout/tab-options-step.tsx`, `customer-checkout-form.tsx`    | tab step and `useTab` branch deleted                                        |
| `app/(customer)/orders/tabs/**`, `app/(customer)/orders/page.tsx`                    | pages and tab links removed                                                 |
| `app/actions/ordering/ordering-options-actions.ts` (new)                             | `getOrderingOptionsAction`                                                  |
| `services/whatsapp-inbound-service.ts`                                               | order-number regex checked (format unchanged: `WG` + 10 digits)             |
| `scripts/migrate-order-origin.ts` (new)                                              | idempotent migration with dry run                                           |

Issue-text note: staff using the old customer checkout path no longer exists (REQ-084 split them), so refusing staff sessions in the web wrapper removes no working flow.

### Design (what makes this safe)

1. **One service, thin callers.** Behaviour lives only in `createCustomerOrder`; web action and API route translate input and map typed errors.
2. **Server is the only source of money.** Totals come from `reconcileAndValidateOrderLines` + `SettingsService.calculateOrderTotals`; client `subtotal/tax/total` fields are ignored and never stored.
3. **Fail closed for customers, unchanged for staff.** Tab and `pay-now` rejection is by role and by field on the server; staff code paths are not edited beyond stamping `origin`.
4. **Deploy order is irrelevant.** `origin` has a default of `staff` in the schema, readers treat a missing `origin` as unknown, and the migration is idempotent. Rollback is a revert; extra fields are ignored by old code.

## 3. Architecture decisions

- **ADR-010 — One customer order service as the only customer order-creation path** — Proposed by `adr-author`. Draft at `docs/ADR/ADR-010-single-customer-order-service.md`. Operator edits and flips status to _Accepted_ at plan approval.

Decisions for the operator at plan approval:

- **D1: Public API order writes.** Recommendation: customer-role key bound to a `userId` goes through the service; staff-role keys keep today's staff path (tabs, `pay-now`, existing integrations unaffected); keys with no role are refused for order writes. Alternative: customer-only endpoint, moving staff API order creation elsewhere (breaking for any staff integration).
- **D2: Legacy open customer tabs.** Customers with an open tab today lose the page. Recommendation: no data change; staff settle them from `/dashboard/orders/tabs` as they do for any tab. Alternative: a one-off list of open customer-created tabs for staff before release.
- **D3: `maxOrdersPerHour`.** Counts all customer-origin orders in the last 60 minutes (a shop-wide capacity cap, as the issue says). Recommendation: treat `0`/unset as unlimited so a default setting never blocks ordering.
- **D4: Existing `WGB` order numbers.** Left as they are; only new orders use the single format.

## 4. E2E test coverage

New critical specs, authored through `e2e-test-engineer`: `e2e/critical/customer-order-validation.spec.ts` (US-A2.6 to A2.9, AC2, AC3) and `e2e/critical/customer-cannot-use-tabs.spec.ts` (US-B2.4, AC6). Unit: `__tests__/services/customer-order-service.test.ts` (US-A2.10, AC2, AC4, AC5, AC8) plus tab-action role tests. Regression proof, unchanged: `e2e/critical/csr-order-tab-parity-req109.spec.ts` (US-B2.1), `close-tab-tip-capture`, `partial-payments`, `write-off-tab`, and the existing checkout specs touched by the removed tab step (updated through `e2e-test-engineer`, not by this skill).

### Test data requirements

Settings control for hours, minimum and radius per test (restored afterwards); a customer user with a saved session (WA-04 helpers `e2e/helpers/customer-auth.ts`); a staff session for the unchanged tab flow; a customer API key bound to a user for the API tests. Seeding via `e2e-test-data`.

## Plan deviation (recorded during Phase 2, 2026-11-10)

Implementation deviations (approach changed; ACs still correct):

1. **Business hours apply to pickup and delivery only.** Dine-in stays exempt, as REQ-061 decided (the customer is already at the bar). The issue text lists `isWithinBusinessHours` without this carve-out; the existing rule was kept so late dine-in orders are not blocked. Operator to confirm.
2. **Customer line prices are rebuilt from the menu.** The old reconcile step trusted the `price` on each selected customization from the client. The service now looks every selected option up on the menu and uses that price (and rejects an option marked unavailable). This closes a tamper path the issue did not name.
3. **Cost snapshots on web orders.** Web orders now go through `OrderService.createOrder`, so they carry cost, profit and operational-cost snapshots like every other order (the old web path wrote none), and the estimated wait comes from the queue rather than a fixed 30/45/20 minutes.
4. **Tab reads are staff-only on the public API too**, and the customer role no longer gets `tabs:read` by default. The issue asks for writes only; a customer key that can list every tab leaks other customers' data, which breaks the two-processes rule.
5. **`createOrderAction` removed.** `app/actions/order/order-actions.ts` held a third, unused customer creation path (guest fields, client totals). Nothing imported it.
6. **Customer tab payment is staff-only.** `initializeTabPayment` (payment-actions) refuses non-staff, and its customer redirect URL is gone.
7. **Test support.** `SettingsService` reads uncached when `ENABLE_E2E_PIN_INTERCEPT=true` (the existing e2e flag) so e2e can set hours, minimum and radius in Mongo. `customer-order-validation` runs as its own chained Playwright project (`AGGREGATE_SPECS`) because it changes shop-wide settings.
8. **`maxOrdersPerHour` is configurable in Dashboard → Settings → Order configuration** (it already was, but the form could not store 0 and showed 20 for it). The schema and form now accept 0 meaning no limit; the default for a new settings document stays 20. It now caps customer orders shop-wide per rolling hour. Operator sets the production value before release.
9. **Checkout offers only the enabled order types** (found in UAT step 10). The Order Details step always listed Dine In, Pickup and Delivery; the server refused a disabled type only after Proceed to Payment. The step now reads `getOrderingOptionsAction` and hides a disabled type, and moves the selection to an enabled one. The server rule is unchanged. Covered by `e2e/critical/customer-ordering-options-ui.spec.ts`.

Requirements deviation: none.

## 5. Threat model + security considerations

| Threat (STRIDE)                                              | Surface                            | Mitigation                                                                                             |
| ------------------------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Tampering: client sends low totals or prices                 | public orders endpoint, web action | server recomputes everything; client totals ignored; unit test US-A2.10                                |
| Elevation: customer creates or joins a tab, or sends `tabId` | tab actions, API, order input      | role check on each action, field rejection in the service, staff-key scope on API writes; negative e2e |
| Elevation: staff-only `pay-now` via customer path            | service                            | order types limited to dine-in, pickup, delivery                                                       |
| Spoofing: API key used for another customer                  | `ApiKey.userId`                    | customer keys must be bound; order `userId` comes from the key, never the body                         |
| Repudiation: orders of unknown origin                        | order model                        | `origin` and `channel` on every order                                                                  |
| Denial of service: order flooding                            | service                            | `maxOrdersPerHour`, existing API rate limit                                                            |
| Tampering: migration mislabels orders                        | migration                          | idempotent, dry run, only sets missing `origin`, before/after counts as evidence                       |
| Information disclosure: ordering options leak staff data     | `getOrderingOptionsAction`         | read-only, public settings fields only                                                                 |

### Risk register entries

- **R-056 — Order money path rewritten behind one service** — OPEN; residual low × high until validation and e2e tests pass.
- **R-057 — Customer tab removal leaves legacy open tabs** — OPEN; medium × low (staff settle them; decision D2).
- **R-058 — API-key binding breaks existing integrations or mis-attributes orders** — OPEN; medium × medium until integrations are identified.
- **R-059 — Order origin migration mislabels orders** — OPEN; low × low (idempotent, dry run, default).

Opened by `risk-register-keeper`; the operator signs off the residual ratings at plan approval.

## 6. Data protection (GDPR Art. 25)

No new personal data. Guest name, email and phone fields on new orders are no longer written (data minimisation); existing guest orders are untouched and keep their retention. `ApiKey.userId` links a key to an existing customer record.

## 7. AI / model considerations (EU AI Act Art. 11)

No AI in scope. Implementation is drafted with Claude Code (disclosed on every commit); no model runs in the product.

## 8. Rollback plan

Revert the merge. `origin`, `channel` and `ApiKey.userId` are additive and ignored by old code. Orders created by the new service are ordinary orders. The removed customer tab pages return with the revert; no tab data was changed. The migration only adds `origin`.

## 9. Verification

Unit and integration tests per the AC table; the two critical e2e specs plus the unchanged staff tab regression specs; `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`; migration dry run then real run on UAT with counts recorded; live UAT check by the operator (place a customer order on the web, attempt out-of-hours/below-minimum, confirm no tab options).

## 10. Operator tasks (non-code)

1. Confirm D1 to D4 (Section 3) and the plan at the HIGH-risk checkpoint.
2. Sign off the new risk entries and the ADR at plan approval.
3. Existing public-API integrations that create customer orders need a customer-role key bound to a user (or a staff-role key); tell their owners before release.
4. After the UAT deploy: run `scripts/migrate-order-origin.ts --dry-run`, then for real; repeat on production after release.
5. A UAT reviewer other than the operator (`dual_actor`) records UAT; a person approves Production.

## 11. Sign-off

- **Plan approved by operator:** approved 2026-11-10 (HIGH-risk checkpoint). The operator replied `PROCEED` with no amendments, recorded as acceptance of the recommended options for D1 to D4, ADR-010, the SRS stubs and risks R-056 to R-059.
