---
execution_mode: agent_executed
executed_by: Claude Sonnet 5.5 (agent)
tested_sha: 2264611b951fb92e068b037860f74654c48f9719
---

<!--
  UAT execution record for REQ-129. Satisfies ISO/IEC/IEEE 29119-3 test
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

# UAT Execution Record — REQ-129: Table and event booking (WA-13), with the dashboard Support link (#1087)

## Header

| Item                       | Value                                                            |
| -------------------------- | ---------------------------------------------------------------- |
| Release                    | REQ-129                                                          |
| Execution mode             | agent-executed, with human review (`uat.mode: auto`)             |
| Build under test (git SHA) | 2264611b951fb92e068b037860f74654c48f9719                         |
| Environment / URL          | UAT, https://wawagardenbar-uat.ostendo.io                        |
| Executed by                | Claude Sonnet 5.5 (agent)                                        |
| Reviewed by                | REPLACE (agent-executed runs only; write "n/a" for a manual run) |
| Started                    | 2026-11-27 19:02 UTC                                             |
| Finished                   | 2026-11-27 20:25 UTC                                             |

**Independence declaration** (required when `approval.mode` is `dual_actor`). For a manual run the tester signs; for an agent-executed run the human reviewer signs:
I did not write, review or approve the change under test. Name: REPLACE &nbsp; Date: REPLACE

## Operator preparation (initial each before the run starts)

| Item                                            | Done | Initials |
| ----------------------------------------------- | ---- | -------- |
| Migrations applied to the environment           | [ ]  |          |
| Test accounts created as listed in the briefing | [ ]  |          |
| Test data loaded                                | [ ]  |          |

## Actions taken by the agent (agent-executed runs only; write "None" or "n/a" otherwise)

Every action the agent performed beyond the procedure's steps (a login, creating a record the step needed, clearing a cookie), with the account used. Settings changes and data loads are operator actions: the agent does not perform them, it lists them as preconditions above.

| When       | Action                                                                                                                                 | Account                    |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| 2026-11-27 | Signed in to the dashboard as the csr (UAT_TEST_CSR) for steps 11 to 15, 17 and the check of step 10; no admin or manager account used | uat-test-csr               |
| 2026-11-27 | Entered the PIN the operator read from the UAT customer's WhatsApp (634906) to sign the customer in at step 4                          | UAT customer +447825285212 |
| 2026-11-27 | Created BK-0001 (table) and BK-0002 (event) as steps 4 and 7 require                                                                   | UAT customer               |
| 2026-11-27 | Assigned BK-0001 to the staff member "System" (second entry in the assignee list) in step 13                                           | uat-test-csr               |
| 2026-11-27 | Sent "I want to book a table" and "A question about my booking" from the customer's phone (done by the operator, not the agent)        | operator                   |
| 2026-11-27 | Extra signed-in attempt at step 3 (see Deviations)                                                                                     | UAT customer               |

## Results

Evidence files are stored under `compliance/evidence/REQ-129/uat/` and named in the procedure (`REQ-129-AC<n>-<slug>.png`). Where a screenshot is not practical, store the page text as a `.txt` file there and name it here.

