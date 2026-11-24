# UAT Briefing — REQ-124: Order status notifications, tracking link and serving check

**Release:** REQ-124
**Risk:** HIGH
**Prepared:** 2026-11-22
**Build under test:** to be filled in when UAT starts (git SHA of the build deployed to UAT)

## 1. Background

Wawa Garden Bar is a restaurant and bar with a website where customers order food and drinks for dine-in, pickup or delivery. Staff use a dashboard to move each order through its stages, and a kitchen display shows what to prepare. Until now customers heard nothing after paying, the page that shows an order's progress could be opened by anyone who guessed the order number, and the kitchen display did not make it obvious whose order a drink was for.

## 2. What changed, and what did not

**Changed:**

- When staff set a customer's order to Preparing, Ready, Out for delivery or Delivered, the customer gets one WhatsApp message with the new status and a "Track order" button. Each status is sent once per order. Setting an order to Completed sends nothing.
- A delivery order can now be moved Ready, Out for delivery, Delivered, Completed from the order card and the order page. These two new steps are offered only for delivery orders. The Active tab keeps the order until it is Completed.
- The order progress page opens only for the signed-in owner, or from the "Track order" link in the message (a signed link that lasts 30 days). Anyone else sees "page not found".
- The kitchen display, the dashboard order card and the order queue show a large label such as `Table 7 · Ada`, `Pickup · Ada` or `Delivery · Ada`. The kitchen display shows a first name only: no phone number, email or full name. A delivery order also shows its address and delivery instructions on the kitchen card.

**Did not change (do not report as defects):**

- Orders created by staff (express orders, tab orders) never send a customer message.
- The status messages for payment (order confirmation, receipt, payment link) from the previous release.
- The Confirmed status is set automatically when payment succeeds; staff do not set it.

## 3. Scope

| In scope                                                                                                             | Out of scope                                                         |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Status messages and the Track order link; delivery steps; owner-or-link access to the order page; serving label; delivery details on the kitchen card | Refunds, customer cancellation, ordering from WhatsApp, WhatsApp retention |

**Known limits:** the WhatsApp template `order_status_update_v2` was submitted to Meta on 2026-11-21 and may still be pending approval on UAT. Until it is approved, a status message sent outside the 24-hour reply window is not delivered and is logged as held; steps that need the message are marked BLOCKED, not failed. Payments use Paystack's test mode: no real money moves.

## 4. Environment

| Item             | Value                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------- |
| URL              | https://wawagardenbar-uat.ostendo.io                                                    |
| Environment name | UAT                                                                                     |
| Browser / device | Chrome, desktop plus one phone (for WhatsApp) and one private (incognito) window        |
| Data state       | UAT test menu and test accounts; orders created during UAT are safe to cancel or delete |

## 5. Accounts and prerequisites

| Role               | Account                                                                 | What it can do                                                    | How credentials are delivered                                          |
| ------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Customer           | A UAT customer phone number that receives WhatsApp messages             | Sign in, place and pay for an order, open the order page          | Out of band, from the operator                                         |
| csr / admin        | A UAT staff account                                                     | Change order status on the dashboard; open the kitchen display    | Out of band, from the operator                                         |
| Second customer    | A different UAT customer account                                        | Used to prove another customer cannot open the first one's order  | Out of band, from the operator                                         |
| Paystack test card | Paystack's published test card                                          | Completes a test payment                                          | Public; the operator confirms the current details                      |

**Prerequisites the operator completes first** (initial each in the execution record): the build is deployed to UAT; `ORDER_TRACKING_SECRET` is set on UAT (32 or more characters); the customer and staff accounts exist; the status of `order_status_update_v2` on the UAT WhatsApp account is noted.

## 6. Tester rules

- Follow `uat-test-procedure.md` step by step. Do not improvise unless a step says to.
- Record what actually happened, not what you expected. A step that does not behave exactly as written is a FAIL.
- Take the screenshot named in the step. Use the file name given.
- If a step marked "stop if fails" fails, stop and tell the operator.
- Do not change data outside the accounts listed above.
- The tester must not be the person who wrote the change (see the independence declaration in the execution record).

## 7. Entry and exit criteria

**Entry (all true before starting):** the build under test is deployed to the environment above; the operator preparation checklist in the execution record is initialled; the tester has the accounts above.

**Exit:** every step has a recorded result; every FAIL or BLOCKED has a defect entry; the recommendation and both signatures in the execution record are filled in.

## 8. Glossary

| Term                | Meaning                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------- |
| Track order link    | The button in the WhatsApp message; it opens the order page without signing in, for 30 days   |
| Serving label       | The large `Table 7 · Ada` / `Pickup · Ada` / `Delivery · Ada` line on an order                |
| Kitchen display     | The full-screen page the kitchen uses to see orders to prepare                                |
| 24-hour window      | WhatsApp allows a free-text reply for 24 hours after the customer last wrote to the bar        |
