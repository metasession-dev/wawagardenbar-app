---
execution_mode: agent_executed
executed_by: Claude Code (claude-sonnet-5-5)
tested_sha: 8a67f4a9ce5b2dee1b3a9ca18b162c9f1f55d10f
---

<!--
  UAT execution record for REQ-128. Satisfies ISO/IEC/IEEE 29119-3 test
  execution log, test incident report, test completion report and sign-off.
  The agent copies this file with the header filled; whoever executes
  uat-test-procedure.md completes it; it is committed before the release
  PR is merged. Uploaded as evidence type test_report.

  The front matter above is read by the portal and by CI. Keep it the first
  bytes of the file and keep the keys exactly:
    execution_mode: manual (a tester ran the steps by hand) or agent_executed
                    (the agent ran them under uat.mode: auto, a human reviewed)
    executed_by:    the tester's name, or the agent and its version
    tested_sha:     the git SHA of the build under test
  Write the mode of the run that actually happened, not the value of
  uat.mode. Fill in every placeholder when UAT starts.
-->

# UAT Execution Record — REQ-128: Customer cancellation and Paystack refunds (WA-11)

## Header

| Item                       | Value                                      |
| -------------------------- | ------------------------------------------ |
| Release                    | REQ-128                                    |
| Execution mode             | agent-executed, with human review          |
| Build under test (git SHA) | 8a67f4a9ce5b2dee1b3a9ca18b162c9f1f55d10f   |
| Environment / URL          | UAT, https://wawagardenbar-uat.ostendo.io  |
| Executed by                | Claude Code (claude-sonnet-5-5)            |
| Reviewed by                | Pending: the human reviewer completes this |
| Started                    | 2026-11-26                                 |
| Finished                   | 2026-11-26                                 |

**Independence declaration** (required when `approval.mode` is `dual_actor`). For a manual run the tester signs; for an agent-executed run the human reviewer signs:
I did not write, review or approve the change under test. Name: REPLACE &nbsp; Date: REPLACE

## Operator preparation (initial each before the run starts)

| Item                                            | Done | Initials                                                                                 |
| ----------------------------------------------- | ---- | ---------------------------------------------------------------------------------------- |
| Migrations applied to the environment           | [x]  | operator (confirmed "initialled" in the session, 2026-11-26)                             |
| Test accounts created as listed in the briefing | [x]  | operator (same confirmation)                                                             |
| Test data loaded                                | [x]  | operator (same confirmation; refunds also confirmed enabled on the UAT Paystack account) |

## Actions taken by the agent (agent-executed runs only; write "None" or "n/a" otherwise)

Every action the agent performed beyond the procedure's steps (a login, creating a record the step needed, clearing a cookie), with the account used. Settings changes and data loads are operator actions: the agent does not perform them, it lists them as preconditions above.

| When       | Action                                                                                                      | Account                                    |
| ---------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 2026-11-26 | Signed in to UAT as the admin, csr and the UAT customer (customer by WhatsApp PIN, relayed by the operator) | uat-test-admin, uat-test-csr, UAT customer |
| 2026-11-26 | Created five paid-ready orders for the steps (cart, checkout, Pay link). The operator paid them on Paystack | UAT customer                               |
| 2026-11-26 | Set orders to Preparing and Ready on the order page, as steps 8, 11, 16 and 17 require                      | uat-test-csr                               |
| 2026-11-26 | Read the support queue, orders and Refunds page to check results                                            | uat-test-admin                             |

## Results

Evidence files are stored under `compliance/evidence/REQ-128/uat/` and named in the procedure (`REQ-128-AC<n>-<slug>.png`). Where a screenshot is not practical, store the page text as a `.txt` file there and name it here.

