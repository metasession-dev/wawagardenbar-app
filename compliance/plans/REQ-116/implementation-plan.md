---
title: 'Implementation plan — REQ-116'
requirement_id: 'REQ-116'
risk_class: 'HIGH'
change_type: 'feat'
authored_by: 'sdlc-implementer (Claude) for operator'
authored_at: '2026-10-29'
---

# Implementation plan — REQ-116

Issue: #964 (WA-02, tracker #953). Risk HIGH (operator-confirmed 2026-10-29): the webhook is an unauthenticated public entry point (signature check, fail-closed behaviour, consent changes) and AC9 repairs customer sign-in PIN delivery (auth surface).

**Scope amendment (operator-approved 2026-10-29, option b, not a `Bundles:` declaration).** #964 originally carried AC1–AC8. The operator asked for one single release that also contains (AC9–AC10) the `verification_pin` delivery fix, which fails on UAT and production with Meta `#131008`, and (AC11–AC15) fixes for the regression-pack failures tracked in #979 and #932, plus the e2e tagging gaps `devaudit doctor` and the portal reported. AC9 is implemented as the **first implementation commit**. The five `incident`-labelled flake issues (#944, #945, #948, #949, #907) stay open.

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

Closes ISO 29119 §3.4 (§1), ISO 27001 A.8.25 (§5), GDPR Art. 25 (§6), EU AI Act Art. 11 (§7).

## 1. Goal + acceptance criteria

- **Goal:** Harden the WhatsApp webhook (fail closed, safe signature compare, dedup before side effects, every event processed, STOP/START, per-phone rate limit, bounded retry with an incident), restore customer PIN delivery, and make the e2e regression pack deterministic where the failures are test-side.

