# UAT Briefing — REQ-125: Admin switches for WhatsApp notifications (bundle with REQ-126 and REQ-127)

**Release:** REQ-125 (core of a declared bundle; REQ-126 and REQ-127 are co-tracked, one UAT for all three)
**Risk:** MEDIUM
**Prepared:** 2026-11-25
**Build under test:** filled in when UAT starts (git SHA of the deployed build)

## 1. Background

Wawa Garden Bar is a restaurant and bar. Customers order and pay on the website and sign in with a PIN sent on WhatsApp. The business also uses WhatsApp for order updates, payment reminders, support replies, bookings and alerts to staff. This bundle gives admins switches for those WhatsApp messages, makes the word "order" on WhatsApp return the menu link, makes an order-status question on WhatsApp raise an urgent ticket for staff, and fixes checkout so a failed payment start leaves one Pending order.

## 2. What changed, and what did not

**Changed:**

- Settings page has a new "WhatsApp messages" section: a master switch and one switch per message group, each with what it is for, why it matters and what happens if it is off. The sign-in PIN is shown as locked on.
- Switching off order status updates, payment reminders, staff alerts or account recovery asks for confirmation first.
- A switched-off message is not sent; the action that triggered it (for example a status change) still works.
- A customer who texts "order" (or "menu", "food", "drink") gets a reply with the menu link.
- A customer who texts "status", "where is my order" or an order number gets a short acknowledgement and staff get an urgent ticket titled "Order status enquiry". No order details are sent by text.
- Checkout: after a failed payment start the cart is kept, there is exactly one Pending order, a retry with the same cart reuses it, and a changed cart replaces it.

**Did not change (do not report as defects):**

- Sign-in PIN delivery (always on). Paystack payment itself. Staff-created orders and tabs.
- Messages a customer receives for replying to their own text (STOP/START confirmations, the order link, the acknowledgement) are not switchable.
- The customer's own consent (STOP) is unchanged.

## 3. Scope

| In scope                                                              | Out of scope                                                       |
| --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Settings, WhatsApp messages section and its confirmation dialogs      | Per-customer message preferences                                   |
| Suppressed messages not arriving; the triggering action still working | Booking messages and refund messages (not built yet)               |
| "order" and "status" texts, in the order-link and ticket behaviour    | Starting or placing an order inside WhatsApp (dropped by decision) |
| Checkout retry after a failed payment start                           | Paystack's own pages                                               |

**Known limits:** WhatsApp templates must be approved on the UAT account for template messages to arrive (otherwise mark that step BLOCKED). Steps 15 to 17 need the payment gateway to fail, which is an operator preparation item.

## 4. Environment

| Item             | Value                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| URL              | https://wawagardenbar-uat.ostendo.io                                                                           |
| Environment name | UAT                                                                                                            |
| Browser / device | A current desktop browser; a phone with WhatsApp for the customer steps                                        |
| Data state       | Menu items exist; test customers and staff accounts below are safe to change; do not change real customer data |

## 5. Accounts and prerequisites

| Role       | Account                               | What it can do                                                     | How credentials are delivered                                |
| ---------- | ------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------ |
| Admin      | the UAT admin account                 | Open Settings, use the switches, mark orders ready                 | Out of band, by the operator                                 |
| csr        | the UAT csr account                   | Open Support, Orders and the Kitchen display; cannot open Settings | Out of band, by the operator                                 |
| Customer A | a test customer with a WhatsApp phone | Order, receive messages                                            | The tester's own WhatsApp number, registered by the operator |
| Customer B | a second test customer                | A second customer for the "another customer's order" step          | The operator provides a second WhatsApp number               |

**Prerequisites the operator completes first** (initial each in the execution record): the build under test deployed to UAT; the test accounts above created; for steps 15 to 17, the UAT payment gateway set to fail (for example an invalid Paystack key) and set back afterwards.

## 6. Tester rules

- Follow `uat-test-procedure.md` step by step. Do not improvise unless a step says to.
- Record what actually happened, not what you expected. A step that does not behave exactly as written is a FAIL.
- Take the screenshot named in the step. Use the file name given.
- If a step marked "stop if fails" fails, stop and tell the operator.
- Do not change data outside the accounts listed above. Put every switch back on at the end (step 9).
- The tester must not be the person who wrote the change (see the independence declaration in the execution record).

## 7. Entry and exit criteria

**Entry (all true before starting):** the build under test is deployed to the environment above; the operator preparation checklist in the execution record is initialled; the tester has the accounts above.

**Exit:** every step has a recorded result; every FAIL or BLOCKED has a defect entry; the recommendation and both signatures in the execution record are filled in.

## 8. Glossary

| Term          | Meaning                                                                           |
| ------------- | --------------------------------------------------------------------------------- |
| Switch        | A toggle in Settings that turns one group of WhatsApp messages on or off          |
| Master switch | The toggle that turns every switchable WhatsApp message off at once               |
| Locked        | A message that cannot be switched off (the sign-in PIN)                           |
| Pending order | An order that has been created but not yet paid                                   |
| Urgent ticket | A support ticket at the top of the Support queue with a 15 minute response target |
