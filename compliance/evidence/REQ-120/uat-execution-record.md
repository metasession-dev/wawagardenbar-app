# UAT Execution Record — REQ-120: One customer order service; tabs are staff-only

## Header

| Item                       | Value                                     |
| -------------------------- | ----------------------------------------- |
| Release                    | REQ-120                                   |
| Build under test (git SHA) | REPLACE                                   |
| Environment / URL          | UAT, https://wawagardenbar-uat.ostendo.io |
| Tester                     | REPLACE                                   |
| Started                    | REPLACE                                   |
| Finished                   | REPLACE                                   |

**Tester independence declaration** (required when `approval.mode` is `dual_actor`):
I did not write, review or approve the change under test. Tester: REPLACE &nbsp; Date: REPLACE

## Operator preparation (initial each before the tester starts)

| Item                                            | Done | Initials |
| ----------------------------------------------- | ---- | -------- |
| Migrations applied to the environment           | [X]  | WT       |
| Test accounts created as listed in the briefing | [X]  | WT       |
| Test data loaded                                | [X]  | WT       |

## Results

| Step | Actual result                                                                                                                                                                                                                                                                                                                                                                                                                                                | PASS / FAIL / BLOCKED | Evidence file | Defect |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- | ------------- | ------ |
| 1    | There is no "Payment Options" step and no "New Tab", "Existing Tab" or "Pay Now" choice                                                                                                                                                                                                                                                                                                                                                                      | PASS                  |               |        |
| 2    | The page title is "My Orders". Only order cards are shown. No "Tab", "View Tab Details" or "Pay & Close Tab" appears                                                                                                                                                                                                                                                                                                                                         | PASS                  |               |        |
| 3    | A "page not found" (404) page is shown                                                                                                                                                                                                                                                                                                                                                                                                                       | PASS                  |               |        |
| 4    | An order is created (the payment page opens, or "Payment Initialization Failed" if the gateway is unavailable on UAT, in which case the order still appears under /orders with Payment: Pending). The order number starts with WG followed by 10 digits. In UAT the payment gatway failed It was observed that the menu items remained in the shopping cart while at the same time the order was created with payment pending. this can be an followup issue | PASS                  |               |        |
| 5    | Exactly one new order exists for this attempt. same thing happened with orders created and menu items remained in the shopping cart. this can be a followup issue                                                                                                                                                                                                                                                                                            | PASS                  |               |        |
| 6    | The order is refused with a message that states the minimum order amount. No new order appears under /orders                                                                                                                                                                                                                                                                                                                                                 | PASS                  |               |        |
| 7    | there is a message on the order details page stating "we are closed right now " with the option to schedule for opening", I am able to complete the order which appears in the orders but there is no indication that the order was made during closing hours and the order creation process was not blocked. Does the "schedule for opening" option do anything?                                                                                            | FAILED                |               |        |
| 8    | UK address was used and order was created. I dont think the address/delivery/mapping options have been implemented. What is there to support the delivery process and which services are available.                                                                                                                                                                                                                                                          | FAILED                |               |        |
| 9    | The tab opens and the order is added ("Order Added to Tab"). Staff tab flow works as before                                                                                                                                                                                                                                                                                                                                                                  | PASSED                |               |        |
| 10   | 2 order types enabled in Settings BUT 3 are offered, the pickup times fall inside opening hours                                                                                                                                                                                                                                                                                                                                                              | FAILED                |               |        |

## Deviations

Anything done differently from the procedure, and why. Write "None" if there were none.

## Defect log

| Defect | Step | Severity (blocker / major / minor) | Description | Reference |
| ------ | ---- | ---------------------------------- | ----------- | --------- |
|        |      |                                    |             |           |

## Summary

| Passed | Failed | Blocked | Total steps |
| ------ | ------ | ------- | ----------- |
|        |        |         |             |

**AC coverage**

| AC  | Steps | Result |
| --- | ----- | ------ |
|     |       |        |

**Recommendation:** [ ] Approve &nbsp; [x] Approve with noted defects &nbsp; [ ] Reject

## Sign-off

| Role     | Name             | Date       |
| -------- | ---------------- | ---------- |
| Tester   | WILLIAM THOMPSON | 12/11/2026 |
| Operator | METASESSION DEV  | 12/11/2026 |
