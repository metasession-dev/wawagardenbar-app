---
execution_mode: agent_executed
executed_by: Claude Code (claude-sonnet-5-5) for the browser and dashboard steps; WhatsApp results relayed by the operator
tested_sha: 8b4a1053cd9f1c751b95e96496ac97a4d61550ed
---

# UAT Execution Record — REQ-125: Admin switches for WhatsApp notifications (bundle with REQ-126 and REQ-127)

## Header

| Item                       | Value                                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Release                    | REQ-125 (bundle: REQ-125, REQ-126, REQ-127)                                                                                                       |
| Execution mode             | agent-executed with human review (WhatsApp results relayed by the operator)                                                                       |
| Build under test (git SHA) | 8b4a1053cd9f1c751b95e96496ac97a4d61550ed (PR #1086 merged to develop; Deploy UAT (k3s) green at 13:33 UTC)                                        |
| Environment / URL          | UAT, https://wawagardenbar-uat.ostendo.io                                                                                                         |
| Executed by                | Claude Code (claude-sonnet-5-5); the operator carried out the WhatsApp sends and receipts, restored the Paystack key and paid the two test orders |
| Reviewed by                | Pending: a named reviewer independent of the author                                                                                               |
| Started                    | 2026-11-25 14:50 UTC                                                                                                                              |
| Finished                   | 2026-11-25 16:25 UTC                                                                                                                              |

**Independence declaration** (required when `approval.mode` is `dual_actor`). For a manual run the tester signs; for an agent-executed run the human reviewer signs:
I did not write, review or approve the change under test. Name: PENDING (reviewer) &nbsp; Date: PENDING

## Operator preparation (initial each before the run starts)

| Item                                            | Done                                                                                                                                                                                             | Initials |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| Migrations applied to the environment           | [x] none needed (additive settings document)                                                                                                                                                     | operator |
| Test accounts created as listed in the briefing | [x] `uat-test-admin`, `uat-test-csr`, `uat-test-superadmin` seeded by `scripts/seed-uat-test-users.sh` after the prod to UAT sync; test customer is the existing account on `UAT_CUSTOMER_PHONE` | operator |
| Test data loaded                                | [x] UAT database replaced by a production copy (`sync-prod-to-ostendo-uat.sh`) before the run; Paystack key set invalid for steps 15 and 16, restored for step 17                                | operator |

## Actions taken by the agent (agent-executed runs only; write "None" or "n/a" otherwise)

| When           | Action                                                                                                                                                                                                                                | Account                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 14:40          | Logged in with the credentials from `.env.uat.local` for the admin, super-admin and csr accounts; admin and super-admin returned "Invalid credentials" (stale after the sync), csr worked. Three failed logins in total, then stopped | UAT admin, super-admin, csr |
| 15:00          | Seeded the `uat-test-*` logins through `scripts/seed-uat-test-users.sh` (creates three staff accounts on UAT)                                                                                                                         | scoped UAT database user    |
| 15:10          | Steps 1 to 4, 6, 8, 9: logged in as `uat-test-admin`; opened Settings; switched Order status updates off then on; switched the master switch off then on                                                                              | uat-test-admin              |
| 15:12          | Steps 5, 6, 7 and the Support and bell reads: logged in as `uat-test-csr`; moved orders to Preparing and Ready from the kitchen display; acknowledged one support alert in the bell                                                   | uat-test-csr                |
| 15:30 to 15:50 | Steps 15 to 17: signed in as the UAT test customer with the PIN the operator relayed; added a menu item, set the table, pressed Pay; created five unpaid orders and two paid ones (see deviations)                                    | test customer               |
| 15:45          | Step 17 first attempt: forced the payment start to fail in the browser (the initializePayment request was aborted), then changed the table and paid                                                                                   | test customer               |

## Results

Evidence files are stored under `compliance/evidence/REQ-125/uat/`.

| Step | Actual result                                                                                                                                                                                                                                                               | PASS / FAIL / BLOCKED | Evidence file                                                                                                    | Defect |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------- | ------ |
| 1    | Master switch on; 11 groups each showing the three texts ("What it is for", "Why it matters", "If you switch it off")                                                                                                                                                       | PASS                  | REQ-125-AC5-uat-switches.png                                                                                     |        |
| 2    | "Sign-in PIN" row shows the reason and "Locked on"; its switch is on and disabled                                                                                                                                                                                           | PASS                  | REQ-125-AC4-uat-pin-locked.png                                                                                   |        |
| 3    | Clicking Staff alerts opened "Switch off Staff alerts?" repeating that WhatsApp escalation stops; after Keep it on the switch stayed on                                                                                                                                     | PASS                  | REQ-125-AC6-uat-confirm-dialog.png                                                                               |        |
| 4    | Order status updates: dialog repeated the consequence, "WhatsApp message settings saved" shown, switch off and still off after a reload; the other switches unchanged                                                                                                       | PASS                  | REQ-125-AC2-uat-status-off.png                                                                                   |        |
| 5    | With the switch off the csr moved paid order WG2611250006 to Preparing then Ready (orders page showed Ready). The operator received the order confirmation and the receipt and reported no order status message                                                             | PASS                  | REQ-125-AC3-uat-ready-no-message.png, REQ-125-AC2-uat-status-messages.txt                                        |        |
| 6    | Switch turned back on (saved, on after reload). On a second paid order (WG2611250007) the csr set Preparing and Ready: the operator received "...is being prepared. Tap below to track it." and "...is ready and on its way to your table. Tap below to track it."          | PASS                  | REQ-125-AC2-uat-status-back-on.png, REQ-125-AC2-uat-status-message-prep.png, REQ-125-AC2-uat-status-messages.txt |        |
| 7    | csr opening Settings was sent to /dashboard/forbidden; no switches shown                                                                                                                                                                                                    | PASS                  | REQ-125-AC8-uat-csr-refused.png                                                                                  |        |
| 8    | Master switch off: banner shown, every individual switch disabled, PIN row still on. A signed-out visitor requested a sign-in PIN: it arrived on WhatsApp and signing in with it worked                                                                                     | PASS                  | REQ-125-AC4-uat-master-off-pin.png, REQ-125-AC4-uat-pin-signin.png                                               |        |
| 9    | Master switch back on: no banner; all 11 group switches on and enabled                                                                                                                                                                                                      | PASS                  | REQ-125-AC2-uat-all-on.png                                                                                       |        |
| 10   | "order" got the menu-link reply; the operator reported the link opened the menu; no ticket                                                                                                                                                                                  | PASS                  | REQ-126-AC1-uat-order-link.txt                                                                                   |        |
| 11   | "my order is late" created TKT-1795622278266091, status Open, no urgent marker and no SLA. The operator did not report a menu-link reply                                                                                                                                    | PASS                  | REQ-126-AC5-uat-complaint-ticket.png                                                                             |        |
| 12   | "status" returned the acknowledgement. The bell first still showed "Support message" (an alert for this ticket was already open and one open alert per ticket is kept); after the csr acknowledged it, a second "status" raised "Order status enquiry TKT-1795622278266091" | PASS                  | REQ-126-AC2-uat-status-ticket.png, REQ-126-AC4-uat-bell-alert.png, REQ-126-AC4-uat-bell-alert.txt                | D-2    |
| 13   | "where is my order" returned the acknowledgement; the same ticket became Urgent with an SLA "due in 15m"; still one ticket                                                                                                                                                  | PASS                  | REQ-126-AC3-uat-ticket-raised.png                                                                                |        |
| 14   | Another order number returned the same acknowledgement and nothing about any order                                                                                                                                                                                          | PASS                  | REQ-126-AC6-uat-other-order.txt                                                                                  |        |
| 15   | Gateway failing: two Pay attempts both showed the error; the cart kept its item; exactly one new Pending order was created                                                                                                                                                  | PASS                  | REQ-127-AC4-uat-failed-start.png                                                                                 |        |
| 16   | Left checkout for the menu and came back with the same cart and table in the same tab: Pay failed again and no second order was added                                                                                                                                       | PASS                  | REQ-127-AC1-uat-same-order.png                                                                                   | D-3    |
| 17   | After a failed start the table was changed and Pay pressed with a working gateway: the first order showed Cancelled, a new order was created and the browser went to Paystack's page; the operator paid it                                                                  | PASS                  | REQ-127-AC2-uat-changed-cart.png, REQ-127-AC2-uat-paystack-page.png                                              |        |

## Deviations

1. **Order for steps 5 and 6.** A paid order needs a real Paystack payment, so steps 5 and 6 used two orders (WG2611250006, WG2611250007). A status message is sent once per status per order, so the order used with the switch off could not also prove the message after the switch was back on.
2. **Step 12.** The procedure assumed a second customer with no open ticket; only one test number was available. The first `status` met an already-open alert (dedupe), so the csr acknowledged it and `status` was sent again to see a fresh alert.
3. **Steps 15 and 16 were re-run** because my first browser script filled the first-name field before the profile had loaded, so validation stopped Pay. This created three extra Pending orders (WG2611250001 to 003); each was unpaid and expires on its own. The recorded results are from the corrected runs.
4. **Step 17.** The Paystack key had already been restored by the operator when step 17 ran, so the failed first payment start was forced in the browser (the initializePayment request was aborted) instead of at the gateway. The change-of-cart behaviour itself is the real one. One extra order (WG2611250004) was cancelled by it, as intended.
5. **Test accounts.** The credentials in `.env.uat.local` were stale after the production sync (admin and super-admin refused them), so `uat-test-*` logins were seeded and used.

## Defect log

| Defect | Step   | Severity (blocker / major / minor) | Description                                                                                                                                                                                                            | Reference                  |
| ------ | ------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| D-1    | 12, 13 | minor                              | The dashboard menu has no link to the Support queue; staff reach it only by address or from the bell. Pre-existing since REQ-064, outside this bundle's scope                                                          | #1087                      |
| D-2    | 12     | minor (by design)                  | The bell keeps one open alert per ticket, so a status enquiry on a ticket that already has an unacknowledged alert keeps the old "Support message" title (the ticket itself is raised to urgent)                       | none; plan note in REQ-126 |
| D-3    | 15, 16 | minor (observation)                | The test customer account was asked for its first name again on every visit to checkout although a name had been entered; may be specific to this account (a production account seeded with no name). Not investigated | none                       |

## Summary

| Passed | Failed | Blocked | Total steps |
| ------ | ------ | ------- | ----------- |
| 17     | 0      | 0       | 17          |

**AC coverage**

| AC          | Steps   | Result |
| ----------- | ------- | ------ |
| REQ-125/AC2 | 4, 6, 9 | PASS   |
| REQ-125/AC3 | 5, 8    | PASS   |
| REQ-125/AC4 | 2, 8    | PASS   |
| REQ-125/AC5 | 1       | PASS   |
| REQ-125/AC6 | 3, 4    | PASS   |
| REQ-125/AC8 | 7       | PASS   |
| REQ-126/AC1 | 10      | PASS   |
| REQ-126/AC2 | 12      | PASS   |
| REQ-126/AC3 | 13      | PASS   |
| REQ-126/AC4 | 12      | PASS   |
| REQ-126/AC5 | 11      | PASS   |
| REQ-126/AC6 | 14      | PASS   |
| REQ-127/AC1 | 16      | PASS   |
| REQ-127/AC2 | 17      | PASS   |
| REQ-127/AC4 | 15      | PASS   |

**Recommendation:** [ ] Approve &nbsp; [x] Approve with noted defects &nbsp; [ ] Reject

**Reviewer decision** (agent-executed runs): [ ] The agent's results are accepted &nbsp; [ ] A manual re-run is required (the release waits; the re-run gets its own record with `execution_mode: manual`)

## Sign-off

| Role                                                        | Name                            | Date       |
| ----------------------------------------------------------- | ------------------------------- | ---------- |
| Tester (manual run) or agent executor                       | Claude Code (claude-sonnet-5-5) | 2026-11-25 |
| Reviewer (agent-executed run; write "n/a" for a manual run) | PENDING                         | PENDING    |
| Operator                                                    | PENDING                         | PENDING    |
