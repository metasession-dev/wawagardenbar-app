---
title: 'Implementation plan — REQ-111'
requirement_id: 'REQ-111'
risk_class: 'MEDIUM'
change_type: 'feat'
authored_by: 'sdlc-implementer (agent) — william@ostendo.io'
authored_at: '2026-10-20'
---

# Implementation plan — REQ-111

Scoped slice of [#933](https://github.com/metasession-dev/wawagardenbar-app/issues/933): **Sections D and E only** — `account_recovery` inbound-routing detection, its unit tests, and a new Playwright spec. #933's Sections A/B/C (dev/UAT Meta App creation, ngrok, UAT k8s Secret, template submission scripts) are explicitly **out of scope** for REQ-111 and remain open, unscheduled work on the parent issue.

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

| Clause                                             | What this plan contains                                                                  |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **ISO 29119 §3.4** Test Plan                       | §1 acceptance criteria + §9 verification strategy.                                       |
| **ISO 27001 A.8.25** Secure development life cycle | §5 threat model — this REQ resolves inbound free-text to an existing account's identity. |
| **GDPR Art. 25** Data protection by design         | §6 — yes, personal data (email, phone, order number) is processed for account matching.  |
| **EU AI Act Art. 11** Technical documentation      | §7 — N/A, no AI/model behaviour involved.                                                |

## 1. Goal + acceptance criteria

**Goal:** When an inbound WhatsApp message comes from a phone number not on file, but the message body identifies an existing account (by email or order number) whose phone differs from the sender's, send that account's `account_recovery` template to the sender instead of silently treating them as a brand-new customer.

- **Acceptance criteria:**

| AC  | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                         | SRS item it traces to                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| AC1 | Given a customer with an existing, verified account (phone A, email on file), When they text the WhatsApp number from an unrecognized phone B and include that email in the message body, Then the business sends the `account_recovery` template to phone B and the persisted `IncomingMessage` row for that inbound message records `classifiedState: 'phone_mismatch'`, `actionTaken: 'sent_account_recovery'`, and `userId` equal to the existing account's id. | REQ-WA-007 (new — proposed, see SRS items section below)          |
| AC2 | Same as AC1, but the identifying token in the message body is a matching order number (format `WG` + 10 digits) instead of an email.                                                                                                                                                                                                                                                                                                                                | REQ-WA-007 (new — proposed)                                       |
| AC3 | Given the message body contains an email/order number that resolves to an account whose phone number is the _same_ as the inbound sender's (not actually a mismatch), When the webhook processes the message, Then it falls through to ordinary `'new'`-state handling (auto-create + `welcome_new_user`) exactly as before this REQ — no false-positive `phone_mismatch` classification.                                                                           | REQ-WA-007 (new — proposed)                                       |
| AC4 | Given a brand-new phone number with no identifying email/order number in the message body (e.g. "hi"), When the webhook processes it, Then it is still classified `'new'` and auto-created exactly as before this REQ (regression — unchanged behaviour).                                                                                                                                                                                                           | REQ-WA-005 (existing, `docs/SRS.md:1541` — unchanged, trace-only) |

## SRS items proposed/touched

| AC  | SRS item                    | Status    | Notes                                                                                                                                                                                                                                     |
| --- | --------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | REQ-WA-007 (new — proposed) | stub      | Account-recovery routing: phone-mismatch detection (email or order-number match to a different phone) → `account_recovery` template sent to inbound sender                                                                                |
| AC2 | REQ-WA-007 (new — proposed) | stub      | Same item as AC1 — order-number detection path                                                                                                                                                                                            |
| AC3 | REQ-WA-007 (new — proposed) | stub      | Same item as AC1 — negative case (same-phone match is not a mismatch)                                                                                                                                                                     |
| AC4 | REQ-WA-005 (existing)       | unchanged | Trace-only — pre-existing REQ-056 behaviour, confirmed covered already in `docs/SRS.md:1546` ("Given an inbound WhatsApp message from an unknown phone number... a new User row is auto-created and a welcome_new_user template is sent") |

## 2. Scope

- **In scope:** `services/whatsapp-inbound-service.ts` (new detector + routing branch), `models/incoming-message-model.ts` (new `phone_mismatch` state), `lib/whatsapp-inbound-templates.ts` (map entry for documentation completeness), new/extended unit tests, new Playwright spec `e2e/whatsapp-inbound-registration-templates.spec.ts`.
- **Out of scope:** #933 Sections A/B/C (Meta App/WABA provisioning, ngrok, UAT k8s Secret, template-submission scripts); the `YES`/`NEW` reply handler implied by the `account_recovery` template's own copy (no code anywhere handles that reply today — flagged as a future item requiring a second factor before granting any access, not built here); real Meta template approval (async, outside this REQ's control).

### Surface inventory (MEDIUM risk — required)

| Surface                                                       | URL / file                                                                                                        | Status                                                                                                                                                         |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WhatsApp inbound webhook                                      | `app/api/webhooks/whatsapp/route.ts` → `WhatsAppInboundService.handle()` (`services/whatsapp-inbound-service.ts`) | In scope — new `phone_mismatch` branch added; existing `new`/`signing_up`/`active`/`dormant` branches unchanged                                                |
| WhatsApp outbound send                                        | `lib/whatsapp.ts` (`WhatsAppService.sendMessage`)                                                                 | Already works — reused as-is for the new branch, same `ENABLE_WHATSAPP_NOTIFICATIONS` gate and `SERVICE_DISABLED` short-circuit that existing branches rely on |
| Account recovery template itself (Meta-side content/approval) | `docs/whatsapp-templates.md` lines 407-434                                                                        | Out of scope (waived) — template submission is #933 Section C, tracked separately; this REQ only builds the code path that _would_ send it once approved       |

## 3. Architecture decisions

**No ADR needed** — decision-tree verdict (`adr-author` skill, Stage 1): no new third-party dependency, no new external service, no new database/cache/queue tier, no schema-level data-model change (an added enum value, not a new relationship), risk class MEDIUM (not HIGH/CRITICAL), and the touched files (`services/whatsapp-inbound-service.ts`, `models/incoming-message-model.ts`, `lib/whatsapp-inbound-templates.ts`) don't match any `sdlc-config.json:adr_author.file_paths_signal_architecture` entry (defaults: `lib/services/`, `lib/repositories/`, `prisma/schema.prisma`, `infra/` — none apply here). This is a routing-logic addition inside an existing service, following the same dispatch pattern the `opt_out` branch already established (direct `WhatsAppService` call bypassing `NotificationService` when the recipient is the inbound sender, not a DB-resolved user) — a 3-file pattern extension, not a >3-file structural change.

## 4. E2E test coverage

**Spec:** `e2e/whatsapp-inbound-registration-templates.spec.ts` (new).
**ACs covered:** AC1 (phone-mismatch via email), AC2 (phone-mismatch via order number — if not covered by a dedicated case, covered at the unit level per §9), AC3 (same-phone negative case — unit level), AC4 (new/unrecognized phone with no signal — e2e, regression).

## 5. Threat model + security considerations

| Threat                                                                                                                                                                                                                                                                | Likelihood                                                                                                                                                    | Impact                                                                                                                                                                                                                                                                                                                                                        | Mitigation                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Attacker who knows a victim's email or order number (e.g. from a leaked receipt or guessed sequential order number) texts the WhatsApp number from their own phone, triggering an `account_recovery` send revealing the victim's last-4 phone digits to the attacker. | Medium — order numbers are sequential (`WG` + date + zero-padded counter) and not secret; emails are commonly known/leaked.                                   | Low-medium — this REQ only _sends a message_ (last-4 digits of the real phone) to whoever asked; it does **not** link the new phone to the account or grant any access. The `YES`/`NEW` reply that the template implies is unhandled by any code (confirmed) — so an attacker who receives the last-4-digit hint gains no further access via this REQ's code. | Documented explicitly in this plan and in the PR description as a known, accepted limitation of v1: the detector is intentionally narrow (first-message-only, proactive identifier) and sends a hint, not an account link. A future handler for the `YES`/`NEW` reply must require a second factor (e.g. re-verify via PIN to the _old_ phone) before granting any access — not built in this REQ. |
| False-positive phone-mismatch classification blocking a genuinely new customer's normal signup if their first message happens to contain an email/order-number-shaped string unrelated to any real account.                                                           | Low — `UserModel.findOne`/`OrderModel.findOne` require an exact match; a non-matching string falls through to ordinary `'new'` handling (AC3/AC4 cover this). | Low                                                                                                                                                                                                                                                                                                                                                           | Covered by AC3's negative-case test; detector returns `null` (not a mismatch) unless a real account match is found.                                                                                                                                                                                                                                                                                |

**Secrets / credentials:** None introduced. Reuses the existing `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_APP_SECRET` already in place; no new credential type.

**Dependencies introduced:** None — no new npm packages.

### Risk register entries

- **R-037 — Account-recovery hint disclosure via WhatsApp** — Status: ACCEPTED (v1 design limitation, documented). Opened by `risk-register-keeper` in `compliance/risk-register.md`. Residual likelihood × impact: medium × low — the mitigation is the narrow, proactive-identifier-only detection design plus the explicit absence of any `YES`/`NEW` reply handler; residual risk is "attacker learns last-4 phone digits," not "attacker gains account access." A future reply-handler requiring a second factor is the precondition for closing this further.

## 6. Data protection (GDPR Art. 25)

**Personal data processed by this REQ:** Yes.

- **Categories of data subjects:** WhatsApp customers (both the inbound sender and, when matched, the existing account holder).
- **Categories of personal data:** Phone number (inbound sender + matched account), email address (if present in message body), order number (if present in message body) — order number alone is not personal data but is used as a join key back to the account's phone/email.
- **Special categories (Art. 9):** None.
- **Lawful basis:** Art. 6(1)(b) — necessary for performance of a contract (resuming service to an existing customer who has lost access to their registered phone) / Art. 6(1)(f) legitimate interest (customer support continuity).
- **Purpose limitation:** The detector's only output is a boolean mismatch + which account matched; it is not used for any purpose beyond deciding which template to send. No new persistent linkage between the two phone numbers is created.
- **Data minimisation:** Only the last-4 digits of the matched account's phone are sent back in the template (per `docs/whatsapp-templates.md`'s existing field design, unchanged by this REQ) — the full matched phone number is never exposed to the inbound sender.
- **Retention:** The inbound message, its classification, and the matched `userId` are persisted in the existing `IncomingMessage` collection under REQ-056's existing retention policy — no new retention regime introduced.
- **Cross-references:**
  - Is the ROPA (`compliance/governance/ropa.md`) updated? No — this REQ extends an existing, already-documented processing activity (WhatsApp inbound message handling); no new processing _purpose_ is introduced.
  - Is a DPIA required? No — same reasoning; the existing WhatsApp inbound DPIA coverage (if any) already accounts for phone/email-based customer matching at a comparable risk level.
