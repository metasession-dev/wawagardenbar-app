# UAT Briefing — REQ-129: Table and event booking (WA-13), with the dashboard Support link (#1087)

**Release:** REQ-129 (core of a declared bundle with REQ-130)
**Risk:** MEDIUM
**Prepared:** 2026-11-27
**Build under test:** filled in when UAT starts (git SHA)

## 1. Background

Wawa Garden Bar takes orders on its website and talks to customers on WhatsApp. Customers had no way to ask for a table or to plan an event except by messaging the bar. This release adds a Book page where a customer chooses a table or an event, fills a short form and sends a request (an enquiry: nothing is paid and no table is reserved automatically). The customer is verified with the same WhatsApp PIN used at checkout, sees a confirmation, and gets a WhatsApp message. Staff see the request in a new Bookings page in the dashboard, track it, reply and confirm or decline it. The release also adds the missing Support link to the dashboard menu (#1087).

## 2. What changed, and what did not

**Changed:**

- A "Book" link in the site header and footer opens `/book`, where a visitor chooses Table or Event. Name and phone are filled in for a signed-in customer and the phone cannot be edited. Without a session, Send request opens the WhatsApp PIN form and then sends the request without retyping.
- After sending, the customer sees "Thanks, {first name}. We've received your request and will get back to you shortly" with a booking number (for example BK-0001), and receives a WhatsApp message.
- Texting a short message such as "I want to book a table" to the bar's WhatsApp number returns the Book page link. A message about an existing booking ("a question about my booking") is treated as ordinary support text.
- Customers see their requests and status under My Bookings (account menu, or `/profile/bookings`).
- Staff (csr, manager, admin, super-admin) see a Bookings item in the dashboard menu: a list with filters, a calendar view, and a detail page to change status, assign, add internal notes and reply. Confirm and Decline message the customer. Each new request raises one staff alert.
- The dashboard menu now has a Support item for the same roles that can open the Support queue (REQ-130).

**Did not change (do not report as defects):**

- No payment, deposit or automatic table allocation; a request is an enquiry.
- A customer cannot cancel a booking from the site; staff set the status.
- A kitchen-only staff member sees neither Bookings nor Support.
- Checkout, orders, refunds and the existing support queue behave as before.

## 3. Scope

| In scope                                                                                                                                                                      | Out of scope                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| The Book page and its validation, the confirmation and customer messages, the WhatsApp booking reply, My Bookings, the staff Bookings pages and alerts, the Support menu link | Payment for bookings, WhatsApp retention and compliance, tab and staff orders |

**Known limits:** a booking is limited to five requests per phone per day (counted in the database), so repeating the run with one phone may hit the limit. The WhatsApp templates `booking_received` and `booking_update` were submitted to Meta on 2026-11-27 and may still be pending on UAT; until approved, a message sent outside the 24-hour reply window is held, not delivered, and the step that checks it is marked BLOCKED. The welcome templates with the "Book an Event" button are not yet submitted.

## 4. Environment

| Item             | Value                                                                          |
| ---------------- | ------------------------------------------------------------------------------ |
| URL              | https://wawagardenbar-uat.ostendo.io                                           |
| Environment name | UAT                                                                            |
| Browser / device | Chrome, desktop, plus one phone for WhatsApp                                   |
| Data state       | UAT test menu and test accounts; bookings created during UAT are safe to leave |

## 5. Accounts and prerequisites

| Role     | Account                                                     | What it can do                                          | How credentials are delivered                |
| -------- | ----------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------- |
| Customer | A UAT customer phone number that receives WhatsApp messages | Open Book, send requests, see My Bookings, text the bar | Out of band, from the operator (PIN relayed) |
| csr      | A UAT staff account with only the csr role                  | Open Bookings and Support, handle requests              | Out of band, from the operator               |
| Manager  | A UAT staff account with the manager (or admin) role        | Same as csr for these pages                             | Out of band, from the operator               |
| Kitchen  | A UAT staff account with only the kitchen role              | Cannot open Bookings or Support                         | Out of band, from the operator               |

**Prerequisites the operator completes first** (initial each in the execution record): the build under test is deployed to UAT; the accounts above exist; the UAT copies of `booking_received` and `booking_update` are APPROVED (or the steps that need them are marked BLOCKED).

## 6. Tester rules

- Follow `uat-test-procedure.md` step by step. Do not improvise unless a step says to.
- Record what actually happened, not what you expected. A step that does not behave exactly as written is a FAIL.
- Take the screenshot named in the step. Use the file name given.
- If a step marked "stop if fails" fails, stop and tell the operator.
- Do not change data outside the accounts listed above.
- The tester must not be the person who wrote the change (see the independence declaration in the execution record).

## 7. Entry and exit criteria

**Entry (all true before starting):** the build under test is deployed to the environment above; the operator preparation checklist in the execution record is initialled; the tester has the accounts above.

**Exit:** every step has a recorded result; every FAIL or BLOCKED has a defect entry; the recommendation and the signatures in the execution record are filled in.

## 8. Glossary

| Term            | Meaning                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| Booking request | A table or event enquiry sent from the Book page; it has a number like BK-0001 and a status                      |
| Status          | New, Contacted, Confirmed, Declined, Completed or Cancelled; staff set it                                        |
| Staff alert     | The bell notification a new request raises for staff                                                             |
| Outside hours   | An event that starts before opening, ends after closing or falls on a closed day; allowed, and flagged for staff |
