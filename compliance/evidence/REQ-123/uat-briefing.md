# UAT Briefing — REQ-123: Paystack payment at checkout and the paid-only kitchen gate

**Release:** REQ-123
**Risk:** HIGH
**Prepared:** 2026-11-19
**Build under test:** to be filled in by the operator when UAT starts (git SHA of the build deployed to UAT)

## 1. Background

Wawa Garden Bar is a restaurant and bar with a website where customers order food and drinks for dine-in, pickup or delivery. Staff take orders in a dashboard and a kitchen display shows what to prepare. The business decided that every customer order is paid at checkout through Paystack, and that an order reaches the kitchen only after Paystack confirms the payment.

## 2. What changed, and what did not

**Changed:**

- A customer order is paid through Paystack's hosted checkout; pressing Pay again for the same unpaid order opens the same checkout link.
- Paystack's payment confirmation marks the order paid and confirmed, shows it in the kitchen once, and sends the customer an order confirmation and a receipt on WhatsApp (when WhatsApp templates are approved).
- Unpaid customer orders no longer appear on the kitchen display or in the live orders list; they appear under a new "Awaiting payment" view on the Orders page.
- A customer order still unpaid after 5 minutes gets one WhatsApp payment-link message; after 30 minutes it is cancelled.

**Did not change (do not report as defects):**

- Orders created by staff (express orders, tab orders, counter payments) still reach the kitchen immediately and are paid later.
- Refunds and cancellation by the customer (a later release), order status messages after confirmation (a later release), and starting an order from WhatsApp (a later release).

## 3. Scope

| In scope                                                                                                                                                                | Out of scope                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Paying a customer order through Paystack; the paid-only kitchen display and orders list; the Awaiting payment view; the abandoned-payment link and the 30-minute expiry | Refunds, customer cancellation, status messages, WhatsApp ordering |

**Known limits:** the three WhatsApp templates (`order_confirmation`, `receipt`, `payment_link`) were submitted to Meta on 2026-11-19 and may still be pending; until a template is approved the message is not sent and the step that checks it is marked BLOCKED, not failed. Payments use Paystack's test mode on UAT: no real money moves.

## 4. Environment

| Item             | Value                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------- |
| URL              | https://wawagardenbar-uat.ostendo.io                                                    |
| Environment name | UAT                                                                                     |
| Browser / device | Chrome, desktop and one phone-width window                                              |
| Data state       | UAT test menu and test accounts; orders created during UAT are safe to cancel or delete |

## 5. Accounts and prerequisites

| Role               | Account                                                 | What it can do                                                           | How credentials are delivered                                                   |
| ------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Customer           | A UAT customer phone number that receives WhatsApp PINs | Browse, sign in with a WhatsApp PIN, check out and pay                   | Out of band, from the operator                                                  |
| csr / admin        | A UAT staff account                                     | Create orders in the dashboard, view the kitchen display and Orders page | Out of band, from the operator                                                  |
| Paystack test card | Paystack's published test card                          | Completes a test payment                                                 | Paystack's test card details are public; the operator confirms the current ones |

**Prerequisites the operator completes first** (initial each in the execution record): the build is deployed to UAT; the UAT Paystack test keys are set and the Paystack webhook URL points at `https://wawagardenbar-uat.ostendo.io/api/webhooks/paystack`; the customer and staff accounts exist; the template approval status for `order_confirmation`, `receipt` and `payment_link` on the UAT WhatsApp account is noted.

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

| Term                         | Meaning                                                                    |
| ---------------------------- | -------------------------------------------------------------------------- |
| Paystack                     | The online payment provider that takes the customer's card or bank payment |
| Kitchen display              | The full-screen page the kitchen uses to see orders to prepare             |
| Awaiting payment             | The Orders page view that lists customer orders not yet paid               |
| Order confirmation / receipt | The two WhatsApp messages sent to the customer after payment               |