| Step | Actual result                                                                                                                                                                                                                                                                  | PASS / FAIL / BLOCKED | Evidence file                                                                  | Defect |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- | ------------------------------------------------------------------------------ | ------ |
| 1    | The Book page opened from the Menu header link with Book a table and Plan an event                                                                                                                                                                                             | PASS                  | REQ-129-AC1-book-page.png                                                      |        |
| 2    | Table form shows name, phone, date, time, guests and special requests only; Event adds end time, purpose and DJ yes/no                                                                                                                                                         | PASS                  | REQ-129-AC1-event-fields.png                                                   |        |
| 3    | Signed out, a past date and 0 guests did not show field messages: the WhatsApp sign-in dialog opened and nothing was saved. Signed in, the same input showed "At least 1 guest." and "Please correct the highlighted fields." but no message under the date (see Deviations 2) | FAIL                  | REQ-129-AC1-validation-refused.png                                             | D1     |
| 4    | Sign-in dialog opened over the form; after the PIN the confirmation showed "Thanks, UAT. We've received your request and will get back to you shortly to discuss your needs." and reference BK-0001, with no details retyped                                                   | PASS                  | REQ-129-AC2-confirmation.png                                                   |        |
| 5    | UAT template booking_received is PENDING at Meta; the operator's phone screenshot shows no booking message after the PIN                                                                                                                                                       | BLOCKED               | REQ-129-AC2-whatsapp-received.txt                                              |        |
| 6    | Name filled in; phone +447825285212 filled in and read-only                                                                                                                                                                                                                    | PASS                  | REQ-129-AC1-prefilled-phone.png                                                |        |
| 7    | Event accepted (16:00 to 23:59, 60 guests, Birthday, DJ yes); confirmation showed BK-0002                                                                                                                                                                                      | PASS                  | REQ-129-AC1-event-sent.png                                                     |        |
| 8    | Both requests listed with status New (BK-0002 event, BK-0001 table); event detail shows 4:00 PM to 11:59 PM, 60 guests, Purpose Birthday, DJ Yes (status Declined at the time of the detail check, after step 15)                                                              | PASS                  | REQ-129-AC6-my-bookings.png, REQ-129-AC6-my-bookings-event-detail.png          |        |
| 9    | The bar replied "You can book a table or tell us about your event here: https://wawagardenbar-uat.ostendo.io/book ..."                                                                                                                                                         | PASS                  | REQ-129-AC3-booking-link.txt, REQ-129-AC3-whatsapp-booking-link.jpeg           |        |
| 10   | No link was sent; the message was added to support ticket TKT-1795622278266091 as a customer message at 19:09:48                                                                                                                                                               | PASS                  | REQ-129-AC3-existing-booking-text.txt, REQ-129-AC3-existing-booking-ticket.png |        |
| 11   | Bell showed "New booking request BK-0001" and "New event request BK-0002"; the Bookings list showed both with status New and the event flagged Outside Hours                                                                                                                   | PASS                  | REQ-129-AC4-bell.png, REQ-129-AC4-bookings-list.png                            |        |
| 12   | Type Event listed only BK-0002 (applied by the page address ?type=event, see Deviations 3); the calendar listed Fri 4 Dec (BK-0001) and Fri 11 Dec (BK-0002)                                                                                                                   | PASS                  | REQ-129-AC4-filter-event.png, REQ-129-AC4-filter-calendar.png                  |        |
| 13   | After opening BK-0001 its alert was gone from the bell (BK-0002 remained); the note "Call after 5pm", assignee System and the staff reply "We have a table at 7pm." show on the page                                                                                           | PASS                  | REQ-129-AC4-note-reply.png                                                     |        |
| 14   | Status shows Confirmed. The customer message is BLOCKED: booking_update is PENDING at Meta and the phone shows no update                                                                                                                                                       | BLOCKED               | REQ-129-AC4-confirmed.png, REQ-129-AC4-confirmed-declined-whatsapp.txt         |        |
| 15   | Status shows Declined. The customer message is BLOCKED for the same reason                                                                                                                                                                                                     | BLOCKED               | REQ-129-AC4-declined.png, REQ-129-AC4-confirmed-declined-whatsapp.txt          |        |
| 16   | Signed in as uat-test-kitchen: the menu shows only Orders, Kitchen display and My account; /dashboard/bookings opened "Access Forbidden" (/dashboard/forbidden)                                                                                                                | PASS                  | REQ-129-AC4-kitchen-menu.png, REQ-129-AC4-kitchen-refused.png                  |        |
| 17   | The Support item opened the queue and is highlighted there and on the ticket page (/dashboard/support/...)                                                                                                                                                                     | PASS                  | REQ-130-AC1-support-link.png, REQ-130-AC3-support-ticket-active.png            |        |
| 18   | Same kitchen account: Support is not in the menu and /dashboard/support opened "Access Forbidden"                                                                                                                                                                              | PASS                  | REQ-130-AC2-kitchen-no-support.png                                             |        |

## Deviations

Anything done differently from the procedure, and why. Write "None" if there were none.