| AC   | Description (Given / When / Then)                                                                                                                                                                                                                                                                                                                                                           | SRS-ID                               | Verification                                                                                                         |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| AC1  | **Given** `WHATSAPP_APP_SECRET` is unset, **When** Meta posts, **Then** POST returns 503, logs one error, and processes nothing (no `IncomingMessage` row).                                                                                                                                                                                                                                 | REQ-WA-009                           | `e2e/critical/whatsapp-webhook-security.spec.ts`; unit                                                               |
| AC2  | **Given** a missing, malformed, wrong-prefix or wrong-length signature, **When** Meta posts, **Then** 403 with no thrown error; the HMAC-SHA256 is over the raw body and compared with length check then `timingSafeEqual`.                                                                                                                                                                 | REQ-WA-009                           | same spec; unit                                                                                                      |
| AC3  | **Given** a GET verification or a POST, **Then** neither the verify token nor any signature value is written to logs.                                                                                                                                                                                                                                                                       | REQ-WA-009                           | unit (log spy)                                                                                                       |
| AC4  | **Given** the same `wamid` delivered twice, **Then** exactly one `IncomingMessage` row, one welcome `NotificationLog` row and one ticket exist; the row is inserted before classification or any side effect.                                                                                                                                                                               | REQ-WA-005                           | `e2e/critical/whatsapp-inbound-idempotency.spec.ts`; unit                                                            |
| AC5  | **Given** a payload with several `entry[]` and `changes[]` (messages and statuses), **Then** every message and status is processed.                                                                                                                                                                                                                                                         | REQ-WA-005                           | same spec; unit                                                                                                      |
| AC6  | **Given** an opted-in customer sends STOP, **Then** `whatsappMarketing=false`, `whatsappTransactional` stays `true`, and the confirmation text is sent; **Given** START (`/^\s*(start\|subscribe\|opt[-\s]?in)\s*$/i`), **Then** `whatsappMarketing=true`, `communicationPreferencesUpdatedAt` is stamped, consent source is `whatsapp_inbound`, and the subscription confirmation is sent. | REQ-WA-010 (new), REQ-WA-006         | `e2e/critical/whatsapp-optout-optin.spec.ts`; unit                                                                   |
| AC7  | **Given** 21 messages from one phone in 10 minutes, **Then** the 21st is stored but creates no ticket or other side effect.                                                                                                                                                                                                                                                                 | REQ-WA-005                           | `__tests__/services/whatsapp-inbound-service.routing.test.ts`                                                        |
| AC8  | **Given** an outbound reply fails with a retryable error (rate limit, 5xx), **Then** it is retried up to 3 times (1s, 5s, 30s); after the last failure an `Incident` is created.                                                                                                                                                                                                            | REQ-WA-005                           | unit                                                                                                                 |
| AC9  | **Given** a customer requests a WhatsApp sign-in PIN, **When** `verification_pin` is sent, **Then** the payload carries the code in the body parameter **and** in the Copy-code URL button (`sub_type: url`, `index: "0"`, one text parameter), and Meta no longer returns `#131008`.                                                                                                       | REQ-WA-001                           | exact-payload unit test on `sendVerificationPinWhatsApp`; extends `__tests__/lib/whatsapp-template-contract.test.ts` |
| AC10 | **Given** UAT after deploy, **When** the operator signs in with a number that has an account, **Then** a 6-digit PIN arrives on WhatsApp (live round-trip recorded as evidence).                                                                                                                                                                                                            | REQ-WA-001                           | operator evidence                                                                                                    |
| AC11 | **Given** `express-order-portion-pricing-req097.spec.ts` (#979; #944/#945/#948/#949), **Then** it creates its own fixture menu item with unique name and `portionOptions`, no longer mutates the seeded `Ogbono`, and `e2e/helpers/express-menu.ts` no longer depends on seeded item names.                                                                                                 | `@srs-deferred: test infrastructure` | the spec itself, 3 consecutive green runs under default workers                                                      |
| AC12 | **Given** the `critical` tier run with default workers against one shared database, **Then** the six specs named in the #979 addendum (and `webhook-idempotency-replay.spec.ts`, #907) pass, the shared-state cause of each is identified in the PR, and specs that cannot be isolated are moved to a serial group.                                                                         | `@srs-deferred: test infrastructure` | 3 consecutive green `critical` runs                                                                                  |
| AC13 | **Given** `cost-snapshot.spec.ts` (x2) and the `partial-payments.spec.ts` skip, **Then** they no longer self-skip silently: the `a[href*="/menu/"][href$="/edit"]` selector or seed is fixed, or the test creates its own item, or it fails loudly.                                                                                                                                         | `@srs-deferred: test infrastructure` | tier run shows 0 unexplained skips                                                                                   |
| AC14 | **Given** `staff-pot.spec.ts` › "start date saves and persists" (#932), **Then** the test waits for hydration before `fill()`, asserts the saved value after reload, and passes under the sharded regression; the root cause (confirmed from CI trace artifacts before the fix) is written up in the PR.                                                                                    | REQ-015 (existing)                   | the spec under sharded dispatch run, 3 green runs                                                                    |
| AC15 | **Given** `e2e/csr-uat.spec.ts` and the REQ-115 AC2 test in `e2e/support-ticket-staff-flow.spec.ts`, **Then** each carries a `[REQ-NNN][ACn]` title tag, `scripts/check-req-title-tags.sh` passes, and `devaudit doctor` no longer reports an untagged test file.                                                                                                                           | `@srs-deferred: test infrastructure` | `check-req-title-tags.sh`; doctor                                                                                    |

Ordering: AC9 is the first implementation commit; AC1–AC8 follow; AC11–AC15 are test-side and land last.

**Behaviour change flagged for the operator.** REQ-WA-005 today says STOP clears **both** `whatsappTransactional` and `whatsappMarketing`. AC6 changes this to marketing only, per programme decision (#953: order messages are part of the service). REQ-WA-005 and REQ-WA-006 prose are updated in this REQ; the operator should confirm the legal position before approving, because the existing SRS cites Meta WABA policy for clearing both.

## SRS items proposed/touched

| AC                     | SRS item                                | Status                                                     | Notes                                                                            |
| ---------------------- | --------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| AC1–AC3                | REQ-WA-009 (new)                        | authored (drafted as full G/W/T, SRS.md)                   | webhook authenticity: fail closed, safe compare, no secret logging               |
| AC4, AC5, AC7, AC8     | REQ-WA-005 (existing)                   | updated (SRS.md)                                           | dedup-first, all entries, rate limit, retry + incident                           |
| AC6                    | REQ-WA-010 (new), REQ-WA-006 (existing) | authored + updated                                         | STOP marketing-only, START opt-in; REQ-WA-005/006 currently say STOP clears both |
| AC9, AC10              | REQ-WA-001 (existing)                   | updated (SRS.md)                                           | OTP delivery: code in body and button                                            |
| AC14                   | REQ-015 (existing)                      | unchanged                                                  | trace-only                                                                       |
| AC11, AC12, AC13, AC15 | n/a                                     | `@srs-deferred: test infrastructure, no product behaviour` |                                                                                  |

## 2. Scope

- **In scope:** `app/api/webhooks/whatsapp/route.ts`, `lib/whatsapp.ts` (`handleWebhook`, `sendVerificationPinWhatsApp`, retry), `services/whatsapp-inbound-service.ts`, `models/incoming-message-model.ts` (read; unique `messageId` index already exists), `lib/rate-limiter.ts` (phone key), `app/actions/auth/send-whatsapp-pin.ts` (read), incident creation via the existing incidents feature, the e2e files named in AC11–AC15, `e2e/helpers/whatsapp-webhook.ts`.
- **Out of scope:** new intents (order, status, cancel, book: later sub-issues); WhatsApp-only identity (WA-04); `welcome_new_user` and `welcome_back` Meta submission (held for WA-13); handling the `account_recovery` YES/NEW reply (risk R-037, separate); the five `incident`-labelled flake issues stay open; migration script run (REQ-115 operator task).

### Surface inventory

| Surface                         | Change                                                            |
| ------------------------------- | ----------------------------------------------------------------- |
| `POST /api/webhooks/whatsapp`   | fail closed, safe compare, no secret logging, raw body HMAC       |
| `GET /api/webhooks/whatsapp`    | stop logging the verify token                                     |
| `WhatsAppService.handleWebhook` | iterate every entry and change                                    |
| `WhatsAppInboundService`        | insert-first dedup, START intent, marketing-only STOP, rate limit |
| outbound sends                  | bounded retry, `Incident` on final failure                        |
| `sendVerificationPinWhatsApp`   | add button parameter                                              |
| e2e regression pack             | fixtures, isolation, hydration wait, tags                         |

## 3. Architecture decisions

- **ADR-007 — Insert-first idempotency on `wamid` and an in-memory per-phone rate limit** — Proposed by `adr-author`. Draft at `docs/ADR/ADR-007-webhook-insert-first-idempotency-and-phone-rate-limit.md`. Operator flips status to _Accepted_ at plan approval. Triggered by: HIGH risk class and a change spanning more than 3 files.
- **No separate ADR for the PIN button parameter (AC9)** — a one-function fix using the existing `buildTemplateComponents` `buttonParams` support; no structural change.

## 4. E2E test coverage

Authored via `e2e-test-engineer` (invoked in Phase 2).

- **New specs (critical tier, transport-layer, no `page`):** `e2e/critical/whatsapp-webhook-security.spec.ts` (AC1, AC2), `e2e/critical/whatsapp-inbound-idempotency.spec.ts` (AC4, AC5), `e2e/critical/whatsapp-optout-optin.spec.ts` (AC6). Their evidence form is `test-execution-summary.md`, not screenshots.
- **Changed specs (AC11–AC15):** portion-pricing REQ-097, the critical-tier isolation group, cost-snapshot, partial-payments, staff-pot, csr-uat, support-ticket-staff-flow.
- AC3, AC7, AC8, AC9 are unit-level; AC10 is operator evidence.

## 5. Threat model + security considerations

| Threat                                                                         | Likelihood   | Impact | Mitigation                                                                                                                    |
| ------------------------------------------------------------------------------ | ------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Forged webhook accepted when the app secret is missing (today returns `true`)  | Medium       | High   | Fail closed: 503, nothing processed (AC1).                                                                                    |
| Signature compare throws on length mismatch, or returns 200 on malformed input | Medium       | Medium | Length check then `timingSafeEqual`, 403 on any malformed value (AC2).                                                        |
| Verify token or signature written to logs                                      | Medium       | Medium | Remove the logging (AC3).                                                                                                     |
| Meta retry duplicates welcomes and tickets (side effects before dedup)         | High         | Low    | Insert `IncomingMessage` first, stop on duplicate-key (AC4).                                                                  |
| Messages beyond the first entry silently dropped                               | Medium       | Medium | Iterate all entries and changes (AC5).                                                                                        |
| STOP removes transactional messages the customer needs (orders, PINs)          | Medium       | Medium | STOP clears marketing only (AC6).                                                                                             |
| Opt-in by a spoofed sender                                                     | Low          | Medium | START acts on the verified sender number from a signature-validated payload only; consent source recorded.                    |
| Message flood from one phone drives ticket and notification spam               | Medium       | Medium | Per-phone limit, 20 per 10 minutes (AC7); limiter is in-memory and per-instance, so restarts reset it (accepted, documented). |
| Retry storm against Meta on outage                                             | Low          | Medium | 3 attempts with backoff, retryable errors only (AC8).                                                                         |
| PIN not delivered, customers cannot sign in                                    | High (today) | High   | AC9 payload fix and AC10 live check.                                                                                          |

**Secrets:** no new secrets; `WHATSAPP_APP_SECRET` becomes mandatory in every environment that receives webhooks (operator checks UAT and production before deploy, otherwise the webhook returns 503). **Dependencies:** none added.

### Risk register entries

This REQ opens the following entries in `compliance/risk-register.md`:

- **R-043 — WhatsApp webhook accepts unsigned events when the app secret is missing** — Status: OPEN. Mitigated by AC1/AC2 (fail closed, safe compare).
- **R-044 — Per-phone rate limit is in memory, per instance, and resets on restart** — Status: OPEN → ACCEPTED at operator sign-off (ADR-007).
- **R-045 — STOP now clears marketing consent only** — Status: OPEN. Operator confirms the policy position before approval.
- **R-046 — Customer sign-in PIN not delivered on WhatsApp (`#131008`)** — Status: OPEN. Mitigated by AC9; closed after the AC10 live round-trip.

Operator edits the canonical rows and signs off the residual ratings before plan approval.

## 6. Data protection (GDPR Art. 25)

**Personal data processed:** yes (phone numbers, message text, consent flags).

- **Data subjects:** customers. **Data:** phone, message body, consent state. **Special categories:** none.
- **Lawful basis:** Art. 6(1)(b) contract for transactional messages; marketing stays consent-based. START records consent with source `whatsapp_inbound` and a timestamp (Art. 7 demonstrable consent).
- **Minimisation:** no new data collected; the rate limiter keys on phone in memory only.
- **Retention:** unchanged.
- **ROPA/DPIA:** no new purpose; ROPA unchanged; DPIA not required.
- **Cross-border:** Meta WhatsApp Cloud API, unchanged.

## 7. AI / model considerations (EU AI Act Art. 11)

N/A — this REQ does not introduce or change AI behaviour.

## 8. Rollback plan

- **Reversible via:** `git revert` of the merge commit. AC1 means a deploy without `WHATSAPP_APP_SECRET` stops all inbound processing; rollback restores the old fail-open behaviour.
- **Data implications:** none; no migration. Consent flags changed by START or STOP are ordinary user updates.
- **Notification path:** operator pages via the project incident playbook.

## 9. Verification

Unit tests per AC; three new critical-tier transport specs; `critical` tier green three times in a row at default workers; sharded regression green for the staff-pot test; live UAT PIN round-trip (AC10); `devaudit doctor` `test-tiers` untagged-file warning cleared.

## 10. Operator tasks (non-code)

1. Confirm `WHATSAPP_APP_SECRET` is set in UAT and production before deploying (AC1 fails closed).
2. Live UAT PIN sign-in after deploy (AC10).
3. Confirm the marketing-only STOP position (AC6).
4. REQ-115 carry-overs still open: AC14 `account_recovery` live check, production account IDs, R-042 sign-off, phone migration run.

## 11. Sign-off

- **Plan approved by operator:** pending (HIGH-risk checkpoint).

SRS drift (table vs headings): none found for REQ-WA-\*.
