---
title: 'Implementation plan — REQ-122'
requirement_id: 'REQ-122'
risk_class: 'HIGH'
change_type: 'feat'
authored_by: 'sdlc-implementer (Claude) for operator'
authored_at: '2026-11-16'
---

# Implementation plan — REQ-122

Issue: #974 (WA-12, tracker #953). Own risk class HIGH: it stores staff phone numbers and consent, sends WhatsApp messages to staff, runs a minute-by-minute escalation job, and decides which role sees which alert. **Declared bundle** with REQ-121 (#968, the primary REQ): one branch `feat/bundle-wa-06-wa-12-checkout-staff-alerts`, one PR and one portal release; this REQ is the `co_tracked` member. Bundle ceremony runs at HIGH.

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

Closes ISO 29119 §3.4 (§1), ISO 27001 A.8.25 (§5), GDPR Art. 25 (§6), EU AI Act Art. 11 (§7).

## 1. Goal + acceptance criteria

- **Goal:** New customer orders and support messages raise an alert that cannot be ignored: a live bell and sound in the dashboard, a Needs-attention panel, and, if nobody acknowledges in time, a WhatsApp message to on-shift staff and then to an escalation role.

| AC  | Description (Given / When / Then)                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Verification                                                                                    | SRS-ID                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | -------------------------------------- |
| AC1 | **Given** a customer order is paid, or a support ticket is created or receives a customer reply, **Then** one `StaffNotification` is raised through `StaffNotificationService.raise(type, ref, title)` according to the rule for that type; staff-created orders raise nothing. The model and helper also accept `booking`, `event` and `refund` types for WA-13 and WA-11 to call (see gap G2).                                                                                     | `e2e/critical/staff-notifications.spec.ts` (US-B5.3) + unit                                     | REQ-DASH-003 (new)                     |
| AC2 | **Given** a csr is on the dashboard, **When** an alert is raised, **Then** the bell count increases live, a toast shows and `/sounds/new-order.mp3` plays, the tab title shows `(n)`; the dropdown lists title, age and link; "Acknowledge" and "Acknowledge all" work; opening the linked item acknowledges it.                                                                                                                                                                     | same spec (US-B5.3, US-B5.9)                                                                    | REQ-DASH-004 (new)                     |
| AC3 | **Given** unacknowledged items visible to the user, **Then** `app/dashboard/page.tsx` shows a Needs-attention panel, oldest first, with minutes waiting.                                                                                                                                                                                                                                                                                                                             | same spec (US-B5.4)                                                                             | REQ-DASH-005 (new)                     |
| AC4 | **Given** a staff member enters an alert number, **When** they verify the WhatsApp PIN, **Then** `alertPhoneVerified` is true and the consent timestamp is stored; the alert number is separate from the customer `phone`.                                                                                                                                                                                                                                                           | `e2e/critical/staff-alert-number.spec.ts` (US-B5.5)                                             | REQ-AUTHA-008 (new)                    |
| AC5 | **Given** the top bar, **Then** an On-shift toggle beside the bell sets `onShift`.                                                                                                                                                                                                                                                                                                                                                                                                   | `staff-notifications.spec.ts` + unit                                                            | REQ-DASH-006 (new)                     |
| AC6 | **Given** Settings, Notifications, "Staff alerts", **Then** per-type rules (in-app roles, WhatsApp delay, WhatsApp roles, escalation delay, escalation roles, named users, quiet hours with in-app only) are stored in system settings with the issue's defaults, and an admin change (for example booking WhatsApp delay 15 minutes) is what the job uses.                                                                                                                          | `__tests__/jobs/staff-alert-escalation.test.ts` (US-B5.10)                                      | REQ-SETTINGS-006 (new)                 |
| AC7 | **Given** an unacknowledged notification past `whatsappAfterMinutes`, **Then** the job sends `staff_alert` once per level to on-shift users with a verified alert number holding a `whatsappRoles` role; with nobody on shift it goes straight to the escalation roles; past `escalateAfterMinutes` it sends once to `escalateRoles`; a user with several roles receives one message per level; opening the item stops escalation and records `acknowledgedBy` and `acknowledgedAt`. | `staff-alert-escalation.test.ts` (US-B5.6 to US-B5.8) + `staff-notifications.spec.ts` (US-B5.9) | REQ-WA-014 (new)                       |
| AC8 | **Given** a message from a verified staff `alertPhone`, **Then** the inbound router does not treat it as a customer (no welcome, no ticket) and replies "Thanks, please open the dashboard to handle alerts."                                                                                                                                                                                                                                                                        | `e2e/critical/whatsapp-staff-number-routing.spec.ts` (US-B5.11)                                 | REQ-WA-015 (new), REQ-WA-005 (updated) |
| AC9 | **Given** this release, **Then** the `staff_alert` template definition is in `docs/whatsapp-templates.md` and `docs/whatsapp-templates/staff_alert.json`; submitting it to the UAT and production WhatsApp accounts is an operator-confirmed task and its status is tracked per environment.                                                                                                                                                                                         | operator evidence                                                                               | `@srs-deferred` (operator task)        |

