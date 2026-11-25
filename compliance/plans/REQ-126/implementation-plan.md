---
title: 'Implementation plan — REQ-126'
requirement_id: 'REQ-126'
risk_class: 'MEDIUM'
change_type: 'feat'
authored_by: 'sdlc-implementer (Claude Sonnet 5.5)'
authored_at: '2026-11-25'
---

# Implementation plan — REQ-126

Issue: [#1084](https://github.com/metasession-dev/wawagardenbar-app/issues/1084) — WA-16 WhatsApp "order" gets the menu link; order-status enquiries raise an urgent support ticket. Parent tracker: #953. Member of the bundle led by REQ-125 (#1082); replaces the part of WA-09 (#971, closed as not planned) the business still wants.

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

Closes ISO 29119 §3.4 (§1, §9), ISO 27001 A.8.25 (§5), GDPR Art. 25 (§6), EU AI Act Art. 11 (§7).

## 1. Goal + acceptance criteria

- **Goal:** All orders are made in the app. A customer who texts "order" gets the menu link; a customer who asks where their order is gets a short acknowledgement and an **urgent** support ticket for staff, with no order data sent by text.

| AC  | Description (Given / When / Then)                                                                                                                                                                                                                                                                                                                                                    | SRS-ID               | Verification |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- | ------------ |
| AC1 | **Given** any customer state (new, returning, dormant, known), **When** they text "order", "menu", "food" or "drink" (or the welcome quick reply "Order"), **Then** they receive a free-form reply with the current environment's `/menu` URL and no ticket is created.                                                                                                              | REQ-WA-017           | unit + e2e   |
| AC2 | **Given** a customer texts "status", "where is my order" or an order number (`WG` + 10 digits), **When** the message is processed, **Then** an **urgent** support ticket is opened (or the open one is escalated), the customer gets a short acknowledgement ("a member of staff will message you shortly"), and **no order status or order data is returned by text**.              | REQ-WA-018           | unit + e2e   |
| AC3 | **Given** the customer already has an open ticket, **When** they send a status enquiry, **Then** that ticket is raised to urgent and the message is appended; no second ticket is created.                                                                                                                                                                                           | REQ-WA-018           | unit + e2e   |
| AC4 | **Given** an urgent ticket from a status enquiry, **Then** staff are alerted through the WA-12 support alert rule and the alert text reads "Order status enquiry".                                                                                                                                                                                                                   | REQ-WA-018           | unit + e2e   |
| AC5 | **Given** an opted-out customer, **When** they send "order" or "status", **Then** the existing STOP handling applies unchanged: no marketing, and the order reply is a service reply to a message they sent; precedence is opt-out/opt-in, then chat-with-staff, then status, then order, then ordinary support text; "where is my order" is a status enquiry, not an order request. | REQ-WA-005 (updated) | unit         |
| AC6 | **Given** another customer's order number, **Then** the reply and the ticket reveal nothing about that order.                                                                                                                                                                                                                                                                        | REQ-WA-018           | unit + e2e   |

Stories → tests: US-A3.1 → `e2e/critical/whatsapp-order-link.spec.ts` (AC1, AC5); US-A4.5–US-A4.8 → `e2e/critical/whatsapp-status-enquiry.spec.ts` (AC2–AC4, AC6).

Note on AC5: the original issue text says "an opted-out customer gets no reply". STOP in WA-02 clears **marketing** consent only (REQ-116 AC6), and a text reply to a message the customer just sent is a service message, so this plan keeps the reply. This is recorded under "Plan decisions" below for approval.

### SRS items proposed/touched

| AC        | SRS item              | Status    | Notes                                                              |
| --------- | --------------------- | --------- | ------------------------------------------------------------------ |
| AC1       | REQ-WA-017 (new)      | written   | order link in every customer state                                 |
| AC2       | REQ-WA-018 (new)      | written   | urgent ticket, acknowledgement, no order data                      |
| AC3       | REQ-WA-018 (new)      | written   | escalate the open ticket, no duplicate                             |
| AC4       | REQ-WA-018 (new)      | written   | staff alert via the support alert rule                             |
| AC5       | REQ-WA-005 (existing) | updated   | one Given added: order and status messages answered in every state |
| AC6       | REQ-WA-018 (new)      | written   | no disclosure of another phone's order                             |
| (context) | REQ-WA-013 (existing) | unchanged | the urgent ticket and 15-minute SLA are reused as is               |

Table/heading drift check: none for REQ-WA (table and heading maxima agree at 015 before this REQ, 018 after).

## 2. Scope

- **In scope:**
  - `models/incoming-message-model.ts`: add `order_start` and `order_status` to `IncomingMessageIntent` (and the schema enum).
  - `services/whatsapp-inbound-service.ts`: `classifyMessageIntent` (two new regex intents, precedence per AC5); in `handle`, a branch ahead of the welcome-template routing so "order" and "status" are answered in every customer state; `order_start` replies with `sendTextMessage` (menu link built from the environment base URL setting already used for template buttons); `order_status` calls `openSupportTicket(from, body, userId, true)` and sends the acknowledgement.
  - `services/support-ticket-service.ts` only if the ticket needs a reason tag ("Order status enquiry") for the staff alert text; otherwise a marker in the ticket subject.
  - `services/staff-notification-service.ts`: the support alert label for this path.
  - `docs/whatsapp-templates.md`: note that no template is added.
- **Out of scope:** interactive buttons, signed single-use links, a WhatsApp ordering session (all dropped with WA-09); automatic status replies by text.

### Surface inventory

| Surface                   | Change                                     |
| ------------------------- | ------------------------------------------ |
| Inbound intent classifier | two new intents                            |
| Inbound router            | answer "order" and "status" in every state |
| Support ticket            | urgent, tagged as order status enquiry     |
| Staff alert               | support alert label                        |

## 3. Architecture decisions

- **No ADR needed** — small extension of the existing inbound intent classifier and the existing urgent-ticket path (REQ-WA-013); two new intent values, no new dependency, service, data store or pattern. Signals examined: new dependency no, new external service no, new datastore no, pattern change over three files no (inbound service, intent model, one ticket label), schema change no (enum values only), HIGH risk no (MEDIUM).

## 4. E2E test coverage

Delegated to `e2e-test-engineer` in Phase 2. Specs: `e2e/critical/whatsapp-order-link.spec.ts` and `e2e/critical/whatsapp-status-enquiry.spec.ts`, using the signed-webhook helper `e2e/helpers/whatsapp-webhook.ts` and `NotificationLog` / `SupportTicket` assertions.

## 5. Threat model + security considerations

- **Information disclosure:** a customer must not learn another customer's order status by guessing order numbers. Mitigation: no order data is ever put in the reply text; the ticket is for staff only (AC2, AC6).
- **Ticket flooding by repeated status messages:** an open ticket is escalated and appended, not duplicated (AC3); existing per-sender rate limit from WA-02 applies.
- **Regex over-match** ("order" inside a normal sentence about an issue): precedence puts chat-with-staff and status first, and a false "order" match only returns a link, so the failure is harmless. Ordinary support text without those words still creates a ticket.
- No new secret, dependency or external service.

### Risk register entries

Entries in `compliance/risk-register.md` (the project's register uses `R-NNN` ids). The operator signs off each residual rating at the Phase 3 sign-off exchange.

- **R-79 — Order-status enquiry by WhatsApp discloses another customer's order or floods the support queue** — OPEN, residual low × low. Controls: fixed acknowledgement with no order data, open ticket escalated not duplicated, existing rate limit.

## 6. Data protection (GDPR Art. 25)

No new personal data: the inbound message body already lands in `IncomingMessage` and `SupportTicket` (covered by the retention and export work in WA-14). The reply contains no personal data.

## 7. AI / model considerations (EU AI Act Art. 11)

No AI in scope. AI assistance in authoring is disclosed in `ai-use-note.md`.

## 8. Rollback plan

Revert the bundle PR. The two new intent values are additive; existing rows are unaffected.

## 9. Verification

`npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, the two new critical specs; UAT on the UAT environment (agent-executed, human reviewed). Level 2 (live Meta round-trip) needs no template and can run on UAT immediately.

## 10. Sign-off

Plan approved by: operator, at the Phase 1 checkpoint.
