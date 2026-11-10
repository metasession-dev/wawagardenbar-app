# UAT Briefing — REQ-120: One customer order service; tabs are staff-only

**Release:** REQ-120
**Risk:** HIGH
**Prepared:** 2026-11-10
**Build under test:** to be filled in by the operator when UAT starts (git SHA of the UAT deploy)

## 1. Background

Wawa Garden Bar is a restaurant and bar with a website where customers order food and drink for dine-in, pickup or delivery, and a staff dashboard where staff take and manage orders. This change makes every customer order go through one set of server rules (opening hours, minimum order, delivery distance, hourly capacity) and makes tabs (a running bill) something only staff can open or use.

## 2. What changed, and what did not

**Changed:**

- A customer checkout is now four steps: Customer Info, Order Details, Tip, Payment. There is no "Payment Options" step with tab choices.
- Pickup and delivery orders are refused outside opening hours, below the minimum order, and (delivery) beyond the delivery radius, with a clear message.
- Placing the same order twice (for example a double click) creates one order.
- The Orders page for a customer lists orders only; the old tab pages no longer exist.
- New orders get a number in the form `WG` followed by 10 digits.

**Did not change (do not report as defects):**

- Staff creating orders and tabs in the dashboard (Express create order, Tabs) works as before.
- Payment, the kitchen display and order status updates.
- Dine-in orders are still accepted outside opening hours (the customer is already at the bar).
- Old orders keep their old numbers (`WGB…`).

## 3. Scope

| In scope                                                                                                                                                                             | Out of scope                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Customer checkout steps and messages; customer Orders page; refusal of out-of-hours, below-minimum and out-of-radius orders; duplicate-submit protection; staff tab flow still works | Payment gateway behaviour, WhatsApp ordering, order tracking pages, refunds, the one-page checkout layout (a later release) |

**Known limits:** the shop-wide hourly cap (default 20 customer orders per hour) now applies; a payment page may fail to open on UAT depending on gateway test settings, which is not part of this change.

## 4. Environment

| Item             | Value                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------ |
| URL              | https://wawagardenbar-uat.ostendo.io                                                       |
| Environment name | UAT                                                                                        |
| Browser / device | A current desktop browser (Chrome or Edge) and, for step 4, a phone-sized window           |
| Data state       | The UAT menu is loaded. Orders and tabs created during UAT are test data and safe to leave |

## 5. Accounts and prerequisites

| Role              | Account                                                             | What it can do                 | How credentials are delivered                                       |
| ----------------- | ------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------- |
| Customer          | A phone number the tester controls, signed in with the WhatsApp PIN | Browse, order, view own orders | The tester uses their own WhatsApp number; no password is shared    |
| Customer (second) | A second number, or the same number after signing out               | Duplicate-order check          | As above                                                            |
| Staff (CSR)       | `e2e-csr` style CSR account on UAT                                  | Dashboard orders and tabs      | Given to the tester by the operator out of band; never in this file |

**Prerequisites the operator completes first** (initial each in the execution record): the REQ-120 build is deployed to UAT; the order-origin migration dry run and `--apply` have been run on UAT; a CSR account exists; business hours in Settings include the time of testing for steps that expect an open shop.

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

| Term            | Meaning                                                                                       |
| --------------- | --------------------------------------------------------------------------------------------- |
| Tab             | A running bill for a table that staff open and settle later. Customers can no longer use tabs |
| Business hours  | The opening hours set in Settings; pickup and delivery orders are only accepted inside them   |
| Minimum order   | The smallest basket value (in naira) the shop accepts                                         |
| Delivery radius | How far from the bar, in km, the shop delivers                                                |
| Idempotency     | Submitting the same order twice creates it once                                               |