### Requirements gap raised at Phase 1 (devaudit-installer#212) — DECIDED: (b) amend, approved 2026-11-16

- **Gap G2 (AC1):** the issue says the raise helper is wired to four sources, but the booking source (WA-13, #975) and the refund-request source (WA-11, #973) do not exist yet. `markOrderPaid` named in the issue also does not exist: the customer-order paid hook is `OrderService.updatePaymentStatus` in `services/order-service.ts` (called with `paymentStatus: 'paid'`), restricted to orders whose `origin` is `customer` (REQ-120). **Proposed handling: (b) amend AC1** as written above: wire the order-paid and support sources now; WA-13 and WA-11 call the helper when they land, with the shared model, rules and tests already covering those types. If the operator prefers (a), accept the gap as is; if (c), file a follow-up. AC2 to AC8 are unaffected.

## SRS items proposed/touched

| AC  | SRS item                                | Status                                               | Notes                                   |
| --- | --------------------------------------- | ---------------------------------------------------- | --------------------------------------- |
| AC1 | REQ-DASH-003 (new)                      | prose drafted                                        | model, raise helper, sources            |
| AC2 | REQ-DASH-004 (new)                      | prose drafted                                        | bell, sound, toast, acknowledge         |
| AC3 | REQ-DASH-005 (new)                      | prose drafted                                        | Needs-attention panel                   |
| AC4 | REQ-AUTHA-008 (new)                     | prose drafted                                        | alert number, PIN verification, consent |
| AC5 | REQ-DASH-006 (new)                      | prose drafted                                        | on-shift toggle                         |
| AC6 | REQ-SETTINGS-006 (new)                  | prose drafted                                        | rules, defaults, quiet hours            |
| AC7 | REQ-WA-014 (new)                        | prose drafted                                        | escalation job                          |
| AC8 | REQ-WA-015 (new), REQ-WA-005 (existing) | new, updated                                         | verified staff numbers not customers    |
| AC9 | n/a                                     | `@srs-deferred`: operator task, no product behaviour | template submission                     |

The new items carry full Given/When/Then prose written by the aligner; the operator reviews them at plan approval. No heading versus index-table drift for DASH, SETTINGS, AUTHA, WA or CHECKOUT. Advisory drift found elsewhere, unrelated to this bundle: REQ-ORDMGT-011, -012, -015, -016 appear in only one of the two representations.

## 2. Scope

In scope: `models/staff-notification-model.ts` and `StaffNotificationService`; hooks in `OrderService.updatePaymentStatus` (customer origin) and `SupportTicketService` (create and customer reply); the bell, the toast, sound, tab title and live `staff-notification` socket event; the Needs-attention panel; staff alert number, consent and verification (`alertPhone`, `alertPhoneVerified`, `alertsEnabled`, `onShift`, consent timestamp on `models/user-model.ts`); create and edit admin dialogs and the staff account page; the On-shift toggle; the Staff alerts settings and defaults; the escalation job in `lib/scheduled-jobs.ts`; the inbound router rule for staff numbers; the `staff_alert` template files. Out of scope: rider and dispatch assignment, browser push notifications, the booking and refund alert sources (WA-13, WA-11).

### Surface inventory

| Surface                                     | URL / file                                                                                                                     | Status                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Dashboard top bar bell and On-shift toggle  | `app/dashboard/layout.tsx` (placeholder at the "Future: Notifications" comment), `components/features/admin/dashboard-nav.tsx` | In scope                                                       |
| Needs-attention panel                       | `app/dashboard/page.tsx`                                                                                                       | In scope                                                       |
| Kitchen sound and subscription              | `components/features/kitchen/kitchen-order-grid.tsx`, `/sounds/new-order.mp3`                                                  | Already works: bell reuses the sound; kitchen screen unchanged |
| Staff alert number in admin dialogs         | `components/features/admin/create-admin-dialog.tsx`, `edit-roles-dialog.tsx`, `app/actions/admin/admin-management-actions.ts`  | In scope                                                       |
| Staff own account page and PIN verification | `app/actions/auth/send-whatsapp-pin.ts`, `verify-whatsapp-pin.ts`                                                              | In scope: reuse of the WhatsApp PIN flow                       |
| Alert rules form                            | `components/features/admin/notification-settings-form.tsx`, `app/dashboard/settings/*`, `services/system-settings-service.ts`  | In scope                                                       |
| Escalation job                              | `lib/scheduled-jobs.ts`                                                                                                        | In scope                                                       |
| Inbound router                              | `services/whatsapp-inbound-service.ts`                                                                                         | In scope                                                       |
| Booking and refund alert sources            | WA-13 (#975), WA-11 (#973)                                                                                                     | Out of scope (waived), tracked as #975 and #973                |

## 3. Architecture decisions

- **ADR-011 — Staff notification subsystem: persisted notifications, live socket event, minute escalation job, staff-own consent** — Proposed by `adr-author`. Draft at `docs/ADR/ADR-011-staff-notification-subsystem.md`. Signals matched: a new persisted model, a new socket event, a new scheduled job, a new staff delivery path outside the customer consent flow, risk class HIGH. Accepted by the operator at plan approval, 2026-11-16.

## 4. E2E test coverage

New critical specs: `e2e/critical/staff-notifications.spec.ts` (US-B5.3, US-B5.4, US-B5.9), `staff-alert-number.spec.ts` (US-B5.5), `whatsapp-staff-number-routing.spec.ts` (US-B5.11); the escalation timing cases (US-B5.6 to US-B5.8, US-B5.10) are unit tests with fake timers in `__tests__/jobs/staff-alert-escalation.test.ts`. Per-AC `tagTest('REQ-122', n)`. Delegated to `e2e-test-engineer`.

### Test data requirements

Staff users with roles csr, kitchen, manager and a multi-role csr+manager user, each with a verified alert number and `onShift` set per test, created inside the spec or test (existing `e2e-admin`, `e2e-csr` seed accounts are not mutated). A customer order is created through the existing customer-auth helper and paid with the payment-provider mock; WhatsApp is off (Meta mocked), asserting `NotificationLog` rows. Seed and reset stay with the `e2e-test-data` skill.

## 5. Threat model + security considerations

| Threat (STRIDE)                                                                  | Surface  | Mitigation                                                                                                                                    |
| -------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Spoofing: a customer messages from a staff number, or a staff number is hijacked | AC4, AC8 | the alert number must pass the WhatsApp PIN verification; routing treats only verified `alertPhone` as staff; a mismatch is never auto-linked |
| Information disclosure: alert content or links shown to the wrong role           | AC2, AC3 | notifications are filtered by the user's `roles` (any-of helpers from `lib/session.ts`, ADR-009); no new direct `session.role ===` checks     |
| Tampering: a user acknowledges or edits rules without permission                 | AC2, AC6 | Staff alerts rules require an admin permission; acknowledge is limited to items visible to the user                                           |
| Denial of service / alert fatigue or spam                                        | AC7      | each level sent once, multi-role dedup, quiet hours, per-user rate cap in the job                                                             |
| Repudiation                                                                      | AC2, AC7 | `acknowledgedBy`, `acknowledgedAt` and `NotificationLog` rows are the audit trail                                                             |
| Elevation of privilege via inbound router                                        | AC8      | a staff reply cannot trigger customer actions; the only reply is the fixed thanks message                                                     |

**Secrets / credentials:** none added (existing WhatsApp token and webhook secret). **Dependencies introduced:** none.

### Risk register entries

This REQ opens the following entries in `compliance/risk-register.md` (operator edits the rows and signs off the residual ratings at plan approval):

- **R-63 — Missed or late staff alerts** — OPEN, residual low × high.
- **R-64 — Duplicate, runaway or noisy WhatsApp alerts to staff** — OPEN, residual low × medium.
- **R-65 — Staff alert numbers: wrong or hijacked number, consent and retention** — OPEN, residual low × medium.
- **R-66 — Staff alerts shown or sent to the wrong role** — OPEN, residual low × medium.

## 6. Data protection (GDPR Art. 25)

**Personal data processed:** yes. Data subjects: staff. Categories: a separate alert phone number, a verification flag and consent timestamp, an on-shift flag, acknowledgement history. Special categories: none. Lawful basis: Art. 6(1)(f), legitimate interest in operating the business, with the staff member's own consent recorded for the WhatsApp number. Purpose limitation: the alert number is used only for `staff_alert` and routing; it is separate from the customer `phone`. Data minimisation: one number and flags only; no message content beyond a reference and a title. Retention: notifications are kept for the audit window and purged by the retention rules in WA-14; alert numbers are removed when a staff account is deleted. ROPA: add the staff alert processing. DPIA: not required. Cross-border transfers: WhatsApp (Meta) as for existing messaging.

## 7. AI / model considerations (EU AI Act Art. 11)

N/A: this REQ does not introduce or change AI behaviour. Implementation is drafted with Claude Code (disclosed on every commit).

## 8. Rollback plan

Revert the bundle merge. The new collection (`staffnotifications`) and the additive user fields are ignored by the old code; the escalation job disappears with the revert. Disable alerting without a deploy by turning `alertsEnabled` off in settings. Notification path: the operator, immediately, through the release-incident route.

## 9. Verification

Unit tests per AC (model and service, role filtering, rule defaults, quiet hours, escalation levels with fake timers, dedup, on-shift fallback, router); the critical e2e specs above; a live UAT round-trip after the UAT copy of `staff_alert` is APPROVED (Level 2 evidence); UAT executed by the agent with a named independent reviewer.

## Plan deviation

Implementation approach changes found while building; none changes an acceptance criterion (implementation deviations, not requirements gaps).

1. **Where the Needs-attention panel shows.** The plan puts it on `app/dashboard/page.tsx`, but csr, manager and admin are redirected from that page to `/dashboard/orders` (REQ-DASH-002), so only super-admin would see it. The panel is one shared component shown on `/dashboard` and at the top of `/dashboard/orders`, where the roles that receive alerts land.
2. **No `held_template_pending` status.** The programme text describes a held state while a template is pending, but nothing in the code implements one. While `staff_alert` is not approved, the send fails and is logged in `NotificationLog` as `failed` with Meta's error code; the level is still claimed once, so it is not retried every minute; in-app alerts continue. R-63 is mitigated by the in-app alert and the escalation to the next role, not by a hold.
3. **The socket event carries only an id and a type.** The socket rooms have no authentication, so the live signal tells the client to refetch through an authenticated, role-scoped action. This is a stricter version of the plan's "persisted row is authoritative" and keeps R-66 closed. The list also polls every 30 seconds.
4. **A paid-order hook in four places.** `markOrderPaid` does not exist. A customer order becomes paid in `OrderService.updatePaymentStatus`, the Monnify and Paystack webhooks and the `verifyPayment` action; each calls `raiseForPaidOrder`. One alert per item for orders, even if a webhook retries after staff acknowledged it.
5. **A staff account page.** There was no page where a staff member could enter and verify their own number, and kitchen-only staff reach only a few routes. `/dashboard/account` (all staff roles, in the route allowlist and the sidebar) holds the alert number card.
6. **Alert number rules added.** A number that belongs to a customer account, or is already verified for another staff member, is refused, so a customer can never be treated as staff by the inbound router. `alertsEnabled` has a switch on the account page.
7. **Opening the item acknowledges it** from the bell, and also when the order or ticket page is opened directly (`AcknowledgeOnOpen`).
8. **Levels are claimed even when nobody is reachable**, so a run does not retry every minute. Quiet hours hold WhatsApp without claiming a level, so the alert goes out when they end.

## 10. Operator tasks (non-code)

1. ~~Decide requirements gap G2~~ done: (b) amend.
2. **Confirm before submitting** `staff_alert` to the UAT account (WGB DEV, +44 7363 078509, URL button base `https://wawagardenbar-uat.ostendo.io`) and the production account (+234 814 825 3342, base `https://app.wawagardenbar.com`); submission is an outward Meta action and is done only on the operator's yes. Track status per environment in the evidence. Until approved, the WhatsApp send fails and is logged as `failed` (Meta's error code), and staff see in-app alerts only.
3. Staff set and verify their alert numbers and the on-shift toggle after release; sign off the risk entries at plan approval.

## 11. Sign-off

- **Plan approved by operator:** William (william@ostendo.io, via the shared GitHub login metasession-dev), 2026-11-16, in the Claude Code session (HIGH-risk checkpoint, bundle ceremony). Decisions: gap G2 = (b) amend (AC1 wires paid customer orders and support now; WA-13 and WA-11 call the helper later); ADR-011 accepted.