1. The operator, not the agent, sent the two WhatsApp messages of steps 9 and 10 and supplied phone screenshots and the PIN; phone messages are evidenced from the screenshots the agent read, not seen on the device.
2. Step 3: the procedure expects a signed-out visitor to see the field messages. The form checked nothing before sign-in, so the sign-in dialog opened first. The agent also ran step 3 signed in (extra action above): the page then showed the guests message but not the past-date message, because the date rule ran only after the other fields were valid. Both are recorded as D1 and fixed in PR #1107.
3. Step 12: the Type filter was applied by opening `/dashboard/bookings?type=event`, not by the filter control; the calendar was opened with its button.
4. Steps 14 and 15: BK-0001 was confirmed and BK-0002 declined while the customer's 24-hour reply window was open, yet no update message reached the phone by 19:14. The message part stays BLOCKED as the operator instructed (the templates are pending at Meta).
5. Step 8: the event detail was checked after the event had been declined in step 15.
6. Step 13: the assignee was the second entry in the list ("System"); the list also held deleted accounts (D2).
7. The operator opened /book on a phone and typed a table request for "Tunde" but did not submit it; only BK-0001 and BK-0002 exist.
8. Steps 16 and 18 were first BLOCKED (no kitchen account) and were run on 2026-11-28 after the logins were created (see Actions). The manager login was also checked: it sees Bookings and Support and opens both pages (REQ-129-AC4-manager-bookings.png, REQ-130-AC1-manager-support.png).
9. Steps 3 and 4 are to be re-run on UAT at the build that contains PR #1107; this record shows the first run until then.

## Defect log

| Defect | Step | Severity (blocker / major / minor) | Description                                                                                                                                                                                                                                                                                                     | Reference                                                                           |
| ------ | ---- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| D2     | 13   | minor                              | The assignee list on the booking page included deleted accounts (an entry like `del_…@deleted`)                                                                                                                                                                                                                 | Fixed in PR #1107 (active staff only)                                               |
| D1     | 3    | minor                              | A signed-out visitor sees no field messages before the sign-in prompt, and a past date is not reported together with another field error (shown only once the other fields are valid). The request is refused either way and nothing is saved. The procedure expected messages under the date and guests fields | Not filed: reviewer decides whether to accept, amend the procedure or file an issue |

## Summary

| Passed | Failed | Blocked | Total steps |
| ------ | ------ | ------- | ----------- |
| 14     | 1      | 3       | 18          |

**AC coverage**

| AC               | Steps                  | Result                                                                                                        |
| ---------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| AC1              | 1, 2, 3, 6, 7          | Steps 1, 2, 6, 7 pass; step 3 FAIL (D1)                                                                       |
| AC2              | 4, 5                   | Step 4 pass; step 5 BLOCKED (template pending)                                                                |
| AC3              | 9, 10                  | Pass                                                                                                          |
| AC4              | 11, 12, 13, 14, 15, 16 | Steps 11 to 13 pass; steps 14, 15 status changes seen, messages BLOCKED; step 16 BLOCKED (no kitchen account) |
| AC5              | 11, 13                 | Pass (bell shows the requests; alert clears on opening)                                                       |
| AC6              | 8                      | Pass                                                                                                          |
| AC7              | n/a                    | Not testable by a person; templates submitted, still PENDING at Meta                                          |
| REQ-130/AC1, AC3 | 17                     | Pass                                                                                                          |
| REQ-130/AC2      | 18                     | BLOCKED (no kitchen account)                                                                                  |

**Recommendation:** [ ] Approve &nbsp; [ ] Approve with noted defects &nbsp; [ ] Reject

**Reviewer decision** (agent-executed runs): [ ] The agent's results are accepted &nbsp; [ ] A manual re-run is required (the release waits; the re-run gets its own record with `execution_mode: manual`)

## Sign-off

| Role                                                        | Name | Date |
| ----------------------------------------------------------- | ---- | ---- |
| Tester (manual run) or agent executor                       |      |      |
| Reviewer (agent-executed run; write "n/a" for a manual run) |      |      |
| Operator                                                    |      |      |
