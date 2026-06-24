# REQ-084 — Test Scope

## Requirement

Separate customer and admin checkout paths; extend Express Create Order to support pickup/delivery.

## Risk Classification

MEDIUM — user-facing checkout flow, multiple file changes, admin/customer path separation, touches payment-adjacent logic. AI involvement raises risk by one level per SDLC rules.

## Acceptance Criteria

| AC # | Description                                                                                                                                                                               | Verification Method                                                 |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| AC1  | Given an unauthenticated customer on `/checkout`, When they view the checkout form, Then a "Continue as Guest" banner is visible with a link to sign in.                                  | E2E: banner element present for unauthenticated users               |
| AC2  | Given an unauthenticated customer on `/checkout`, When they complete the form and submit, Then the order is created successfully without auth.                                            | E2E: guest checkout submission creates order                        |
| AC3  | Given any user on `/checkout`, When they view the payment method step, Then only Monnify gateway options are shown — no manual cash/transfer/card.                                        | E2E: only CARD/TRANSFER/USSD/PHONE_NUMBER options visible           |
| AC4  | Given an admin on express create-order, When they select "Pickup", Then a pickup time field appears and is required.                                                                      | E2E: pickup time field visible and validated                        |
| AC5  | Given an admin on express create-order, When they select "Delivery", Then delivery address fields appear and are required.                                                                | E2E: address fields visible and validated                           |
| AC6  | Given an admin creating a delivery order via express, When submitted, Then `SettingsService.calculateOrderTotals` is called with `orderType='delivery'`.                                  | Unit: verify calculateOrderTotals called with correct orderType     |
| AC7  | Given an admin on `/dashboard/orders/tabs/[tabId]/checkout`, When they view the page, Then `AdminTabCheckoutForm` renders with manual payment — no redirect.                              | E2E: no redirect to `/orders/tabs/{id}/checkout`                    |
| AC8  | Given `createOrder` in `payment-actions.ts`, When searching for price override logic, Then no `isAdmin`/`priceOverridden`/`hasOverrides` branching found.                                 | Unit: grep/assert no admin price override in createOrder            |
| AC9  | Given `customer-checkout-form.tsx`, When searching for `isAdmin`, Then no admin branching logic is found.                                                                                 | Unit: grep/assert no isAdmin in customer checkout component         |
| AC10 | Given an admin on express create-order selecting Pickup/Delivery, When they view the form, Then customer info fields (name, phone) appear and required.                                   | E2E: customer info fields visible and validated                     |
| AC11 | Given an admin closing a tab via `AdminTabCheckoutForm`, When they submit, Then `expressCloseTabAction` is called with manual payment — no Monnify URL.                                   | E2E: no Monnify checkout URL returned; tab closed successfully      |
| AC12 | Given an unauthenticated user on `/menu`, When they add an item to cart and navigate to `/checkout`, Then they are not redirected to login and the "Continue as Guest" banner is visible. | E2E: anonymous menu → add to cart → checkout without login redirect |

## Out of Scope

- Monnify payment gateway changes
- OrderService.createOrder method signature changes
- Tab model schema changes
- Financial report calculations
- Customer tab checkout (`/orders/tabs/[tabId]/checkout`) — unchanged
