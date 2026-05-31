# Release Ticket: REQ-053 — WhatsApp opt-in surface at signup + profile

**Status:** IN PROGRESS
**Date:** 2026-05-31
**Requirement ID:** REQ-053
**Risk Level:** MEDIUM
**GitHub Issue:** [#117 WA-4](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Integration PR:** (opened in this push — link added once gh returns the number)
**Release PR:** (opened after integration merges develop → main)
**DevAudit Release:** `https://devaudit.metasession.co/projects/wgb/` (release version `REQ-053`)
**Sign-off (dual-actor):** pending — UAT review on the portal, then Production approval, then Marked as Released.

---

## Summary

First code item of the WhatsApp expansion bundle on #117 (WA-4). Adds the **opt-in surface** that Meta WhatsApp Business Policy requires before any non-OTP message can be sent — a single Checkbox at the PIN-entry step for new users and two Switches in the profile preferences tab.

Schema gains `whatsappTransactional` (default `true` — consent for order updates, receipts, support replies) and `whatsappMarketing` (default `false` — explicit opt-in needed for offers / promotions). Mongoose schema defaults keep existing user docs working without a migration.

REQ-053 only **writes** the consent state. WA-2 (`NotificationService.send`) will **read** it when it lands. P0 #5 (communication preferences enforced on outbound) is unblocked by this REQ.

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI).
- **AI-Generated Changes:** mapping of the surface, implementation plan with STRIDE + rollback, schema + interface changes, three-action `verify*Pin` opt-in plumbing, `send-email-pin.ts:isNewUser` gap close, profile preferences Switches + zod schema, login-form PIN-entry Checkbox wiring, 8 new vitest cases (4 schema + 4 verify-pin), full REQ-053 compliance markdown. See `compliance/evidence/REQ-053/ai-prompts.md` + `ai-use-note.md`.
- **Operator action this turn:** approved the implementation plan at the MEDIUM-risk checkpoint. Will perform Phase 4 portal UAT approval + Phase 5 Production approval after CI green on develop → main.
- **Human Reviewer:** Stage 4 `dual_actor` approver (independent of submitter per the solo-operator interpretation — see DevAudit-Installer issue #89 gap 10) — see `implementation-plan.md` § _Four-eyes attestation_.

## Implementation Details

- **`interfaces/user.interface.ts` + `models/user-model.ts`** — `IPreferences.communicationPreferences` gains `whatsappTransactional` (default `true`) and `whatsappMarketing` (default `false`).
- **`components/shared/auth/login-form.tsx`** — tracks `isNewUser` from the send-pin response; conditionally renders a Checkbox at PIN-entry (default checked); threads the `optIn` payload through to all three verify-pin actions.
- **`app/actions/auth/{verify-pin,verify-whatsapp-pin,verify-email-pin}.ts`** — accept an optional `optIn` payload; persist via `user.set('preferences.communicationPreferences.whatsapp*')` ONLY when `!user.phoneVerified && !user.emailVerified` (strict first-verify gate).
- **`app/actions/auth/send-email-pin.ts`** — returns `isNewUser: boolean` (the SMS + WhatsApp send actions already did).
- **`components/features/profile/preferences-tab.tsx`** — two new Switches mirroring the existing email/sms/push layout, with zod schema + form defaults extended.
- **`app/actions/profile/profile-actions.ts`** — server-side zod `preferencesSchema` accepts the new fields as optional; normalisation defaults missing fields to `true` / `false` before handing off to `ProfileService.updateProfile`.
- **Tests** — `__tests__/models/user-model.preferences.test.ts` (4 cases) + `__tests__/actions/auth/verify-pin-opt-in.test.ts` (4 cases).
- **Evidence pack (Stage 3, this commit):** test-scope / test-plan / test-execution-summary / security-summary / ai-use-note / ai-prompts / implementation-plan + this release ticket.

## Verification

- `npx tsc --noEmit` → exit 0.
- `npx vitest run` (full suite, feat branch HEAD) → **901 pass / 4 skip / 0 fail** (+8 new REQ-053 cases).
- `npx eslint <REQ-053 files>` → 0 errors. (8 pre-existing warnings unrelated to REQ-053.)
- `npm audit --audit-level=high` → 0 high / 0 critical.
- Semgrep (`--config auto`) → 0 findings on the 8 changed files.
- E2E focused regression → deferred (provider-mock infra blocker per `e2e_regression_suite` memory). Unit boundary is the load-bearing gate for AC4 / AC6.

## Residual Risk

- **Marketing-side templates** — REQ-053 sets up consent. The send path (WA-2) must gate marketing templates on `whatsappMarketing` and transactional on `whatsappTransactional`. If WA-2 ships without that check, opt-outs are not honoured.
- **Client behaviour for returning users** — `isNewUser` is purely a render hint; the backend gate (`!phoneVerified && !emailVerified`) is the security boundary. A bug client that renders the checkbox for returning users still can't overwrite their prefs.
- **No DB migration; no schema change.** Rollback is a single `git revert` on the release-PR merge. Newly-set values on existing user docs persist.

## Rollback Plan

`git revert <merge-sha>` on the release-PR merge → restores prior schema + UI. Mongoose docs that already wrote the new fields keep them in DB (harmless extra fields); the app stops reading/writing them. No data loss.

## Cross-Reference

- Parent backlog item: **#117 WA-4**.
- Unblocks: **WA-2** (NotificationService) + **P0 #5** (communication preferences enforced).
- Sibling work (orchestrated by user, no code): **WA-1** (Meta template approvals).
