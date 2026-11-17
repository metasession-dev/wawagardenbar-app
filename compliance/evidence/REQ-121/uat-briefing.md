# UAT Briefing — REQ-121: One-page customer checkout and staff notifications (bundle WA-06 + WA-12)

**Release:** REQ-121 (with co-tracked REQ-122)
**Risk:** HIGH
**Prepared:** 2026-11-17
**Build under test:** to be filled in by the operator when UAT starts (git SHA of the UAT deploy)

## 1. Background

Wawa Garden Bar is a restaurant and bar with a website where customers order food and drink for dine-in, pickup or delivery, and a staff dashboard where staff manage orders and support messages. This release does two things: it turns the customer checkout into one simple page, and it gives staff alerts that are hard to miss when a new order or support message arrives.

## 2. What changed, and what did not

**Changed:**

- The checkout is one page. It asks only what the order type needs. It no longer asks for email, phone or a payment method; a first name is asked only if the account has none. The tip is chosen on the same page and is part of the amount charged.
- When the shop is closed, Pickup and Delivery cannot be paid; Dine-in still can.
- Staff get a bell with a live count, a toast and a sound for each paid customer order and each support message, a Needs-attention panel, an On shift switch, and a My account page where they verify their own WhatsApp number to receive alerts.
- If nobody acknowledges an alert in time, WhatsApp messages go to on-shift staff and then to an escalation role (timing is checked by automated tests, not in this UAT).

**Did not change (do not report as defects):**

- The payment gateway, the kitchen display, order statuses and how staff create orders and tabs.
- Opening hours, minimum order and delivery rules (REQ-120 server rules).
- Customer WhatsApp ordering and support replies.

## 3. Scope

| In scope                                                                                                                                                                                | Out of scope                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The one-page checkout, tip, saved address, closed-hours block; the staff bell, panel, On shift switch, alert number verification, alert rules form, and the staff-number WhatsApp reply | Payment on the gateway's own page, the WhatsApp template approval by Meta (an operator task), booking and refund alerts (later releases), escalation timing |

**Known limits:** a payment page may fail to open on UAT depending on gateway test settings; use the gateway test card or ask the operator to confirm the payment. WhatsApp messages to staff stay unsent until Meta approves the `staff_alert` template.

## 4. Environment

| Item             | Value                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------- |
| URL              | https://wawagardenbar-uat.ostendo.io                                                         |
| Environment name | UAT                                                                                          |
| Browser / device | A current desktop browser (Chrome or Edge) and a phone for the WhatsApp steps                |
| Data state       | The UAT menu is loaded. Orders and alerts created during UAT are test data and safe to leave |

## 5. Accounts and prerequisites

| Role               | Account                                                             | What it can do              | How credentials are delivered                                       |
| ------------------ | ------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------- |
| Customer           | A phone number the tester controls, signed in with the WhatsApp PIN | Order and pay               | The tester uses their own WhatsApp number; no password is shared    |
| Customer (no name) | An account with no first name saved                                 | Step 3                      | Prepared by the operator                                            |
| Staff (CSR)        | A CSR account on UAT                                                | Dashboard, bell, My account | Given to the tester by the operator out of band; never in this file |
| Admin              | An admin account on UAT                                             | Settings, Staff alerts      | As above                                                            |

**Prerequisites the operator completes first** (initial each in the execution record): this build is deployed to UAT; business hours include the time of testing; a minimum order is set (step 9); the CSR account has no verified alert number; the tester has a WhatsApp number that is not a customer account (steps 15 to 18).

## 6. Tester rules

- Follow `uat-test-procedure.md` step by step. Do not improvise unless a step says to.
- Record what actually happened, not what you expected. A step that does not behave exactly as written is a FAIL.
- Take the screenshot named in the step. Use the file name given.
- If a step marked "stop if fails" fails, stop and tell the operator.
- Do not change data outside the accounts listed above. Put the settings you change (steps 10 and 17) back.
- The tester must not be the person who wrote the change (see the independence declaration in the execution record).

## 7. Entry and exit criteria

**Entry (all true before starting):** the build under test is deployed to the environment above; the operator preparation checklist in the execution record is initialled; the tester has the accounts above.

**Exit:** every step has a recorded result; every FAIL or BLOCKED has a defect entry; the recommendation and both signatures in the execution record are filled in.

## 8. Glossary

| Term            | Meaning                                                                               |
| --------------- | ------------------------------------------------------------------------------------- |
| Bell            | The notification icon in the dashboard top bar, with a count of unacknowledged alerts |
| Acknowledge     | Marking an alert as seen; opening the linked order does it automatically              |
| On shift        | A staff member who has switched on that they are working now                          |
| Escalation      | The next WhatsApp message to a more senior role when an alert stays unacknowledged    |
| Needs attention | A dashboard panel listing alerts nobody has acknowledged yet                          |
