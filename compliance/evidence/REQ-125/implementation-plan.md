---
title: 'Implementation plan — REQ-125'
requirement_id: 'REQ-125'
risk_class: 'MEDIUM'
change_type: 'feat'
authored_by: 'sdlc-implementer (Claude Sonnet 5.5)'
authored_at: '2026-11-25'
---

# Implementation plan — REQ-125

Issue: [#1082](https://github.com/metasession-dev/wawagardenbar-app/issues/1082) — WA-15 Admin switches for WhatsApp notifications (with purpose, importance and consequences). Parent tracker: #953. **Lead of a declared bundle** with REQ-126 (#1084, WA-16) and REQ-127 (#1031, checkout cart fix); the bundle runs at MEDIUM.

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

Closes ISO 29119 §3.4 (§1, §9), ISO 27001 A.8.25 (§5), GDPR Art. 25 (§6), EU AI Act Art. 11 (§7).

## 1. Goal + acceptance criteria

- **Goal:** An admin can switch each WhatsApp notification on or off from Settings → Notifications. Every switch shows what the message is for, why it matters and what happens if it is off. One gate in the send path enforces the switches, so no sender can bypass them. The sign-in PIN can never be switched off.

| AC  | Description (Given / When / Then)                                                                                                                                                                                                                                                                                                                                                                                                                         | SRS-ID                                   | Verification |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------ |
| AC1 | **Given** the notification catalogue, **When** its unit test runs, **Then** every template in `TEMPLATE_CATEGORIES` is either in the catalogue (with non-empty purpose, why-it-matters and if-switched-off text) or on the explicit always-on list, and the test fails otherwise.                                                                                                                                                                         | REQ-WA-016                               | unit         |
| AC2 | **Given** an admin changes the master switch or a per-notification switch, **When** it is saved, **Then** it persists in system settings, defaults to ON when absent, and takes effect without a redeploy (cached read, invalidated on save).                                                                                                                                                                                                             | REQ-SETTINGS-007                         | unit + e2e   |
| AC3 | **Given** a notification is switched off (or the master switch is off), **When** any caller sends that template through `WhatsAppService.sendMessage` or the `freeFormText` path of `NotificationService.send`, **Then** nothing is sent, the call returns `errorCode: SUPPRESSED_ADMIN_DISABLED`, a `NotificationLog` row records `suppressed_admin_disabled`, and the calling flow (order status change, ticket reply, staff alert) completes normally. | REQ-WA-016                               | unit + e2e   |
| AC4 | **Given** the sign-in PIN (`verification_pin`), **When** the master switch is off or any switch is changed through the UI or the action, **Then** it is still sent and cannot be switched off; the UI shows it locked with the reason. The refund and cancellation messages join the locked list when WA-11 adds them (locked list is one constant).                                                                                                      | REQ-WA-016                               | unit + e2e   |
| AC5 | **Given** an admin opens Settings → Notifications → WhatsApp messages, **Then** each toggle shows its purpose, why it matters and the consequences of switching it off, grouped, with the master switch on top; with the master off the per-notification toggles are disabled and a banner says only locked messages are sent.                                                                                                                            | REQ-SETTINGS-007                         | e2e          |
| AC6 | **Given** an admin switches off staff alerts, payment reminders or order status updates, **When** they confirm the change, **Then** a dialog repeats the consequences first and the change is saved only after confirmation.                                                                                                                                                                                                                              | REQ-SETTINGS-007                         | e2e          |
| AC7 | **Given** any switch changes, **Then** an audit-log entry records who, which key, before and after; and suppressed sends are filterable in the notification log.                                                                                                                                                                                                                                                                                          | REQ-SETTINGS-007                         | unit + e2e   |
| AC8 | **Given** a customer session, a customer-scoped key or a non-admin staff role (csr, kitchen), **When** they call the read or write settings action, **Then** it is rejected; admin and super-admin only.                                                                                                                                                                                                                                                  | REQ-SETTINGS-007                         | unit + e2e   |
| AC9 | **Given** the runbook, **Then** `docs/operations/` explains what each switch does and how to tell a suppressed message from a failed one.                                                                                                                                                                                                                                                                                                                 | @srs-deferred (runbook is documentation) | doc review   |

Stories → tests: US-B4.5–US-B4.9 → `e2e/critical/whatsapp-notification-settings.spec.ts` (AC2–AC8); the catalogue/gate behaviour (AC1, AC3, AC4) is covered by vitest under `__tests__/`.

### SRS items proposed/touched

| AC        | SRS item                    | Status                                                   | Notes                                                                   |
| --------- | --------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------- |
| AC1       | REQ-WA-016 (new)            | written                                                  | catalogue completeness is part of the gate item                         |
| AC2       | REQ-SETTINGS-007 (new)      | written                                                  | persistence, default ON, effective without redeploy                     |
| AC3       | REQ-WA-016 (new)            | written                                                  | suppression, errorCode, log row, flow continues                         |
| AC4       | REQ-WA-016 (new)            | written                                                  | PIN never gated; locked list                                            |
| AC5       | REQ-SETTINGS-007 (new)      | written                                                  | purpose / why / consequences text                                       |
| AC6       | REQ-SETTINGS-007 (new)      | written                                                  | confirmation dialog                                                     |
| AC7       | REQ-SETTINGS-007 (new)      | written                                                  | audit entry, log filter                                                 |
| AC8       | REQ-SETTINGS-007 (new)      | written                                                  | admin and super-admin only                                              |
| AC9       | n/a                         | `@srs-deferred: runbook is documentation, not behaviour` |                                                                         |
| (context) | REQ-WA-006 (existing)       | unchanged                                                | consent model; switches are an admin layer on top, not a consent change |
| (context) | REQ-SETTINGS-006 (existing) | unchanged                                                | staff alert rules; the switch only adds an on/off above them            |

Table/heading drift check: pre-existing and not touched by this REQ: `REQ-ORDMGT-011`, `-012`, `-015`, `-016` have heading blocks but no summary-table row. Per-prefix maxima for WA, SETTINGS and CHECKOUT agree between table and headings. Reported for a separate fix.

## 2. Scope

- **In scope:**
  - `lib/whatsapp-notification-catalogue.ts` (new): the catalogue (key, group, template names, purpose, why, ifOff, `highImpact`), the always-on list, a helper `isLockedTemplate(name)`, and `catalogueKeyForTemplate(name)`.
  - `lib/whatsapp.ts`: gate at the top of `sendMessage` after the `isEnabled` check; returns `SUPPRESSED_ADMIN_DISABLED`. `sendTextMessage` is **not** gated: it is used for replies to a message the customer has just sent (STOP/START confirmation, staff-number reply, WA-16 replies), which are inside the 24-hour window and customer-initiated.
  - `services/notification-service.ts`: the `freeFormText` path (support replies) checks the same gate by `templateKey`; a suppressed WhatsApp attempt is logged with the `suppressed_admin_disabled` errorCode (same pattern as `held_template_pending`) and falls through to email/SMS if the caller supplied them, like a consent-off attempt.
  - `services/system-settings-service.ts`: `getWhatsAppNotificationSettings`, `updateWhatsAppNotificationSettings` under a new key `whatsapp-notification-switches`, with an in-process cache (short TTL, invalidated on save) and change history.
  - `app/actions/admin/notification-settings-actions.ts` (new or extended): read/update actions, admin and super-admin only via `lib/session.ts` helpers, audit-logged.
  - `components/features/admin/whatsapp-notification-switches.tsx` (new) used from `notification-settings-form.tsx`.
  - `services/notification-log-service.ts` and the notification log UI filter: a `suppressed` filter on the errorCode.
  - `docs/operations/` runbook note.
- **Out of scope:** per-customer category preferences (STOP/START from WA-02 stays the customer control); gating inbound free-form replies; the WA-14 messaging health page (it will count the new errorCode); template submission (none new).

### Surface inventory

| Surface                                   | Change                          |
| ----------------------------------------- | ------------------------------- |
| `WhatsAppService.sendMessage`             | gate by template name           |
| `NotificationService.send` free-form path | gate by templateKey             |
| Settings → Notifications                  | new "WhatsApp messages" section |
| Notification log                          | suppressed filter               |

## 3. Architecture decisions

- **ADR-014 — One gate in the WhatsApp send path for admin notification switches** — Proposed by `adr-author` (pattern change in the shared send path touching more than three files; new settings storage; a locked always-on list). Draft at `docs/ADR/ADR-014-whatsapp-send-gate-and-admin-switches.md`. Operator flips status to _Accepted_ on plan approval.

## 4. E2E test coverage

Delegated to `e2e-test-engineer` in Phase 2. Spec: `e2e/critical/whatsapp-notification-settings.spec.ts` (AC2–AC8). AC1, AC3 and AC4 are unit-tested.

## 5. Threat model + security considerations

- **Mis-gating the sign-in PIN locks every customer out** (WhatsApp-only sign-in). Mitigation: the PIN is never gated in code (the gate returns early for locked templates before reading settings), not only hidden in the UI; a unit test sends the PIN with the master switch off.
- **Settings read fails or the cache is stale.** Default is fail-open (send): a settings read error must never silently drop messages. Cache TTL is short and invalidated on save.
- **Privilege:** the actions are admin and super-admin only; negative tests for csr, kitchen and customer sessions (AC8). No new secret, no new external service, no new dependency.
- **Operator error:** switching off staff alerts removes the WhatsApp escalation chain. Mitigation: confirmation dialog repeating the consequence (AC6) and an audit entry (AC7).

### Risk register entries

Entries in `compliance/risk-register.md` (the project's register uses `R-NNN` ids). The operator signs off each residual rating at the Phase 3 sign-off exchange.

- **R-77 — Admin notification switches suppress the sign-in PIN or silently drop messages** — OPEN, residual low × medium. Controls: code-level always-on list, fail-open settings read, catalogue completeness test, distinct suppressed log, default ON.
- **R-78 — Switching off staff alerts or payment reminders removes an operational safety net** — OPEN, residual low × medium. Controls: purpose/why/consequence text, confirmation dialog, audit log, admin-only.

## 6. Data protection (GDPR Art. 25)

No new personal data. Settings hold only switch states and the admin's id in change history. Suppressed sends write a `NotificationLog` row with the same fields as any send attempt (no message content beyond the template parameters already logged).

## 7. AI / model considerations (EU AI Act Art. 11)

No AI in scope. AI assistance in authoring is disclosed in `ai-use-note.md`.

## 8. Rollback plan

Revert the bundle PR. The settings key is additive and unread after revert; with no document present every switch defaults to ON, so behaviour returns to today's. No migration.

## 9. Verification

`npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npx playwright test e2e/critical/whatsapp-notification-settings.spec.ts`; UAT on the UAT environment per the UAT pack (agent-executed, `uat.mode: auto`, human review).

## 10. Sign-off

Plan approved by: operator, at the Phase 1 checkpoint (bundle decision #1031 below).

## Decisions recorded at the Phase 1 checkpoint (2026-11-25)

Operator approved the bundle plan with: **option B for #1031** (keep the cart, reuse the order via a cart-fingerprint-bound key, cancel the superseded unpaid order); **opted-out customers who text "order" or "status" still get the reply** (STOP clears marketing only); **replies to a customer's own message are not switchable** (template sends and support replies are; the sign-in PIN is locked on).
