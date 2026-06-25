# REQ-085 — Test Scope

## Requirement

Tab payment must not reset order fulfillment status. Closing a tab (manually or via gateway) must only update payment-related fields on associated orders, not `status`. UI surfaces must clearly distinguish kitchen/fulfillment status from payment status.

## Risk Classification

HIGH — touches payment processing logic, affects kitchen display flow, and can cause double inventory deductions. AI involvement raises risk by one level per SDLC rules.

## Acceptance Criteria

| AC # | Description                                                                                                                                                                                                                        | Verification Method                                                                  |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| AC1  | Given a tab with orders in various statuses (pending, completed, preparing), When an admin closes the tab with manual payment, Then all orders retain their original `status` field — no reset to `confirmed`.                     | E2E: insert orders with mixed statuses, close tab via UI, assert DB status unchanged |
| AC2  | Given a tab paid via Monnify gateway (`markTabPaid`), When the webhook confirms payment, Then associated orders' `status` is NOT set to `confirmed` — only `paymentStatus`, `paidAt`, `paymentMethod`, `businessDate` are updated. | Unit: verify `markTabPaid` `$set` does not contain `status`                          |
| AC3  | Given a completed order on a tab, When the tab is closed with payment, Then the order does NOT reappear on the kitchen display (no status reset to active).                                                                        | E2E: AC1 test includes a `completed` order; verify it does not reappear              |
| AC4  | Given an order details page (`/dashboard/orders/[orderId]`), When viewed, Then two labeled badges are shown: "Kitchen: `<status>`" and "Payment: `<paymentStatus>`".                                                               | E2E: navigate to order details, assert both labeled badges visible                   |
| AC5  | Given the order queue (`/dashboard/orders`), When an order card is displayed, Then a payment status badge is shown alongside the kitchen status badge.                                                                             | E2E: navigate to orders page, assert payment badge visible                           |
| AC6  | Given the kitchen display (`/dashboard/kitchen-display`), When an order card is displayed, Then a payment status indicator (CheckCircle icon + "Paid"/"Pending") is visible.                                                       | E2E: navigate to kitchen display, assert payment indicator visible                   |
| AC7  | Given the customer orders page (`/orders`), When order cards are displayed, Then "Kitchen:" and "Payment:" labels are shown on the respective badges.                                                                              | Manual: verify labeled badges on customer orders page (same pattern as AC4/AC5)      |
| AC8  | Given existing tab payment E2E tests (close-tab-tip-capture, partial-payments, reconciliation), When run after the fix, Then all existing tests continue to pass — no regressions.                                                 | E2E: run existing tab payment specs, verify all pass                                 |

## Out of Scope

- Monnify payment gateway integration changes
- Tab creation or order creation flow changes
- Inventory deduction logic changes (the fix prevents the bug that causes double deductions, but the deduction logic itself is unchanged)
- Customer-facing checkout flow changes
