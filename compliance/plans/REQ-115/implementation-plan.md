---
title: 'Implementation plan — REQ-115'
requirement_id: 'REQ-115'
risk_class: 'HIGH'
change_type: 'fix'
authored_by: 'sdlc-implementer (Claude) for operator'
authored_at: '2026-10-24'
---

# Implementation plan — REQ-115

Issue: #963 (WA-01, Phase 0 of tracker #953). Risk HIGH (operator-confirmed 2026-10-24) because D16 changes PIN generation/verification (auth surface). Other items are LOW/MEDIUM.

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

Closes ISO 29119 §3.4 (§1), ISO 27001 A.8.25 (§5), GDPR Art. 25 (§6), EU AI Act Art. 11 (§7).

## 1. Goal + acceptance criteria

- **Goal:** Fix the existing WhatsApp paths that are broken today (wrong template parameters, mis-logged outcomes, inconsistent phone formats, wrong PIN length, misleading errors, stale docs and test plumbing) without adding any new customer feature.

| AC   | Description (Given / When / Then)                                                                                                                                                                                                                                                                                                                                                                                               | SRS item                     |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| AC1  | **Given** an unknown number messages us, **When** the router sends `welcome_new_user`, **Then** its `NotificationLog` row has 2 body params (today's opening and closing time, `h:mm a`); **Given** a dormant customer "Ada", **Then** `welcome_back` is logged with `["Ada"]` (fallback `there`).                                                                                                                              | REQ-WA-005                   |
| AC2  | **Given** a ticket and staff reply outside the 24h window, **When** `support_reply` is sent, **Then** it carries header `[ticket no.]` and 3 body params `[first name, subject, reply]`; `sendMessage` accepts `{headerParams, bodyParams, buttonParams}` and old `string[]` callers behave unchanged.                                                                                                                          | REQ-WA-003                   |
| AC3  | **Given** the daily incident summary job, **When** it notifies by WhatsApp, **Then** it resolves a real user `_id` by email and reads their communication preferences, or skips WhatsApp and logs when no user matches.                                                                                                                                                                                                         | REQ-WA-002                   |
| AC4  | **Given** a send that fails, **When** the inbound router records `actionTaken`, **Then** it is `<template>_failed:<errorCode>`; it is `<template>_sent` only when `success: true`.                                                                                                                                                                                                                                              | REQ-WA-005                   |
| AC5  | **Given** a user stored as `+2348012345678`, **When** a message arrives from `2348012345678`, **Then** they are classified existing (not `new`) and no second user is created; `normalizePhone` makes `234…`, `0…`, `+234…` all `+234…` and is used by `sanitizePhone`, inbound lookups and the PIN send/verify actions; `scripts/migrate-normalize-phones.ts` normalises stored phones and reports duplicates without merging. | REQ-WA-008 (new), REQ-WA-005 |
| AC6  | **Given** `docs/whatsapp-templates.md`, **Then** every URL uses `https://app.wawagardenbar.com/...`, the welcome templates' event button documents `/book`, and a `docs/whatsapp-templates/<name>.json` exists for every documented template.                                                                                                                                                                                   | REQ-WA-002                   |
| AC7  | **Given** `WHATSAPP_API_VERSION` unset, **Then** the Graph URL uses `v23.0`; the env override still wins.                                                                                                                                                                                                                                                                                                                       | REQ-WA-001                   |
| AC8  | **Given** `.env.test`, **Then** `ENABLE_WHATSAPP_NOTIFICATIONS` is defined once as `false`; the leaked access token is rotated (operator) and recorded in evidence.                                                                                                                                                                                                                                                             | REQ-WA-001                   |
| AC9  | `phone_mismatch` is listed in REQ-WA-005, "account_recovery routing" is removed from the gaps list in `docs/authentication/whatsapp-dev-uat-setup.md`, and the RTM traces REQ-WA-00x to REQ-115.                                                                                                                                                                                                                                | REQ-WA-005/007               |
| AC10 | `e2e/helpers/whatsapp-webhook.ts` exports `metaInboundPayload`, `metaStatusPayload`, `postSignedWebhook`; both existing specs import it and no private copy remains.                                                                                                                                                                                                                                                            | n/a (test infra)             |
| AC11 | `__tests__/lib/whatsapp-template-contract.test.ts` passes: each template JSON matches its param builder's header/body/button counts and `TEMPLATE_CATEGORIES`.                                                                                                                                                                                                                                                                  | REQ-WA-002                   |
| AC12 | The REQ-097 flake issues (#944, #945, #948, #949, #907) are consolidated into one issue; the hard-coded seed item in `e2e/helpers/express-menu.ts` is fixed or ticketed.                                                                                                                                                                                                                                                        | n/a (housekeeping)           |
| AC13 | Production WhatsApp account/app status recorded in evidence (operator).                                                                                                                                                                                                                                                                                                                                                         | n/a (operator)               |
| AC14 | Live `account_recovery` round-trip on UAT recorded as evidence (operator).                                                                                                                                                                                                                                                                                                                                                      | REQ-WA-007                   |
| AC15 | **Given** the intercept flag is off, **When** a customer requests a WhatsApp PIN, **Then** the code is exactly 6 digits (`crypto.randomInt`), a 4-digit entry is rejected with the normal invalid-PIN message, the login form says 6-digit/`maxLength 6`, and a live UAT sign-in delivers the PIN.                                                                                                                              | REQ-AUTHC-001, REQ-WA-001    |
| AC16 | **Given** Meta returns code 100 whose detail is not about the recipient, **When** the send fails, **Then** `errorCode` is not `INVALID_PHONE` and the sign-in page shows the generic "could not send, try again" message.                                                                                                                                                                                                       | REQ-WA-001                   |

## SRS items proposed/touched

| AC               | SRS item                 | Status                                                                                        | Notes                                                                         |
| ---------------- | ------------------------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| AC1, AC4         | REQ-WA-005 (existing)    | updated                                                                                       | welcome params, `actionTaken` semantics, `phone_mismatch` added to Behaviour  |
| AC2              | REQ-WA-003 (existing)    | unchanged                                                                                     | trace-only; param shape lives in template doc                                 |
| AC3, AC6, AC11   | REQ-WA-002 (existing)    | unchanged                                                                                     | trace-only                                                                    |
| AC5              | REQ-WA-008 (new)         | authored                                                                                      | canonical E.164 format + migration; drafted as full G/W/T for operator review |
| AC7, AC8, AC16   | REQ-WA-001 (existing)    | unchanged                                                                                     | infra/error mapping, behaviour unchanged                                      |
| AC9              | REQ-WA-005 / REQ-WA-007  | updated                                                                                       | docs/SRS/RTM edits themselves                                                 |
| AC15             | REQ-AUTHC-001 (existing) | stale — updated                                                                               | said "4-digit PIN"; now 6-digit + invalid-entry case                          |
| AC14             | REQ-WA-007 (existing)    | unchanged                                                                                     | live evidence only                                                            |
| AC10, AC12, AC13 | n/a                      | `@srs-deferred: test infrastructure / housekeeping / operator evidence, no product behaviour` |                                                                               |

SRS drift (table vs headings): none found for REQ-WA-_ or REQ-AUTHC-_.

## 2. Scope

- **In scope:** `lib/whatsapp.ts`, `lib/whatsapp-template-params.ts` (new), `lib/auth-utils.ts`, `lib/notification-templates.ts` (read), `services/whatsapp-inbound-service.ts`, `services/support-ticket-service.ts`, `scheduled-jobs.ts`, `app/actions/auth/{verify-pin,verify-whatsapp-pin,verify-email-pin,send-whatsapp-pin}.ts`, `components/shared/auth/login-form.tsx`, `scripts/migrate-normalize-phones.ts` (new), `docs/whatsapp-templates.md` and `docs/whatsapp-templates/*.json`, `docs/authentication/whatsapp-dev-uat-setup.md`, `docs/SRS.md`, `.env.test`, `e2e/helpers/whatsapp-webhook.ts` (new) and the two specs that use it, tests that assume 4-digit PINs.
- **Out of scope:** webhook hardening D4–D7 (WA-02, #964); WhatsApp-only identity (WA-04, #966); submitting `welcome_new_user`/`welcome_back` to Meta (held for WA-13); any new feature.

### Surface inventory

| Surface                        | File                                                       | Status                                       |
| ------------------------------ | ---------------------------------------------------------- | -------------------------------------------- |
| Customer sign-in PIN screen    | `components/shared/auth/login-form.tsx`                    | In scope (6 digits)                          |
| PIN send/verify server actions | `app/actions/auth/*`                                       | In scope                                     |
| Inbound WhatsApp router        | `services/whatsapp-inbound-service.ts`                     | In scope                                     |
| Support reply send             | `services/support-ticket-service.ts`, `/dashboard/support` | In scope (params only; UI unchanged)         |
| Incident summary job           | `scheduled-jobs.ts`                                        | In scope                                     |
| Phone data                     | `users.phone`                                              | In scope (migration script, run by operator) |
| Staff dashboard UI             | `app/dashboard/*`                                          | Already works / unchanged                    |

## 3. Architecture decisions

- **ADR-006 — Canonical E.164 phone format (`+` prefix) for every identity lookup** — Proposed by `adr-author`. Draft at `docs/ADR/ADR-006-canonical-e164-phone-format.md`. Operator flips status to _Accepted_ at plan approval. Triggered by: HIGH risk class and a pattern change spanning more than 3 files.
- **No separate ADR for the `sendMessage` options shape** — backward-compatible extension of one internal method (old `string[]` callers unchanged), no new dependency or service; recorded here as examined.

## 4. E2E test coverage

Authored via `e2e-test-engineer` (invoked in Phase 2).

- **Spec(s):** `e2e/critical/whatsapp-welcome-params.spec.ts` (AC1), `e2e/critical/whatsapp-phone-normalisation.spec.ts` (AC5), `e2e/critical/customer-pin-six-digits.spec.ts` (AC15), `e2e/support-ticket-staff-flow.spec.ts` (AC2, new test), plus the shared `e2e/helpers/whatsapp-webhook.ts` now used by `e2e/whatsapp-inbound-registration-templates.spec.ts` and `e2e/support-ticket-whatsapp-inbound.spec.ts` (AC10).
- **ACs covered:** AC1, AC2, AC5, AC10, AC15. Other ACs are unit-level, documentation or operator evidence (see `test-scope.md`).
- The two WhatsApp critical specs are transport-layer (no `page`); their evidence form is `test-execution-summary.md`, not screenshots.

## 5. Threat model + security considerations

| Threat                                                                                | Likelihood | Impact | Mitigation                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4-digit PIN brute force (10^4 space)                                                  | Medium     | High   | 6-digit PIN from `crypto.randomInt` (10^6, CSPRNG); existing expiry kept. Attempt-limiting is WA-04 scope and is noted there.                                                                       |
| Weak PRNG for PIN (`Math.random`)                                                     | Medium     | High   | Replace with `crypto.randomInt(0, 1_000_000)` padded to 6.                                                                                                                                          |
| Old 4-digit PINs accepted after change                                                | Low        | Medium | Verify rejects non-6-digit input; stored 4-digit PINs expire via `pinExpiresAt` (10 min).                                                                                                           |
| Phone normalisation merges or mismatches two accounts (account takeover by collision) | Low        | High   | Migration only normalises format and **reports duplicates, never merges**; lookups use the same canonical function on both sides; unique-index conflicts surface as a report, not silent overwrite. |
| Wrong recipient on incident summary (email passed as userId)                          | Medium     | Low    | Resolve by email to `_id`; skip when no match.                                                                                                                                                      |
| Access token in git history                                                           | Known      | High   | Operator rotates token (AC8); no new secrets introduced.                                                                                                                                            |
| Misleading error hides real Meta failure                                              | Medium     | Low    | Map code 100 by detail; log Meta `details`.                                                                                                                                                         |

**Secrets:** `WHATSAPP_ACCESS_TOKEN` rotated by the operator, never written to evidence. **Dependencies:** none added.

### Risk register entries

This REQ opens the following entries in `compliance/risk-register.md` (the register uses `R-NNN` IDs):

- **R-040 — Weak customer sign-in PIN: 4 digits from a non-cryptographic RNG** — Status: OPEN. Mitigated in this REQ by 6-digit `crypto.randomInt` PINs; per-phone attempt limiting is tracked in WA-04 (#966).
- **R-041 — Phone normalisation collides or mis-matches accounts** — Status: OPEN. Controls: no-merge migration with dry-run default and before/after file, same function on both sides (ADR-006).
- **R-042 — WhatsApp access token present in git history** — Status: OPEN. Closed by operator token rotation (AC8).

Operator edits the canonical rows and signs off the residual ratings before plan approval.

## 6. Data protection (GDPR Art. 25)

**Personal data processed:** yes (phone numbers, first name in template params, support ticket text).

- **Data subjects:** customers and staff recipients. **Data:** phone, first name, message text. **Special categories:** none.
- **Lawful basis:** Art. 6(1)(b) contract (order/auth messages); marketing remains consent-based (unchanged).
- **Minimisation:** no new data collected; the migration rewrites the format of an existing field. Template params carry only first name and ticket subject/reply already sent today.
- **Retention:** unchanged. The migration duplicate report is written to evidence with phones masked and is not retained beyond the evidence pack.
- **ROPA/DPIA:** no new purpose, so ROPA unchanged; DPIA not required.
- **Cross-border:** Meta WhatsApp Cloud API, unchanged.

## 7. AI / model considerations (EU AI Act Art. 11)

N/A — this REQ does not introduce or change AI behaviour.

## 8. Rollback plan

- **Reversible via:** `git revert` of the merge commit; the API version and PIN length are code/config only. `WHATSAPP_API_VERSION=v18.0` env override restores the old version without a deploy.
- **Data implications:** the phone migration is not auto-reversible. The script writes a before/after CSV to evidence and supports `--dry-run` (default) so it is run only after UAT approval; rollback is replaying the "before" values from that file. Normalised `+234…` values remain readable by old code (old `sanitizePhone` also preserved `+`).
- **Notification path:** operator pages via the project incident playbook.

## 9. Verification

- **Unit/integration:** param builders, `sendMessage` options and backward compatibility, API URL v23.0, error-code mapping, `normalizePhone`, PIN length (generate/verify/login form), `actionTaken`, incident-summary user resolution, template contract test.
- **E2E:** see §4.
- **Manual after UAT deploy:** live `account_recovery` round-trip; live PIN sign-in with `ENABLE_E2E_PIN_INTERCEPT=false`; dry-run of the phone migration against UAT data.
- **Monitoring:** `NotificationLog` outcomes by template.

## Plan deviation (Phase 2)

All implementation-approach deviations; no acceptance criterion changed.

1. **`NotificationLog` gains `templateParams` and `errorCode`.** The plan's e2e stories (US-01.1/01.2/01.3) assert "the NotificationLog row has these params", but the model stored neither. Two optional fields were added (`templateParams: {header, body, buttons}`, `errorCode`); `NotificationAttempt` also carries `errorCode`, which D8 needs to write `<template>_failed:<errorCode>`. Existing rows and callers are unaffected.
2. **`phoneLookupVariants` added alongside `normalizePhone`.** ADR-006 says lookups must keep finding accounts stored in legacy formats until the migration has run; otherwise the first sign-in after deploy would create a duplicate user. Lookups use `$in` over the canonical form, the digits-only form, the local `0…` form and the value as typed.
3. **`payment_link` template renumbered.** The contract test found that the doc's body used `{{1}} {{2}} {{4}}` (with `{{3}}` reserved for the button URL), which Meta rejects. Body is now `{{1}} {{2}} {{3}}` and the URL button has its own `{{1}}`.
4. **`support_reply` header.** The doc had `Re: {{2}}` (a header variable reusing a body number). Per the issue it is now `Support ticket {{1}}` with the ticket number as the header parameter; the subject moved into the body.
5. **`incident_summary` has no template definition** in the doc or on Meta. D3 now resolves a real user id and passes the incident total as the WhatsApp parameter, but until a template is defined and approved the send fails with `TEMPLATE_NOT_FOUND` and falls back to email, as before. Not in scope here; noted for WA-12's alerting template work.
6. **`WHATSAPP_API_VERSION` env override.** The default is now `v23.0`, but UAT and production set `WHATSAPP_API_VERSION=v18.0` explicitly in their env/secrets, which overrides the default. Operator task: change that variable to `v23.0` (or unset it) per environment.
7. **`actionTaken` strings renamed** (`sent_welcome_new_user` → `welcome_new_user_sent`, `sent_account_recovery` → `account_recovery_sent`, `send_failed` → `<template>_failed:<code>`) as D8 specifies; existing unit and e2e assertions updated.

## 10. Operator tasks (non-code)

1. Rotate the WhatsApp access token present in git history (AC8).
2. Production WhatsApp check and template submission of `verification_pin`/`account_recovery` (AC13).
3. UAT config: `ENABLE_E2E_PIN_INTERCEPT=false`; no trailing `# comments` in `--from-env-file` values (documented in AC9 docs change).
4. Run `scripts/migrate-normalize-phones.ts` after UAT approval, review the duplicate report.
5. Live UAT round-trips (AC14, AC15).
6. Set `WHATSAPP_API_VERSION=v23.0` (or remove it) in the UAT and production env, since an explicit `v18.0` overrides the new default (AC7).

## 11. Sign-off

- **Plan approved by operator:** approved 2026-10-24 ("continue" after HIGH-risk checkpoint)
