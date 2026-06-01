# Release Ticket: REQ-054 — NotificationService.send() channel-fallback wrapper

**Status:** IN PROGRESS
**Date:** 2026-06-01
**Requirement ID:** REQ-054
**Risk Level:** MEDIUM
**GitHub Issue:** [#117 WA-2](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Integration PR:** (opened in this push — link added once gh returns the number)
**Release PR:** (opened after integration merges develop → main)
**DevAudit Release:** `https://devaudit.metasession.co/projects/wgb/` (release version `REQ-054`)
**Sign-off (dual-actor):** pending — UAT review on the portal, then Production approval, then Marked as Released.

---

## Summary

Second code item in #117's WhatsApp expansion bundle (WA-2). Builds `NotificationService.send()` — one entry point for customer-facing transactional touches, consent-gated and channel-fallback (WhatsApp → email → SMS).

After this lands, REQ-053's consent fields (`whatsappTransactional` / `whatsappMarketing`) actually steer outbound traffic; once Meta approves the templates submitted in WA-1, the order-confirmation flow starts firing on WhatsApp first instead of email.

**Backwards-compatibility is intact** — when `ENABLE_WHATSAPP_NOTIFICATIONS !== 'true'` (current prod env) OR the Meta template hasn't been approved, the WhatsApp attempt fails fast and the email closure fires immediately. Worst case: same UX as today.

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI).
- **AI-Generated Changes:** implementation plan with STRIDE + rollback, the `NotificationService` orchestrator + per-channel routing, the `TEMPLATE_CATEGORIES` lookup table, one-line caller refactor in `communication-actions.ts:80`, 16 new vitest cases (6 template-map + 10 service), full REQ-054 compliance markdown. See `compliance/evidence/REQ-054/ai-prompts.md` + `ai-use-note.md`.
- **Operator action this turn:** approved the implementation plan at the MEDIUM-risk checkpoint. Will perform Phase 4 portal UAT approval + Phase 5 Production approval after CI green on develop → main.
- **Human Reviewer:** Stage 4 `dual_actor` approver — see `implementation-plan.md` § _Four-eyes attestation_.

## Implementation Details

- **`services/notification-service.ts` (new, ~180 LOC incl. JSDoc)** — `NotificationService.send(opts)` orchestrator + per-channel `shouldSend*` helpers + structured `console.log` of every attempt.
- **`lib/notification-templates.ts` (new, ~50 LOC)** — `TEMPLATE_CATEGORIES` map covering the 13 active templates from `docs/whatsapp-templates.md`. Drives the orchestrator's category lookup.
- **`app/actions/communication/communication-actions.ts:80`** — single direct-email site swapped to `NotificationService.send({ userId, templateKey: 'order_confirmation', whatsapp: {...}, email: () => sendOrderConfirmationEmail(...) })`. Other senders stay on direct channel paths.
- **Tests** — `__tests__/lib/notification-templates.test.ts` (6 cases) + `__tests__/services/notification-service.test.ts` (10 cases).
- **Evidence pack (Stage 3, this commit):** test-scope / test-plan / test-execution-summary / security-summary / ai-use-note / ai-prompts / implementation-plan + this release ticket.

## Verification

- `npx tsc --noEmit` → exit 0.
- `npx vitest run` → **917 pass / 4 skipped / 0 fail** (+16 new REQ-054 cases).
- `npx eslint <changed>` → 0 errors. (1 intentional console-statement warning on the v1 observability `console.log`; will be replaced when WA-5 ships the persistent log.)
- `npm audit --audit-level=high` → 0 high / 0 critical.
- Semgrep (`--config auto`) → 0 findings on the 3 changed files.
- E2E focused → **n/a** per the `project_e2e_targeted_until_117` policy AND per REQ-054's scope (the orchestrator surface is best-covered by the unit boundary; e2e would only exercise the email fallback path which matches today's UX).

## Residual Risk

- **`opts.category` override Tampering surface** — documented in the security summary. The default is the static map; override is a power-caller affordance with no in-tree caller in v1. Tests cover both paths.
- **Single-boolean email/SMS consent** — v1 treats `email` and `sms` as binary across both marketing/transactional intents. Future REQ to tighten when data justifies.
- **v1 logging is console-only** — WA-5 will add the persistent `NotificationLog` model + delivery-status webhook handling.

## Rollback Plan

`git revert <merge-sha>` on the release-PR merge → restores prior `communication-actions.ts:80` direct-email call. `services/notification-service.ts` and `lib/notification-templates.ts` remain in the codebase but un-called from any user path; next adopting caller can re-use. No data loss; no schema change.

## Cross-Reference

- Parent backlog item: **#117 WA-2**.
- Depends on: **REQ-053** (consent fields `whatsappTransactional` / `whatsappMarketing`).
- Unblocks: **WA-5** (persistent log layer slots in cleanly), **WA-6** (WhatsApp-aware receipt), **P0 #5** (communication preferences enforced on outbound).
- Filed upstream-related during REQ-053: **DevAudit-Installer#92** (derive-release-version HEAD-only) — adopted in 0.1.28 sync.