- **Cross-border transfers:** None — unchanged from existing WhatsApp integration (Meta Cloud API transfer mechanism already covered by the existing integration, not newly introduced here).

## 7. AI / model considerations (EU AI Act Art. 11)

**AI / ML in scope for this REQ:** No. This is deterministic regex/DB-lookup logic — no model inference, no AI decisioning.

## 8. Rollback plan

- **Reversible via:** `git revert` of the merge commit. The new `phone_mismatch` state is additive to the `IncomingCustomerState` union and schema enum; reverting removes the branch and the enum value. No migration needed — MongoDB's schema-less storage means any already-persisted `phone_mismatch` rows simply become un-queried-by-type-but-still-valid-string-field rows after a revert; they are not deleted and cause no read errors (Mongoose enum validation only applies on write).
- **Data implications of rollback:** None blocking. Pre-revert `IncomingMessage` rows with `classifiedState: 'phone_mismatch'` remain readable; they just won't be produced going forward.
- **Notification path if rollback during a release:** Standard incident/rollback comms per the project's existing release process — no WhatsApp-specific notification needed beyond that.

## 9. Verification

- **Unit + integration tests:** Extend `__tests__/services/whatsapp-inbound-service.classify.test.ts` (detector cases: email match, order-number match, no match, matched-but-same-phone) and `__tests__/services/whatsapp-inbound-service.routing.test.ts` (routing-matrix case: mismatch → `account_recovery` via `WhatsAppService.sendMessage`, not `NotificationService.send`; negative case falls through to ordinary `'new'`). Extend `__tests__/lib/whatsapp.inbound-integration.test.ts`'s state→template table if present.
- **E2E coverage:** see §4 — `e2e/whatsapp-inbound-registration-templates.spec.ts`.
- **Manual smoke after deploy:** None required for this REQ alone — the `account_recovery` template isn't approved by Meta yet (tracked separately in #933 Section C), so there is no live-send path to smoke-test until that lands. The code path is fully exercised by the e2e spec via the `ENABLE_WHATSAPP_NOTIFICATIONS=false` short-circuit, same safety property the existing inbound e2e suite already relies on.
- **Monitoring / alerting:** None new — reuses existing `console.error` logging on send failure, same as the other `WhatsAppInboundService` branches.

## 10. Sign-off

- **Plan reviewer (eng):** REPLACE — name + date (operator to fill before/at Phase 4 PR review)
- **Plan reviewer (security / DPO):** REPLACE — name + date (GDPR §6 and threat-model §5 are non-trivial for this REQ — recommend review)
- **Plan approved by operator:** REPLACE — name + date

## Upload path

This file lives at `compliance/plans/REQ-111/implementation-plan.md` and is uploaded automatically on the next push to `develop` via `compliance-evidence.yml`.
