# UAT Execution Record — REQ-120: One customer order service; tabs are staff-only

## Header

| Item                       | Value                                                                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Release                    | REQ-120                                                                                                                                                                      |
| Build under test (git SHA) | `ghcr.io/metasession-dev/wawagardenbar-app:develop` (UAT rollout 2026-11-12 15:58 UTC; `develop` head 035115d8c554e58cc8d332ebdc817097df02a90b when this record was drafted) |
| Environment / URL          | UAT, https://wawagardenbar-uat.ostendo.io                                                                                                                                    |
| Tester                     | William Thompson                                                                                                                                                             |
| Started                    | 2026-11-12                                                                                                                                                                   |
| Finished                   | 2026-11-12                                                                                                                                                                   |

**Tester independence declaration** (required when `approval.mode` is `dual_actor`):
I did not write, review or approve the change under test. Tester: William Thompson &nbsp; Date: 2026-11-12

## Operator preparation (initial each before the tester starts)

| Item                                            | Done | Initials |
| ----------------------------------------------- | ---- | -------- |
| Migrations applied to the environment           | [X]  | WT       |
| Test accounts created as listed in the briefing | [X]  | WT       |
| Test data loaded                                | [X]  | WT       |

## Results

| Step | Actual result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | PASS / FAIL / BLOCKED | Evidence file | Defect |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------- | ------ |
| 1    | There is no "Payment Options" step and no "New Tab", "Existing Tab" or "Pay Now" choice                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | PASS                  |               |        |
| 2    | The page title is "My Orders". Only order cards are shown. No "Tab", "View Tab Details" or "Pay & Close Tab" appears                                                                                                                                                                                                                                                                                                                                                                                                                                                        | PASS                  |               |        |
| 3    | A "page not found" (404) page is shown                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | PASS                  |               |        |
| 4    | An order is created (the payment page opens, or "Payment Initialization Failed" if the gateway is unavailable on UAT, in which case the order still appears under /orders with Payment: Pending). The order number starts with WG followed by 10 digits. In UAT the payment gatway failed It was observed that the menu items remained in the shopping cart while at the same time the order was created with payment pending. this can be an followup issue                                                                                                                | PASS                  |               |        |
| 5    | Exactly one new order exists for this attempt. same thing happened with orders created and menu items remained in the shopping cart. this can be a followup issue                                                                                                                                                                                                                                                                                                                                                                                                           | PASS                  |               |        |
| 6    | The order is refused with a message that states the minimum order amount. No new order appears under /orders                                                                                                                                                                                                                                                                                                                                                                                                                                                                | PASS                  |               |        |
| 7    | IN THE SETTING EVERYDAY IS SET TO CLOSED AND ALL ORDER TYPES ARE ENABLED., there is a message on the order details page stating "we are closed right now " with the option to schedule for opening", I am able to complete the dine in order which appears in the orders but there is no indication that the order was made during closing hours. a pickup order displays preferred pickup time dropdown but nothing is selectable, a delivery order allows me to enter my address but when i select proceed to payment i get a popup "order failed, we open 9:00 Saturday" | PASSED                |               |        |
| 8    | The order is refused with a message that the address is outside the delivery radius. No new order is created                                                                                                                                                                                                                                                                                                                                                                                                                                                                | PASSED                |               |        |
| 9    | The tab opens and the order is added ("Order Added to Tab"). Staff tab flow works as before                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | PASSED                |               |        |
| 10   | only dine in is enabled but all 3 are still visible and available to select on the order details page although the popup is displayed with the message "order failed, pickup orders are disabled" after selecting "proceed with payment on the payment page                                                                                                                                                                                                                                                                                                                 | FAILED                |               |        |

## Deviations

Anything done differently from the procedure, and why. Write "None" if there were none.

1. **Step 4 and 5:** the payment gateway was unavailable on UAT, which the procedure anticipates. The order was created with Payment: Pending.
2. **Step 7:** the tester set every day to closed with all order types enabled, and tried Dine-in, Pickup and Delivery in turn. The procedure only asked for Pickup.
3. **Step 8:** the first attempt accepted a UK address because `GOOGLE_MAPS_API_KEY` was not set on UAT, so the radius check was skipped (it is designed to skip when the address cannot be geocoded). The key was added, the delivery radius and bar address were set under Settings, and the step was repeated. The recorded result is from the repeat.
4. **Step 10:** the tester first marked this PASSED because the server refused the disabled type at Proceed to Payment, then changed it to FAILED because the Order Details step still offered all three types. The procedure expects only enabled types to be offered.
5. **Settings changed during the run** (business hours, enabled order types, delivery radius): the original values were not recorded in this record. The operator must confirm UAT settings are back to their intended values.

## Defect log

| Defect | Step | Severity (blocker / major / minor) | Description                                                                                                                                                                                                                                                                     | Reference                                                                                                                                                                 |
| ------ | ---- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-1    | 10   | major                              | With only Dine-in enabled in Settings, the Order Details step still offered Pickup and Delivery. The server refused the disabled type only at Proceed to Payment ("pickup orders are disabled"). No order was created, but the customer is offered options that cannot be used. | Fixed on branch `docs/REQ-120-uat-migration-record` (checkout reads `getOrderingOptionsAction`; spec `customer-ordering-options-ui`); to be re-tested on UAT after deploy |
| D-2    | 7    | minor                              | With every day closed, Pickup showed a preferred-time control with nothing selectable. The code returns no slots and should fall back to a date-time input, so this was not reproduced from the code; it needs a re-check.                                                      | Open, to be investigated; not a REQ-120 acceptance criterion                                                                                                              |
| D-3    | 7    | minor (by design)                  | A Dine-in order is accepted while the shop is closed and carries no indication that it was placed outside opening hours. Dine-in is exempt from the opening-hours check (REQ-061: the customer is at the bar). Pickup and Delivery are refused ("we open 9:00 Saturday").       | Not a defect against the acceptance criteria; the operator decides whether to flag after-hours dine-in orders in a follow-up                                              |
| D-4    | 4, 5 | minor                              | When payment initialisation fails the order is created as Payment: Pending but the cart is not cleared. Existing behaviour, not introduced by REQ-120.                                                                                                                          | Follow-up issue to be filed                                                                                                                                               |

## Summary

| Passed | Failed | Blocked | Total steps |
| ------ | ------ | ------- | ----------- |
| 8      | 2      | 0       | 10          |

Passed: steps 1, 2, 3, 4, 5, 6, 8, 9. Failed: steps 7 and 10.

**AC coverage**

| AC                               | Steps      | Result                                                                                             |
| -------------------------------- | ---------- | -------------------------------------------------------------------------------------------------- |
| AC6 (tabs are staff-only)        | 1, 2, 3, 9 | PASS                                                                                               |
| AC1 (single customer order path) | 4          | PASS                                                                                               |
| AC3 (one order per attempt)      | 5          | PASS                                                                                               |
| AC2 (settings-driven rules)      | 6, 7, 8    | PARTIAL: minimum order (6) and delivery radius (8) PASS; opening hours (7) FAILED, see D-2 and D-3 |
| AC7 (ordering options)           | 10         | FAIL, see D-1 (fixed on branch, to be re-tested)                                                   |

**Recommendation:** [ ] Approve &nbsp; [x] Approve with noted defects &nbsp; [ ] Reject

## Sign-off

| Role     | Name             | Date       |
| -------- | ---------------- | ---------- |
| Tester   | WILLIAM THOMPSON | 12/11/2026 |
| Operator | METASESSION DEV  | 12/11/2026 |
