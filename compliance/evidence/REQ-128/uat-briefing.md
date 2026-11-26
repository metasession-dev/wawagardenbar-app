# UAT Briefing — REQ-128: Customer cancellation and Paystack refunds (WA-11)

**Release:** REQ-128
**Risk:** HIGH
**Prepared:** 2026-11-26
**Build under test:** filled in when UAT starts (git SHA)

## 1. Background

Wawa Garden Bar takes online orders on its website; customers pay at checkout through Paystack and sign in with a PIN sent on WhatsApp. Until now a paid order could not be cancelled and no money could be returned. This release lets a customer cancel a paid order before the kitchen starts, which refunds them automatically; after the kitchen starts, their request goes to a manager who decides. Managers and admins can also refund a paid order, fully or partly, from the order page.

## 2. What changed, and what did not

**Changed:**

- A signed-in customer sees a Cancel Order button on their own order page. Before preparation it cancels the order and refunds the full amount to the original payment; after preparation it sends a refund request to a manager.
- A customer can text "cancel" to the bar's WhatsApp number from the phone on their order and get the same result.
- A manager, admin or super-admin sees a Refund button on a paid order (full or partial amount, with a reason) and Approve / Reject buttons on a customer's refund request in the support queue.
- A new Refunds page in the dashboard shows refund totals by type and by approver.
- The customer gets a WhatsApp message when the order is cancelled and when the refund is processed.
- When a delivery order is set to Ready, the customer message no longer says "ready for pickup".

**Did not change (do not report as defects):**

- Orders created by staff, tab orders and cash or manual payments cannot be refunded here; the Refund button is not shown for them.
- A csr cannot refund or decide a request.
- Approving a refund request returns the money only; the order's status is not changed by it.
- Customer sign-in, checkout and the status messages for preparing, out for delivery and delivered.

## 3. Scope

| In scope                                                                                                                                                            | Out of scope                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Customer cancel (order page and WhatsApp), refund requests, staff refunds and approvals, the Refunds page, cancellation and refund messages, delivery Ready wording | Table and event booking, WhatsApp retention, tab and staff orders |

**Known limits:** refunds work only if refunds are enabled on the UAT Paystack account (operator confirms before the run). The WhatsApp templates `order_cancelled` and `refund_processed` were submitted to Meta on 2026-11-26 and may still be pending on UAT; until approved, a message sent outside the 24-hour reply window is held, not delivered (steps that need it say so).

## 4. Environment

| Item             | Value                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------- |
| URL              | https://wawagardenbar-uat.ostendo.io                                                     |
| Environment name | UAT                                                                                      |
| Browser / device | Chrome, desktop, plus one phone for WhatsApp                                             |
| Data state       | UAT test menu and test accounts; orders and refunds created during UAT are safe to leave |

## 5. Accounts and prerequisites

| Role     | Account                                                     | What it can do                                                             | How credentials are delivered                |
| -------- | ----------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------- |
| Customer | A UAT customer phone number that receives WhatsApp messages | Sign in, pay for an order, cancel it, text "cancel"                        | Out of band, from the operator (PIN relayed) |
| Manager  | A UAT staff account with the manager (or admin) role        | Refund an order, approve or reject a refund request, open the Refunds page | Out of band, from the operator               |
| csr      | A UAT staff account with only the csr role                  | Open orders and the support queue; cannot refund or decide                 | Out of band, from the operator               |

**Prerequisites the operator completes first** (initial each in the execution record): the build under test is deployed to UAT; refunds are enabled on the UAT Paystack account; the three accounts above exist; the UAT copies of `order_cancelled` and `refund_processed` are APPROVED (or the steps that need them are marked BLOCKED).

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

| Term           | Meaning                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------- |
| Refund request | A ticket in the support queue created when a customer cancels after preparation began       |
| Partial refund | Returning part of the order total; only a manager, admin or super-admin can do it           |
| Pending refund | Asked of Paystack, not yet confirmed; the order still shows as paid until Paystack confirms |
