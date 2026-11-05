---
title: 'Implementation plan — REQ-118'
requirement_id: 'REQ-118'
risk_class: 'MEDIUM'
change_type: 'feat'
authored_by: 'sdlc-implementer (Claude) for operator'
authored_at: '2026-11-05'
---

# Implementation plan — REQ-118

Issue: #972 (WA-10, tracker #953). Own risk class MEDIUM: customer messages and staff replies over WhatsApp (personal data, outbound messaging, template use), additive changes to one model, no authentication or payment surface. **Declared bundle** with REQ-117 (#966, the primary REQ): one branch `feat/bundle-wa-04-wa-10`, one PR, one release; the bundle runs at the higher risk class, HIGH. Eligibility was checked: the files are disjoint from REQ-117.

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

Closes ISO 29119 §3.4 (§1), ISO 27001 A.8.25 (§5), GDPR Art. 25 (§6), EU AI Act Art. 11 (§7).

## 1. Goal + acceptance criteria

- **Goal:** A customer has one ongoing support conversation. Inbound WhatsApp messages append to their open ticket, staff replies go out as a free-form message inside the 24-hour window and as the `support_reply` template outside it, and "Chat with staff" raises an urgent ticket with a 15-minute SLA that sorts first.

| AC  | Description (Given / When / Then)                                                                                                                                                                                                                                                                               | Verification                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| AC1 | **Given** a customer with an open ticket (status not resolved or closed), **When** they send further WhatsApp messages, **Then** each is appended to that ticket as a customer reply; a new ticket is created only when none is open; a resolved ticket is reopened if the customer replies within 72 hours.    | `e2e/critical/whatsapp-support-thread.spec.ts` (US-A4.7); unit |
| AC2 | **Given** a staff reply, **When** the customer's last inbound message is within 24 hours, **Then** a free-form text is sent; otherwise the `support_reply` template is sent with its header and body parameters; the reply box shows "Free message" or "Template message: the customer hasn't messaged in 24h". | same spec (US-B4.1, US-B4.2); unit                             |
| AC3 | **Given** the customer taps "Chat with staff", **Then** the ticket is `urgent` with `slaDueAt` fifteen minutes ahead; the queue sorts by SLA and highlights overdue tickets.                                                                                                                                    | same spec (US-A4.8); unit                                      |
| AC4 | **Given** this release, **Then** `support_reply` is submitted to both the UAT and the production WhatsApp accounts (operator task) and its status is tracked per environment in the evidence.                                                                                                                   | operator evidence                                              |

The queue shows the customer's first name and phone, and the detail view shows the thread oldest first (tasks 4 in the issue; covered by the unit tests under AC1).

## SRS items proposed/touched

| AC  | SRS item                                | Status                                               | Notes                                                                |
| --- | --------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------- |
| AC1 | REQ-WA-005 (existing), REQ-WA-011 (new) | update, stub                                         | inbound routing appends to the open ticket; thread and reopen policy |
| AC2 | REQ-WA-003 (existing), REQ-WA-012 (new) | update, stub                                         | window-aware reply mode shown to staff                               |
| AC3 | REQ-WA-013 (new)                        | stub                                                 | human-handoff urgency, SLA and queue ordering                        |
| AC4 | n/a                                     | `@srs-deferred`: operator task, no product behaviour | template submission                                                  |

## 2. Scope

In scope: support ticket threading, the reopen window, window-aware reply sending, the human-handoff SLA, the queue and detail views. Out of scope: staff notification bell (WA-12).

### Surface inventory

| Surface                                                                    | Change                                                                                                                                                                                                     |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `services/support-ticket-service.ts`                                       | thread append, reopen within 72 hours, window check, SLA fields                                                                                                                                            |
| `models/support-ticket-model.ts`                                           | additive fields `lastCustomerMessageAt`, `slaDueAt`; the `priority` enum gains `urgent` (today `low`, `normal`, `high`); reply author role `customer` is already supported                                 |
| `app/dashboard/support/*`                                                  | queue sorted by SLA with overdue highlight, thread view, reply mode label                                                                                                                                  |
| `services/whatsapp-inbound-service.ts`                                     | route `support_text` and `chat_with_staff` into the open ticket; `chat_with_staff` today only drives the welcome and queued actions, so it must now also create or append to the ticket and mark it urgent |
| `models/incoming-message-model.ts`                                         | read `lastInboundAt` per phone                                                                                                                                                                             |
| `docs/whatsapp-templates/support_reply.json`, `docs/whatsapp-templates.md` | confirm template definition                                                                                                                                                                                |

## 3. Architecture decisions

- **No ADR needed.** Additive fields on one existing model, no new dependency, service, queue or external system, and no change to a cross-cutting pattern. The reply-mode rule (24-hour window) is recorded in SRS REQ-WA-012.

## 4. E2E test coverage

New critical spec `e2e/critical/whatsapp-support-thread.spec.ts` (US-A4.7, US-B4.1, US-B4.2, US-A4.8) at the transport level with WhatsApp off, asserting `NotificationLog` rows (free-form versus template) and ticket state. Delegated to `e2e-test-engineer`.

### Test data requirements

A customer user and phone per test, created and removed inside the spec; tickets and incoming messages are created by posting signed webhook payloads with the shared helper. No shared rows are mutated.

## 5. Threat model + security considerations

| Threat (STRIDE)                                                          | Surface   | Mitigation                                                          |
| ------------------------------------------------------------------------ | --------- | ------------------------------------------------------------------- |
| Spoofing: forged inbound messages                                        | webhook   | signature check and dedup from REQ-116 (unchanged)                  |
| Information disclosure: wrong customer sees a thread                     | dashboard | queue and detail stay behind the existing support RBAC              |
| Tampering: reply sent outside the window fails or goes to the wrong mode | AC2       | mode computed server-side from `lastInboundAt`, not from the client |
| Denial of service: message flood grows one ticket                        | threading | the per-phone rate limit from REQ-116 applies                       |

### Risk register entries

- **R-051 — Support reply sent in the wrong mode or outside the 24-hour window** (opened by `risk-register-keeper`; the operator signs off at plan approval) — OPEN, mitigated by server-side mode selection and tests; MITIGATED after the live UAT round-trip.

## 6. Data protection (GDPR Art. 25)

Personal data: phone, first name and message text, already stored in support tickets. Lawful basis: Art. 6(1)(b) for service messages. No new data category; two timestamps are added. Retention of tickets is unchanged here (WA-14 owns retention).

## 7. AI / model considerations (EU AI Act Art. 11)

No AI in scope. Implementation was drafted with Claude Code (disclosed on every commit).

## 8. Rollback plan

Revert the bundle merge. The new ticket fields are additive and ignored by the old code. Tickets already threaded stay as one ticket with several customer replies.

## 9. Verification

Unit tests per AC; the critical e2e spec; a live UAT round-trip after the UAT copy of `support_reply` is APPROVED (operator, Level 2 evidence).

## 10. Operator tasks (non-code)

1. Submit `support_reply` to the UAT and the production WhatsApp accounts at plan approval (24 to 48 hour review). Track the status per environment in the evidence.
2. Live UAT round-trip once approved; production enable after the production copy is approved. Until then replies outside the window fall through to the existing email path.
3. Sign off R-051 at plan approval.

## 11. Sign-off

- **Plan approved by operator:** approved 2026-11-05 (HIGH-risk checkpoint, bundle ceremony): the operator said `continue` after the checklist. `support_reply` submission status is not confirmed here; it stays an operator task.
