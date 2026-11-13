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

## Re-test (2026-11-12, UAT build `b921ce9`)

Reported by the tester after PR #1030 deployed.

| Step | Re-test result                                                                                                                                                                                             | PASS / FAIL |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 7    | Every day closed: Pickup shows a date-time input and is refused at Proceed to Payment, as Delivery was in the first run. Dine-in is accepted while closed by design (REQ-061, the customer is at the bar). | PASS        |
| 10   | With only Dine In enabled, only Dine In is offered on Order Details. Enabling all three offers all three.                                                                                                  | PASS        |

## Deviations

Anything done differently from the procedure, and why. Write "None" if there were none.

1. **Step 4 and 5:** the payment gateway was unavailable on UAT, which the procedure anticipates. The order was created with Payment: Pending.
2. **Step 7:** the tester set every day to closed with all order types enabled, and tried Dine-in, Pickup and Delivery in turn. The procedure only asked for Pickup.
3. **Step 8:** the first attempt accepted a UK address because `GOOGLE_MAPS_API_KEY` was not set on UAT, so the radius check was skipped (it is designed to skip when the address cannot be geocoded). The key was added, the delivery radius and bar address were set under Settings, and the step was repeated. The recorded result is from the repeat.
4. **Step 10:** the tester first marked this PASSED because the server refused the disabled type at Proceed to Payment, then changed it to FAILED because the Order Details step still offered all three types. The procedure expects only enabled types to be offered.
5. **Settings changed during the run** (business hours, enabled order types, delivery radius). After the run the tester restored the business hours. On 2026-11-12 the operator set UAT to: Dine In, Pickup and Delivery enabled, delivery radius 5 km, Max orders per hour 20 (unchanged). Verified by reading the settings document.

## Defect log

| Defect | Step | Severity (blocker / major / minor) | Description                                                                                                                                                                                                                                                                     | Reference                                                                                                                                   |
| ------ | ---- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| D-1    | 10   | major                              | With only Dine-in enabled in Settings, the Order Details step still offered Pickup and Delivery. The server refused the disabled type only at Proceed to Payment ("pickup orders are disabled"). No order was created, but the customer is offered options that cannot be used. | Closed. Fixed in PR #1030 (merged, deployed to UAT build `b921ce9`). Re-tested by the tester on UAT: only the enabled order type is offered |
| D-2    | 7    | none                               | With every day closed, Pickup showed a preferred-time control with nothing selectable. Re-check by the tester on UAT: with every day closed, Pickup shows a date-time input (the designed fallback when there are no slots) and Proceed to Payment is refused.                  | Closed: not a defect                                                                                                                        |
| D-3    | 7    | minor (by design)                  | A Dine-in order is accepted while the shop is closed and carries no indication that it was placed outside opening hours. Dine-in is exempt from the opening-hours check (REQ-061: the customer is at the bar). Pickup and Delivery are refused ("we open 9:00 Saturday").       | Not a defect against the acceptance criteria; the operator decides whether to flag after-hours dine-in orders in a follow-up                |
| D-4    | 4, 5 | minor                              | When payment initialisation fails the order is created as Payment: Pending but the cart is not cleared. Existing behaviour, not introduced by REQ-120.                                                                                                                          | Follow-up issue #1031                                                                                                                       |

## Summary

| Passed | Failed | Blocked | Total steps |
| ------ | ------ | ------- | ----------- |
| 8      | 2      | 0       | 10          |

First run: passed steps 1, 2, 3, 4, 5, 6, 8, 9; failed steps 7 and 10. After the re-test above, steps 7 and 10 pass: **10 passed, 0 failed, 0 blocked**.

**AC coverage**

| AC                               | Steps      | Result                          |
| -------------------------------- | ---------- | ------------------------------- |
| AC6 (tabs are staff-only)        | 1, 2, 3, 9 | PASS                            |
| AC1 (single customer order path) | 4          | PASS                            |
| AC3 (one order per attempt)      | 5          | PASS                            |
| AC2 (settings-driven rules)      | 6, 7, 8    | PASS (step 7 after re-test)     |
| AC7 (ordering options)           | 10         | PASS (after re-test, D-1 fixed) |

**Recommendation:** [ ] Approve &nbsp; [x] Approve with noted defects &nbsp; [ ] Reject

## Sign-off

| Role     | Name             | Date       |
| -------- | ---------------- | ---------- |
| Tester   | WILLIAM THOMPSON | 12/11/2026 |
| Operator | METASESSION DEV  | 12/11/2026 |
