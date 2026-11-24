---
execution_mode: agent_executed
executed_by: 'Claude Code (sdlc-implementer, claude-sonnet-5-5) with operator-assisted payment and phone relay'
tested_sha: 5bf612634cf641eeb92c43abf59f245c498c6c9c
---

<!--
  UAT execution record for REQ-124. Satisfies ISO/IEC/IEEE 29119-3 test
  execution log, test incident report, test completion report and sign-off.
  The agent copies this file with the header filled; whoever executes
  uat-test-procedure.md completes it; it is committed before the release
  PR is merged. Uploaded as evidence type test_report.

  The front matter above is read by the portal and by CI. Keep it the first
  bytes of the file and keep the keys exactly:
    execution_mode: agent_executed (a tester ran the steps by hand) or agent_executed
                    (the agent ran them under uat.mode: auto, a human reviewed)
    executed_by:    the tester's name, or the agent and its version
    tested_sha:     the git SHA of the build under test
  Write the mode of the run that actually happened, not the value of
  uat.mode. Fill in every placeholder when UAT starts.
-->

# UAT Execution Record — REQ-124: Order status notifications, tracking link and serving check

## Header

| Item                       | Value                                                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Release                    | REQ-124                                                                                                                 |
| Execution mode             | Agent-executed with human review (operator paid the Paystack test orders and read the WhatsApp messages from the phone) |
| Build under test (git SHA) | 5bf612634cf641eeb92c43abf59f245c498c6c9c (develop; UAT redeployed by Deploy UAT (k3s) run 45018127294)                  |
| Environment / URL          | UAT, https://wawagardenbar-uat.ostendo.io                                                                               |
| Executed by                | Claude Code (sdlc-implementer, claude-sonnet-5-5); operator relayed phone results                                       |
| Reviewed by                | ADE THOMPSON                                                                                                            |
| Started                    | 2026-11-23, about 08:40 UTC                                                                                             |
| Finished                   | 2026-11-23, about 10:15 UTC                                                                                             |

**Independence declaration** (required when `approval.mode` is `dual_actor`). The human reviewer signs:
I did not write, review or approve the change under test. Name: ADE THOMPSON &nbsp; Date: 2026-11-24

## Operator preparation (initial each before the run starts)

| Item                                            | Done | Initials |
| ----------------------------------------------- | ---- | -------- |
| Migrations applied to the environment           | [x]  | WT       |
| Test accounts created as listed in the briefing | [x]  | WT       |
| Test data loaded                                | [x]  | WT       |

## Actions taken by the agent (agent-executed runs only; write "None" or "n/a" otherwise)

| When        | Action                                                                                                             | Account                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| 08:40       | Requested a WhatsApp sign-in PIN; operator supplied it                                                             | UAT customer (+44 7825 285212) |
| 08:43       | Placed delivery order WG2611230001 (address, instructions "Gate code 4455"); operator paid it on Paystack          | UAT customer                   |
| about 08:55 | Placed pickup order WG2611230002; operator paid it on Paystack                                                     | UAT customer                   |
| 08:50-09:10 | Set WG2611230001 to Preparing, Ready, Out for Delivery, Delivered, Completed; set WG2611230002 to Preparing, Ready | uat-csr                        |
| about 09:30 | Created staff express order WG2611230005 (Pay Now, cash) and set it to Preparing, Ready                            | uat-csr                        |
| 09:40       | Opened the tracking page with the signed link, without a token, with an altered token, and as the owner            | anonymous, customer, uat-csr   |

Two earlier express-order attempts (pickup) were rejected by the form and created nothing.

## Results

Evidence files are stored under `compliance/evidence/REQ-124/uat/`. Phone-side results are the operator's transcription in `operator-relayed-messages.txt`.

