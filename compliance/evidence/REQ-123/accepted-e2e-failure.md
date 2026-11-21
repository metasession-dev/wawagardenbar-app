# Accepted E2E failures — REQ-123

Specs that failed in the local `critical` run or intermittently on CI, classified as flakes, not caused by REQ-123, and carried into the release as accepted exceptions. Proposed by the agent; **the operator accepts or rejects each in the table below.** An unsigned row is not accepted.

| Spec / check                                                    | What was seen                                                                                                                                                                                                                    | Why it is not REQ-123                                                                                                              | Re-check                                                                      |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `requirements-verification` Rewards page tests (7)              | `waitForLoadState('networkidle')` timed out on the rewards page in the local production stack                                                                                                                                    | Page and code under test are not touched by REQ-123                                                                                | Release-PR `E2E Regression Suite` (#1060)                                     |
| `daily-report-business-date-selection` Last 7 Days picker       | Date-picker locator failure                                                                                                                                                                                                      | No payment, kitchen or order code involved                                                                                         | Release-PR `E2E Regression Suite` (#1060)                                     |
| `staff-notifications` US-B5.3 and the acknowledge test          | Fails with 4 workers (the spec counts a shared bell while other specs raise alerts); passes alone with one worker, which CI uses                                                                                                 | Test isolation under parallel workers, not application behaviour                                                                   | Release-PR `E2E Regression Suite` (#1060)                                     |
| `customer-order-journey` (aggregate), pickup and delivery cases | Failed twice on CI feature runs (no failure artifacts are uploaded by the generated workflow) and passed on a later attempt; locally the checkout showed "Table number is required" for the pickup case; the dine-in case passed | The REQ-123 change to `createOrder` only moved an emit. **Cause not found**; opening hours and a slow Paystack call were ruled out | Release-PR `E2E Regression Suite` (#1060); follow-up to be filed if it recurs |

## Operator decision

| Row                    | Accepted (yes/no) | Name | Date |
| ---------------------- | ----------------- | ---- | ---- |
| Rewards page tests     |                   |      |      |
| Last 7 Days picker     |                   |      |      |
| staff-notifications    |                   |      |      |
| customer-order-journey |                   |      |      |
