# Release Ticket: REQ-063 — Explicit-consent split (P4 #21 + WA-4 tail)

**Status:** DRAFT
**Date:** 2026-06-03
**Requirement ID:** REQ-063
**Risk Level:** MEDIUM
**GitHub Issue:** [#117 P4 #21](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Integration PR:** [#266](https://github.com/metasession-dev/wawagardenbar-app/pull/266) — merged to develop 2026-06-03.
**Release PR:** (to be opened after this evidence pack lands)
**DevAudit Release:** [`devaudit.metasession.co/projects/wgb/`](https://devaudit.metasession.co/projects/wgb/) — release version `REQ-063`, status `draft` → `uat_review` on this evidence push.
**Sign-off (dual-actor):** Pending UAT approval + Production approval on the DevAudit portal.

---

## Summary

Closes the explicit-consent gap that REQ-053 left in place: the PIN-entry surface collapsed `whatsappTransactional` + `whatsappMarketing` into a single checkbox (one click sets both), and the schema's single `email` boolean conflated marketing email with transactional email (an opt-out of offers also killed order confirmations). REQ-063 splits both into independent explicit gates per #117 P4 #21.

- **AC1** — PIN-entry now renders three labelled checkboxes: WhatsApp transactional (default on), WhatsApp marketing (default off), email marketing (default off).
- **AC2** — `emailMarketing: boolean` added to `IPreferences.communicationPreferences`, default false; backwards-compatible via Mongoose default-fill (no migration).
- **AC3** — `communicationPreferencesUpdatedAt?: Date` audit timestamp; server-stamped on PIN first-verify + every profile-prefs save.
- **AC4** — `NotificationService.shouldSendEmail` gates marketing-category templates on `emailMarketing === true`. Transactional + authentication unchanged.
- **AC5** — Profile preferences-tab gains the "Email — offers & promotions" toggle.

**Existing users left alone:** users whose `whatsappMarketing` was set to `true` by REQ-053's single-checkbox bug keep that value. Flipping it now would feel hostile (their explicit click stands). Operator decision recorded at plan time.

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI).
- **AI-Generated Changes:** Implementation plan with 5 ACs + risk + security considerations; schema split (interfaces + Mongoose model) for `emailMarketing` and `communicationPreferencesUpdatedAt`; verify-pin / verify-whatsapp-pin / verify-email-pin payload extension + audit-stamp wiring; login-form three-checkbox UI; NotificationService email-marketing gate; preferences-tab toggle; profile-actions server-stamp; 8 new vitest cases (3 model + 3 NotificationService + 2 verify-pin) + updates to REQ-053 and REQ-054 tests for the new payload shape. See `compliance/evidence/REQ-063/ai-prompts.md` + `ai-use-note.md`.
- **Operator action this cycle:** picked Bundles B/C/D from the post-REQ-062 backlog; confirmed REQ-063 scope after the agent spotted that REQ-053 had already shipped most of WA-4 (only the PIN-entry single-checkbox collapse and the missing emailMarketing split remained); selected the single-timestamp audit shape over the heavier event-log; approved that existing users' collapsed marketing consent should be left alone.
- **Human Reviewer:** Stage 4 `dual_actor` approver — see `implementation-plan.md` § Four-eyes attestation.

## Implementation Details

**Files Added:**

- `__tests__/actions/verify-pin.optin-payload.test.ts` — 2 cases.
- `__tests__/services/notification-service.email-marketing-gate.test.ts` — 3 cases.
- `compliance/plans/REQ-063/implementation-plan.md` — plan with ACs, risk, security.

**Files Modified:**

- `interfaces/user.interface.ts` — added `emailMarketing: boolean` + `communicationPreferencesUpdatedAt?: Date`.
- `models/user-model.ts` — schema mirrors the interface (default false + optional Date).
- `app/actions/auth/verify-pin.ts`, `verify-whatsapp-pin.ts`, `verify-email-pin.ts` — extended `PinOptInPayload` with `emailMarketing`; persist all three independently on first verify + stamp audit timestamp.
- `components/shared/auth/login-form.tsx` — replaced single `whatsappOptIn` state with three independent state slots; rendered three labelled `<Checkbox>` rows in the `isNewUser` block.
- `services/notification-service.ts` — `shouldSendEmail` now takes category; routes marketing through `emailMarketing` gate.
- `components/features/profile/preferences-tab.tsx` — Zod schema + defaults + new `<Switch>` row for `emailMarketing`.
- `app/actions/profile/profile-actions.ts` — `preferencesSchema` accepts `emailMarketing`; `normalisedPreferences` defaults absent fields + stamps `communicationPreferencesUpdatedAt`.
- `__tests__/actions/auth/verify-pin-opt-in.test.ts` — extended REQ-053 payloads with the new `emailMarketing` field.
- `__tests__/services/notification-service.test.ts` — flipped REQ-054 user fixtures to include `emailMarketing: true` where the test exercises a marketing-category email fallback.
- `__tests__/models/user-model.preferences.test.ts` — 3 new cases (default false + override + Date acceptance).
- `compliance/RTM.md` — REQ-063 IN PROGRESS row.

**Schema changes:**

- `IPreferences.communicationPreferences.emailMarketing` (Boolean, default `false`).
- `IPreferences.communicationPreferencesUpdatedAt` (Date, optional).

**Migration:** none required. Mongoose default-fill supplies `emailMarketing: false` at read time; the timestamp simply stays unset on pre-REQ-063 docs.

## Test Plan & Evidence

See `compliance/evidence/REQ-063/test-plan.md` and `test-execution-summary.md`. Full vitest suite: 1047 pass / 4 skip / 0 fail. TypeScript 0 errors. ESLint 0 errors (950 pre-existing console warnings unchanged). Production build green.

## Security & Compliance

- **Auth surface impact:** none new. The optIn payload is only persisted after the OTP verifies, mirroring REQ-053. No new endpoints, no new permission boundaries.
- **Consent integrity:** server-side gate in `NotificationService.shouldSendEmail` cannot be bypassed by a forged client payload. Audit timestamp is server-stamped (the client never supplies it) — prevents replay-style backdating.
- **GDPR posture:** explicit-consent capture at PIN first-verify now records what the user actually clicked (not a system default), with a server-stamped timestamp proving when the consent was actively given.
- **Data egress:** none new.

## Rollback Plan

Revert PR #266. The interface + schema changes are additive (no migration to undo); a revert simply restores the single-checkbox UI and removes the email-marketing gate.

## Quality Gates

| Gate                            | Expected   | Actual (2026-06-03)                  |
| ------------------------------- | ---------- | ------------------------------------ |
| `npx tsc --noEmit`              | exit 0     | exit 0                               |
| `npx vitest run` (full)         | 0 failures | 1047 pass / 4 skip / 0 fail          |
| `npx eslint . --max-warnings=0` | 0 errors   | 0 errors / 950 pre-existing warnings |
| `npm run build`                 | exit 0     | exit 0                               |
| CI Pipeline (develop)           | green      | run 26888266053 — SUCCESS            |
| Compliance Evidence Upload      | uploaded   | run 26888266061 — SUCCESS            |

## Stage Approvals

- [x] Stage 1 — Plan (`compliance/plans/REQ-063/implementation-plan.md`)
- [x] Stage 2 — Implement & test (PR #266 merged to develop)
- [x] Stage 3 — Compile evidence (this evidence pack)
- [ ] Stage 4 — Submit for UAT review (release PR)
- [ ] Stage 5 — UAT review + production deployment + close-out

## Notes

- Sixth cycle in the #117 series after the REQ-057→062 sequence; first in the post-REQ-062 trio (REQ-063 Bundle B → REQ-064 Bundle C → REQ-065 Bundle D).
- REQ-053 + REQ-054 test fixtures touched in this PR — explicitly to track the gate-shape change, not to silence pre-existing failures.
- No new packages, no env vars, no DB migration.