| Step | Actual result                                                                                                                                                                                                              | PASS / FAIL / BLOCKED | Evidence file                                                            | Defect |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------ | ------ |
| 1    | Dialog text matched: full refund of ₦4,000 to the original payment method, 3–10 working days                                                                                                                               | PASS                  | REQ-128-AC2-cancel-dialog.png                                            |        |
| 2    | "Order cancelled. A full refund of ₦4,000 is on its way." shown; order page shows Order Cancelled                                                                                                                          | PASS                  | REQ-128-AC2-order-cancelled.png                                          |        |
| 3    | Refunds card: ₦4,000 full, reason "Cancelled by customer before preparation", pending (processed by 11:30)                                                                                                                 | PASS                  | REQ-128-AC1-refund-row.png                                               |        |
| 4    | Refund-processed message for #WG2611260001 arrived at 11:30. The "has been cancelled" message was not reported as received (sent before the customer texted; templates PENDING at Meta)                                    | BLOCKED               | REQ-128-AC5-whatsapp-messages.txt                                        |        |
| 5    | After reload the cancelled order shows no Cancel Order button                                                                                                                                                              | PASS                  | REQ-128-AC2-no-second-cancel.png                                         |        |
| 6    | "Cancel WG2611260002" cancelled the order, one "has been cancelled" message arrived, order shows Cancelled with a ₦2,500 full refund (see Deviations)                                                                      | PASS                  | REQ-128-AC2-whatsapp-cancel.png, REQ-128-AC2-whatsapp-cancel.txt         |        |
| 7    | "Can I cancel my order" did not cancel anything; it was added to the open WhatsApp support ticket as a customer message                                                                                                    | PASS                  | REQ-128-AC2-question-not-cancel.png                                      |        |
| 8    | Customer saw "Your order is already being prepared, so we've passed your request to our manager."; a "Refund request for order #WG2611260004" ticket exists; no refund exists                                              | PASS                  | REQ-128-AC3-request-created.png, REQ-128-AC3-request-ticket.png          | D1     |
| 9    | csr sees "This refund request is waiting for a manager, admin or super-admin." with no Approve buttons; the order page has no Refund button                                                                                | PASS                  | REQ-128-AC4-csr-cannot-decide.png, REQ-128-AC4-csr-order-no-refund.png   |        |
| 10   | "Refund approved and requested."; Refunds card shows ₦2,000 partial; ticket shows "Refund request approved". The customer's WhatsApp was not checked for this step                                                         | PASS                  | REQ-128-AC3-partial-approved.png, REQ-128-AC3-partial-approved-order.png |        |
| 11   | Ticket shows "Refund request rejected: Already served"; the customer received the message with that reason at 11:24                                                                                                        | PASS                  | REQ-128-AC3-request-rejected.png, REQ-128-AC3-request-rejected.txt       |        |
| 12   | "Refund requested."; Refunds card shows ₦1,000 partial, reason "Missing item reported by phone" (still pending)                                                                                                            | PASS                  | REQ-128-AC4-manager-refund.png                                           |        |
| 13   | Over-refund refused with no new refund row. ₦5,000 (more than the whole order) gave "Enter a valid refund amount."; ₦2,000 (more than the ₦1,500 left) gave the expected "larger than the amount still refundable" message | PASS                  | REQ-128-AC4-over-refund.png, REQ-128-AC4-over-refund-balance.png         |        |
| 14   | Report shows Refunded (processed) ₦4,000 (1), Pending ₦5,500 (3), Failed ₦0; By type and By approver add up to the processed total                                                                                         | PASS                  | REQ-128-AC6-refunds-report.png                                           |        |
| 15   | csr was redirected to /dashboard/orders; the Refunds page is not shown                                                                                                                                                     | PASS                  | REQ-128-AC6-csr-refused.png                                              |        |
| 16   | Message read "…order #WG2611260005 is ready and waiting for a rider…" with no "pickup"                                                                                                                                     | PASS                  | REQ-128-AC8-delivery-ready.txt                                           |        |
| 17   | Message read "…order #WG2611260003 is ready for pickup…"                                                                                                                                                                   | PASS                  | REQ-128-AC8-pickup-ready.txt                                             |        |

## Deviations

Anything done differently from the procedure, and why. Write "None" if there were none.

1. Step 6: sent "cancel WG2611260002" instead of the bare word "cancel", because several paid orders were active and a bare "cancel" asks which one. The procedure assumed one active order.
2. Step 13: the procedure's ₦5,000 is above the whole ₦2,500 order, so it hits the "valid amount" check first. A second attempt with ₦2,000 exercised the balance check named in the procedure.
3. Step 15: the csr lands on /dashboard/orders, not a separate dashboard home; the Refunds page is still refused.
4. Orders were ₦2,500 (₦4,000 for the first), not the totals the procedure implied; every amount used stayed within them.
5. Phone messages are evidenced as text relayed by the operator (`.txt` files), not screenshots, because the agent cannot see the phone.
6. Step 4: the WhatsApp templates `order_cancelled` and `refund_processed` were PENDING at Meta on UAT during the run. The phone log the operator relayed starts at 11:20, after the first order was cancelled (about 11:01), so the "has been cancelled" message for #WG2611260001 could not be confirmed.
7. Step 10: no customer message for the ₦2,000 partial approval appears in the relayed log; the procedure does not require one. At 11:45 the ₦2,000, ₦1,000 (step 12) and ₦2,500 (step 6) refunds all reached "processed" and each sent the customer a "refund … has been processed" message (REQ-128-AC1-all-refunds-processed.txt).

## Defect log

| Defect | Step | Severity (blocker / major / minor) | Description                                                                                                                                                                                      | Reference                       |
| ------ | ---- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| D1     | 8    | minor                              | After a cancel request on a preparing order, the web toast heading reads "Order Cancelled" while the description says the request was passed to a manager. Cosmetic; the order is not cancelled. | Not filed; the operator decides |

## Summary

| Passed | Failed | Blocked | Total steps |
| ------ | ------ | ------- | ----------- |
| 16     | 0      | 1       | 17          |

**AC coverage**

| AC  | Steps         | Result                                                          |
| --- | ------------- | --------------------------------------------------------------- |
| AC1 | 3, 4          | Step 3 passed; step 4 blocked (cancelled message not confirmed) |
| AC2 | 1, 2, 5, 6, 7 | All passed                                                      |
| AC3 | 8, 10, 11     | All passed                                                      |
| AC4 | 9, 10, 12, 13 | All passed                                                      |
| AC5 | 4, 6          | Step 6 passed; step 4 blocked                                   |
| AC6 | 14, 15        | All passed                                                      |
| AC7 | none          | Not testable by a human; see the procedure                      |
| AC8 | 16, 17        | All passed                                                      |

**Recommendation:** [ ] Approve &nbsp; [ ] Approve with noted defects &nbsp; [ ] Reject

**Reviewer decision** (agent-executed runs): [ ] The agent's results are accepted &nbsp; [ ] A manual re-run is required (the release waits; the re-run gets its own record with `execution_mode: manual`)

## Sign-off

| Role                                                        | Name | Date |
| ----------------------------------------------------------- | ---- | ---- |
| Tester (manual run) or agent executor                       |      |      |
| Reviewer (agent-executed run; write "n/a" for a manual run) |      |      |
| Operator                                                    |      |      |
