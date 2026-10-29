# Release Ticket: REQ-115 — WhatsApp Phase 0: fix existing WhatsApp defects (WA-01)

**Status:** RELEASED
**Date:** 2026-10-24
**Requirement ID:** REQ-115
**Risk Level:** HIGH
**Issue:** [#963](https://github.com/metasession-dev/wawagardenbar-app/issues/963) (sub-issue of tracker [#953](https://github.com/metasession-dev/wawagardenbar-app/issues/953))
**Implementation branch:** `fix/REQ-115-whatsapp-phase0-hygiene`

## Summary

Repairs the WhatsApp paths that are broken today. No new customer feature.

- **Welcome templates** now send their parameters: `welcome_new_user` gets today's opening and closing time (`h:mm a`), `welcome_back` gets the customer's first name (fallback "there"). Missing parameters were the cause of Meta error 131048.
- **`support_reply`** sends header `[ticket number]` and body `[first name, subject, reply]`. `WhatsAppService.sendMessage` accepts header, body and URL-button parameters; the old `string[]` form still works.
- **Honest outcomes:** the inbound router records `<template>_sent` only when the send succeeded, otherwise `<template>_failed:<errorCode>`. Previously a failed send was recorded as sent.
- **One phone format:** phones are stored and compared as `+E.164` through `normalizePhone` (ADR-006). Lookups still find accounts stored in older formats. A migration script normalises stored numbers, dry-run by default, and reports duplicates without merging them.
- **6-digit PINs:** sign-in PINs are 6 digits from a cryptographically secure RNG (Meta rejects any other length for the authentication template). Login form, verify actions and tests are updated; 4-digit entries are refused.
- **Clearer errors:** a Meta code-100 error is shown as "phone number format is invalid" only when Meta says the recipient is the problem; otherwise the user sees a generic "could not send, try again".
- **Incident summary** now resolves a real user id, so its WhatsApp channel can be attempted.
- **Housekeeping:** Graph API default `v23.0`, duplicate `ENABLE_WHATSAPP_NOTIFICATIONS` removed from `.env.test`, template docs use `https://app.wawagardenbar.com` and every documented template has a JSON definition guarded by a contract test (which also fixed a `payment_link` variable-numbering defect), shared e2e webhook helper, SRS and docs updates, and the REQ-097/REQ-069 flake issues consolidated in #979.

## AI contributors

| Tool        | Version    | Commits                                                                           | Date       |
| ----------- | ---------- | --------------------------------------------------------------------------------- | ---------- |
| Claude Code | Sonnet 5.5 | plan, ADR, risk, implementation, test and compliance commits on this REQ's branch | 2026-10-24 |

## Implementation details

- **`lib/whatsapp.ts`:** `WhatsAppTemplateParams`, `buildTemplateComponents`, `classifyInvalidParameterError`; default API version `v23.0`.
- **`lib/whatsapp-template-params.ts`** (new): one parameter builder per template.
- **`lib/auth-utils.ts`:** `normalizePhone`, `phoneLookupVariants`, `isValidPinFormat`; `generatePin` uses `crypto.randomInt`; `sanitizePhone` delegates to `normalizePhone`.
- **`services/whatsapp-inbound-service.ts`, `services/notification-service.ts`, `services/notification-log-service.ts`, `models/notification-log-model.ts`:** params, canonical phone matching, real outcomes; `NotificationLog` gains `templateParams` and `errorCode`.
- **`services/support-ticket-service.ts`, `lib/scheduled-jobs.ts`:** `support_reply` params and incident-summary recipient.
- **`app/actions/auth/*`, `components/shared/auth/login-form.tsx`:** 6-digit PINs, canonical phone with legacy-form lookups, generic send-failed message.
- **`lib/phone-migration.ts`, `scripts/migrate-normalize-phones.ts`** (new): the migration plan and runner.
- **Docs:** `docs/whatsapp-templates.md`, `docs/whatsapp-templates/*.json` (12), `docs/authentication/whatsapp-dev-uat-setup.md`.
- **Design:** ADR-006 (`docs/ADR/ADR-006-canonical-e164-phone-format.md`). **SRS:** REQ-WA-008 new; REQ-WA-005 and REQ-AUTHC-001 updated. **Risk register:** R-040, R-041, R-042.

## Operator tasks (not code)

1. Rotate the WhatsApp access token that is in git history (AC8, R-042). Record the date in evidence; never the token.
2. Production WhatsApp check (AC13): confirm `WHATSAPP_BUSINESS_ACCOUNT_ID` and `WHATSAPP_PHONE_NUMBER_ID` in Railway production, subscribe the production account to the WGB app and publish it, submit `verification_pin` and `account_recovery` to the production account if missing. Do **not** submit `welcome_new_user` or `welcome_back` (held for WA-13).
3. In UAT and production set `WHATSAPP_API_VERSION=v23.0` or remove it; an explicit `v18.0` overrides the new default.
4. On UAT set `ENABLE_E2E_PIN_INTERCEPT=false` and keep `# comments` out of `--from-env-file` values, then record the live `account_recovery` round-trip (AC14) and a live 6-digit PIN sign-in (AC15).
5. After UAT approval run `npx tsx scripts/migrate-normalize-phones.ts` (dry run), review the duplicate report, then `--apply`. Keep the before/after file as restricted evidence.

## Verification

- TypeScript: 0 errors. ESLint: 0 errors (pre-existing warnings only).
- Unit/integration: 1755 passed, 4 skipped (full suite). New or updated tests cover every code AC; see `compliance/evidence/REQ-115/test-plan.md`.
- E2E: new critical specs `whatsapp-welcome-params`, `whatsapp-phone-normalisation`, `customer-pin-six-digits` and the new US-01.3 test passed locally on an isolated server with a disposable MongoDB; the four modified existing specs passed. Full `critical` tier results and triage are in `compliance/evidence/REQ-115/test-execution-summary.md`.
- Dependency audit: `0 accepted, 0 unresolved`; no dependency changed.
- Full detail: `compliance/evidence/REQ-115/test-execution-summary.md` and `compliance/evidence/REQ-115/security-summary.md`.
- Not yet done (operator, see above): live UAT round-trips and the production WhatsApp check.

## Sign-off (dual-actor)

This is a HIGH-risk release on a solo-operator team, so the "reviewer ≠ submitter" check is read as actor type, not human identity. The AI tooling that implemented this REQ and the human operator who performs UAT and approves on the portal are distinct actors. The operator must review the diff independently, perform the live UAT round-trips (AC14, AC15), and confirm the ADR-006 and R-040 to R-042 wording and ratings before approving.