| Step | Actual result                                                                                                                                                                                                                          | PASS / FAIL / BLOCKED | Evidence file                                                  | Defect |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------- | ------ |
| 1    | WG2611230001 appears under Live orders with the header `Delivery · UAT`                                                                                                                                                                | PASS                  | REQ-124-AC4-delivery-header.png                                |        |
| 2    | Kitchen card header `Delivery · UAT`; shows address "Mikano Road, Plot 27 to 42 Westerner Industrial Ave, Ifo, Ogun, 110101" and "Gate code 4455"; no phone, email or surname                                                          | PASS                  | REQ-124-AC5-kitchen-delivery-details.png                       |        |
| 3    | `Pickup · UAT` (new order WG2611230002) and `Table T-UAT3 · UAT` / `Table T-UAT4 · UAT` (dine-in orders already on UAT from earlier cycles, shown by this build); no phone or email on the cards                                       | PASS                  | REQ-124-AC4-table-and-pickup-headers.png                       |        |
| 4    | One message: "Your Wawa Garden Bar order #WG2611230001 is being prepared. Tap below to track it."                                                                                                                                      | PASS                  | operator-relayed-messages.txt, REQ-124-AC1-preparing-click.png |        |
| 5    | The card offers no second Preparing action; no second Preparing message arrived                                                                                                                                                        | PASS                  | operator-relayed-messages.txt                                  |        |
| 6    | Ready then Out for Delivery each produced one message; the card then offered Mark Delivered                                                                                                                                            | PASS                  | REQ-124-AC7-ready-click.png, REQ-124-AC7-out-for-delivery.png  | D1     |
| 7    | Delivered produced one message; after Completed the order left the Active tab and no message arrived                                                                                                                                   | PASS                  | REQ-124-AC7-delivered.png, REQ-124-AC7-completed.png           |        |
| 8    | Pickup order WG2611230002 in Ready: the card offers Complete only; no Out for Delivery or Mark Delivered                                                                                                                               | PASS                  | REQ-124-AC7-pickup-no-delivery-steps.png                       |        |
| 9    | Staff express order WG2611230005 set to Preparing then Ready: no message arrived                                                                                                                                                       | PASS                  | REQ-124-AC1-staff-order-silent.png                             | D2     |
| 10   | The Track order link opens the order page (HTTP 200) in a window with no session, showing the order number, items and status                                                                                                           | PASS                  | REQ-124-AC3-link-opens-order.png                               |        |
| 11   | The same address without `?t=` returns 404 "This page could not be found."                                                                                                                                                             | PASS                  | REQ-124-AC3-no-token-404.png                                   |        |
| 12   | Signed in as a second customer (a different UAT customer account, phone changed in `.env.uat.local` on 2026-11-23) in a separate session, the first customer's order page address without `?t=` returns 404; no items or address shown | PASS                  | REQ-124-AC3-other-customer-404.png                             |        |
| 13   | Signed in as the owner, the order page opens without a token                                                                                                                                                                           | PASS                  | REQ-124-AC3-owner-no-token.png                                 |        |
| 14   | One character of `?t=` changed: 404                                                                                                                                                                                                    | PASS                  | REQ-124-AC3-altered-token-404.png                              |        |

## Deviations

- Step 1: the Paystack hosted page is behind a Cloudflare bot check, so the operator paid the test orders in their own browser.
- Step 5: the dashboard does not offer a second Preparing action, so the duplicate guard was not exercised through the UI; it is covered by the unit and critical e2e tests.
- Step 8: the order page was not opened and Cancel was not observed on the card.
- Step 9: the express form did not retain the customer name or phone (the order shows "Walk-in Customer"), so the check shows that a staff order sends no message, not that a staff order carrying a customer phone sends none.
- Step 12 was first blocked (the only second number was the production sender), then run on 2026-11-23 after the operator replaced the second test number. The staff account uat-csr (not the owner) also got 404.
- Step 3 used two dine-in orders that already existed on UAT.

## Defect log

| Defect | Step | Severity (blocker / major / minor) | Description                                                                                                                                                                                           | Reference |
| ------ | ---- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| D1     | 6    | minor                              | The Ready message for a delivery order reads "ready for pickup" (`services/order-status-notifier.ts:42`), while the order page says "Order ready for delivery". The wording is outside REQ-124's ACs. | #1071     |
| D2     | 9    | minor                              | Not a REQ-124 defect. The express Create Order form, Pickup type, rejects the order with "preferredPickupTime is required" although a pickup time is filled in.                                       | #1072     |

## Summary

| Passed | Failed | Blocked | Total steps |
| ------ | ------ | ------- | ----------- |
| 14     | 0      | 0       | 14          |

**AC coverage**

| AC       | Steps                   | Result                                           |
| -------- | ----------------------- | ------------------------------------------------ |
| AC1      | 4, 5, 6, 7, 9           | Passed                                           |
| AC3      | 10, 11, 12, 13, 14      | Passed                                           |
| AC4      | 1, 2, 3                 | Passed                                           |
| AC5      | 2                       | Passed                                           |
| AC7      | 6, 7, 8                 | Passed                                           |
| AC2, AC6 | not testable by a human | covered by unit test and template-submissions.md |

**Recommendation:** [ ] Approve &nbsp; [x] Approve with noted defects &nbsp; [ ] Reject
(For the human reviewer. The agent recommends: approve with noted defects D1 and D2.)

**Reviewer decision** (agent-executed runs): [x] The agent's results are accepted &nbsp; [ ] A manual re-run is required (the release waits; the re-run gets its own record with `execution_mode: manual`)

## Sign-off

| Role                                                        | Name                                              | Date       |
| ----------------------------------------------------------- | ------------------------------------------------- | ---------- |
| Tester (manual run) or agent executor                       | Claude Code (sdlc-implementer, claude-sonnet-5-5) | 2026-11-23 |
| Reviewer (agent-executed run; write "n/a" for a manual run) | ADE THOMPSON                                      | 2026-11-24 |
| Operator                                                    | Metasession Dev                                   | 2026-11-24 |
