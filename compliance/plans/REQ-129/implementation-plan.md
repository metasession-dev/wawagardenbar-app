---
title: 'Implementation plan — REQ-129'
requirement_id: 'REQ-129'
risk_class: 'MEDIUM'
change_type: 'feature'
authored_by: 'sdlc-implementer (Claude Sonnet 5.5)'
authored_at: '2026-11-27'
---

# Implementation plan — REQ-129

Issue: [#975](https://github.com/metasession-dev/wawagardenbar-app/issues/975) — WA-13 Table and event booking (`/book` + dashboard), tracker #953. Declared bundle with [#1087](https://github.com/metasession-dev/wawagardenbar-app/issues/1087) (REQ-130, Dashboard Support link): REQ-129 is the core, REQ-130 is `co_tracked`. The two edit one file, `components/features/admin/dashboard-nav.tsx`; the operator accepted that overlap on 2026-11-27. [#218](https://github.com/metasession-dev/wawagardenbar-app/issues/218) (customer event booking form, `/events/book`) is closed as superseded by this REQ.

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

Closes ISO 29119 §3.4 (§1, §9), ISO 27001 A.8.25 (§5), GDPR Art. 25 (§6), EU AI Act Art. 11 (§7).

## 1. Goal + acceptance criteria

- **Goal:** A visitor can ask to book a table or enquire about an event at `/book`, after the same WhatsApp PIN sign-in as checkout; they get an on-screen confirmation and a WhatsApp message; staff see, track and answer the request in a new dashboard Bookings page; the customer sees their requests under their profile. Booking is an enquiry: no payment, no table allocation.

### What the code does today (verified)

- There is no booking model, page, action or dashboard section. The words "booking" appear only in the staff-alert types (`booking`, `event` in `lib/staff-alerts/staff-alert-rules.ts`, deep link `/dashboard/bookings/{id}`, written by REQ-122) and in the `welcome_new_user` / `welcome_back` template JSON (button "Book an Event" → `/book`, `holdUntil: WA-13`).
- Public navigation is `components/shared/navigation/navbar.tsx` (Home, Menu, Orders, Rewards) and `footer.tsx` (Contact, Terms, Privacy, Menu, Orders, Rewards). `/contact` is a static page.
- Customer sign-in is the WhatsApp PIN `LoginForm` (`components/shared/auth/login-form.tsx`, `onSuccess` prop); the session is read with `getIronSession` / `lib/session.ts`.
- Support tickets already embed staff and customer replies and send free-form inside the 24-hour window and `support_reply` outside it (`models/support-ticket-model.ts`, `lib/support-reply-mode.ts`, `app/dashboard/support/*`).
- `StaffNotificationService.raise('booking' | 'event', …)` exists and de-duplicates per item; `staffAlertPath` already maps both types to `bookings/{id}`.
- `components/features/admin/dashboard-nav.tsx` has no Support or Bookings entry. `/dashboard/support` is gated by `requireRole(['csr','manager','admin','super-admin'])`.
- The inbound intent router (`WhatsAppInboundService.classifyMessageIntent`) has no booking intent.

### Decisions for approval

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                                                        | Recommendation                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| D1  | **Rate limit storage.** The issue says 5 bookings per phone per day. The in-memory limiter resets on restart and is per instance.                                                                                                                                                                                                                                                                               | Count `Booking` rows for the phone in the business day (database-backed, survives restarts).                            |
| D2  | **Dates and times** are the business time zone (`lib/business-time`); "not in the past" compares the start moment with now.                                                                                                                                                                                                                                                                                     | Yes.                                                                                                                    |
| D3  | **PIN gate.** The server action requires a signed-in customer session and takes the phone from it (never from the form). The page opens the PIN form and then resubmits the kept form data.                                                                                                                                                                                                                     | Yes. A staff session may not create a booking for a customer through this form.                                         |
| D4  | **Staff roles for Bookings.** Same as Support: `csr`, `manager`, `admin`, `super-admin`.                                                                                                                                                                                                                                                                                                                        | Yes (the issue says csr/manager/admin; super-admin is the existing top staff tier and every other section includes it). |
| D5  | **Replies.** Embedded array like `SupportTicket`, free-form inside 24 h of the customer's last message, `booking_update` template outside it.                                                                                                                                                                                                                                                                   | Yes. `booking_update`'s URL button opens `/profile/bookings/{{1}}`, so a read-only customer detail page is added.       |
| D6  | **Templates.** `booking_received` and `booking_update` are submitted to UAT now by API. The production account is not on Cloud API coexistence (REQ-128 deviation 5), so production copies are an operator task. `welcome_new_user` and `welcome_back` are submitted to UAT only once `/book` is live there (task 7). Features stay held per environment until that copy is APPROVED (`held_template_pending`). | Yes.                                                                                                                    |
| D7  | **Event outside business hours** is allowed and flagged for staff (a badge on the list and detail).                                                                                                                                                                                                                                                                                                             | Yes (as the issue states).                                                                                              |
| D8  | **#218** is closed as superseded by this REQ at release (not before: it is closed when the release lands).                                                                                                                                                                                                                                                                                                      | Yes.                                                                                                                    |

### Acceptance criteria

| AC  | Description (Given / When / Then)                                                                                                                                                                                                                                                                                                                                                                                                                                              | SRS-ID                     | Verification         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- | -------------------- |
| AC1 | **Given** any visitor, **When** they open `/book` (nav and footer link "Book"), **Then** they choose Table or Event and see only that type's fields; a signed-in customer has name and phone prefilled with the phone locked; without a session, submitting opens the PIN form and the booking is saved after verification without re-entering details; invalid dates (past, end before start), guests outside 1–500, and a sixth booking from one phone in a day are refused. | REQ-BOOK-001               | unit + e2e           |
| AC2 | **Given** a saved booking, **Then** the confirmation screen shows the booking number and the "we'll get back to you shortly" text, and a `booking_received` message is logged in `NotificationLog` (`held_template_pending` while the environment's copy is not approved).                                                                                                                                                                                                     | REQ-BOOK-002               | unit + e2e           |
| AC3 | **Given** a customer texts a booking word ("book", "reservation", "table", "event", "party", "birthday"), **Then** the reply is free-form and contains the environment's `/book` link; ordering, cancel and status intents keep priority.                                                                                                                                                                                                                                      | REQ-WA-020                 | unit + e2e           |
| AC4 | **Given** a booking, **Then** staff in csr, manager, admin and super-admin see it in `/dashboard/bookings` (filters: type, status, date range; list and date-grouped calendar), open its detail (all fields, status, assignee, internal notes, replies), confirm or decline it (sending `booking_update`), and each status change is audit-logged; other roles cannot open the pages or call the actions.                                                                      | REQ-BOOK-003               | unit + e2e           |
| AC5 | **Given** a new booking, **Then** `StaffNotificationService.raise('booking' or 'event')` creates one alert linking to `/dashboard/bookings/{id}`; a failure to alert never fails the customer's submission.                                                                                                                                                                                                                                                                    | REQ-BOOK-003, REQ-DASH-003 | unit + e2e           |
| AC6 | **Given** a signed-in customer with bookings, **Then** `/profile/bookings` lists only their own with status, and `/profile/bookings/{id}` shows one (read-only); another customer's id returns not found.                                                                                                                                                                                                                                                                      | REQ-BOOK-004               | unit + e2e           |
| AC7 | **Given** the booking templates, **Then** `docs/whatsapp-templates/booking_received.json`, `booking_update.json` and their catalogue entries exist, the UAT copies are submitted with the status recorded in evidence, and the welcome templates' `holdUntil` note is satisfied once `/book` is live on UAT (UAT submission recorded; production is an operator step).                                                                                                         | REQ-WA-020                 | unit + evidence file |

### SRS items proposed/touched

| AC  | SRS item                | Status  | Notes                                            |
| --- | ----------------------- | ------- | ------------------------------------------------ |
| AC1 | REQ-BOOK-001 (new)      | written | `/book` form, PIN gate, validation, rate limit   |
| AC2 | REQ-BOOK-002 (new)      | written | confirmation and `booking_received`              |
| AC3 | REQ-WA-020 (new)        | written | booking intent; also covers AC7 templates        |
| AC4 | REQ-BOOK-003 (new)      | written | dashboard list, calendar, detail, replies, audit |
| AC5 | REQ-DASH-003 (existing) | touched | booking and event alerts now raised              |
| AC6 | REQ-BOOK-004 (new)      | written | customer "My bookings"                           |
| AC7 | REQ-WA-020              | written | templates                                        |

Stories → tests (Meta mocked, `ENABLE_WHATSAPP_NOTIFICATIONS=false`, `NotificationLog` assertions): `e2e/critical/booking-customer.spec.ts` (US-A5.1–A5.6, A5.8), `e2e/critical/whatsapp-booking-intent.spec.ts` (US-A5.7), `e2e/critical/booking-dashboard.spec.ts` (US-B5.1, B5.2).

## 2. Scope

- **In scope:** `models/booking-model.ts` + `interfaces/booking.interface.ts` (new, exported from `models/index.ts`), a booking-number counter; `services/booking-service.ts` (create with rate limit and validation, list/filter, status change, assignee, notes, reply, customer reads); `app/actions/booking/*` (customer submit; staff actions role-gated); `app/(customer)/book/page.tsx` and a client form; `app/(customer)/profile/bookings/*`; `app/dashboard/bookings/*` (list, calendar, detail) with a role-gated layout; nav: "Book" in `navbar.tsx` and `footer.tsx`, "Bookings" and (REQ-130) "Support" in `dashboard-nav.tsx`; booking intent in `services/whatsapp-inbound-service.ts` and its reply text; `lib/notification-templates.ts` (`booking_received`, `booking_update` transactional, held-until-approved), `lib/whatsapp-template-params.ts`, `lib/whatsapp-notification-catalogue.ts`, `docs/whatsapp-templates/*` and `docs/whatsapp-templates.md`; audit-log entries; `StaffNotificationService.raise`.
- **Out of scope:** deposits and payment for bookings; automatic table allocation; customer cancellation of a booking; changes to the sign-in flow; submitting production templates (operator).

### Surface inventory

| Surface                                | Process      | Role gate                                          |
| -------------------------------------- | ------------ | -------------------------------------------------- |
| `/book` and submit action              | A (customer) | public page; submit needs a customer session (PIN) |
| `/profile/bookings`, `…/{id}`          | A (customer) | signed-in owner                                    |
| WhatsApp booking intent                | A (customer) | none (reply is a link only)                        |
| `/dashboard/bookings`, detail, actions | B (staff)    | csr, manager, admin, super-admin                   |
| Dashboard nav "Bookings", "Support"    | B (staff)    | same roles as the pages they open                  |

## 3. Architecture decisions

- **No ADR needed** — REQ-129 adds a self-contained `Booking` collection and its pages by reusing decisions already recorded: WhatsApp-PIN sign-in (ADR-008), staff alerts (ADR-011), the central send gate and held templates (ADR-014), and the embedded-replies shape of `SupportTicket`. Signals examined: new third-party dependency, new external service and new database tier: none; pattern change across more than three files: none (a new feature on existing patterns, not a change to them); schema-level change: one new collection that no other collection references; risk class MEDIUM (below the ADR threshold); `sdlc-config.json` sets no `adr_author.file_paths_signal_architecture`, and the default prefixes (`lib/services/`, `lib/repositories/`, `prisma/`, `infra/`) match none of the touched paths.

## 4. E2E test coverage

Delegated to `e2e-test-engineer` in Phase 2 (`e2e/critical/booking-customer.spec.ts`, `e2e/critical/whatsapp-booking-intent.spec.ts`, `e2e/critical/booking-dashboard.spec.ts`), PIN flows with `ENABLE_E2E_PIN_INTERCEPT=true` and `e2e/helpers/customer-auth.ts`, inbound WhatsApp with `e2e/helpers/whatsapp-webhook.ts`. UI regression sweep over `e2e/` for the navigation strings changed (navbar, footer, dashboard nav).

## 5. Threat model + security considerations

| STRIDE                 | Threat                                                                          | Mitigation                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Spoofing               | Booking in someone else's name or phone                                         | Phone comes from the verified session, never the form (D3); name is free text but tied to the verified phone                                 |
| Tampering              | Client sends another user's id, a status, or an assignee                        | Server action ignores such fields on create; staff actions re-check role and validate with Zod                                               |
| Repudiation            | Staff change a booking with no trail                                            | Audit-log every status change, assignee and reply with actor                                                                                 |
| Information disclosure | A customer reads another customer's booking (IDOR); staff pages reach customers | Customer reads are owner-scoped queries (not found otherwise); dashboard layout and each action check the role                               |
| Denial of service      | Spam bookings flood staff and WhatsApp                                          | PIN-verified sender, 5 per phone per business day counted in the database (D1), guest and text length caps; alerts de-duplicated per booking |
| Elevation              | `kitchen` or a customer reaches Bookings or Support                             | `requireRole` in layouts and `hasAnyRole` in actions; nav entries filtered by the same roles; negative tests (AC4, REQ-130 AC2)              |
| Injection              | Markup or WhatsApp formatting in free text                                      | React escapes output; reply text sent as WhatsApp text only; length limits                                                                   |

No new dependency or secret. New outbound message types are covered by the existing consent and send gates.

### Risk register entries

Entries in `compliance/risk-register.md` (the project register uses `R-NNN` ids). The operator signs off each residual rating at the Phase 3 sign-off exchange.

- **R-85 — Spam or abuse of the public booking form floods staff and WhatsApp** — OPEN, residual low × medium. Verified session, 5 per phone per business day in the database, length caps, de-duplicated alerts.
- **R-86 — One customer reads another customer's booking or personal data** — OPEN, residual low × medium. Owner-scoped reads, phone from the session, role-gated dashboard and actions, audit log.
- **R-87 — A booking is saved but staff never see it, or the customer is never answered** — OPEN, residual medium × low. List is the source of truth, best-effort alert, `held_template_pending` visible, status under My bookings, existing alert escalation.

## 6. Data protection (GDPR Art. 25)

A booking holds name, phone, event details and free-text requests; staff notes and replies are staff-entered. Purpose: respond to the enquiry. Lawful basis: steps at the customer's request before a contract (and legitimate interest for staff follow-up). Phone is the verified WhatsApp number and is read-only on the form. Messages go only to customers with consent for transactional messages. Retention follows WA-14 (retention schedule, to follow); until then bookings are kept. Customers can read their own bookings; staff access is role-gated and audit-logged.

## 7. AI / model considerations (EU AI Act Art. 11)

No AI in scope. AI assistance in authoring is disclosed in `ai-use-note.md`.

## 8. Rollback plan

Revert the PR. The `Booking` collection and counter are additive and ignored by older code; the nav links disappear with the revert. Messages already sent cannot be recalled. Submitted Meta templates stay in review and are harmless.

## 9. Verification

`npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, the three new critical specs, the UI regression sweep; UAT on `https://wawagardenbar-uat.ostendo.io` (agent-executed per `uat.mode: auto`) including a live UAT `booking_received` and `booking_update` round trip once the UAT template copies are APPROVED. Production smoke after release.

## 10. Sign-off

Plan authored 2026-11-27. Approval: operator confirmed the bundle and the scope at the Phase 0 decision (MEDIUM risk, no plan checkpoint). Decisions D1–D8 stand as written unless the operator replies with a change.
