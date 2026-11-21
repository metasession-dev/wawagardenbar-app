---
execution_mode: agent_executed
executed_by: Claude Code (claude-sonnet-5-5), sdlc-implementer
tested_sha: bba621e9a7e06d37aa39eb6a652c8dcc07c6d8e1
---

# UAT Execution Record — REQ-123: Paystack payment at checkout and the paid-only kitchen gate

## Header

| Item                       | Value                                                                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Release                    | REQ-123                                                                                                                                                                                                                   |
| Execution mode             | Agent-executed, with human review. A human (the operator) paid on Paystack and photographed the WhatsApp messages, because Cloudflare blocks the card form for a headless browser.                                        |
| Build under test (git SHA) | `bba621e9` (develop after #1063). Steps 1 to 9 first ran on earlier builds (`688251c8`, then `6d3e8e59`); step 7 was re-run on `bba621e9` after defect D2 was fixed. Steps 1 to 6, 8 and 9 were not re-run on `bba621e9`. |
| Environment / URL          | UAT, https://wawagardenbar-uat.ostendo.io                                                                                                                                                                                 |
| Executed by                | Claude Code (claude-sonnet-5-5), driven by `sdlc-implementer`                                                                                                                                                             |
| Reviewed by                | REPLACE (independent human reviewer; not the author)                                                                                                                                                                      |
| Started                    | 2026-11-19                                                                                                                                                                                                                |
| Finished                   | 2026-11-21 (step 7 retest 10:24 UTC)                                                                                                                                                                                      |

**Independence declaration** (required when `approval.mode` is `dual_actor`). For an agent-executed run the human reviewer signs:
I did not write, review or approve the change under test. Name: REPLACE &nbsp; Date: REPLACE

## Operator preparation (initial each before the run starts)

| Item                                            | Done | Initials |
| ----------------------------------------------- | ---- | -------- |
| Migrations applied to the environment           | [ ]  | REPLACE  |
| Test accounts created as listed in the briefing | [ ]  | REPLACE  |
| Test data loaded                                | [ ]  | REPLACE  |

## Actions taken by the agent (agent-executed runs only)

| When       | Action                                                                                                                                             | Account  |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 2026-11-19 | Signed in and placed unpaid dine-in orders (tables T-UAT1 to T-UAT4) through the checkout form in a headless browser; stopped at the Paystack page | Customer |
| 2026-11-19 | Signed in to the dashboard and opened Kitchen display, Orders and Awaiting payment; created one express order                                      | csr      |
| 2026-11-20 | Read `orders` and `notificationlogs` in the UAT database through a temporary port-forward, read-only, to check order state and message rows        | n/a      |
| 2026-11-21 | Created one fresh dine-in order (T-UAT4) for the step 7 retest and gave the operator its Paystack link                                             | Customer |

The operator paid each order on Paystack (test card) and photographed the phone.

## Results

Evidence files are under `compliance/evidence/REQ-123/uat/`.

| Step | Actual result                                                                                                                                                                                                                                                    | PASS / FAIL / BLOCKED                                                                      | Evidence file                                                                                                                           | Defect         |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 1    | Pay opened a Paystack checkout page for the order total                                                                                                                                                                                                          | PASS                                                                                       | REQ-123-AC1-checkout-before-pay.png, REQ-123-AC1-paystack-checkout.png                                                                  |                |
| 2    | Not runnable as written: the order page has no Pay button for this order. The same-link behaviour is covered by e2e US-A2.13 and a unit test. The screenshot shows the checkout link as it was reused.                                                           | NOT RUN as written                                                                         | REQ-123-AC2-same-checkout-link.png                                                                                                      | D4 (procedure) |
| 3    | The unpaid order was not on the Kitchen display and not in Live orders; it was listed under Awaiting payment                                                                                                                                                     | PASS                                                                                       | REQ-123-AC5-unpaid-not-in-kitchen.png, REQ-123-AC5-unpaid-not-in-kitchen-kitchen-display.png, REQ-123-AC5-unpaid-not-in-live-orders.png |                |
| 4    | The express order was on the Kitchen display at once                                                                                                                                                                                                             | PASS                                                                                       | REQ-123-AC5-express-order-form.png, REQ-123-AC5-express-order-created.png, REQ-123-AC5-staff-order-in-kitchen.png                       |                |
| 5    | After the test card payment the order page showed "Order Confirmed!" and the order was paid                                                                                                                                                                      | PASS                                                                                       | REQ-123-AC4-order-confirmed.png                                                                                                         |                |
| 6    | The paid order appeared once on the Kitchen display. The Live orders and "no longer under Awaiting payment" checks have no valid screenshot: the two captures were of the dashboard hub and were removed.                                                        | PASS for the Kitchen display; PARTIAL for Live orders and Awaiting payment (no screenshot) | REQ-123-AC4-paid-in-kitchen.png                                                                                                         |                |
| 7    | Two WhatsApp messages arrived: the order confirmation (order number and total) and the receipt (items, total, paid via, points, View receipt button). Retest on `bba621e9`: the View receipt button opened the order page (the first run gave a 404, defect D2). | PASS (retest after fix)                                                                    | REQ-123-AC4-whatsapp-messages.jpeg, REQ-123-AC4-receipt-link-order-page.jpeg                                                            | D2             |
| 8    | One payment-link message arrived about 5 minutes after the unpaid order, with a Pay now button for the same Paystack checkout; no second message followed. Evidence is the `notificationlogs` rows, not a phone screenshot.                                      | PASS (no screenshot)                                                                       | none; query of `notificationlogs` on 2026-11-20                                                                                         |                |
| 9    | After 31 minutes the unpaid order was cancelled (`payment_timeout`), was not on the Kitchen display, and no customer message was sent. Evidence is the database record, not a screenshot.                                                                        | PASS (no screenshot)                                                                       | none; query of `orders` and `notificationlogs` on 2026-11-20                                                                            |                |

## Deviations

- Step 2 could not be run as written (see D4).
- The operator paid on Paystack and took the WhatsApp photographs. The agent could not pay: Cloudflare blocks the card form for a headless browser.
- The templates were still pending at the first run of step 7; they were approved on 2026-11-20 and the step was run afterwards.
- Steps 8 and 9 have no screenshots (the operator had none to supply). Their evidence is the database record.
- Steps 1 to 6, 8 and 9 ran on earlier builds. Only step 7 was re-run on the final build `bba621e9`.

## Defect log

| Defect | Step | Severity | Description                                                                                                                                                                                                                         | Reference                      |
| ------ | ---- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| D1     | 7    | major    | Meta error 132001 (template pending or missing) failed the message and did not hold it. Fixed by mapping 132001 to `TEMPLATE_NOT_FOUND` so unapproved templates are held.                                                           | PR #1061 (merged)              |
| D2     | 7    | major    | The receipt's View receipt button took the order number, but `/orders/{id}` looks the order up by database id, so the link gave a 404. Fixed: the button takes the order id. Retested on `bba621e9`: the link opens the order page. | PR #1063 (merged)              |
| D3     | n/a  | minor    | An intermittent failure of the REQ-120 customer order journey in CI (`customer-order-journey.spec.ts:132`) passed on a later attempt; cause not found. The failing runs left no artifacts.                                          | Not filed; noted for follow-up |
| D4     | 2    | minor    | The procedure's step 2 assumes a Pay button on the order page; there is none for this order. Procedure wording, not a product defect.                                                                                               | Procedure to be corrected      |

## Summary

| Passed | Failed | Blocked | Total steps |
| ------ | ------ | ------- | ----------- |
| 8      | 0      | 0       | 9           |

8 steps passed (1, 3, 4, 5, 6, 7, 8, 9), none failed, none blocked, and step 2 was not run as written (it is counted in the 9 and in none of the three columns). Step 6 passes on the Kitchen display and has no screenshot for Live orders or Awaiting payment. Steps 8 and 9 have no screenshot.

**AC coverage**

| AC  | Steps   | Result                                                                                                     |
| --- | ------- | ---------------------------------------------------------------------------------------------------------- |
| AC1 | 1       | Pass                                                                                                       |
| AC2 | 2       | Not run as written; covered by e2e US-A2.13 and unit tests                                                 |
| AC3 | 5       | Pass for the paid path; signature, replay, mismatch and unknown reference covered by the critical e2e spec |
| AC4 | 5, 6, 7 | Pass                                                                                                       |
| AC5 | 3, 4, 6 | Pass (Live orders and Awaiting payment after payment: no screenshot)                                       |
| AC6 | 9       | Pass (no screenshot)                                                                                       |
| AC7 | 8       | Pass (no screenshot)                                                                                       |
| AC8 | 7       | Pass: all three templates approved on UAT and production (see `template-submissions.md`)                   |
| AC9 | n/a     | Covered by `paystack-refund-capability.md`                                                                 |

**Recommendation:** [ ] Approve &nbsp; [x] Approve with noted defects &nbsp; [ ] Reject (agent recommendation; the reviewer decides)

**Reviewer decision** (agent-executed runs): [ ] The agent's results are accepted &nbsp; [ ] A manual re-run is required (the release waits; the re-run gets its own record with `execution_mode: manual`)

## Sign-off

| Role                                                        | Name | Date |
| ----------------------------------------------------------- | ---- | ---- |
| Tester (manual run) or agent executor                       |      |      |
| Reviewer (agent-executed run; write "n/a" for a manual run) |      |      |
| Operator                                                    |      |      |
